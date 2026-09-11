import { createHash } from 'node:crypto'
import { Prisma } from '../src/generated/prisma/client'
import type { RegionAliasKind } from '../src/generated/prisma/enums'
import { db } from './db'
import { normalizeRegionAlias } from '../src/domain/regionAlias'
export { normalizeRegionAlias } from '../src/domain/regionAlias'
import { parseRegionQueryMapping, type RegionQueryMapping } from './registry-mapping'
import {
  GERMANY_REGISTRY_SHA256,
  loadGermanyRegistry,
  parseRegionRegistry,
  type RegionRegistry,
  type RegistryRegion,
} from './registry/registry'

const LEGACY_SUCCESSORS: Record<string, string> = {
  'de-krg-07339000': 'DEU.11.19_1',
  'de-krg-07340000': 'DEU.11.30_1',
}

type RegionRegistryImportDependencies = {
  legacySuccessors: Readonly<Record<string, string>>
}

const REGION_REGISTRY_IMPORT_DEFAULTS: RegionRegistryImportDependencies = {
  legacySuccessors: LEGACY_SUCCESSORS,
}

const instant = (date: string) => new Date(`${date}T00:00:00.000Z`)
const stableId = (kind: string, ...parts: string[]) => `${kind}-${createHash('sha256').update(parts.join('\0')).digest('hex').slice(0, 32)}`
const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}
const json = (value: unknown) => value as Prisma.InputJsonValue

function aliasKind(region: RegistryRegion, name: string): RegionAliasKind {
  if (name === region.displayName) return 'displayName'
  if (name === region.sourceName) return 'sourceName'
  if (name === region.stateName) return 'state'
  if (region.kreisUnits.some((unit) => name.includes(unit.name))) return 'sourceUnit'
  return 'variant'
}

function assertArtifactSha(value: string) {
  if (!/^[0-9a-f]{64}$/.test(value)) throw new Error('registry artifact SHA-256 must be 64 lowercase hexadecimal characters')
}

function assertMappingCoverage(registry: RegionRegistry, mapping: RegionQueryMapping) {
  if (mapping.registryId !== registry.registry.key) {
    throw new Error(`query mapping ${mapping.registryId} does not belong to registry ${registry.registry.key}`)
  }
  const expected = registry.regions.flatMap((region) => region.kreisUnits.map((unit) => unit.key)).sort()
  const actual = mapping.mappings.map((row) => row.sourceUnitKey)
  if (expected.length !== actual.length || expected.some((key, index) => key !== actual[index])) {
    const missing = expected.filter((key) => !actual.includes(key))
    const extra = actual.filter((key) => !expected.includes(key))
    throw new Error(`query mapping must cover every source unit exactly once (missing ${missing.join(', ') || 'none'}; extra ${extra.join(', ') || 'none'})`)
  }
}

type ImportOptions = {
  registry?: RegionRegistry
  artifactSha256?: string
  mapping?: RegionQueryMapping
  log?: (message: string) => void
}

export type RegionRegistryImportResult = {
  registryId: string
  created: boolean
  regions: number
  sourceUnits: number
  aliases: number
  queryUnits: number
  legacyRegionsReused: number
}

type RegistryReader = Pick<
  Prisma.TransactionClient,
  'regionRegistryVersion' | 'regionRegistrySource' | 'regionRegistryEntry' | 'regionRegistryAlias' | 'regionSourceUnit' | 'regionQueryUnit'
>

async function registryCounts(client: RegistryReader, registryId: string) {
  const [regions, sourceUnits, aliases, queryUnits] = await Promise.all([
    client.regionRegistryEntry.count({ where: { registryVersionId: registryId } }),
    client.regionSourceUnit.count({ where: { registryVersionId: registryId } }),
    client.regionRegistryAlias.count({ where: { registryEntry: { registryVersionId: registryId } } }),
    client.regionQueryUnit.count({ where: { registryVersionId: registryId } }),
  ])
  return { regions, sourceUnits, aliases, queryUnits }
}

