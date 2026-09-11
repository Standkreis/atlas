/** Bind an explicitly reviewed target decision document to the source and target snapshots. */
import { canonicalContent, contentDigest } from './catalogue-gallery-transfer'
import type { ValidatedCatalogueImport } from './catalogue-import-validation'
import type { TargetCatalogueSnapshot, TargetGalleryReview, TargetReferenceReviewDraft } from './catalogue-import-plan'
import { referenceAssetFingerprint, type ReferenceAsset, type ReferenceReviewEvidence } from './reference-gallery-preservation'
import { z } from 'zod'

export type ReviewedTargetGalleryDocument = {
  schemaVersion: 1
  kind: 'reviewed-target-gallery'
  catalogueVersionId: string
  reviewer: string
  reviewedAt: string
  evidence: { notes: string; source: string; fingerprint: string }
  sourceApproval: {
    decision: 'approved'
    artifactSha256: string
    assetTableDigest: string
    notes: string
  }
  existing: Array<{ assetId: string; assetFingerprint: string; review: TargetReferenceReviewDraft }>
  reuse: Array<{ sourceAssetId: string; targetAssetId: string }>
}

const nonempty = (value: unknown): value is string => typeof value === 'string' && Boolean(value.trim())
const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
const digestSchema = z.string().regex(/^[a-f0-9]{64}$/)
const textSchema = z.string().trim().min(1)
const evidenceSchema = z.strictObject({
  rights: z.strictObject({ status: z.enum(['verified-supported-licence', 'unverified', 'custom-attribution-grant']), source: textSchema }),
  subject: z.strictObject({ status: z.enum(['verified', 'unverified', 'confirmed-conflict']), source: textSchema }),
  renderedUrl: z.strictObject({ url: textSchema, source: textSchema }), notes: textSchema,
})
const decisionSchema = z.strictObject({ decision: z.enum(['eligible', 'hidden']), hiddenReason: textSchema.nullable(), correctedLicenceUrl: textSchema.nullable(), evidence: evidenceSchema, evidenceFingerprint: digestSchema })
const documentSchema = z.strictObject({
  schemaVersion: z.literal(1), kind: z.literal('reviewed-target-gallery'), catalogueVersionId: textSchema,
  reviewer: textSchema, reviewedAt: textSchema, evidence: z.strictObject({ notes: textSchema, source: textSchema, fingerprint: digestSchema }),
  sourceApproval: z.strictObject({ decision: z.literal('approved'), artifactSha256: digestSchema, assetTableDigest: digestSchema, notes: textSchema }),
  existing: z.array(z.strictObject({ assetId: textSchema, assetFingerprint: digestSchema, review: decisionSchema })),
  reuse: z.array(z.strictObject({ sourceAssetId: textSchema, targetAssetId: textSchema })),
})
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child); Object.freeze(value) }
  return value
}
function immutableMap<K, V>(map: Map<K, V>): ReadonlyMap<K, V> {
  const view: ReadonlyMap<K, V> = Object.freeze({ get size() { return map.size }, get: (key: K) => map.get(key), has: (key: K) => map.has(key),
    keys: () => map.keys(), values: () => map.values(), entries: () => map.entries(), [Symbol.iterator]: () => map[Symbol.iterator](),
    forEach: (fn: (value: V, key: K, self: ReadonlyMap<K, V>) => void, thisArg?: unknown) => map.forEach((value, key) => fn.call(thisArg, value, key, view)) })
  return view
}

