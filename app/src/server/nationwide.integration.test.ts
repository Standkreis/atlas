import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { AcceptedTaxonomyResult } from '../../etl/accepted-taxonomy'
import type { Species } from '../../etl/gbif'
import { fingerprint, prismaStore, runGermany } from '../../etl/nationwide'
import { WORMS_SOURCE, wormsMatchUrl } from '../../etl/marine-habitat'
import { importRegionRegistry } from '../../etl/registry-import'
import { parseRegionQueryMapping } from '../../etl/registry-mapping'
import { parseRegionRegistry, type RegionRegistry } from '../../etl/registry/registry'
import { runRegion, runRegistryRegion, type RegistryRegionCalculation, type RegionJobDependencies } from '../../etl/region'
import { runTaxonWork } from '../../etl/taxon-work'
import { db } from './db'
import { germanyProgress } from './germanyProgress'
import { searchRegions } from './regionSearch'

const REGISTRY_ID = 'de-krg-2098-12-31'
const NORTH_KEY = 'de-krg-99101000'
const SOUTH_KEY = 'de-krg-99102000'
const RUN_COMPLETE = 'issue-18-integration-complete'
const RUN_RETRY = 'issue-18-integration-retry'
const RUN_MARINE = 'issue-53-integration-marine'
const SHARED_KEY = 990_018_001
const NORTH_ONLY_KEY = 990_018_002
const SOUTH_ONLY_KEY = 990_018_003
const TAXON_KEYS = [SHARED_KEY, NORTH_ONLY_KEY, SOUTH_ONLY_KEY]

const source = (id: string, role: 'regions' | 'kreisUnits', product: string, layer: string) => ({
  id,
  role,
  authority: 'Bundesamt für Kartographie und Geodäsie (BKG)',
  product,
  layer,
  topicDate: '2098-12-31',
  archiveUrl: `https://example.test/${id}.zip`,
  downloadedOn: '2098-12-31',
  archiveSha256: id === 'nationwide-ge' ? 'a'.repeat(64) : 'b'.repeat(64),
  productUrl: `https://example.test/${product}`,
  licence: { id: 'dl-de/by-2-0', name: 'Datenlizenz Deutschland – Namensnennung 2.0', url: 'https://www.govdata.de/dl-de/by-2-0' },
  attribution: '© BKG nationwide integration fixture dl-de/by-2-0',
  dataSourcesUrl: `https://example.test/${id}.pdf`,
  changeNotice: 'Test fixture; no geometry.',
})

const registry = parseRegionRegistry({
  schemaVersion: 1,
  registry: {
    key: REGISTRY_ID,
    countryCode: 'DE',
    topicDate: '2098-12-31',
    counts: { regions: 2, kreisUnits: 2, states: 1, singletonRegions: 2, twoUnitRegions: 0, threeUnitRegions: 0 },
    sources: [
      source('nationwide-ge', 'regions', 'GE250', 'KRG250'),
      source('nationwide-vg', 'kreisUnits', 'VG250', 'vg250_krs (GF = 4)'),
    ],
  },
  regions: [
    {
      key: NORTH_KEY,
      sourceKey: '99101000',
      displayName: 'Atlas North',
      sourceName: 'Atlas North',
      stateCode: '99',
      stateName: 'Fixtureland',
      aliases: ['Atlas North', 'Fixtureland', 'North Unit'],
      kreisUnits: [{ key: 'de-krs-99101', ags: '99101', name: 'North Unit', type: 'Landkreis' }],
    },
    {
      key: SOUTH_KEY,
      sourceKey: '99102000',
      displayName: 'Atlas South',
      sourceName: 'Atlas South',
      stateCode: '99',
      stateName: 'Fixtureland',
      aliases: ['Atlas South', 'Fixtureland', 'South Unit'],
      kreisUnits: [{ key: 'de-krs-99102', ags: '99102', name: 'South Unit', type: 'Landkreis' }],
    },
  ],
} satisfies RegionRegistry)

