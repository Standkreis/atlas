// The region job (spec §🗃️ A–C, Germany contract §Query and aggregation): resolve one
// application region, fetch every constituent query unit, fold synonyms to accepted species,
// aggregate, then apply the floor/cut and atomically replace its derived regional rows.
import type { Prisma } from '../src/generated/prisma/client'
import type { Tile } from '../src/generated/prisma/enums'
import { resolveAcceptedSpecies, type AcceptedTaxonomyResult, type SpeciesLookup, type TaxonomyRejection } from './accepted-taxonomy'
import { aggregateCompositeCounts, cutCompositeTile, type QueryUnitCounts } from './composite-aggregation'
import { db } from './db'
import { pool, requests, withFreshCache } from './fetch'
import { gbifFacet, gbifSpecies, occurrenceBase, resolveRegion, type Facet, type Gadm, type Species } from './gbif'
import { normalizeRegionAlias } from './registry-import'
import { isNow, monthShares, tileOf, words } from './rules'

// Direct jobs also update shared Taxon identities/prose, so even a legacy foreign region
// can affect the active German catalogue. Version-explicit calculation/staging is separate.
async function activeCatalogue(client: Pick<Prisma.TransactionClient, 'catalogueVersion'> = db) {
  return client.catalogueVersion.findFirst({ where: { countryCode: 'DE', status: 'active' }, select: { id: true } })
}

async function assertDirectPublicationAllowed(client: Pick<Prisma.TransactionClient, 'catalogueVersion'> = db) {
  const active = await activeCatalogue(client)
  if (active) throw new Error(`direct regional publication is blocked by active catalogue ${active.id}; use germany --registry <version-id> --run <new-key>, reviewed audits and local activation; production transfer requires separate authorization`)
}