/** PostgreSQL timestamp-without-time-zone values in this application represent UTC, not host time. */
export function referenceTimestampUtc(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value)) throw new Error('reference timestamp is invalid')
  const timestamp = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`
  const parsed = new Date(timestamp)
  if (!Number.isFinite(parsed.getTime())) throw new Error('reference timestamp is invalid')
  return parsed.toISOString()
}

export function referenceAssetFromSnapshot(row: Readonly<Record<string, unknown>>): ReferenceAsset {
  return { ...row, createdAt: referenceTimestampUtc(row.createdAt), avatarOf: row.avatarOf ?? false } as ReferenceAsset
}

/**
 * This function never approves an unsigned audit or invents a reviewer. The caller must load an
 * owner-only decision file whose exact SHA is independently pinned by the reviewed import plan.
 * The signed scope acknowledges the already-audited source gallery and enumerates every old row.
 * #61 still validates the individual evidence, ordering and complete receipt during planning.
 */
export function targetGalleryReviewFromDocument(
  source: ValidatedCatalogueImport,
  target: TargetCatalogueSnapshot,
  inputDocument: ReviewedTargetGalleryDocument,
  approvalPins: { documentFingerprint: string; evidenceFingerprint: string },
): TargetGalleryReview {
  if (contentDigest(inputDocument) !== digestSchema.parse(approvalPins.documentFingerprint) || inputDocument.evidence?.fingerprint !== digestSchema.parse(approvalPins.evidenceFingerprint)) throw new Error('target review approval pin mismatch')
  // Disconnect the approved decision from caller-owned mutable objects before callbacks retain it.
  const parsed = documentSchema.safeParse(JSON.parse(canonicalContent(inputDocument)))
  if (!parsed.success) throw new Error('a target-specific reviewed gallery document with valid evidence is required')
  const document = freeze(parsed.data)
  if (document?.schemaVersion !== 1 || document.kind !== 'reviewed-target-gallery' ||
    document.catalogueVersionId !== source.pins.catalogueId || !nonempty(document.reviewer) ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(document.reviewedAt) || !Number.isFinite(Date.parse(document.reviewedAt)) ||
    !nonempty(document.evidence?.notes) || !nonempty(document.evidence?.source) || !/^[a-f0-9]{64}$/.test(document.evidence?.fingerprint ?? '')) {
    throw new Error('a target-specific reviewed gallery document is required')
  }
  const artifact = source.evidence.files.find(file => file.role === 'gallery artifact')
  const assetTable = source.evidence.tables.find(table => table.table === 'Asset')
  if (document.sourceApproval?.decision !== 'approved' || !nonempty(document.sourceApproval.notes) ||
    document.sourceApproval.artifactSha256 !== artifact?.sha256 || document.sourceApproval.assetTableDigest !== assetTable?.digest) {
    throw new Error('source gallery approval does not bind the validated artifact')
  }
  const sourceAssets = new Map((source.tables.get('Asset') ?? []).map(row => [String(row.id), referenceAssetFromSnapshot(row)]))
  const sourceKeys = new Set((source.tables.get('Taxon') ?? []).map(row => row.gbifKey))
  const targetTaxa = new Set((target.tables.get('Taxon') ?? []).filter(row => sourceKeys.has(row.gbifKey)).map(row => row.id))
  const avatars = new Set((target.tables.get('Identity') ?? []).map(row => row.avatarAssetId).filter(Boolean))
  const existing = (target.tables.get('Asset') ?? []).filter(row => targetTaxa.has(row.taxonId) && row.kind === 'image' && row.ownerId === null && row.sightingId === null && !avatars.has(row.id))
    .map(referenceAssetFromSnapshot)
  const existingById = new Map(existing.map(asset => [asset.id, asset]))
  const decisions = new Map(document.existing.map(item => [item.assetId, item]))
  if (decisions.size !== document.existing.length || decisions.size !== existing.length || existing.some(asset => !decisions.has(asset.id))) {
    throw new Error('target reference review must cover every existing in-union image exactly once')
  }
  for (const asset of existing) {
    const decision = decisions.get(asset.id)!
    if (decision.assetFingerprint !== referenceAssetFingerprint(asset) || decision.review.evidenceFingerprint !== contentDigest(decision.review.evidence)) {
      throw new Error(`target reference decision drift for ${asset.id}`)
    }
  }
  const reuse = new Map(document.reuse.map(item => [item.sourceAssetId, item.targetAssetId]))
  if (reuse.size !== document.reuse.length || new Set(reuse.values()).size !== reuse.size) throw new Error('reference reuse is not one-to-one')
  for (const [sourceId, targetId] of reuse) {
    if (!sourceAssets.has(sourceId) || !existingById.has(targetId) || decisions.get(targetId)?.review.decision !== 'eligible') throw new Error('reference reuse lacks a reviewed eligible identity')
  }
  const work = new Map((source.tables.get('TaxonEnrichmentWork') ?? []).filter(row => row.kind === 'gallery').map(row => [row.taxonId, row]))
  const documentFingerprint = contentDigest(document)
  const approvedSource = (asset: ReferenceAsset | null) => {
    const original = asset && sourceAssets.get(asset.id)
    if (!original || referenceAssetFingerprint(original) !== referenceAssetFingerprint(asset!)) throw new Error('incoming reference does not bind the reviewed source')
    const accepted = record(work.get(original.taxonId)?.resultSummary)?.acceptedEvidence
    const fields = ['origin', 'url', 'author', 'licence', 'licenceUrl', 'sourceUrl', 'caption'] as const
    const matches = Array.isArray(accepted) ? accepted.filter(item => {
      const evidence = record(item)
      return evidence && fields.every(field => (evidence[field] ?? null) === (original[field] ?? null))
    }) : []
    if (matches.length !== 1) throw new Error(`incoming reference lacks unique audited source evidence: ${original.id}`)
    return { original, fields, binding: `review:${documentFingerprint};source-asset:${original.id};source-evidence:${contentDigest(matches[0])}` }
  }
  const reusedSourceByTarget = new Map([...reuse].map(([sourceId, targetId]) => [targetId, sourceId]))
  return Object.freeze({
    reviewer: document.reviewer,
    reviewedAt: document.reviewedAt,
    receiptEvidence: freeze({ documentFingerprint, ...document.evidence, sourceApproval: document.sourceApproval }),
    reuseTargetAssetIdBySourceId: immutableMap(reuse),
    reviewAsset(context: Parameters<TargetGalleryReview['reviewAsset']>[0]) {
      if (context.kind === 'existing') {
        const decision = decisions.get(context.asset.id)
        if (!decision || decision.assetFingerprint !== referenceAssetFingerprint(context.asset)) throw new Error('existing reference changed during gallery planning')
        const sourceId = reusedSourceByTarget.get(context.asset.id)
        if (sourceId !== context.sourceAsset?.id && (sourceId || context.sourceAsset)) throw new Error('reused reference lacks its approved source context')
        if (context.sourceAsset) approvedSource(context.sourceAsset)
        return decision.review
      }
      const { original, fields, binding } = approvedSource(context.sourceAsset)
      for (const field of fields) if ((context.asset[field] ?? null) !== (original[field] ?? null)) throw new Error('incoming metadata changed during target mapping')
      const evidence: ReferenceReviewEvidence = {
        rights: { status: 'verified-supported-licence', source: binding },
        subject: { status: 'verified', source: binding },
        renderedUrl: { url: context.asset.url, source: binding },
        notes: document.sourceApproval.notes,
      }
      return freeze({ decision: 'eligible' as const, hiddenReason: null, correctedLicenceUrl: null, evidence, evidenceFingerprint: contentDigest(evidence) })
    },
  })
}