const mapping = parseRegionQueryMapping({
  schemaVersion: 1,
  registryId: REGISTRY_ID,
  provider: 'gbifGadm',
  providerVersion: '4.1-test',
  source: { name: 'GADM fixture', url: 'https://example.test/gadm.gpkg', sha256: 'c'.repeat(64) },
  gbifEvidence: { name: 'GBIF fixture', url: 'https://api.gbif.org/v1/geocode/gadm/search', sha256: 'd'.repeat(64) },
  resolvedAt: '2098-12-31T10:00:00Z',
  reviewedAt: '2098-12-31T11:00:00Z',
  counts: { sourceUnits: 2, mappedQueryUnits: 2, excludedQueryUnits: 0, providerInventory: 2 },
  review: { status: 'verified', method: 'integration fixture', minimumLargestOverlap: 1, excluded: [] },
  mappings: [
    { sourceUnitKey: 'de-krs-99101', providerKeys: ['DEU.98.1_999'] },
    { sourceUnitKey: 'de-krs-99102', providerKeys: ['DEU.98.2_999'] },
  ],
})

const species = (key: number): Species => ({
  key,
  rank: 'SPECIES',
  taxonomicStatus: 'ACCEPTED',
  canonicalName: key === SHARED_KEY ? 'Communis checkpointii' : key === NORTH_ONLY_KEY ? 'Borealis checkpointii' : 'Australis checkpointii',
  scientificName: key === SHARED_KEY ? 'Communis checkpointii Author' : key === NORTH_ONLY_KEY ? 'Borealis checkpointii Author' : 'Australis checkpointii Author',
  kingdom: 'Animalia',
  phylum: 'Chordata',
  class: 'Aves',
  order: 'Passeriformes',
  genus: 'Checkpointia',
})

const taxonomy = vi.fn(async (sourceKeys: readonly number[]): Promise<AcceptedTaxonomyResult> => ({
  resolved: new Map(sourceKeys.map((sourceKey) => [sourceKey, { sourceKey, acceptedKey: sourceKey, species: species(sourceKey) }])),
  rejected: [],
}))

const emptyStats = () => ({ perHost: {}, networkAttempts: 0, hits: 0, misses: 0, retries: 0, tooMany: 0 })
const unmatchedHabitat = async (names: readonly string[]) => JSON.stringify(names.map(() => []))
let targets = new Map<string, { entryId: string; regionId: string; name: string }>()

async function removeFixture() {
  const catalogues = await db.catalogueVersion.findMany({
    where: { countryCode: 'DE', runKey: { in: [RUN_COMPLETE, RUN_RETRY, RUN_MARINE] } },
    select: { id: true },
  })
  const catalogueIds = catalogues.map((row) => row.id)
  const fixtureTaxa = await db.taxon.findMany({ where: { gbifKey: { in: TAXON_KEYS } }, select: { id: true } })
  const fixtureTaxonIds = fixtureTaxa.map((row) => row.id)

  await db.taxonEnrichmentWork.deleteMany({ where: { taxonId: { in: fixtureTaxonIds } } })
  await db.catalogueLookalike.deleteMany({ where: { regionBuild: { catalogueVersionId: { in: catalogueIds } } } })
  await db.cataloguePlausibility.deleteMany({ where: { regionBuild: { catalogueVersionId: { in: catalogueIds } } } })
  await db.catalogueTaxon.deleteMany({ where: { catalogueVersionId: { in: catalogueIds } } })
  await db.catalogueTaxonomyResolution.deleteMany({ where: { catalogueVersionId: { in: catalogueIds } } })
  await db.catalogueHabitatBatch.deleteMany({ where: { catalogueVersionId: { in: catalogueIds } } })
  await db.catalogueRegionBuild.deleteMany({ where: { catalogueVersionId: { in: catalogueIds } } })
  await db.catalogueVersion.deleteMany({ where: { id: { in: catalogueIds } } })

  const regions = await db.region.findMany({ where: { canonicalKey: { in: [NORTH_KEY, SOUTH_KEY] } }, select: { id: true } })
  const regionIds = regions.map((row) => row.id)
  await db.lookalike.deleteMany({ where: { regionId: { in: regionIds } } })
  await db.plausibility.deleteMany({ where: { regionId: { in: regionIds } } })
  await db.regionQueryUnit.deleteMany({ where: { registryVersionId: REGISTRY_ID } })
  await db.regionRegistryAlias.deleteMany({ where: { registryEntry: { registryVersionId: REGISTRY_ID } } })
  await db.regionSourceUnit.deleteMany({ where: { registryVersionId: REGISTRY_ID } })
  await db.regionRegistryEntry.deleteMany({ where: { registryVersionId: REGISTRY_ID } })
  await db.regionRegistrySource.deleteMany({ where: { registryVersionId: REGISTRY_ID } })
  await db.regionRegistryVersion.deleteMany({ where: { id: REGISTRY_ID } })
  await db.region.deleteMany({ where: { id: { in: regionIds } } })
  await db.taxon.deleteMany({ where: { id: { in: fixtureTaxonIds } } })
}

