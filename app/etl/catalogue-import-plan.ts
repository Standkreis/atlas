/** Pure target-identity and before/after planning contracts for the checked Germany cutover. */
import { canonicalContent, contentDigest } from './catalogue-gallery-transfer'
import type { ValidatedCatalogueImport } from './catalogue-import-validation'
import {
  makeReferenceGalleryReceipt,
  planTargetReferenceGallery,
  referenceAssetFingerprint,
  type ReferenceAsset,
  type ReferenceAssetReview,
  type ReferenceReviewEvidence,
} from './reference-gallery-preservation'
import { normalizedRemoteUrl } from '../src/domain/referenceImages'
import { referenceAssetFromSnapshot, referenceTimestampUtc } from './catalogue-import-review'
import { catalogueImportDigest } from './catalogue-import-json'

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
  return catalogueImportDigest({
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

const rowKeyText = (table: CatalogueTargetTable, row: CatalogueTargetRow) => canonicalContent(catalogueMutationKey(table, row))

function targetRowIndex(table: CatalogueTargetTable, rows: readonly CatalogueTargetRow[]) {
  const result = new Map<string, CatalogueTargetRow>()
  for (const row of rows) {
    const key = rowKeyText(table, row)
    if (result.has(key)) throw new Error(`target snapshot has duplicate ${table} primary key ${key}`)
    result.set(key, row)
  }
  return result
}

function addMutation(
  mutations: PlannedCatalogueRowMutation[],
  phase: CatalogueMutationPhase,
  table: CatalogueTargetTable,
  before: CatalogueTargetRow | null,
  after: CatalogueTargetRow | null,
) {
  if (!before && !after) return
  const key = catalogueMutationKey(table, after ?? before!)
  if (before && after && canonicalContent(catalogueMutationKey(table, before)) !== canonicalContent(key)) {
    throw new Error(`${table} primary keys cannot change in place`)
  }
  if (!before || !after || canonicalContent(before) !== canonicalContent(after)) mutations.push({ phase, table, key, before, after })
}

export function catalogueTargetSnapshotFingerprint(snapshot: TargetCatalogueSnapshot) {
  return contentDigest(CATALOGUE_TARGET_SNAPSHOT_TABLES.map((table) => ({
    table,
    rows: catalogueTargetRowsFingerprint(table, snapshot.tables.get(table) ?? []),
  })))
}

const requiredString = (value: unknown, label: string) => {
  if (typeof value !== 'string' || !value) throw new Error(`${label} must be a non-empty string`)
  return value
}

/** Canonical scalar form returned by PostgreSQL `TIMESTAMP(3)` through `to_jsonb`. */
export function cataloguePostgresTimestamp(value: unknown, label = 'catalogue timestamp') {
  try {
    return referenceTimestampUtc(value).replace(/Z$/, '')
      .replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0{3}$/, '')
  }
  catch { throw new Error(`${label} is invalid`) }
}

function uniqueByString(rows: readonly CatalogueTargetRow[], field: string, label: string) {
  const result = new Map<string, CatalogueTargetRow>()
  for (const row of rows) {
    const value = requiredString(row[field], `${label}.${field}`)
    if (result.has(value)) throw new Error(`${label} has duplicate ${field} ${value}`)
    result.set(value, row)
  }
  return result
}

const avatarAssetIds = (target: TargetCatalogueSnapshot) => new Set(
  (target.tables.get('Identity') ?? []).map((row) => row.avatarAssetId).filter((id): id is string => typeof id === 'string'),
)

const asReferenceAsset = (row: CatalogueTargetRow, avatars: ReadonlySet<string>): ReferenceAsset =>
  referenceAssetFromSnapshot({ ...row, avatarOf: avatars.has(requiredString(row.id, 'Asset.id')) })

const globalReferenceRow = (row: CatalogueTargetRow, taxonId: string, avatars: ReadonlySet<string>) =>
  row.taxonId === taxonId && row.kind === 'image' && row.ownerId === null && row.sightingId === null &&
  !avatars.has(requiredString(row.id, 'Asset.id'))

function sameReuseIdentity(source: ReferenceAsset, target: ReferenceAsset, mappedTaxonId: string, correction: string | null) {
  if (target.taxonId !== mappedTaxonId || source.origin !== target.origin ||
    normalizedRemoteUrl(source.sourceUrl) !== normalizedRemoteUrl(target.sourceUrl) ||
    normalizedRemoteUrl(source.url) !== normalizedRemoteUrl(target.url)) return false
  const fields = ['kind', 'author', 'licence', 'sourceUrl', 'origin', 'caption', 'meta', 'byteSize'] as const
  if (fields.some((field) => canonicalContent(source[field] ?? null) !== canonicalContent(target[field] ?? null))) return false
  return (correction ?? target.licenceUrl) === source.licenceUrl
}

/**
 * Adapt mapped Assets to #61's reviewed preservation planner. Existing assets are never deleted;
 * reviewed source rows either reuse one exact target identity or retain their frozen source UUID.
 */
export function buildReviewedGalleryPlan(options: {
  catalogueVersionId: string
  taxonIdBySourceId: ReadonlyMap<string, string>
  sourceAssets: readonly CatalogueTargetRow[]
  target: TargetCatalogueSnapshot
  review: TargetGalleryReview
}): PlannedTargetGallery {
  const catalogueVersionId = requiredString(options.catalogueVersionId, 'catalogueVersionId')
  if (!options.review.reviewer.trim() || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(options.review.reviewedAt)) {
    throw new Error('target gallery review requires a reviewer and UTC timestamp')
  }
  const avatars = avatarAssetIds(options.target)
  const targetRows = options.target.tables.get('Asset') ?? []
  const targetById = uniqueByString(targetRows, 'id', 'target Asset')
  const sourceById = uniqueByString(options.sourceAssets, 'id', 'source Asset')
  for (const [sourceId, targetId] of options.review.reuseTargetAssetIdBySourceId) {
    if (!sourceById.has(requiredString(sourceId, 'reference reuse source id'))) {
      throw new Error(`reference reuse source ${sourceId} is absent from the validated source Assets`)
    }
    requiredString(targetId, `reference reuse target for ${sourceId}`)
  }
  const sourceAssetIdToTargetId = new Map<string, string>()
  const reusedTargetIds = new Set<string>()
  const incomingRows: CatalogueTargetRow[] = []
  const sourceForTarget = new Map<string, ReferenceAsset>()
  const reviewedReuseDrafts = new Map<string, TargetReferenceReviewDraft>()

  for (const sourceRow of options.sourceAssets) {
    const source = asReferenceAsset(sourceRow, new Set())
    const sourceId = source.id
    const mappedTaxonId = options.taxonIdBySourceId.get(requiredString(source.taxonId, `source Asset ${sourceId}.taxonId`))
    if (!mappedTaxonId) throw new Error(`source Asset ${sourceId} has no mapped Taxon`)
    const reuseId = options.review.reuseTargetAssetIdBySourceId.get(sourceId)
    if (reuseId) {
      const targetRow = targetById.get(reuseId)
      if (!targetRow || reusedTargetIds.has(reuseId)) throw new Error(`source Asset ${sourceId} has invalid non-unique target reuse`)
      if (!globalReferenceRow(targetRow, mappedTaxonId, avatars)) {
        throw new Error(`source Asset ${sourceId} cannot reuse a personal, sighting, avatar or out-of-taxon target Asset`)
      }
      const target = asReferenceAsset(targetRow, avatars)
      const draft = options.review.reviewAsset({ kind: 'existing', catalogueVersionId, taxonId: mappedTaxonId, asset: target, sourceAsset: source })
      if (!sameReuseIdentity(source, target, mappedTaxonId, draft.correctedLicenceUrl)) throw new Error(`source Asset ${sourceId} reuse identity or metadata conflicts`)
      reusedTargetIds.add(reuseId)
      sourceAssetIdToTargetId.set(sourceId, reuseId)
      sourceForTarget.set(reuseId, source)
      reviewedReuseDrafts.set(reuseId, draft)
      continue
    }
    if (targetById.has(sourceId)) throw new Error(`new source Asset ${sourceId} UUID collides with target data`)
    const after = {
      ...sourceRow,
      createdAt: cataloguePostgresTimestamp(sourceRow.createdAt, `source Asset ${sourceId}.createdAt`),
      taxonId: mappedTaxonId,
    }
    incomingRows.push(after)
    sourceAssetIdToTargetId.set(sourceId, sourceId)
    sourceForTarget.set(sourceId, source)
  }
  if (sourceAssetIdToTargetId.size !== sourceById.size || new Set(sourceAssetIdToTargetId.values()).size !== sourceAssetIdToTargetId.size) {
    throw new Error('source reference identities are not one-to-one')
  }

  const mappedTaxa = new Set(options.taxonIdBySourceId.values())
  const existingRows = targetRows.filter((row) => typeof row.taxonId === 'string' && mappedTaxa.has(row.taxonId) && globalReferenceRow(row, row.taxonId, avatars))
  const existingByTaxon = Map.groupBy(existingRows, (row) => requiredString(row.taxonId, 'target Asset.taxonId'))
  const incomingByTaxon = Map.groupBy(incomingRows, (row) => requiredString(row.taxonId, 'incoming Asset.taxonId'))
  const receiptRows: CatalogueTargetRow[] = []
  const visibilityRows: CatalogueTargetRow[] = []
  let eligibleAssets = 0
  let hiddenAssets = 0

  for (const taxonId of [...mappedTaxa].sort()) {
    const existingAssets = (existingByTaxon.get(taxonId) ?? []).map((row) => asReferenceAsset(row, avatars))
    const incomingAssets = (incomingByTaxon.get(taxonId) ?? []).map((row) => asReferenceAsset(row, avatars))
    if (incomingAssets.some((asset) => sourceForTarget.get(asset.id)?.taxonId == null)) throw new Error(`Taxon ${taxonId} has an unbound source Asset`)
    const reviews: ReferenceAssetReview[] = [...existingAssets, ...incomingAssets].map((asset) => {
      const sourceAsset = sourceForTarget.get(asset.id) ?? null
      const draft = reviewedReuseDrafts.get(asset.id) ?? options.review.reviewAsset({ kind: incomingAssets.includes(asset) ? 'incoming' : 'existing', catalogueVersionId, taxonId, asset, sourceAsset })
      return {
        assetId: asset.id,
        decision: draft.decision,
        hiddenReason: draft.hiddenReason,
        correctedLicenceUrl: draft.correctedLicenceUrl,
        sourceAssetFingerprint: referenceAssetFingerprint(asset),
        evidence: draft.evidence,
        evidenceFingerprint: draft.evidenceFingerprint,
        reviewer: options.review.reviewer,
        reviewedAt: options.review.reviewedAt,
      }
    })
    const input = { catalogueVersionId, taxonId, existingAssets, incomingAssets, reviews }
    const planned = planTargetReferenceGallery(input)
    const receipt = makeReferenceGalleryReceipt(input, {
      evidence: options.review.receiptEvidence,
      reviewer: options.review.reviewer,
      reviewedAt: options.review.reviewedAt,
    })
    eligibleAssets += planned.visibility.filter((row) => row.eligible).length
    hiddenAssets += planned.visibility.filter((row) => !row.eligible).length
    const storedReviewTime = cataloguePostgresTimestamp(receipt.reviewedAt, 'reference receipt reviewedAt')
    receiptRows.push({
      catalogueVersionId,
      taxonId,
      sourceSnapshot: receipt.sourceSnapshot,
      sourceFingerprint: receipt.sourceFingerprint,
      evidence: receipt.evidence,
      evidenceFingerprint: receipt.evidenceFingerprint,
      resultSnapshot: receipt.resultSnapshot,
      resultFingerprint: receipt.resultFingerprint,
      reviewer: receipt.reviewer,
      reviewedAt: storedReviewTime,
      createdAt: storedReviewTime,
    })
    visibilityRows.push(...planned.visibility.map((row) => ({
      ...row,
      reviewedAt: cataloguePostgresTimestamp(row.reviewedAt, `reference visibility ${row.assetId}.reviewedAt`),
      createdAt: cataloguePostgresTimestamp(row.reviewedAt, `reference visibility ${row.assetId}.createdAt`),
    })))
  }

  const assetMutations: PlannedCatalogueRowMutation[] = []
  for (const row of incomingRows) addMutation(assetMutations, 'materialize', 'Asset', null, row)
  const receiptMutations: PlannedCatalogueRowMutation[] = []
  const targetReceipts = targetRowIndex('ReferenceGalleryReceipt', options.target.tables.get('ReferenceGalleryReceipt') ?? [])
  for (const row of receiptRows) addMutation(receiptMutations, 'materialize', 'ReferenceGalleryReceipt', targetReceipts.get(rowKeyText('ReferenceGalleryReceipt', row)) ?? null, row)
  const visibilityMutations: PlannedCatalogueRowMutation[] = []
  const targetVisibility = targetRowIndex('ReferenceAssetVisibility', options.target.tables.get('ReferenceAssetVisibility') ?? [])
  for (const row of visibilityRows) addMutation(visibilityMutations, 'materialize', 'ReferenceAssetVisibility', targetVisibility.get(rowKeyText('ReferenceAssetVisibility', row)) ?? null, row)

  return {
    sourceAssetIdToTargetId,
    assetMutations,
    receiptMutations,
    visibilityMutations,
    summary: {
      sourceAssets: options.sourceAssets.length,
      reusedAssets: reusedTargetIds.size,
      insertedAssets: incomingRows.length,
      retainedExistingAssets: existingRows.length,
      eligibleAssets,
      hiddenAssets,
      receipts: receiptRows.length,
    },
  }
}