// Match local catalogue activation's lock, and recheck after acquiring it. Never hold a
// transaction over provider requests: a catalogue activated during calculation wins.
async function lockCatalogueActivation(tx: Prisma.TransactionClient) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'catalogue-activation:DE'}, 0))::text`
}

const MONTH_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const

type Candidate = {
  key: number
  obs: number
  byMonth: number[]
  species: Species
  tile: Tile
}

type FacetLookup = typeof gbifFacet
export type RegionJobDependencies = {
  facet: FacetLookup
  species: SpeciesLookup
  taxonomy: (sourceKeys: readonly number[]) => Promise<AcceptedTaxonomyResult>
  resolveLegacy: (query: string) => Promise<Gadm>
  requestStats: typeof requests
}

const DEFAULT_DEPENDENCIES: RegionJobDependencies = {
  facet: gbifFacet,
  species: gbifSpecies,
  taxonomy: (sourceKeys) => resolveAcceptedSpecies(sourceKeys, gbifSpecies),
  resolveLegacy: resolveRegion,
  requestStats: requests,
}

function regionDependencies(overrides: Partial<RegionJobDependencies>): RegionJobDependencies {
  const species = overrides.species ?? DEFAULT_DEPENDENCIES.species
  return {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
    species,
    taxonomy: overrides.taxonomy ?? ((sourceKeys) => resolveAcceptedSpecies(sourceKeys, species)),
  }
}

export type RegionTarget = {
  regionId: string
  regionKey: string | null
  registryEntryId: string | null
  gadmGid: string | null
  name: string
  higher: string
  queryUnits: string[]
  registryVersion: string | null
}

type RawUnitFacets = {
  queryUnitKey: string
  year: Facet
  months: Facet[]
}

export type RegionResult = {
  regionId: string
  gadmGid: string | null
  queryUnits: string[]
  registryVersion: string | null
  name: string
  total: number
  monthTotals: number[]
  perTile: Record<string, number>
  set: number
  lookalikes: number
  rejectedTaxa: TaxonomyRejection[]
  nowInMonth: (month: number) => number
  seconds: number
  requests: ReturnType<typeof requests>
}

export type CalculatedTaxonIdentity = {
  gbifKey: number
  sciName: string
  rank: string
  tile: Tile
  class: string | null
  order: string | null
  genus: string | null
}

export type CalculatedPlausibility = {
  gbifKey: number
  obs: number
  monthShare: number[]
  peak: number
  words: string
}

export type TaxonomyResolutionSummary =
  | { sourceKey: number; status: 'accepted'; acceptedKey: number; species: Species }
  | { sourceKey: number; status: 'rejected'; reason: string }

/** Serializable output of regional calculation, safe to checkpoint before any live publication. */
export type RegistryRegionCalculation = {
  target: RegionTarget
  total: number
  monthTotals: number[]
  perTile: Record<string, number>
  taxa: CalculatedTaxonIdentity[]
  plausibility: CalculatedPlausibility[]
  lookalikePairs: [number, number][]
  rejectedTaxa: TaxonomyRejection[]
  taxonomyResolutions: TaxonomyResolutionSummary[]
  seconds: number
  requests: ReturnType<typeof requests>
}

function selectRegistryEntry<T extends { registryVersion: { active: boolean; importedAt: Date } }>(entries: T[]): T | undefined {
  return [...entries].sort((a, b) => (
    Number(b.registryVersion.active) - Number(a.registryVersion.active) ||
    b.registryVersion.importedAt.getTime() - a.registryVersion.importedAt.getTime()
  ))[0]
}

type RegistryRegionRow = { id: string; canonicalKey: string | null; gadmGid: string | null; name: string; higher: string }
type RegistryEntryRow = {
  id: string
  registryVersionId: string
  sourceUnits: { queryUnits: { providerKey: string }[] }[]
}

function registryTarget(region: RegistryRegionRow, entry: RegistryEntryRow): RegionTarget {
  const missing = entry.sourceUnits.filter((unit) => unit.queryUnits.length === 0)
  if (missing.length > 0) {
    throw new Error(`region ${region.canonicalKey ?? region.id} has ${missing.length} constituent(s) without a verified query mapping`)
  }
  const queryUnits = entry.sourceUnits.flatMap((unit) => unit.queryUnits.map((queryUnit) => queryUnit.providerKey)).sort()
  if (queryUnits.length === 0) throw new Error(`region ${region.canonicalKey ?? region.id} has no constituent query units`)
  if (new Set(queryUnits).size !== queryUnits.length) throw new Error(`region ${region.canonicalKey ?? region.id} has duplicate query mappings`)
  return {
    regionId: region.id,
    regionKey: region.canonicalKey,
    registryEntryId: entry.id,
    gadmGid: region.gadmGid,
    name: region.name,
    higher: region.higher,
    queryUnits,
    registryVersion: entry.registryVersionId,
  }
}

async function storedRegionTarget(query: string): Promise<RegionTarget | null> {
  const normalized = normalizeRegionAlias(query)
  const [direct, aliases] = await Promise.all([
    db.region.findMany({
      where: {
        OR: [
          { id: query },
          { canonicalKey: query },
          { gadmGid: query },
          { name: { equals: query, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    }),
    normalized
      ? db.regionRegistryAlias.findMany({
          where: { normalizedName: normalized },
          select: { registryEntry: { select: { regionId: true } } },
        })
      : Promise.resolve([]),
  ])
  const ids = [...new Set([
    ...direct.map((region) => region.id),
    ...aliases.map((alias) => alias.registryEntry.regionId),
  ])]
  if (ids.length === 0) return null
  if (ids.length > 1) throw new Error(`region query "${query}" is ambiguous; use a de-krg key`)

  const region = await db.region.findUniqueOrThrow({
    where: { id: ids[0] },
    include: {
      registryEntries: {
        include: {
          registryVersion: true,
          sourceUnits: {
            include: {
              queryUnits: {
                where: { provider: 'gbifGadm', reviewStatus: 'verified' },
                select: { providerKey: true },
              },
            },
          },
        },
      },
    },
  })
  const entry = selectRegistryEntry(region.registryEntries)
  if (!entry) {
    if (region.gadmGid) {
      return {
        regionId: region.id,
        regionKey: region.canonicalKey,
        registryEntryId: null,
        gadmGid: region.gadmGid,
        name: region.name,
        higher: region.higher,
        queryUnits: [region.gadmGid],
        registryVersion: null,
      }
    }
    throw new Error(`stored region ${region.canonicalKey ?? region.id} has neither registry membership nor a legacy GADM query unit`)
  }
  if (region.status === 'unprepared') {
    throw new Error(`region ${region.canonicalKey ?? region.id} is unprepared; run it through version-explicit nationwide orchestration`)
  }
  return registryTarget(region, entry)
}

async function explicitRegistryTarget(registryVersionId: string, regionKey: string): Promise<RegionTarget> {
  const entries = await db.regionRegistryEntry.findMany({
    where: {
      registryVersionId,
      OR: [
        { regionId: regionKey },
        { sourceCode: regionKey },
        { region: { canonicalKey: regionKey } },
      ],
    },
    include: {
      region: true,
      sourceUnits: {
        include: {
          queryUnits: {
            where: { provider: 'gbifGadm', reviewStatus: 'verified' },
            select: { providerKey: true },
          },
        },
      },
    },
  })
  if (entries.length !== 1) {
    throw new Error(`registry ${registryVersionId} has ${entries.length} matches for region ${regionKey}`)
  }
  return registryTarget(entries[0]!.region, entries[0]!)
}

async function resolveTarget(query: string, resolveLegacy: RegionJobDependencies['resolveLegacy']): Promise<RegionTarget> {
  const stored = await storedRegionTarget(query)
  if (stored) return stored
  const gadm = await resolveLegacy(query)
  const region = await db.$transaction(async (tx) => {
    await lockCatalogueActivation(tx)
    await assertDirectPublicationAllowed(tx)
    return tx.region.upsert({
      where: { gadmGid: gadm.gadmGid },
      create: { gadmGid: gadm.gadmGid, name: gadm.name, higher: gadm.higher, status: 'queued' },
      update: { name: gadm.name, higher: gadm.higher },
    })
  })
  return {
    regionId: region.id,
    regionKey: region.canonicalKey,
    registryEntryId: null,
    gadmGid: gadm.gadmGid,
    name: gadm.name,
    higher: gadm.higher,
    queryUnits: [gadm.gadmGid],
    registryVersion: null,
  }
}

function speciesFacet(facet: Facet, label: string): Map<number, number> {
  const counts = new Map<number, number>()
  for (const row of facet.counts) {
    const key = Number(row.name)
    if (!Number.isSafeInteger(key) || key <= 0) throw new Error(`${label} returned invalid species key ${JSON.stringify(row.name)}`)
    if (counts.has(key)) throw new Error(`${label} returned duplicate species key ${key}`)
    counts.set(key, row.count)
  }
  return counts
}

async function fetchUnitFacets(queryUnits: string[], facet: FacetLookup): Promise<RawUnitFacets[]> {
  const tasks = queryUnits.flatMap((queryUnitKey) => [
    { queryUnitKey, month: 'year' as const },
    ...MONTH_NUMBERS.map((month) => ({ queryUnitKey, month })),
  ])
  const results = await pool(tasks, 4, ({ queryUnitKey, month }) => {
    const base = occurrenceBase(queryUnitKey)
    return month === 'year'
      ? facet('speciesKey', base)
      : facet('speciesKey', { ...base, month })
  })
  return queryUnits.map((queryUnitKey) => {
    const offset = tasks.findIndex((task) => task.queryUnitKey === queryUnitKey)
    const year = results[offset]
    const months = results.slice(offset + 1, offset + 13)
    if (!year || months.length !== 12) throw new Error(`incomplete facet set for ${queryUnitKey}`)
    return { queryUnitKey, year, months }
  })
}

async function aggregateRegion(
  queryUnits: string[],
  dependencies: RegionJobDependencies,
  log: (message: string) => void,
) {
  const facets = await fetchUnitFacets(queryUnits, dependencies.facet)
  const keyed = facets.map((unit) => ({
    unit,
    year: speciesFacet(unit.year, `${unit.queryUnitKey} year facet`),
    months: unit.months.map((month, index) => speciesFacet(month, `${unit.queryUnitKey} month ${index + 1} facet`)),
  }))
  const sourceKeys = [...new Set(keyed.flatMap(({ year, months }) => [
    ...year.keys(),
    ...months.flatMap((month) => [...month.keys()]),
  ]))].sort((a, b) => a - b)
  const taxonomy = await dependencies.taxonomy(sourceKeys)
  if (taxonomy.rejected.length > 0) {
    log(`taxonomy quarantine: ${taxonomy.rejected.length} facet key(s) excluded; ${taxonomy.rejected.map((row) => row.sourceKey).join(' ')}`)
  }

  const units: QueryUnitCounts[] = keyed.map(({ unit, year, months }) => ({
    queryUnitKey: unit.queryUnitKey,
    total: unit.year.total,
    monthTotals: unit.months.map((month) => month.total),
    species: [...new Set([...year.keys(), ...months.flatMap((month) => [...month.keys()])])]
      .sort((a, b) => a - b)
      .flatMap((sourceKey) => {
        const resolved = taxonomy.resolved.get(sourceKey)
        return resolved
          ? [{
              sourceKey,
              acceptedKey: resolved.acceptedKey,
              species: resolved.species,
              obs: year.get(sourceKey) ?? 0,
              byMonth: months.map((month) => month.get(sourceKey) ?? 0),
            }]
          : []
      }),
  }))
  const taxonomyResolutions: TaxonomyResolutionSummary[] = [
    ...[...taxonomy.resolved.values()].map((row) => ({
      sourceKey: row.sourceKey,
      status: 'accepted' as const,
      acceptedKey: row.acceptedKey,
      species: row.species,
    })),
    ...taxonomy.rejected.map((row) => ({ sourceKey: row.sourceKey, status: 'rejected' as const, reason: row.reason })),
  ].sort((a, b) => a.sourceKey - b.sourceKey)
  return { counts: aggregateCompositeCounts(units), rejectedTaxa: taxonomy.rejected, taxonomyResolutions }
}

/** Fetch and directly replace a region only in a database without an active German catalogue. */
export async function runRegion(
  query: string,
  log: (message: string) => void = console.log,
  overrides: Partial<RegionJobDependencies> = {},
): Promise<RegionResult> {
  await assertDirectPublicationAllowed()
  const dependencies = regionDependencies(overrides)
  const target = await resolveTarget(query, dependencies.resolveLegacy)
  return executeRegion(target, log, dependencies)
}

/**
 * Calculate one entry of a pinned registry without changing live product state.
 * The returned JSON-safe rows are the handoff to nationwide staging/checkpoint orchestration.
 */
export async function calculateRegistryRegion(
  registryVersionId: string,
  regionKey: string,
  log: (message: string) => void = console.log,
  overrides: Partial<RegionJobDependencies> = {},
): Promise<RegistryRegionCalculation> {
  const target = await explicitRegistryTarget(registryVersionId, regionKey)
  return calculateRegion(target, log, regionDependencies(overrides))
}

/** Legacy direct publisher with a pinned registry; nationwide staging uses calculateRegistryRegion. */
export async function runRegistryRegion(
  registryVersionId: string,
  regionKey: string,
  log: (message: string) => void = console.log,
  overrides: Partial<RegionJobDependencies> = {},
): Promise<RegionResult> {
  await assertDirectPublicationAllowed()
  const target = await explicitRegistryTarget(registryVersionId, regionKey)
  return executeRegion(target, log, regionDependencies(overrides))
}

async function executeRegion(
  target: RegionTarget,
  log: (message: string) => void,
  dependencies: RegionJobDependencies,
): Promise<RegionResult> {
  const started = Date.now()
  await db.$transaction(async (tx) => {
    await lockCatalogueActivation(tx)
    await assertDirectPublicationAllowed(tx)
    await tx.region.update({ where: { id: target.regionId }, data: { status: 'queued', error: null } })
  })
  try {
    const calculation = await calculateRegion(target, log, dependencies)
    await publishRegionCalculation(calculation)
    return {
      total: calculation.total,
      monthTotals: calculation.monthTotals,
      perTile: calculation.perTile,
      set: calculation.plausibility.length,
      lookalikes: calculation.lookalikePairs.length,
      rejectedTaxa: calculation.rejectedTaxa,
      nowInMonth: (month: number) => calculation.plausibility.filter((row) => isNow(row.monthShare, row.peak, month)).length,
      regionId: target.regionId,
      gadmGid: target.gadmGid,
      queryUnits: target.queryUnits,
      registryVersion: target.registryVersion,
      name: target.name,
      seconds: (Date.now() - started) / 1000,
      requests: calculation.requests,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await db.$transaction(async (tx) => {
      await lockCatalogueActivation(tx)
      // Preserve activation's ready state if it completed while this job was calculating.
      if (!await activeCatalogue(tx)) {
        await tx.region.update({ where: { id: target.regionId }, data: { status: 'failed', error: message.slice(0, 1000) } })
      }
    })
    throw error
  }
}

async function calculateRegion(
  target: RegionTarget,
  log: (message: string) => void,
  dependencies: RegionJobDependencies,
): Promise<RegistryRegionCalculation> {
  const started = Date.now()
  log(`region ${target.name} · ${target.queryUnits.length} query unit(s) · ${target.higher}`)
  const { counts, rejectedTaxa, taxonomyResolutions } = await aggregateRegion(target.queryUnits, dependencies, log)
  log(`facets: ${counts.total} obs across ${target.queryUnits.length} query unit(s); months ${counts.monthTotals.join(' ')}`)

  const eligible = counts.species.filter((candidate) => candidate.obs >= 10)
  const candidates: Candidate[] = []
  let noTile = 0
  for (const candidate of eligible) {
    const tile = tileOf(candidate.species)
    if (!tile) {
      noTile += 1
      continue
    }
    candidates.push({ ...candidate, tile })
  }
  log(`accepted species ≥ 10: ${eligible.length}, without a tile: ${noTile}`)

  const perTileList = new Map<Tile, Candidate[]>()
  for (const candidate of candidates) {
    perTileList.set(candidate.tile, [...(perTileList.get(candidate.tile) ?? []), candidate])
  }
  const set = [...perTileList.values()]
    .flatMap((list) => cutCompositeTile(list))
    .sort((a, b) => a.key - b.key)
  const perTile: Record<string, number> = {}
  for (const candidate of set) perTile[candidate.tile] = (perTile[candidate.tile] ?? 0) + 1

  const plausibility = set.map((candidate): CalculatedPlausibility => {
    const shares = monthShares(candidate.byMonth, counts.monthTotals)
    const peak = Math.max(...shares)
    return { gbifKey: candidate.key, obs: candidate.obs, monthShare: shares, peak, words: words(shares) }
  })
  const taxa = set.map((candidate): CalculatedTaxonIdentity => ({
    gbifKey: candidate.key,
    sciName: candidate.species.canonicalName ?? candidate.species.scientificName!,
    rank: (candidate.species.rank ?? 'SPECIES').toLowerCase(),
    tile: candidate.tile,
    class: candidate.species.class ?? null,
    order: candidate.species.order ?? null,
    genus: candidate.species.genus ?? null,
  }))
  const byGenus = new Map<string, Candidate[]>()
  for (const candidate of set) {
    if (candidate.species.genus) byGenus.set(candidate.species.genus, [...(byGenus.get(candidate.species.genus) ?? []), candidate])
  }
  const lookalikePairs = [...byGenus.values()]
    .filter((genus) => genus.length > 1)
    .flatMap((genus) => genus.flatMap((a) => genus.filter((b) => b !== a).map((b) => [a.key, b.key] as [number, number])))
    .sort(([a, siblingA], [b, siblingB]) => a - b || siblingA - siblingB)

  return {
    target,
    total: counts.total,
    monthTotals: counts.monthTotals,
    perTile,
    taxa,
    plausibility,
    lookalikePairs,
    rejectedTaxa,
    taxonomyResolutions,
    seconds: (Date.now() - started) / 1000,
    requests: dependencies.requestStats(),
  }
}

async function publishRegionCalculation(calculation: RegistryRegionCalculation) {
  const regionId = calculation.target.regionId
  await db.$transaction(async (tx) => {
    await lockCatalogueActivation(tx)
    await assertDirectPublicationAllowed(tx)
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`region-set:${regionId}`}, 0))::text`
    for (const taxon of calculation.taxa) {
      const { gbifKey, ...data } = taxon
      await tx.taxon.upsert({ where: { gbifKey }, create: { gbifKey, ...data }, update: data })
    }
    const taxa = await tx.taxon.findMany({ where: { gbifKey: { in: calculation.taxa.map((taxon) => taxon.gbifKey) } }, select: { id: true, gbifKey: true } })
    const idOf = new Map(taxa.map((taxon) => [taxon.gbifKey, taxon.id]))
    // Regional prose embeds the old membership and seasonal fact sheet. Invalidate only this
    // region's envelope entry, including taxa that leave the set; reusable global content and
    // prose for other regions remain intact.
    await tx.$executeRaw`UPDATE "Taxon" SET prose = prose #- ARRAY['regions', ${regionId}]::text[] WHERE prose->>'version' = '1' AND prose->'regions' ? ${regionId}`
    await tx.lookalike.deleteMany({ where: { regionId } })
    await tx.plausibility.deleteMany({ where: { regionId } })
    if (calculation.plausibility.length > 0) {
      await tx.plausibility.createMany({ data: calculation.plausibility.map((row) => ({
        taxonId: idOf.get(row.gbifKey)!,
        regionId,
        obs: row.obs,
        monthShare: row.monthShare,
        peak: row.peak,
        words: row.words,
      })) })
    }
    if (calculation.lookalikePairs.length > 0) {
      await tx.lookalike.createMany({ data: calculation.lookalikePairs.map(([a, b]) => ({
        taxonId: idOf.get(a)!,
        regionId,
        siblingId: idOf.get(b)!,
      })) })
    }
    await tx.region.update({
      where: { id: regionId },
      data: { status: 'ready', error: null, monthTotals: calculation.monthTotals, refreshedAt: new Date() },
    })
    await tx.$executeRaw`SELECT refresh_region_picker_summary(${regionId})`
  }, { maxWait: 10_000, timeout: 120_000 })
}

/** Legacy-only bulk refresh; rejects an active catalogue even when no stale regions match. */
export async function refresh(days = 30, log: (message: string) => void = console.log) {
  await assertDirectPublicationAllowed()
  const stale = await db.region.findMany({
    where: {
      status: { not: 'unprepared' },
      gadmGid: { not: null },
      OR: [{ refreshedAt: null }, { refreshedAt: { lt: new Date(Date.now() - days * 86_400_000) } }],
    },
  })
  log(`${stale.length} region(s) older than ${days} days`)
  for (const region of stale) {
    const gadmGid = region.gadmGid
    if (gadmGid) await withFreshCache(() => runRegion(gadmGid, log))
  }
  return stale.length
}