async function liveSnapshot() {
  const regions = await db.region.findMany({
    where: { canonicalKey: { in: [NORTH_KEY, SOUTH_KEY] } },
    orderBy: { canonicalKey: 'asc' },
    select: { id: true, canonicalKey: true, monthTotals: true, status: true, error: true, refreshedAt: true },
  })
  const regionIds = regions.map((row) => row.id)
  const [plausibility, lookalikes, prose] = await Promise.all([
    db.plausibility.findMany({
      where: { regionId: { in: regionIds } },
      orderBy: [{ regionId: 'asc' }, { taxonId: 'asc' }],
      select: { taxonId: true, regionId: true, obs: true, monthShare: true, peak: true, words: true },
    }),
    db.lookalike.findMany({
      where: { regionId: { in: regionIds } },
      orderBy: [{ regionId: 'asc' }, { taxonId: 'asc' }, { siblingId: 'asc' }],
      select: { taxonId: true, regionId: true, siblingId: true },
    }),
    db.taxon.findMany({
      where: { gbifKey: { in: [SHARED_KEY, NORTH_ONLY_KEY] } },
      orderBy: { gbifKey: 'asc' },
      select: { gbifKey: true, prose: true },
    }),
  ])
  return { regions, plausibility, lookalikes, prose }
}

