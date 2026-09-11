/** Pure target-identity and before/after planning contracts for the checked Germany cutover. */
import { canonicalContent, contentDigest } from './catalogue-gallery-transfer'
import type { ValidatedCatalogueImport } from './catalogue-import-validation'
import type { ReferenceAsset, ReferenceAssetReview, ReferenceReviewEvidence } from './reference-gallery-preservation'

export type CatalogueTargetRow = Readonly<Record<string, unknown>>
export type CatalogueMutationPhase = 'materialize' | 'publish'

export const CATALOGUE_TARGET_PRIMARY_KEYS = {
  Region: ['id'],
  RegionRegistryVersion: ['id'],
  RegionRegistrySource: ['id'],
  RegionRegistryEntry: ['id'],
  RegionRegistryAlias: ['id'],
  RegionSourceUnit: ['id'],
  RegionQueryUnit: ['id'],
  Taxon: ['id'],
  CatalogueVersion: ['id'],
  CatalogueRegionBuild: ['id'],
  CataloguePlausibility: ['id'],
  CatalogueLookalike: ['id'],
  CatalogueTaxon: ['catalogueVersionId', 'taxonId'],
  CatalogueTaxonomyResolution: ['catalogueVersionId', 'sourceKey'],
  Asset: ['id'],
  TaxonEnrichmentWork: ['taxonId', 'kind', 'version'],
  ReferenceGalleryReceipt: ['catalogueVersionId', 'taxonId'],
  ReferenceAssetVisibility: ['assetId'],
  Plausibility: ['id'],
  Lookalike: ['taxonId', 'regionId', 'siblingId'],
  Filter: ['id'],
} as const

export type CatalogueTargetTable = keyof typeof CATALOGUE_TARGET_PRIMARY_KEYS
export type CatalogueMutationKey = Readonly<Record<string, string | number>>
export type PlannedCatalogueRowMutation = Readonly<{
  phase: CatalogueMutationPhase
  table: CatalogueTargetTable
  key: CatalogueMutationKey
  before: CatalogueTargetRow | null
  after: CatalogueTargetRow | null
}>

/** A table can occur in both phases: rows are materialized before late publication flips. */
export const CATALOGUE_APPLY_ORDER: readonly Readonly<{ phase: CatalogueMutationPhase; table: CatalogueTargetTable }>[] = [
  { phase: 'materialize', table: 'Region' },
  { phase: 'materialize', table: 'RegionRegistryVersion' },
  { phase: 'materialize', table: 'RegionRegistrySource' },
  { phase: 'materialize', table: 'RegionRegistryEntry' },
  { phase: 'materialize', table: 'RegionRegistryAlias' },
  { phase: 'materialize', table: 'RegionSourceUnit' },
  { phase: 'materialize', table: 'RegionQueryUnit' },
  { phase: 'materialize', table: 'Taxon' },
  { phase: 'materialize', table: 'CatalogueVersion' },
  { phase: 'materialize', table: 'CatalogueRegionBuild' },
  { phase: 'materialize', table: 'CatalogueTaxon' },
  { phase: 'materialize', table: 'CatalogueTaxonomyResolution' },
  { phase: 'materialize', table: 'CataloguePlausibility' },
  { phase: 'materialize', table: 'CatalogueLookalike' },
  { phase: 'materialize', table: 'Asset' },
  { phase: 'materialize', table: 'TaxonEnrichmentWork' },
  { phase: 'materialize', table: 'ReferenceGalleryReceipt' },
  { phase: 'materialize', table: 'ReferenceAssetVisibility' },
  { phase: 'publish', table: 'Plausibility' },
  { phase: 'publish', table: 'Lookalike' },
  { phase: 'publish', table: 'Filter' },
  { phase: 'publish', table: 'RegionRegistryVersion' },
  { phase: 'publish', table: 'CatalogueVersion' },
] as const

export const CATALOGUE_PERSONAL_PROTECTION_TABLES = [
  'Identity', 'Passkey', 'EmailCode', 'Sighting', 'Study', 'PhotoDeletion', 'QuotaBucket', 'Interaction', 'ScanWork',
] as const

/** Fixed target snapshot surface shared by planner and store. Never derive this from object keys. */
export const CATALOGUE_TARGET_SNAPSHOT_TABLES = [
  'Identity', 'EmailCode', 'Passkey', 'Filter', 'Region', 'RegionRegistryVersion',
  'RegionRegistrySource', 'RegionRegistryEntry', 'RegionRegistryAlias', 'RegionSourceUnit',
  'RegionQueryUnit', 'CatalogueVersion', 'CatalogueRegionBuild', 'CataloguePlausibility',
  'CatalogueLookalike', 'CatalogueTaxon', 'CatalogueTaxonomyResolution', 'CatalogueHabitatBatch',
  'TaxonEnrichmentWork', 'Taxon', 'Plausibility', 'Lookalike', 'Interaction', 'Asset',
  'ReferenceAssetVisibility', 'ReferenceGalleryReceipt', 'Sighting', 'Study', 'QuotaBucket',
  'ScanWork', 'PhotoDeletion',
] as const

export type CatalogueProtectionSelector = Readonly<
  { kind: 'all' } | { kind: 'keys'; keys: readonly CatalogueMutationKey[] }
>
export type CatalogueProtectionScope = Readonly<{
  table: string
  columns: readonly string[]
  selector: CatalogueProtectionSelector
  beforeRows: number
  beforeFingerprint: string
}>

