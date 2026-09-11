/** Pure relational target planning for the reviewed Germany catalogue cutover. */
import { canonicalContent } from './catalogue-gallery-transfer'
import {
  CATALOGUE_APPLY_ORDER,
  CATALOGUE_PERSONAL_PROTECTION_TABLES,
  buildReviewedGalleryPlan,
  catalogueMutationKey,
  cataloguePostgresTimestamp,
  catalogueProtectionScope,
  catalogueTargetPlanFingerprint,
  catalogueTargetSnapshotFingerprint,
  type CatalogueProtectionScope,
  type CatalogueTargetPlan,
  type CatalogueTargetRow,
  type CatalogueTargetTable,
  type PlannedCatalogueRowMutation,
  type TargetCatalogueSnapshot,
  type TargetGalleryReview,
} from './catalogue-import-plan'
import type { ValidatedCatalogueImport } from './catalogue-import-validation'
import { LEGACY_REGION_SUCCESSORS } from '../src/server/regionCompatibility'

type Row = Record<string, unknown>

const SOURCE_TABLES = [
  'Region', 'RegionRegistryVersion', 'RegionRegistrySource', 'RegionRegistryEntry',
  'RegionRegistryAlias', 'RegionSourceUnit', 'RegionQueryUnit', 'Taxon', 'CatalogueVersion',
  'CatalogueRegionBuild', 'CataloguePlausibility', 'CatalogueLookalike', 'CatalogueTaxon',
  'CatalogueTaxonomyResolution', 'Asset', 'TaxonEnrichmentWork',
] as const
const TARGET_RICH_FIELDS = ['iucn', 'tags', 'intro', 'facts', 'factsAt', 'namePath', 'contentAt'] as const
const RETIRED_LEGACY_GADM = new Set(Object.entries(LEGACY_REGION_SUCCESSORS)
  .filter(([, successor]) => successor === null).map(([gadm]) => gadm))