async function calculateFixture(
  registryVersionId: string,
  regionKey: string,
  _log: (message: string) => void = () => undefined,
  overrides: Partial<RegionJobDependencies> = {},
): Promise<RegistryRegionCalculation> {
  void _log
  if (registryVersionId !== REGISTRY_ID) throw new Error(`unexpected registry ${registryVersionId}`)
  const target = targets.get(regionKey)
  if (!target) throw new Error(`unexpected region ${regionKey}`)
  if (!overrides.taxonomy) throw new Error('nationwide taxonomy checkpoint was not injected')
  const sourceKeys = regionKey === NORTH_KEY ? [SHARED_KEY, NORTH_ONLY_KEY] : [SHARED_KEY, SOUTH_ONLY_KEY]
  const resolved = await overrides.taxonomy(sourceKeys)
  const accepted = sourceKeys.map((sourceKey) => {
    const row = resolved.resolved.get(sourceKey)
    if (!row) throw new Error(`fixture taxonomy did not resolve ${sourceKey}`)
    return row
  })
  const observations = regionKey === NORTH_KEY ? [30, 20] : [25, 15]
  return {
    target: {
      regionId: target.regionId,
      regionKey,
      registryEntryId: target.entryId,
      gadmGid: null,
      name: target.name,
      higher: 'Deutschland › Fixtureland',
      queryUnits: [regionKey === NORTH_KEY ? 'DEU.98.1_999' : 'DEU.98.2_999'],
      registryVersion: registryVersionId,
    },
    total: observations.reduce((sum, value) => sum + value, 0),
    monthTotals: [50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    perTile: { bird: accepted.length },
    taxa: accepted.map((row) => ({
      gbifKey: row.acceptedKey,
      sciName: row.species.canonicalName!,
      rank: 'species',
      tile: 'bird',
      class: row.species.class ?? null,
      order: row.species.order ?? null,
      genus: row.species.genus ?? null,
    })),
    plausibility: accepted.map((row, index) => ({
      gbifKey: row.acceptedKey,
      obs: observations[index]!,
      monthShare: [observations[index]! * 2_000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      peak: observations[index]! * 2_000,
      words: 'Jan',
    })),
    lookalikePairs: [
      [accepted[0]!.acceptedKey, accepted[1]!.acceptedKey],
      [accepted[1]!.acceptedKey, accepted[0]!.acceptedKey],
    ],
    rejectedTaxa: [],
    taxonomyResolutions: accepted.map((row) => ({
      sourceKey: row.sourceKey,
      status: 'accepted',
      acceptedKey: row.acceptedKey,
      species: row.species,
    })),
    seconds: 0.01,
    requests: emptyStats(),
  }
}

beforeAll(async () => {
  await removeFixture()
  await importRegionRegistry({ registry, artifactSha256: 'e'.repeat(64), mapping })
  const entries = await db.regionRegistryEntry.findMany({
    where: { registryVersionId: REGISTRY_ID },
    select: { id: true, region: { select: { id: true, canonicalKey: true, name: true } } },
  })
  targets = new Map(entries.map((entry) => [entry.region.canonicalKey!, {
    entryId: entry.id,
    regionId: entry.region.id,
    name: entry.region.name,
  }]))

  await db.taxon.createMany({ data: [
    {
      gbifKey: SHARED_KEY,
      sciName: species(SHARED_KEY).canonicalName!,
      rank: 'species',
      tile: 'bird',
      class: 'Aves',
      order: 'Passeriformes',
      genus: 'Checkpointia',
      prose: { version: 1, regions: { [targets.get(NORTH_KEY)!.regionId]: { marker: 'keep regional prose' } } },
    },
    {
      gbifKey: NORTH_ONLY_KEY,
      sciName: species(NORTH_ONLY_KEY).canonicalName!,
      rank: 'species',
      tile: 'bird',
      class: 'Aves',
      order: 'Passeriformes',
      genus: 'Checkpointia',
      prose: { version: 1, global: { marker: 'keep global prose' } },
    },
  ] })
  const liveTaxa = await db.taxon.findMany({
    where: { gbifKey: { in: [SHARED_KEY, NORTH_ONLY_KEY] } },
    select: { id: true, gbifKey: true },
  })
  const idOf = new Map(liveTaxa.map((taxon) => [taxon.gbifKey, taxon.id]))
  const northId = targets.get(NORTH_KEY)!.regionId
  await db.plausibility.createMany({ data: [
    { taxonId: idOf.get(SHARED_KEY)!, regionId: northId, obs: 901, monthShare: Array(12).fill(10), peak: 10, words: 'Live shared' },
    { taxonId: idOf.get(NORTH_ONLY_KEY)!, regionId: northId, obs: 902, monthShare: Array(12).fill(20), peak: 20, words: 'Live north' },
  ] })
  await db.lookalike.createMany({ data: [
    { taxonId: idOf.get(SHARED_KEY)!, regionId: northId, siblingId: idOf.get(NORTH_ONLY_KEY)! },
    { taxonId: idOf.get(NORTH_ONLY_KEY)!, regionId: northId, siblingId: idOf.get(SHARED_KEY)! },
  ] })
})

afterAll(async () => {
  await removeFixture()
  await db.$disconnect()
})

describe('nationwide catalogue orchestration', () => {
  it('stages every region, finalizes one deduplicated union, and leaves live regional state untouched', async () => {
    const before = await liveSnapshot()
    taxonomy.mockClear()
    const calculate = vi.fn(calculateFixture)

    const first = await runGermany({
      registryVersionId: REGISTRY_ID,
      runKey: RUN_COMPLETE,
      concurrency: 2,
      calculate,
      habitatLookup: unmatchedHabitat,
      regionDependencies: { taxonomy },
      log: () => undefined,
    })

    expect(first).toMatchObject({ attempted: 2, completed: 2, failed: 0, lost: 0 })
    expect(first.report).toMatchObject({
      catalogue: { status: 'complete' },
      regions: { expected: 2, complete: 2, failed: 0, pending: 0, running: 0 },
      national: { uniqueTaxa: 3, perTile: { bird: 3 }, contentComplete: 0, contentAwaiting: 3 },
    })
    expect(first.report.catalogue.responseFingerprint).toMatch(/^[0-9a-f]{64}$/)
    expect(first.report.catalogue.unionFingerprint).toBe(first.report.national.unionFingerprint)
    expect(calculate).toHaveBeenCalledTimes(2)
    expect(taxonomy.mock.calls.flatMap(([keys]) => keys).filter((key) => key === SHARED_KEY)).toHaveLength(1)

    const [builds, stagedRows, stagedLookalikes, union, checkpoints] = await Promise.all([
      db.catalogueRegionBuild.findMany({ where: { catalogueVersionId: first.catalogueId }, orderBy: { registryEntryId: 'asc' } }),
      db.cataloguePlausibility.count({ where: { regionBuild: { catalogueVersionId: first.catalogueId } } }),
      db.catalogueLookalike.count({ where: { regionBuild: { catalogueVersionId: first.catalogueId } } }),
      db.catalogueTaxon.findMany({ where: { catalogueVersionId: first.catalogueId }, include: { taxon: { select: { gbifKey: true } } } }),
      db.catalogueTaxonomyResolution.findMany({ where: { catalogueVersionId: first.catalogueId }, orderBy: { sourceKey: 'asc' } }),
    ])
    expect(builds).toHaveLength(2)
    expect(builds.every((build) => build.status === 'complete' && build.attempts === 1)).toBe(true)
    expect(stagedRows).toBe(4)
    expect(stagedLookalikes).toBe(4)
    expect(union.map((row) => row.taxon.gbifKey).sort((a, b) => a - b)).toEqual(TAXON_KEYS)
    expect(checkpoints.map((row) => row.sourceKey)).toEqual(TAXON_KEYS)
    expect(await liveSnapshot()).toEqual(before)

    calculate.mockClear()
    const unchanged = await runGermany({
      registryVersionId: REGISTRY_ID,
      runKey: RUN_COMPLETE,
      calculate,
      habitatLookup: unmatchedHabitat,
      regionDependencies: { taxonomy },
      log: () => undefined,
    })
    expect(unchanged).toMatchObject({ owner: null, attempted: 0, completed: 0, failed: 0, lost: 0 })
    expect(unchanged.report.catalogue.status).toBe('complete')
    expect(calculate).not.toHaveBeenCalled()

    const worker = vi.fn(async ({ taxonId }: { taxonId: string }) => ({ resultSummary: { taxonId }, sourceFingerprint: `fixture:${taxonId}` }))
    const enriched = await runTaxonWork({ catalogueVersionId: first.catalogueId, kind: 'gallery', version: 'fixture-v1', worker, concurrency: 2 })
    expect(enriched).toMatchObject({ seeded: 3, attempted: 3, completed: 3, failed: 0, lost: 0, counts: { complete: 3 } })
    expect(worker).toHaveBeenCalledTimes(3)
    worker.mockClear()
    const reused = await runTaxonWork({ catalogueVersionId: first.catalogueId, kind: 'gallery', version: 'fixture-v1', worker, concurrency: 2 })
    expect(reused).toMatchObject({ seeded: 3, attempted: 0, completed: 0, failed: 0, lost: 0, counts: { complete: 3 } })
    expect(worker).not.toHaveBeenCalled()
  })

  it('keeps a partial checkpoint and retries only the failed region', async () => {
    const calls: string[] = []
    let southFailures = 1
    const calculate = vi.fn(async (...args: Parameters<typeof calculateFixture>) => {
      const regionKey = args[1]
      calls.push(regionKey)
      if (regionKey === SOUTH_KEY && southFailures-- > 0) throw new Error('fixture regional interruption')
      return calculateFixture(...args)
    })

    const interrupted = await runGermany({
      registryVersionId: REGISTRY_ID,
      runKey: RUN_RETRY,
      concurrency: 1,
      calculate,
      habitatLookup: unmatchedHabitat,
      regionDependencies: { taxonomy },
      log: () => undefined,
    })
    expect(interrupted).toMatchObject({ attempted: 2, completed: 1, failed: 1, lost: 0 })
    expect(interrupted.report).toMatchObject({
      catalogue: { status: 'partial' },
      regions: { expected: 2, complete: 1, failed: 1, pending: 0, running: 0 },
      national: { uniqueTaxa: 0 },
    })
    expect(await db.catalogueTaxon.count({ where: { catalogueVersionId: interrupted.catalogueId } })).toBe(0)

    const resumed = await runGermany({
      registryVersionId: REGISTRY_ID,
      runKey: RUN_RETRY,
      concurrency: 1,
      calculate,
      habitatLookup: unmatchedHabitat,
      regionDependencies: { taxonomy },
      log: () => undefined,
    })
    expect(resumed).toMatchObject({ attempted: 1, completed: 1, failed: 0, lost: 0 })
    expect(resumed.report).toMatchObject({
      catalogue: { status: 'complete' },
      regions: { expected: 2, complete: 2, failed: 0, pending: 0, running: 0 },
      national: { uniqueTaxa: 3 },
    })
    expect(calls).toEqual([NORTH_KEY, SOUTH_KEY, SOUTH_KEY])
    const attempts = await db.catalogueRegionBuild.findMany({
      where: { catalogueVersionId: resumed.catalogueId },
      orderBy: { registryEntry: { sourceCode: 'asc' } },
      select: { status: true, attempts: true },
    })
    expect(attempts).toEqual([{ status: 'complete', attempts: 1 }, { status: 'complete', attempts: 2 }])

    const worker = vi.fn(async () => undefined)
    const globallyReused = await runTaxonWork({
      catalogueVersionId: resumed.catalogueId,
      kind: 'gallery',
      version: 'fixture-v1',
      worker,
      concurrency: 2,
    })
    expect(globallyReused).toMatchObject({ seeded: 3, attempted: 0, completed: 0, failed: 0, lost: 0, counts: { complete: 3 } })
    expect(worker).not.toHaveBeenCalled()
  })

  it('filters marine taxa before staging union, lookalikes, picker and seasonal counts', async () => {
    const before = await liveSnapshot()
    const lookup = vi.fn(async (names: readonly string[]) => JSON.stringify(names.map((name) => [{
      scientificname: name, valid_name: name, AphiaID: 53, valid_AphiaID: 53,
      match_type: 'exact', status: 'accepted', rank: 'Species', isMarine: 1,
      isFreshwater: name === species(SHARED_KEY).canonicalName ? 0 : 1, isTerrestrial: 0,
    }])))
    const result = await runGermany({ registryVersionId: REGISTRY_ID, runKey: RUN_MARINE, concurrency: 2,
      calculate: calculateFixture, regionDependencies: { taxonomy }, habitatLookup: lookup, log: () => undefined })
    expect(result).toMatchObject({ completed: 2, failed: 0 })
    expect(result.report).toMatchObject({ catalogue: { status: 'complete', habitatRulesVersion: 1 }, national: { uniqueTaxa: 2, perTile: { bird: 2 } },
      habitat: { names: 3, reasons: { marine: 1, compatible: 2 } } })
    expect(lookup.mock.calls.flatMap(([names]) => names).filter((name) => name === species(SHARED_KEY).canonicalName)).toHaveLength(1)
    const builds = await db.catalogueRegionBuild.findMany({ where: { catalogueVersionId: result.catalogueId }, include: { plausibility: { include: { taxon: true } }, lookalikes: true } })
    expect(builds).toHaveLength(2)
    for (const build of builds) {
      expect(build.regionSize).toBe(1)
      expect(build.perTile).toEqual({ bird: 1 })
      expect(build.nowCounts).toEqual([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
      expect(build.lookalikes).toHaveLength(0)
      expect(build.plausibility.map((row) => row.taxon.gbifKey)).not.toContain(SHARED_KEY)
      expect(build.habitatSummary).toMatchObject({ examined: 2, retained: 1, excluded: [{ gbifKey: SHARED_KEY }] })
    }
    expect(await db.catalogueTaxon.count({ where: { catalogueVersionId: result.catalogueId, taxon: { gbifKey: SHARED_KEY } } })).toBe(0)
    expect(await liveSnapshot()).toEqual(before)
    // Activate only this disposable fixture to exercise the actual product readers.
    expect(await db.catalogueVersion.count({ where: { countryCode: 'DE', status: 'active' } })).toBe(0)
    expect(await db.regionRegistryVersion.count({ where: { countryCode: 'DE', active: true } })).toBe(0)
    await db.catalogueVersion.update({ where: { id: result.catalogueId }, data: { status: 'active', auditedAt: new Date(), activatedAt: new Date() } })
    await db.regionRegistryVersion.update({ where: { id: REGISTRY_ID }, data: { active: true } })
    try {
      await expect(runRegistryRegion(REGISTRY_ID, NORTH_KEY, () => undefined)).rejects.toThrow('build a new nationwide candidate')
      await db.region.update({ where: { id: targets.get(NORTH_KEY)!.regionId }, data: { status: 'ready' } })
      try {
        await expect(runRegion(NORTH_KEY, () => undefined)).rejects.toThrow('build a new nationwide candidate')
      } finally {
        await db.region.update({ where: { id: targets.get(NORTH_KEY)!.regionId }, data: { status: 'unprepared' } })
      }
      const progress = await germanyProgress(db, 'marine-fixture-no-identity', async () => ({ status: 'ok', regionKeys: [] }))
      expect(progress.catalogue).toMatchObject({ id: result.catalogueId, species: 2, discovered: 0, studied: 0 })
      const picker = await searchRegions(db, { q: 'Atlas North', limit: 10, month: 1 })
      expect(picker.results).toHaveLength(1)
      expect(picker.results[0]!.summary).toMatchObject({ setSize: 1, nowCount: 1, perTile: { bird: 1 } })
    } finally {
      await db.catalogueVersion.update({ where: { id: result.catalogueId }, data: { status: 'complete', auditedAt: null, activatedAt: null } })
      await db.regionRegistryVersion.update({ where: { id: REGISTRY_ID }, data: { active: false } })
    }
    const checkpoint = await db.catalogueHabitatBatch.findFirstOrThrow({ where: { catalogueVersionId: result.catalogueId } })
    expect(checkpoint.record).toMatchObject({ ruleVersion: 1, source: { marine_only: false }, rawResponse: expect.any(String) })
    // Idempotent saves are safe, while a stale owner's overlapping batch cannot add a second decision.
    await Promise.all([prismaStore.saveHabitat(result.catalogueId, checkpoint), prismaStore.saveHabitat(result.catalogueId, checkpoint)])
    const overlapNames = [checkpoint.names[0]!, 'Extra fixture']
    const overlapUrl = wormsMatchUrl(overlapNames)
    const overlapRecord = { ...(checkpoint.record as Record<string, unknown>), names: overlapNames, url: overlapUrl, rawResponse: '[[],[]]' }
    await expect(prismaStore.saveHabitat(result.catalogueId, { names: overlapNames, requestFingerprint: fingerprint({ source: WORMS_SOURCE, url: overlapUrl }),
      record: overlapRecord, recordFingerprint: fingerprint(overlapRecord) })).rejects.toThrow('habitat checkpoint conflict')
    expect(await db.catalogueHabitatBatch.count({ where: { catalogueVersionId: result.catalogueId } })).toBe(result.report.habitat!.batches)
    const stored = await db.catalogueVersion.findUniqueOrThrow({ where: { id: result.catalogueId } })
    await db.catalogueVersion.update({ where: { id: stored.id }, data: { inputFingerprint: 'historical-input-fingerprint' } })
    try {
      await expect(runGermany({ registryVersionId: REGISTRY_ID, runKey: RUN_MARINE, log: () => undefined })).rejects.toThrow('different catalogue inputs')
    } finally {
      await db.catalogueVersion.update({ where: { id: stored.id }, data: { inputFingerprint: stored.inputFingerprint } })
    }
  })
})