async function assertExistingRegistry(client: RegistryReader, registry: RegionRegistry, artifactSha256: string) {
  const row = await client.regionRegistryVersion.findUnique({
    where: { countryCode_version: { countryCode: registry.registry.countryCode, version: registry.registry.key } },
  })
  if (!row) return null
  if (
    row.id !== registry.registry.key ||
    row.artifactSha256 !== artifactSha256 ||
    row.expectedRegions !== registry.registry.counts.regions ||
    row.expectedSourceUnits !== registry.registry.counts.kreisUnits
  ) {
    throw new Error(`registry ${registry.registry.key} already exists with different immutable metadata`)
  }
  const counts = await registryCounts(client, row.id)
  if (counts.regions !== row.expectedRegions || counts.sourceUnits !== row.expectedSourceUnits) {
    throw new Error(`registry ${registry.registry.key} is incomplete in the database`)
  }
  const sources = await client.regionRegistrySource.findMany({
    where: { registryVersionId: row.id, role: { in: ['regions', 'kreisUnits'] } },
    select: { id: true, role: true, name: true, url: true, topicDate: true, downloadedAt: true, sha256: true, licenceId: true, licenceUrl: true, attribution: true },
  })
  const actualSourceByRole = new Map(sources.map((source) => [source.role, source]))
  for (const expected of sourceData(registry, row.id)) {
    const actual = actualSourceByRole.get(expected.role)
    if (
      !actual ||
      actual.id !== expected.id ||
      actual.name !== expected.name ||
      actual.url !== expected.url ||
      actual.topicDate.getTime() !== expected.topicDate.getTime() ||
      actual.downloadedAt.getTime() !== expected.downloadedAt.getTime() ||
      actual.sha256 !== expected.sha256 ||
      actual.licenceId !== expected.licenceId ||
      actual.licenceUrl !== expected.licenceUrl ||
      actual.attribution !== expected.attribution
    ) throw new Error(`registry ${registry.registry.key} differs at ${expected.role} source provenance`)
  }
  const entries = await client.regionRegistryEntry.findMany({
    where: { registryVersionId: row.id },
    select: {
      sourceCode: true,
      sourceName: true,
      displayName: true,
      stateCode: true,
      stateName: true,
      region: { select: { canonicalKey: true, countryCode: true } },
      aliases: { select: { name: true, normalizedName: true, kind: true } },
      sourceUnits: { select: { canonicalKey: true, sourceCode: true, name: true, kind: true } },
    },
  })
  const entryByCode = new Map(entries.map((entry) => [entry.sourceCode, entry]))
  for (const expected of registry.regions) {
    const entry = entryByCode.get(expected.sourceKey)
    if (
      !entry ||
      entry.region.canonicalKey !== expected.key ||
      entry.region.countryCode !== registry.registry.countryCode ||
      entry.sourceName !== expected.sourceName ||
      entry.displayName !== expected.displayName ||
      entry.stateCode !== expected.stateCode ||
      entry.stateName !== expected.stateName
    ) throw new Error(`registry ${registry.registry.key} differs at region ${expected.key}`)

    const units = [...entry.sourceUnits].sort((a, b) => a.canonicalKey.localeCompare(b.canonicalKey))
    if (units.length !== expected.kreisUnits.length || expected.kreisUnits.some((unit, index) => {
      const actual = units[index]
      return !actual || actual.canonicalKey !== unit.key || actual.sourceCode !== unit.ags || actual.name !== unit.name || actual.kind !== unit.type
    })) throw new Error(`registry ${registry.registry.key} differs at source units for ${expected.key}`)

    const expectedAliases = new Map<string, { name: string; kind: RegionAliasKind }>()
    for (const name of expected.aliases) {
      const normalizedName = normalizeRegionAlias(name)
      if (!expectedAliases.has(normalizedName)) expectedAliases.set(normalizedName, { name, kind: aliasKind(expected, name) })
    }
    const actualAliases = new Map(entry.aliases.map((alias) => [alias.normalizedName, { name: alias.name, kind: alias.kind }]))
    if (
      expectedAliases.size !== actualAliases.size ||
      [...expectedAliases].some(([key, value]) => {
        const actual = actualAliases.get(key)
        return !actual || actual.name !== value.name || actual.kind !== value.kind
      })
    ) throw new Error(`registry ${registry.registry.key} differs at aliases for ${expected.key}`)
  }
  return { row, counts }
}

function sourceData(registry: RegionRegistry, registryId: string) {
  return registry.registry.sources.map((source) => ({
    id: `${registryId}:${source.id}`,
    registryVersionId: registryId,
    role: source.role,
    name: `${source.product} ${source.layer}`,
    url: source.archiveUrl,
    topicDate: instant(source.topicDate),
    downloadedAt: instant(source.downloadedOn),
    sha256: source.archiveSha256,
    licenceId: source.licence.id,
    licenceUrl: source.licence.url,
    attribution: source.attribution,
    metadata: json({
      authority: source.authority,
      product: source.product,
      layer: source.layer,
      productUrl: source.productUrl,
      dataSourcesUrl: source.dataSourcesUrl,
      licenceName: source.licence.name,
      changeNotice: source.changeNotice,
    }),
  }))
}