// Scalar database images, unlike nested provenance/fingerprint documents, must exactly match
// PostgreSQL's timestamp-without-time-zone JSON representation used by checked CAS reads.
const TIMESTAMP_COLUMNS = new Set([
  'createdAt', 'updatedAt', 'refreshedAt', 'importedAt', 'activatedAt', 'downloadedAt',
  'reviewedAt', 'startedAt', 'generatedAt', 'auditedAt', 'executionExpiresAt',
  'leaseExpiresAt', 'completedAt', 'resolvedAt', 'factsAt', 'contentAt',
])
function databaseImage(row: CatalogueTargetRow): CatalogueTargetRow {
  return Object.fromEntries(Object.entries(detached(row)).map(([column, value]) => {
    if (value === null) return [column, value]
    if (TIMESTAMP_COLUMNS.has(column)) return [column, cataloguePostgresTimestamp(value, column)]
    if (column === 'topicDate') {
      const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? cataloguePostgresTimestamp(`${value}T00:00:00Z`, column).slice(0, 10)
        : cataloguePostgresTimestamp(value, column).slice(0, 10)
      return [column, date]
    }
    return [column, value]
  }))
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value) throw new Error(`${label} must be a non-empty string`)
  return value
}
function requiredInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value)) throw new Error(`${label} must be a safe integer`)
  return value as number
}
function sourceRows(source: ValidatedCatalogueImport, table: (typeof SOURCE_TABLES)[number]): readonly Row[] {
  const value = source.tables.get(table)
  if (!value) throw new Error(`validated source is missing ${table}`)
  return value
}
function targetRows(target: TargetCatalogueSnapshot, table: string): readonly CatalogueTargetRow[] {
  return target.tables.get(table) ?? []
}
function keyText(table: CatalogueTargetTable, row: CatalogueTargetRow) {
  return canonicalContent(catalogueMutationKey(table, row))
}
function indexRows(table: CatalogueTargetTable, input: readonly CatalogueTargetRow[]) {
  const result = new Map<string, CatalogueTargetRow>()
  for (const row of input) {
    const key = keyText(table, row)
    if (result.has(key)) throw new Error(`target snapshot has duplicate ${table} primary key ${key}`)
    result.set(key, row)
  }
  return result
}
function uniqueIndex(input: readonly CatalogueTargetRow[], field: string, label: string, nullable = false) {
  const result = new Map<string | number, CatalogueTargetRow>()
  for (const row of input) {
    const value = row[field]
    if (nullable && value === null) continue
    if ((typeof value !== 'string' || !value) && !Number.isSafeInteger(value)) throw new Error(`${label}.${field} is invalid`)
    const key = value as string | number
    if (result.has(key)) throw new Error(`${label} has duplicate ${field} ${String(key)}`)
    result.set(key, row)
  }
  return result
}
function nonempty(value: unknown) {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return Boolean(value.trim())
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value as object).length > 0
  return true
}
function stringRecord(value: unknown, label: string) {
  if (value === null) return {} as Record<string, string>
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object or null`)
  const result: Record<string, string> = {}
  for (const [language, name] of Object.entries(value)) {
    if (typeof name !== 'string') throw new Error(`${label}.${language} must be a string`)
    result[language] = name
  }
  return result
}
function supportedRegionalProse(value: unknown): { version: 1; regions: Record<string, unknown> } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const prose = value as Row
  if (prose.version !== 1 || !prose.regions || typeof prose.regions !== 'object' || Array.isArray(prose.regions)) return null
  return { version: 1, regions: prose.regions as Record<string, unknown> }
}
function remapProseRegions(
  regions: Readonly<Record<string, unknown>>,
  mapRegion: (id: string) => string,
  label: string,
) {
  const remapped: Record<string, unknown> = {}
  for (const [id, prose] of Object.entries(regions)) {
    const mapped = mapRegion(id)
    if (Object.hasOwn(remapped, mapped) && canonicalContent(remapped[mapped]) !== canonicalContent(prose)) {
      throw new Error(`${label} maps conflicting prose onto Region ${mapped}`)
    }
    remapped[mapped] = prose
  }
  return remapped
}
function mappedProse(
  sourceValue: unknown,
  targetValue: unknown,
  regionIdBySourceId: ReadonlyMap<string, string>,
  targetRegionRemap: ReadonlyMap<string, string | null>,
) {
  const source = supportedRegionalProse(sourceValue)
  // Validate source-side identity projection even when an unsupported rich target shape wins.
  // Otherwise conflicting source keys could escape the fail-closed remapping contract merely
  // because there is no compatible target structure to merge them into.
  const mappedSource = source
    ? remapProseRegions(source.regions, (id) => regionIdBySourceId.get(id) ?? id, 'source Taxon.prose')
    : {}
  if (!nonempty(targetValue)) {
    if (!source) return sourceValue
    return { version: 1, regions: mappedSource }
  }
  const target = supportedRegionalProse(targetValue)
  // An unsupported rich target shape is owner content. Never reinterpret or partially rewrite it.
  if (!target) return targetValue
  const mappedTarget = remapProseRegions(target.regions, (id) => {
    const mapped = targetRegionRemap.has(id) ? targetRegionRemap.get(id) : id
    // Retired/no-successor and unrelated keys remain owner content; only an explicit successor moves.
    return mapped ?? id
  }, 'target Taxon.prose')
  // Existing target prose remains the richer authority when both sources address the same region.
  return { version: 1, regions: { ...mappedSource, ...mappedTarget } }
}
function immutableMap<K, V>(source: Map<K, V>): ReadonlyMap<K, V> {
  const view: ReadonlyMap<K, V> = Object.freeze({
    get size() { return source.size },
    get: (key: K) => source.get(key), has: (key: K) => source.has(key),
    keys: () => source.keys(), values: () => source.values(), entries: () => source.entries(),
    [Symbol.iterator]: () => source[Symbol.iterator](),
    forEach: (callback: (value: V, key: K, map: ReadonlyMap<K, V>) => void, thisArg?: unknown) =>
      source.forEach((value, key) => callback.call(thisArg, value, key, view)),
  })
  return view
}
function deepFreeze<T>(value: T, seen = new Set<object>()): T {
  if (!value || typeof value !== 'object' || seen.has(value as object)) return value
  seen.add(value as object)
  for (const child of Object.values(value as object)) deepFreeze(child, seen)
  return Object.freeze(value)
}
function detached<T>(value: T): T {
  return JSON.parse(canonicalContent(value)) as T
}

function regionRow(source: Row, id: string, createdAt: unknown): CatalogueTargetRow {
  return {
    id, gadmGid: source.gadmGid, canonicalKey: source.canonicalKey, countryCode: source.countryCode,
    name: source.name, higher: source.higher, monthTotals: source.monthTotals, pickerSummary: source.pickerSummary,
    status: source.status, error: source.error, refreshedAt: source.refreshedAt, createdAt,
  }
}
function registryVersionRow(source: Row, active: boolean, activatedAt: unknown): CatalogueTargetRow {
  return {
    id: source.id, countryCode: source.countryCode, version: source.version, artifactSha256: source.artifactSha256,
    expectedRegions: source.expectedRegions, expectedSourceUnits: source.expectedSourceUnits,
    active, importedAt: source.importedAt, activatedAt,
  }
}
function registrySourceRow(source: Row): CatalogueTargetRow {
  return {
    id: source.id, registryVersionId: source.registryVersionId, role: source.role, name: source.name,
    url: source.url, topicDate: source.topicDate, downloadedAt: source.downloadedAt, sha256: source.sha256,
    licenceId: source.licenceId, licenceUrl: source.licenceUrl, attribution: source.attribution, metadata: source.metadata,
  }
}
function registryEntryRow(source: Row, regionId: string): CatalogueTargetRow {
  return {
    id: source.id, registryVersionId: source.registryVersionId, sourceId: source.sourceId, regionId,
    sourceCode: source.sourceCode, sourceName: source.sourceName, displayName: source.displayName,
    stateCode: source.stateCode, stateName: source.stateName,
  }
}
function registryAliasRow(source: Row): CatalogueTargetRow {
  return { id: source.id, registryEntryId: source.registryEntryId, kind: source.kind, name: source.name, normalizedName: source.normalizedName }
}
function regionSourceUnitRow(source: Row): CatalogueTargetRow {
  return {
    id: source.id, registryVersionId: source.registryVersionId, registryEntryId: source.registryEntryId,
    sourceId: source.sourceId, canonicalKey: source.canonicalKey, sourceCode: source.sourceCode, name: source.name, kind: source.kind,
  }
}
function regionQueryUnitRow(source: Row): CatalogueTargetRow {
  return {
    id: source.id, registryVersionId: source.registryVersionId, sourceUnitId: source.sourceUnitId, sourceId: source.sourceId,
    provider: source.provider, providerVersion: source.providerVersion, providerKey: source.providerKey,
    reviewStatus: source.reviewStatus, reviewedAt: source.reviewedAt, evidence: source.evidence,
  }
}
function taxonRow(
  source: Row,
  target: CatalogueTargetRow | null,
  id: string,
  regionIdBySourceId: ReadonlyMap<string, string>,
  targetRegionRemap: ReadonlyMap<string, string | null>,
): CatalogueTargetRow {
  const commonNames = stringRecord(source.commonNames, `source Taxon ${String(source.id)}.commonNames`)
  if (target) {
    const existing = stringRecord(target.commonNames, `target Taxon ${id}.commonNames`)
    for (const [language, name] of Object.entries(existing)) if (name.trim()) commonNames[language] = name
  }
  const rich = Object.fromEntries(TARGET_RICH_FIELDS.map((field) =>
    [field, target && nonempty(target[field]) ? target[field] : source[field]]))
  return {
    id, gbifKey: source.gbifKey,
    wikidataId: target && nonempty(target.wikidataId) ? target.wikidataId : source.wikidataId,
    sciName: source.sciName, commonNames, rank: source.rank, tile: source.tile,
    class: source.class, order: source.order, genus: source.genus,
    iucn: rich.iucn, tags: rich.tags, intro: rich.intro, facts: rich.facts, factsAt: rich.factsAt,
    prose: mappedProse(source.prose, target?.prose, regionIdBySourceId, targetRegionRemap),
    namePath: rich.namePath, contentAt: rich.contentAt, updatedAt: target?.updatedAt ?? source.updatedAt,
  }
}
function catalogueVersionRow(source: Row, status: string, activatedAt: unknown): CatalogueTargetRow {
  return {
    id: source.id, countryCode: source.countryCode, runKey: source.runKey, registryVersionId: source.registryVersionId,
    inputFingerprint: source.inputFingerprint, sourceFingerprint: source.sourceFingerprint,
    responseFingerprint: source.responseFingerprint, unionFingerprint: source.unionFingerprint,
    plausibleRulesVersion: source.plausibleRulesVersion, tileMappingVersion: source.tileMappingVersion,
    habitatRulesVersion: 0, habitatSource: null, observationWindowVersion: source.observationWindowVersion,
    yearFrom: source.yearFrom, yearTo: source.yearTo, occurrencePredicates: source.occurrencePredicates,
    status, expectedRegions: source.expectedRegions, completedRegions: source.completedRegions, unionTaxa: source.unionTaxa,
    startedAt: source.startedAt, generatedAt: source.generatedAt, auditedAt: source.auditedAt,
    activatedAt, executionOwner: null, executionExpiresAt: null, updatedAt: source.updatedAt,
  }
}
function retiredCatalogueVersionRow(source: CatalogueTargetRow): CatalogueTargetRow {
  return {
    id: source.id, countryCode: source.countryCode, runKey: source.runKey, registryVersionId: source.registryVersionId,
    inputFingerprint: source.inputFingerprint, sourceFingerprint: source.sourceFingerprint,
    responseFingerprint: source.responseFingerprint, unionFingerprint: source.unionFingerprint,
    plausibleRulesVersion: source.plausibleRulesVersion, tileMappingVersion: source.tileMappingVersion,
    habitatRulesVersion: source.habitatRulesVersion, habitatSource: source.habitatSource,
    observationWindowVersion: source.observationWindowVersion, yearFrom: source.yearFrom, yearTo: source.yearTo,
    occurrencePredicates: source.occurrencePredicates, status: 'retired', expectedRegions: source.expectedRegions,
    completedRegions: source.completedRegions, unionTaxa: source.unionTaxa, startedAt: source.startedAt,
    generatedAt: source.generatedAt, auditedAt: source.auditedAt, activatedAt: source.activatedAt,
    executionOwner: source.executionOwner, executionExpiresAt: source.executionExpiresAt, updatedAt: source.updatedAt,
  }
}
function catalogueBuildRow(source: Row): CatalogueTargetRow {
  return {
    id: source.id, catalogueVersionId: source.catalogueVersionId, registryVersionId: source.registryVersionId,
    registryEntryId: source.registryEntryId, status: source.status, attempts: source.attempts,
    leaseOwner: source.leaseOwner, leaseExpiresAt: source.leaseExpiresAt, startedAt: source.startedAt,
    completedAt: source.completedAt, error: source.error, totalObservations: source.totalObservations,
    monthTotals: source.monthTotals, regionSize: source.regionSize, nowCounts: source.nowCounts,
    perTile: source.perTile, rejectedTaxa: source.rejectedTaxa, habitatSummary: null,
    requestStats: source.requestStats, responseFingerprint: source.responseFingerprint,
    setFingerprint: source.setFingerprint, createdAt: source.createdAt, updatedAt: source.updatedAt,
  }
}
function cataloguePlausibilityRow(source: Row, taxonId: string): CatalogueTargetRow {
  return { id: source.id, regionBuildId: source.regionBuildId, taxonId, obs: source.obs, monthShare: source.monthShare, peak: source.peak, words: source.words }
}
function catalogueLookalikeRow(source: Row, taxonId: string, siblingId: string): CatalogueTargetRow {
  return { id: source.id, regionBuildId: source.regionBuildId, taxonId, siblingId }
}
function catalogueTaxonRow(source: Row, taxonId: string): CatalogueTargetRow {
  return { catalogueVersionId: source.catalogueVersionId, taxonId, createdAt: source.createdAt }
}
function taxonomyResolutionRow(source: Row): CatalogueTargetRow {
  return {
    catalogueVersionId: source.catalogueVersionId, sourceKey: source.sourceKey, record: source.record,
    recordFingerprint: source.recordFingerprint, acceptedKey: source.acceptedKey,
    rejectionReason: source.rejectionReason, resolvedAt: source.resolvedAt,
  }
}
function enrichmentWorkRow(source: Row, taxonId: string): CatalogueTargetRow {
  return {
    taxonId, kind: source.kind, version: source.version, status: source.status, attempts: source.attempts,
    leaseOwner: source.leaseOwner, leaseExpiresAt: source.leaseExpiresAt, startedAt: source.startedAt,
    completedAt: source.completedAt, error: source.error, resultSummary: source.resultSummary,
    sourceFingerprint: source.sourceFingerprint, createdAt: source.createdAt, updatedAt: source.updatedAt,
  }
}
function livePlausibilityRow(source: Row, id: string, taxonId: string, regionId: string): CatalogueTargetRow {
  return { id, taxonId, regionId, obs: source.obs, monthShare: source.monthShare, peak: source.peak, words: source.words }
}
function liveLookalikeRow(taxonId: string, regionId: string, siblingId: string): CatalogueTargetRow {
  return { taxonId, regionId, siblingId }
}
function filterRow(source: CatalogueTargetRow, regionId: string | null, regionIds: readonly string[]): CatalogueTargetRow {
  return {
    id: source.id, identityId: source.identityId, regionId, regionIds,
    tiles: source.tiles, nowOnly: source.nowOnly, updatedAt: source.updatedAt,
  }
}
function addMutation(
  mutations: PlannedCatalogueRowMutation[], phase: 'materialize' | 'publish', table: CatalogueTargetTable,
  before: CatalogueTargetRow | null, after: CatalogueTargetRow | null,
) {
  if (!before && !after) return
  const key = catalogueMutationKey(table, after ?? before!)
  if (before && after && keyText(table, before) !== keyText(table, after)) throw new Error(`${table} primary key cannot change`)
  if (!before || !after || canonicalContent(before) !== canonicalContent(after)) mutations.push({ phase, table, key, before, after })
}
function addSourceMutation(
  mutations: PlannedCatalogueRowMutation[], indexes: ReadonlyMap<CatalogueTargetTable, ReadonlyMap<string, CatalogueTargetRow>>,
  table: CatalogueTargetTable, after: CatalogueTargetRow, collisionLabel = table,
) {
  const before = indexes.get(table)?.get(keyText(table, after)) ?? null
  if (before && canonicalContent(before) !== canonicalContent(after)) throw new Error(`${collisionLabel} primary key collides with different target data`)
  addMutation(mutations, 'materialize', table, before, after)
}
function phaseRank(mutation: PlannedCatalogueRowMutation) {
  return CATALOGUE_APPLY_ORDER.findIndex((entry) => entry.phase === mutation.phase && entry.table === mutation.table)
}
function sortMutations(mutations: PlannedCatalogueRowMutation[]) {
  return mutations.sort((left, right) => phaseRank(left) - phaseRank(right) ||
    canonicalContent(left.key).localeCompare(canonicalContent(right.key)) ||
    canonicalContent(left.before).localeCompare(canonicalContent(right.before)))
}
function keyedScope(table: CatalogueTargetTable, selected: readonly CatalogueTargetRow[]): CatalogueProtectionScope | null {
  if (!selected.length) return null
  return catalogueProtectionScope(table, selected, { kind: 'keys', keys: selected.map((row) => catalogueMutationKey(table, row)) })
}

/**
 * Produce an exact, deterministic, side-effect-free plan. The returned graph is detached from the
 * caller and frozen; the store still revalidates both source files and the complete target snapshot.
 */
export function planCatalogueTarget(input: {
  source: ValidatedCatalogueImport
  target: TargetCatalogueSnapshot
  gallery: TargetGalleryReview
  activationAt: string
}): CatalogueTargetPlan {
  if (!input?.source || !input.target || !input.gallery) throw new Error('catalogue source, target snapshot and gallery review are required')
  const { source, target } = input
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(input.activationAt) || !Number.isFinite(Date.parse(input.activationAt))) {
    throw new Error('target catalogue activation requires an explicit UTC timestamp')
  }
  const activationAt = cataloguePostgresTimestamp(input.activationAt)
  for (const table of SOURCE_TABLES) sourceRows(source, table)
  const sourceRegistries = sourceRows(source, 'RegionRegistryVersion')
  const sourceCatalogues = sourceRows(source, 'CatalogueVersion')
  if (sourceRegistries.length !== 1 || sourceCatalogues.length !== 1) {
    throw new Error('validated source must contain exactly one registry and catalogue version')
  }
  const registry = sourceRegistries[0]!
  const catalogue = sourceCatalogues[0]!
  const registryVersionId = requiredString(registry.id, 'RegionRegistryVersion.id')
  const catalogueVersionId = requiredString(catalogue.id, 'CatalogueVersion.id')
  if (registryVersionId !== source.pins.registryVersionId || catalogueVersionId !== source.pins.catalogueId ||
    catalogue.registryVersionId !== registryVersionId || catalogue.countryCode !== 'DE' || registry.countryCode !== 'DE') {
    throw new Error('validated source catalogue identity is inconsistent')
  }

  const targetIndexes = new Map<CatalogueTargetTable, ReadonlyMap<string, CatalogueTargetRow>>()
  for (const table of Object.keys(CATALOGUE_APPLY_ORDER.reduce<Record<string, true>>((all, entry) => ({ ...all, [entry.table]: true }), {})) as CatalogueTargetTable[]) {
    targetIndexes.set(table, indexRows(table, targetRows(target, table)))
  }
  const mutations: PlannedCatalogueRowMutation[] = []

  const targetRegionRows = targetRows(target, 'Region')
  const targetRegionById = uniqueIndex(targetRegionRows, 'id', 'target Region')
  const targetRegionByCanonical = uniqueIndex(targetRegionRows, 'canonicalKey', 'target Region', true)
  const targetRegionByGadm = uniqueIndex(targetRegionRows, 'gadmGid', 'target Region', true)
  const sourceRegions = sourceRows(source, 'Region')
  const sourceCanonical = uniqueIndex(sourceRegions, 'canonicalKey', 'source Region')
  uniqueIndex(sourceRegions, 'gadmGid', 'source Region', true)
  if (sourceCanonical.size !== sourceRegions.length) throw new Error('source Region canonical keys are incomplete')
  const regionIdBySourceId = new Map<string, string>()
  const mappedTargetRegionIds = new Set<string>()
  for (const sourceRegion of sourceRegions) {
    const sourceId = requiredString(sourceRegion.id, 'source Region.id')
    const canonicalKey = requiredString(sourceRegion.canonicalKey, `source Region ${sourceId}.canonicalKey`)
    const candidates = new Map<string, CatalogueTargetRow>()
    const canonical = targetRegionByCanonical.get(canonicalKey)
    if (canonical) candidates.set(requiredString(canonical.id, 'target Region.id'), canonical)
    for (const [gadm, successor] of Object.entries(LEGACY_REGION_SUCCESSORS)) {
      if (successor !== canonicalKey) continue
      const legacy = targetRegionByGadm.get(gadm)
      if (legacy) candidates.set(requiredString(legacy.id, 'legacy Region.id'), legacy)
    }
    if (candidates.size > 1) throw new Error(`source Region ${canonicalKey} has ambiguous canonical/legacy target identities`)
    const reused = [...candidates.values()][0] ?? null
    let targetId = sourceId
    if (reused) {
      targetId = requiredString(reused.id, 'reused Region.id')
      if (mappedTargetRegionIds.has(targetId)) throw new Error(`target Region ${targetId} is mapped more than once`)
      const uuidOwner = targetRegionById.get(sourceId)
      if (uuidOwner && uuidOwner.id !== targetId) throw new Error(`mapped source Region ${sourceId} UUID belongs to another target identity`)
      const gadmOwner = typeof sourceRegion.gadmGid === 'string' ? targetRegionByGadm.get(sourceRegion.gadmGid) : null
      if (gadmOwner && gadmOwner.id !== targetId) throw new Error(`source Region ${canonicalKey} GADM identity conflicts with another target Region`)
      addMutation(mutations, 'materialize', 'Region', reused, regionRow(sourceRegion, targetId, reused.createdAt))
    } else {
      if (targetRegionById.has(sourceId)) throw new Error(`new source Region ${sourceId} UUID collides with target data`)
      const gadm = sourceRegion.gadmGid
      if (typeof gadm === 'string' && targetRegionByGadm.has(gadm)) throw new Error(`new source Region ${canonicalKey} GADM identity collides with target data`)
      addMutation(mutations, 'materialize', 'Region', null, regionRow(sourceRegion, sourceId, sourceRegion.createdAt))
    }
    mappedTargetRegionIds.add(targetId)
    regionIdBySourceId.set(sourceId, targetId)
  }

  const targetRegionRemap = new Map<string, string | null>()
  for (const [sourceId, targetId] of regionIdBySourceId) {
    targetRegionRemap.set(sourceId, targetId)
    targetRegionRemap.set(targetId, targetId)
  }
  for (const targetRegion of targetRegionRows) {
    const id = requiredString(targetRegion.id, 'target Region.id')
    const canonical = typeof targetRegion.canonicalKey === 'string' ? sourceCanonical.get(targetRegion.canonicalKey) : null
    if (canonical) targetRegionRemap.set(id, regionIdBySourceId.get(requiredString(canonical.id, 'source Region.id'))!)
    const gadm = targetRegion.gadmGid
    if (typeof gadm !== 'string' || !(gadm in LEGACY_REGION_SUCCESSORS)) continue
    const successor = LEGACY_REGION_SUCCESSORS[gadm as keyof typeof LEGACY_REGION_SUCCESSORS]
    if (successor === null) targetRegionRemap.set(id, null)
    else {
      const sourceSuccessor = sourceCanonical.get(successor)
      if (!sourceSuccessor) throw new Error(`reviewed legacy successor ${successor} is absent from the source registry`)
      targetRegionRemap.set(id, regionIdBySourceId.get(requiredString(sourceSuccessor.id, 'source successor Region.id'))!)
    }
  }

  const targetTaxonRows = targetRows(target, 'Taxon')
  const targetTaxonById = uniqueIndex(targetTaxonRows, 'id', 'target Taxon')
  const targetTaxonByGbif = uniqueIndex(targetTaxonRows, 'gbifKey', 'target Taxon')
  const sourceTaxonRows = sourceRows(source, 'Taxon')
  uniqueIndex(sourceTaxonRows, 'id', 'source Taxon')
  uniqueIndex(sourceTaxonRows, 'gbifKey', 'source Taxon')
  const taxonIdBySourceId = new Map<string, string>()
  const mappedTargetTaxonIds = new Set<string>()
  const wikidataOwners = new Map<string, number>()
  for (const targetTaxon of targetTaxonRows) {
    if (!nonempty(targetTaxon.wikidataId)) continue
    const wikidata = requiredString(targetTaxon.wikidataId, 'target Taxon.wikidataId')
    const gbif = requiredInteger(targetTaxon.gbifKey, 'target Taxon.gbifKey')
    const existing = wikidataOwners.get(wikidata)
    if (existing !== undefined && existing !== gbif) throw new Error(`target Wikidata identity ${wikidata} belongs to multiple GBIF taxa`)
    wikidataOwners.set(wikidata, gbif)
  }
  for (const sourceTaxon of sourceTaxonRows) {
    const sourceId = requiredString(sourceTaxon.id, 'source Taxon.id')
    const gbif = requiredInteger(sourceTaxon.gbifKey, `source Taxon ${sourceId}.gbifKey`)
    const reused = targetTaxonByGbif.get(gbif) ?? null
    const targetId = reused ? requiredString(reused.id, 'reused Taxon.id') : sourceId
    const uuidOwner = targetTaxonById.get(sourceId)
    if (uuidOwner && uuidOwner.id !== targetId) throw new Error(`mapped source Taxon ${sourceId} UUID belongs to another target identity`)
    if (!reused && uuidOwner) throw new Error(`new source Taxon ${sourceId} UUID collides with target data`)
    if (mappedTargetTaxonIds.has(targetId)) throw new Error(`target Taxon ${targetId} is mapped more than once`)
    const chosenWikidata = reused && nonempty(reused.wikidataId) ? reused.wikidataId : sourceTaxon.wikidataId
    if (nonempty(chosenWikidata)) {
      const wikidata = requiredString(chosenWikidata, `Taxon ${sourceId}.wikidataId`)
      const owner = wikidataOwners.get(wikidata)
      if (owner !== undefined && owner !== gbif) throw new Error(`Wikidata identity ${wikidata} conflicts across GBIF taxa`)
      wikidataOwners.set(wikidata, gbif)
    }
    taxonIdBySourceId.set(sourceId, targetId)
    mappedTargetTaxonIds.add(targetId)
  }
  for (const sourceTaxon of sourceTaxonRows) {
    const sourceId = requiredString(sourceTaxon.id, 'source Taxon.id')
    const targetId = taxonIdBySourceId.get(sourceId)!
    const before = targetTaxonById.get(targetId) ?? null
    addMutation(mutations, 'materialize', 'Taxon', before,
      taxonRow(sourceTaxon, before, targetId, regionIdBySourceId, targetRegionRemap))
  }

  const targetRegistryRows = targetRows(target, 'RegionRegistryVersion')
  const targetRegistryById = uniqueIndex(targetRegistryRows, 'id', 'target RegionRegistryVersion')
  const targetRegistryVersionIdentity = new Map(targetRegistryRows.map((row) => [`${String(row.countryCode)}\0${String(row.version)}`, row]))
  if (targetRegistryVersionIdentity.size !== targetRegistryRows.length) throw new Error('target registry country/version identity is ambiguous')
  if (targetRegistryById.has(registryVersionId) || targetRegistryVersionIdentity.has(`${String(registry.countryCode)}\0${String(registry.version)}`)) {
    throw new Error('source registry version conflicts with existing target history')
  }
  addMutation(mutations, 'materialize', 'RegionRegistryVersion', null, registryVersionRow(registry, false, null))
  for (const row of sourceRows(source, 'RegionRegistrySource')) addSourceMutation(mutations, targetIndexes, 'RegionRegistrySource', registrySourceRow(row))
  for (const row of sourceRows(source, 'RegionRegistryEntry')) {
    const mapped = regionIdBySourceId.get(requiredString(row.regionId, 'RegionRegistryEntry.regionId'))
    if (!mapped) throw new Error('RegionRegistryEntry has no mapped Region')
    addSourceMutation(mutations, targetIndexes, 'RegionRegistryEntry', registryEntryRow(row, mapped))
  }
  for (const row of sourceRows(source, 'RegionRegistryAlias')) addSourceMutation(mutations, targetIndexes, 'RegionRegistryAlias', registryAliasRow(row))
  for (const row of sourceRows(source, 'RegionSourceUnit')) addSourceMutation(mutations, targetIndexes, 'RegionSourceUnit', regionSourceUnitRow(row))
  for (const row of sourceRows(source, 'RegionQueryUnit')) addSourceMutation(mutations, targetIndexes, 'RegionQueryUnit', regionQueryUnitRow(row))

  const targetCatalogueRows = targetRows(target, 'CatalogueVersion')
  const targetCatalogueById = uniqueIndex(targetCatalogueRows, 'id', 'target CatalogueVersion')
  const targetRunIdentity = new Map(targetCatalogueRows.map((row) => [`${String(row.countryCode)}\0${String(row.runKey)}`, row]))
  if (targetRunIdentity.size !== targetCatalogueRows.length) throw new Error('target catalogue country/run identity is ambiguous')
  if (targetCatalogueById.has(catalogueVersionId) || targetRunIdentity.has(`${String(catalogue.countryCode)}\0${String(catalogue.runKey)}`)) {
    throw new Error('source catalogue version conflicts with existing target history')
  }
  const materializedCatalogue = catalogueVersionRow(catalogue, 'audited', null)
  addMutation(mutations, 'materialize', 'CatalogueVersion', null, materializedCatalogue)
  for (const row of sourceRows(source, 'CatalogueRegionBuild')) addSourceMutation(mutations, targetIndexes, 'CatalogueRegionBuild', catalogueBuildRow(row))
  for (const row of sourceRows(source, 'CatalogueTaxon')) {
    const taxonId = taxonIdBySourceId.get(requiredString(row.taxonId, 'CatalogueTaxon.taxonId'))
    if (!taxonId) throw new Error('CatalogueTaxon has no mapped Taxon')
    addSourceMutation(mutations, targetIndexes, 'CatalogueTaxon', catalogueTaxonRow(row, taxonId))
  }
  for (const row of sourceRows(source, 'CatalogueTaxonomyResolution')) addSourceMutation(mutations, targetIndexes, 'CatalogueTaxonomyResolution', taxonomyResolutionRow(row))
  for (const row of sourceRows(source, 'CataloguePlausibility')) {
    const taxonId = taxonIdBySourceId.get(requiredString(row.taxonId, 'CataloguePlausibility.taxonId'))
    if (!taxonId) throw new Error('CataloguePlausibility has no mapped Taxon')
    addSourceMutation(mutations, targetIndexes, 'CataloguePlausibility', cataloguePlausibilityRow(row, taxonId))
  }
  for (const row of sourceRows(source, 'CatalogueLookalike')) {
    const taxonId = taxonIdBySourceId.get(requiredString(row.taxonId, 'CatalogueLookalike.taxonId'))
    const siblingId = taxonIdBySourceId.get(requiredString(row.siblingId, 'CatalogueLookalike.siblingId'))
    if (!taxonId || !siblingId) throw new Error('CatalogueLookalike has no mapped Taxon')
    addSourceMutation(mutations, targetIndexes, 'CatalogueLookalike', catalogueLookalikeRow(row, taxonId, siblingId))
  }
  for (const row of sourceRows(source, 'TaxonEnrichmentWork')) {
    const taxonId = taxonIdBySourceId.get(requiredString(row.taxonId, 'TaxonEnrichmentWork.taxonId'))
    if (!taxonId) throw new Error('TaxonEnrichmentWork has no mapped Taxon')
    const after = enrichmentWorkRow(row, taxonId)
    const before = targetIndexes.get('TaxonEnrichmentWork')?.get(keyText('TaxonEnrichmentWork', after)) ?? null
    addMutation(mutations, 'materialize', 'TaxonEnrichmentWork', before, after)
  }

  const gallery = buildReviewedGalleryPlan({
    catalogueVersionId, taxonIdBySourceId, sourceAssets: sourceRows(source, 'Asset'), target, review: input.gallery,
  })
  mutations.push(...gallery.assetMutations, ...gallery.receiptMutations, ...gallery.visibilityMutations)

  const entryById = uniqueIndex(sourceRows(source, 'RegionRegistryEntry'), 'id', 'source RegionRegistryEntry')
  const buildById = uniqueIndex(sourceRows(source, 'CatalogueRegionBuild'), 'id', 'source CatalogueRegionBuild')
  const liveScopeRegionIds = new Set<string>(mappedTargetRegionIds)
  for (const targetRegion of targetRegionRows) {
    if (typeof targetRegion.gadmGid === 'string' && RETIRED_LEGACY_GADM.has(targetRegion.gadmGid)) {
      liveScopeRegionIds.add(requiredString(targetRegion.id, 'retired legacy Region.id'))
    }
  }
  const targetLivePlausibility = targetRows(target, 'Plausibility')
  const currentPlausibilityByNatural = new Map<string, CatalogueTargetRow>()
  const currentPlausibilityById = uniqueIndex(targetLivePlausibility, 'id', 'target Plausibility')
  for (const row of targetLivePlausibility) {
    const natural = `${requiredString(row.taxonId, 'Plausibility.taxonId')}\0${requiredString(row.regionId, 'Plausibility.regionId')}`
    if (currentPlausibilityByNatural.has(natural)) throw new Error(`target Plausibility has duplicate natural identity ${natural}`)
    currentPlausibilityByNatural.set(natural, row)
  }
  const desiredPlausibility = new Map<string, CatalogueTargetRow>()
  for (const sourceRow of sourceRows(source, 'CataloguePlausibility')) {
    const build = buildById.get(requiredString(sourceRow.regionBuildId, 'CataloguePlausibility.regionBuildId'))
    if (!build) throw new Error('CataloguePlausibility has no source build')
    const entry = entryById.get(requiredString(build.registryEntryId, 'CatalogueRegionBuild.registryEntryId'))
    if (!entry) throw new Error('CatalogueRegionBuild has no source registry entry')
    const regionId = regionIdBySourceId.get(requiredString(entry.regionId, 'RegionRegistryEntry.regionId'))!
    const taxonId = taxonIdBySourceId.get(requiredString(sourceRow.taxonId, 'CataloguePlausibility.taxonId'))!
    const natural = `${taxonId}\0${regionId}`
    if (desiredPlausibility.has(natural)) throw new Error(`source catalogue has duplicate live Plausibility identity ${natural}`)
    const before = currentPlausibilityByNatural.get(natural) ?? null
    const sourceId = requiredString(sourceRow.id, 'CataloguePlausibility.id')
    const id = before ? requiredString(before.id, 'Plausibility.id') : sourceId
    if (!before && currentPlausibilityById.has(id)) throw new Error(`new live Plausibility ${id} UUID collides with target data`)
    desiredPlausibility.set(natural, livePlausibilityRow(sourceRow, id, taxonId, regionId))
  }
  for (const row of targetLivePlausibility) {
    const regionId = requiredString(row.regionId, 'Plausibility.regionId')
    if (!liveScopeRegionIds.has(regionId)) continue
    const natural = `${requiredString(row.taxonId, 'Plausibility.taxonId')}\0${regionId}`
    if (!desiredPlausibility.has(natural)) addMutation(mutations, 'publish', 'Plausibility', row, null)
  }
  for (const [natural, after] of desiredPlausibility) {
    addMutation(mutations, 'publish', 'Plausibility', currentPlausibilityByNatural.get(natural) ?? null, after)
  }

  const targetLiveLookalike = targetRows(target, 'Lookalike')
  const currentLookalike = new Map<string, CatalogueTargetRow>()
  for (const row of targetLiveLookalike) {
    const natural = `${requiredString(row.taxonId, 'Lookalike.taxonId')}\0${requiredString(row.regionId, 'Lookalike.regionId')}\0${requiredString(row.siblingId, 'Lookalike.siblingId')}`
    if (currentLookalike.has(natural)) throw new Error(`target Lookalike has duplicate identity ${natural}`)
    currentLookalike.set(natural, row)
  }
  const desiredLookalike = new Map<string, CatalogueTargetRow>()
  for (const sourceRow of sourceRows(source, 'CatalogueLookalike')) {
    const build = buildById.get(requiredString(sourceRow.regionBuildId, 'CatalogueLookalike.regionBuildId'))
    if (!build) throw new Error('CatalogueLookalike has no source build')
    const entry = entryById.get(requiredString(build.registryEntryId, 'CatalogueRegionBuild.registryEntryId'))
    if (!entry) throw new Error('CatalogueRegionBuild has no source registry entry')
    const regionId = regionIdBySourceId.get(requiredString(entry.regionId, 'RegionRegistryEntry.regionId'))!
    const taxonId = taxonIdBySourceId.get(requiredString(sourceRow.taxonId, 'CatalogueLookalike.taxonId'))!
    const siblingId = taxonIdBySourceId.get(requiredString(sourceRow.siblingId, 'CatalogueLookalike.siblingId'))!
    const natural = `${taxonId}\0${regionId}\0${siblingId}`
    if (desiredLookalike.has(natural)) throw new Error(`source catalogue has duplicate live Lookalike identity ${natural}`)
    desiredLookalike.set(natural, liveLookalikeRow(taxonId, regionId, siblingId))
  }
  for (const [natural, row] of currentLookalike) {
    if (!liveScopeRegionIds.has(requiredString(row.regionId, 'Lookalike.regionId'))) continue
    if (!desiredLookalike.has(natural)) addMutation(mutations, 'publish', 'Lookalike', row, null)
  }
  for (const [natural, after] of desiredLookalike) {
    addMutation(mutations, 'publish', 'Lookalike', currentLookalike.get(natural) ?? null, after)
  }

  const filterRemap = new Map<string, string | null>(targetRegionRemap)
  for (const before of targetRows(target, 'Filter')) {
    if (!Array.isArray(before.regionIds) || before.regionIds.some((id) => typeof id !== 'string')) throw new Error('target Filter.regionIds is invalid')
    const mappedIds: string[] = []
    for (const sourceId of before.regionIds) {
      const mapped = filterRemap.get(sourceId) ?? null
      if (mapped && !mappedIds.includes(mapped)) mappedIds.push(mapped)
    }
    const selected = typeof before.regionId === 'string' ? filterRemap.get(before.regionId) ?? null : null
    const active = selected && mappedIds.includes(selected) ? selected : mappedIds[0] ?? null
    addMutation(mutations, 'publish', 'Filter', before, filterRow(before, active, mappedIds))
  }

  for (const before of targetRegistryRows) {
    if (before.countryCode !== 'DE' || before.active !== true) continue
    addMutation(mutations, 'publish', 'RegionRegistryVersion', before, {
      id: before.id, countryCode: before.countryCode, version: before.version, artifactSha256: before.artifactSha256,
      expectedRegions: before.expectedRegions, expectedSourceUnits: before.expectedSourceUnits,
      active: false, importedAt: before.importedAt, activatedAt: before.activatedAt,
    })
  }
  addMutation(mutations, 'publish', 'RegionRegistryVersion', registryVersionRow(registry, false, null),
    registryVersionRow(registry, true, activationAt))
  for (const before of targetCatalogueRows) {
    if (before.countryCode === 'DE' && before.status === 'active') {
      addMutation(mutations, 'publish', 'CatalogueVersion', before, retiredCatalogueVersionRow(before))
    }
  }
  addMutation(mutations, 'publish', 'CatalogueVersion', materializedCatalogue,
    catalogueVersionRow(catalogue, 'active', activationAt))

  const mutatedKeys = new Map<string, Set<string>>()
  for (const mutation of mutations) {
    const found = mutatedKeys.get(mutation.table) ?? new Set<string>()
    found.add(canonicalContent(mutation.key))
    mutatedKeys.set(mutation.table, found)
  }
  const protectedScopes: CatalogueProtectionScope[] = CATALOGUE_PERSONAL_PROTECTION_TABLES.map((table) =>
    catalogueProtectionScope(table, targetRows(target, table)))
  protectedScopes.push(catalogueProtectionScope('CatalogueHabitatBatch', targetRows(target, 'CatalogueHabitatBatch')))
  // Every old Asset, including sounds, personal media and out-of-union references, is immutable;
  // key the scope so reviewed new Asset insertions do not change the protected row cardinality.
  const protectedAssets = keyedScope('Asset', targetRows(target, 'Asset'))
  if (protectedAssets) protectedScopes.push(protectedAssets)
  const protectedCandidates: readonly CatalogueTargetTable[] = [
    'Region', 'Taxon', 'Plausibility', 'Lookalike', 'Filter', 'RegionRegistryVersion', 'CatalogueVersion',
    'RegionRegistrySource', 'RegionRegistryEntry', 'RegionRegistryAlias', 'RegionSourceUnit', 'RegionQueryUnit',
    'CatalogueRegionBuild', 'CataloguePlausibility', 'CatalogueLookalike', 'CatalogueTaxon',
    'CatalogueTaxonomyResolution', 'TaxonEnrichmentWork', 'ReferenceGalleryReceipt', 'ReferenceAssetVisibility',
  ]
  for (const table of protectedCandidates) {
    const changed = mutatedKeys.get(table) ?? new Set<string>()
    const untouched = targetRows(target, table).filter((row) => !changed.has(keyText(table, row)))
    const scope = keyedScope(table, untouched)
    if (scope) protectedScopes.push(scope)
  }

  const orderedMutations = sortMutations(mutations).map((mutation) => ({
    phase: mutation.phase, table: mutation.table, key: detached(mutation.key),
    before: mutation.before === null ? null : databaseImage(mutation.before),
    after: mutation.after === null ? null : databaseImage(mutation.after),
  }))
  const mappings = {
    taxonIdBySourceId: immutableMap(new Map(taxonIdBySourceId)),
    regionIdBySourceId: immutableMap(new Map(regionIdBySourceId)),
    sourceAssetIdToTargetId: immutableMap(new Map(gallery.sourceAssetIdToTargetId)),
  }
  const summary = {
    sourceRegions: sourceRegions.length, sourceTaxa: sourceTaxonRows.length,
    mappedRegionIdentities: regionIdBySourceId.size, mappedTaxonIdentities: taxonIdBySourceId.size,
    materializeMutations: orderedMutations.filter((mutation) => mutation.phase === 'materialize').length,
    publishMutations: orderedMutations.filter((mutation) => mutation.phase === 'publish').length,
    protectedScopes: protectedScopes.length,
    ...gallery.summary,
  }
  const payload = {
    schemaVersion: 1 as const, catalogueVersionId, registryVersionId,
    sourceEvidence: detached(source.evidence), targetSnapshotFingerprint: catalogueTargetSnapshotFingerprint(target),
    mappings, protectedScopes, mutations: orderedMutations, summary,
  }
  return deepFreeze({ ...payload, fingerprint: catalogueTargetPlanFingerprint(payload) }) as CatalogueTargetPlan
}