export type TargetCatalogueSnapshot = Readonly<{
  /** Complete projections loaded under one target snapshot; timestamps are ISO strings. */
  tables: ReadonlyMap<string, readonly CatalogueTargetRow[]>
}>

export type TargetReferenceReviewDraft = Readonly<{
  decision: ReferenceAssetReview['decision']
  hiddenReason: string | null
  correctedLicenceUrl: string | null
  evidence: ReferenceReviewEvidence
  evidenceFingerprint: string
}>
export type TargetReferenceReviewContext = Readonly<{
  kind: 'existing' | 'incoming'
  catalogueVersionId: string
  taxonId: string
  asset: ReferenceAsset
  /** Present when a reviewed source Asset is explicitly mapped to this retained target Asset. */
  sourceAsset: ReferenceAsset | null
}>
export type TargetGalleryReview = Readonly<{
  reviewer: string
  reviewedAt: string
  receiptEvidence: unknown
  /** Explicit provider-identity reuse only; absence means retain the source Asset as a new row. */
  reuseTargetAssetIdBySourceId: ReadonlyMap<string, string>
  reviewAsset(context: TargetReferenceReviewContext): TargetReferenceReviewDraft
}>

export type PlannedTargetGallery = Readonly<{
  sourceAssetIdToTargetId: ReadonlyMap<string, string>
  assetMutations: readonly PlannedCatalogueRowMutation[]
  receiptMutations: readonly PlannedCatalogueRowMutation[]
  visibilityMutations: readonly PlannedCatalogueRowMutation[]
  summary: Readonly<{
    sourceAssets: number
    reusedAssets: number
    insertedAssets: number
    retainedExistingAssets: number
    eligibleAssets: number
    hiddenAssets: number
    receipts: number
  }>
}>

export type CatalogueTargetMappings = Readonly<{
  taxonIdBySourceId: ReadonlyMap<string, string>
  regionIdBySourceId: ReadonlyMap<string, string>
  sourceAssetIdToTargetId: ReadonlyMap<string, string>
}>

export type CatalogueTargetPlan = Readonly<{
  schemaVersion: 1
  catalogueVersionId: string
  registryVersionId: string
  sourceEvidence: ValidatedCatalogueImport['evidence']
  targetSnapshotFingerprint: string
  mappings: CatalogueTargetMappings
  protectedScopes: readonly CatalogueProtectionScope[]
  mutations: readonly PlannedCatalogueRowMutation[]
  summary: Readonly<Record<string, number>>
  fingerprint: string
}>

export function catalogueMutationKey(table: CatalogueTargetTable, row: CatalogueTargetRow): CatalogueMutationKey {
  return Object.fromEntries(CATALOGUE_TARGET_PRIMARY_KEYS[table].map((field) => {
    const value = row[field]
    if ((typeof value !== 'string' || !value) && !Number.isSafeInteger(value)) throw new Error(`${table}.${field} is not a valid primary key`)
    return [field, value as string | number]
  }))
}

export function canonicalCatalogueTargetRows(table: CatalogueTargetTable | string, rows: readonly CatalogueTargetRow[]) {
  const fields = CATALOGUE_TARGET_PRIMARY_KEYS[table as CatalogueTargetTable]
  const key = (row: CatalogueTargetRow) => fields ? canonicalContent(Object.fromEntries(fields.map((field) => [field, row[field]]))) : canonicalContent(row)
  return [...rows].sort((left, right) => key(left).localeCompare(key(right)))
}

export const catalogueTargetRowsFingerprint = (table: CatalogueTargetTable | string, rows: readonly CatalogueTargetRow[]) =>
  contentDigest(canonicalCatalogueTargetRows(table, rows))

export function catalogueProtectionScope(table: string, rows: readonly CatalogueTargetRow[], selector: CatalogueProtectionSelector = { kind: 'all' }): CatalogueProtectionScope {
  return {
    table,
    columns: [...new Set(rows.flatMap((row) => Object.keys(row)))].sort(),
    selector,
    beforeRows: rows.length,
    beforeFingerprint: catalogueTargetRowsFingerprint(table, rows),
  }
}

const sortedMapEntries = (map: ReadonlyMap<string, string>) => [...map.entries()].sort(([left], [right]) => left.localeCompare(right))

/** Recompute the plan digest; the stored fingerprint itself is deliberately excluded. */
export function catalogueTargetPlanFingerprint(plan: Omit<CatalogueTargetPlan, 'fingerprint'> | CatalogueTargetPlan) {
  return contentDigest({
    schemaVersion: plan.schemaVersion,
    catalogueVersionId: plan.catalogueVersionId,
    registryVersionId: plan.registryVersionId,
    sourceEvidence: plan.sourceEvidence,
    targetSnapshotFingerprint: plan.targetSnapshotFingerprint,
    mappings: {
      taxonIdBySourceId: sortedMapEntries(plan.mappings.taxonIdBySourceId),
      regionIdBySourceId: sortedMapEntries(plan.mappings.regionIdBySourceId),
      sourceAssetIdToTargetId: sortedMapEntries(plan.mappings.sourceAssetIdToTargetId),
    },
    protectedScopes: plan.protectedScopes,
    mutations: plan.mutations,
    summary: plan.summary,
  })
}

export function assertCatalogueTargetPlan(plan: CatalogueTargetPlan) {
  if (catalogueTargetPlanFingerprint(plan) !== plan.fingerprint) throw new Error('catalogue target plan fingerprint mismatch')
  return plan
}