async function addQueryMappings(
  tx: Prisma.TransactionClient,
  registry: RegionRegistry,
  mapping: RegionQueryMapping,
) {
  assertMappingCoverage(registry, mapping)
  const mappingSha256 = createHash('sha256').update(canonicalJson(mapping)).digest('hex')
  const sourceId = `${registry.registry.key}:query-${mapping.provider}-${mapping.providerVersion}`
  const existing = await tx.regionRegistrySource.findUnique({
    where: { registryVersionId_role: { registryVersionId: registry.registry.key, role: 'queryMappings' } },
  })
  if (existing) {
    const metadata = existing.metadata as { mappingSha256?: string } | null
    if (existing.sha256 !== mapping.source.sha256 || metadata?.mappingSha256 !== mappingSha256) {
      throw new Error(`query mapping for ${registry.registry.key} already exists with different immutable evidence`)
    }
    const queryUnits = await tx.regionQueryUnit.findMany({
      where: { registryVersionId: registry.registry.key },
      select: { provider: true, providerVersion: true, providerKey: true, reviewStatus: true, sourceUnit: { select: { canonicalKey: true } } },
    })
    const expectedOwner = new Map(mapping.mappings.flatMap((row) => row.providerKeys.map((key) => [key, row.sourceUnitKey] as const)))
    if (
      queryUnits.length !== expectedOwner.size ||
      queryUnits.some((unit) => (
        unit.provider !== mapping.provider ||
        unit.providerVersion !== mapping.providerVersion ||
        unit.reviewStatus !== 'verified' ||
        expectedOwner.get(unit.providerKey) !== unit.sourceUnit.canonicalKey
      ))
    ) throw new Error(`query mapping rows for ${registry.registry.key} differ from their immutable evidence`)
    return queryUnits.length
  }

  await tx.regionRegistrySource.create({
    data: {
      id: sourceId,
      registryVersionId: registry.registry.key,
      role: 'queryMappings',
      name: `${mapping.source.name} → BKG VG250`,
      url: mapping.source.url,
      topicDate: instant(registry.registry.topicDate),
      downloadedAt: new Date(mapping.resolvedAt),
      sha256: mapping.source.sha256,
      licenceId: 'gadm-non-commercial',
      licenceUrl: 'https://gadm.org/license.html',
      attribution: 'GADM 4.1 via the GBIF GADM geocoder; internal occurrence-query mapping, not redistributed',
      metadata: json({
        provider: mapping.provider,
        providerVersion: mapping.providerVersion,
        gbifEvidence: mapping.gbifEvidence,
        resolvedAt: mapping.resolvedAt,
        reviewedAt: mapping.reviewedAt,
        counts: mapping.counts,
        review: mapping.review,
        mappingSha256,
        sourceUnitCount: mapping.mappings.length,
        queryUnitCount: mapping.mappings.flatMap((row) => row.providerKeys).length,
      }),
    },
  })

  const sourceUnits = await tx.regionSourceUnit.findMany({
    where: { registryVersionId: registry.registry.key },
    select: { id: true, canonicalKey: true },
  })
  const idByKey = new Map(sourceUnits.map((unit) => [unit.canonicalKey, unit.id]))
  await tx.regionQueryUnit.createMany({
    data: mapping.mappings.flatMap((row) => row.providerKeys.map((key) => ({
      id: stableId('query', registry.registry.key, mapping.provider, mapping.providerVersion, key),
      registryVersionId: registry.registry.key,
      sourceUnitId: idByKey.get(row.sourceUnitKey)!,
      sourceId,
      provider: mapping.provider,
      providerVersion: mapping.providerVersion,
      providerKey: key,
      reviewStatus: 'verified' as const,
      reviewedAt: new Date(mapping.reviewedAt),
      evidence: json({
        sourceUnitKey: row.sourceUnitKey,
        resolvedAt: mapping.resolvedAt,
        reviewMethod: mapping.review.method,
        minimumLargestOverlap: mapping.review.minimumLargestOverlap,
        mappingSha256,
      }),
    }))),
  })
  return mapping.mappings.flatMap((row) => row.providerKeys).length
}

/**
 * Import one immutable BKG registry, optionally with its separately supplied operational GADM
 * mapping. The transaction is all-or-nothing; a byte-identical rerun performs validation only.
 */
export async function importRegionRegistry(
  options: ImportOptions = {},
  dependencies: RegionRegistryImportDependencies = REGION_REGISTRY_IMPORT_DEFAULTS,
): Promise<RegionRegistryImportResult> {
  const registry = parseRegionRegistry(options.registry ?? loadGermanyRegistry())
  const artifactSha256 = options.artifactSha256 ?? GERMANY_REGISTRY_SHA256
  const mapping = options.mapping ? parseRegionQueryMapping(options.mapping) : undefined
  const log = options.log ?? (() => undefined)
  assertArtifactSha(artifactSha256)
  if (mapping) assertMappingCoverage(registry, mapping)

  const outcome = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`region-registry:${registry.registry.key}`}, 0))::text`
    const existing = await assertExistingRegistry(tx, registry, artifactSha256)
    if (existing) {
      if (mapping) await addQueryMappings(tx, registry, mapping)
      return { created: false, legacyRegionsReused: 0 }
    }

    let legacyRegionsReused = 0

    await tx.regionRegistryVersion.create({
      data: {
        id: registry.registry.key,
        countryCode: registry.registry.countryCode,
        version: registry.registry.key,
        artifactSha256,
        expectedRegions: registry.registry.counts.regions,
        expectedSourceUnits: registry.registry.counts.kreisUnits,
      },
    })
    const sources = sourceData(registry, registry.registry.key)
    await tx.regionRegistrySource.createMany({ data: sources })
    const sourceByRole = new Map(sources.map((source) => [source.role, source.id]))

    for (const region of registry.regions) {
      const legacyGadmGid = dependencies.legacySuccessors[region.key]
      const candidates = await tx.region.findMany({
        where: { OR: [{ canonicalKey: region.key }, ...(legacyGadmGid ? [{ gadmGid: legacyGadmGid }] : [])] },
        select: { id: true, canonicalKey: true },
      })
      if (new Set(candidates.map((candidate) => candidate.id)).size > 1) {
        throw new Error(`canonical and legacy Region rows conflict for ${region.key}`)
      }
      const current = candidates[0]
      const applicationRegion = current
        ? await tx.region.update({
            where: { id: current.id },
            data: { canonicalKey: region.key, countryCode: registry.registry.countryCode, name: region.displayName, higher: `Deutschland › ${region.stateName}` },
          })
        : await tx.region.create({
            data: { canonicalKey: region.key, countryCode: registry.registry.countryCode, name: region.displayName, higher: `Deutschland › ${region.stateName}`, status: 'unprepared' },
          })
      if (current?.canonicalKey === null) legacyRegionsReused += 1

      const entryId = stableId('entry', registry.registry.key, region.key)
      await tx.regionRegistryEntry.create({
        data: {
          id: entryId,
          registryVersionId: registry.registry.key,
          sourceId: sourceByRole.get('regions')!,
          regionId: applicationRegion.id,
          sourceCode: region.sourceKey,
          sourceName: region.sourceName,
          displayName: region.displayName,
          stateCode: region.stateCode,
          stateName: region.stateName,
        },
      })

      const normalizedAliases = new Map<string, { name: string; kind: RegionAliasKind }>()
      for (const name of region.aliases) {
        const normalizedName = normalizeRegionAlias(name)
        if (!normalizedAliases.has(normalizedName)) normalizedAliases.set(normalizedName, { name, kind: aliasKind(region, name) })
      }
      await tx.regionRegistryAlias.createMany({
        data: [...normalizedAliases.entries()].map(([normalizedName, alias]) => ({
          id: stableId('alias', entryId, normalizedName),
          registryEntryId: entryId,
          name: alias.name,
          normalizedName,
          kind: alias.kind,
        })),
      })
      await tx.regionSourceUnit.createMany({
        data: region.kreisUnits.map((unit) => ({
          id: stableId('unit', registry.registry.key, unit.key),
          registryVersionId: registry.registry.key,
          registryEntryId: entryId,
          sourceId: sourceByRole.get('kreisUnits')!,
          canonicalKey: unit.key,
          sourceCode: unit.ags,
          name: unit.name,
          kind: unit.type,
        })),
      })
    }

    if (mapping) await addQueryMappings(tx, registry, mapping)
    const [entries, units] = await Promise.all([
      tx.regionRegistryEntry.count({ where: { registryVersionId: registry.registry.key } }),
      tx.regionSourceUnit.count({ where: { registryVersionId: registry.registry.key } }),
    ])
    if (entries !== registry.registry.counts.regions || units !== registry.registry.counts.kreisUnits) {
      throw new Error(`registry import count mismatch: ${entries} regions, ${units} source units`)
    }
    return { created: true, legacyRegionsReused }
  }, { maxWait: 10_000, timeout: 120_000 })

  const counts = await registryCounts(db, registry.registry.key)
  log(outcome.created
    ? `imported ${counts.regions} regions, ${counts.sourceUnits} source units and ${counts.queryUnits} query units`
    : `registry ${registry.registry.key} already present; verified ${counts.regions} regions and ${counts.sourceUnits} source units`)
  return { registryId: registry.registry.key, ...outcome, ...counts }
}
