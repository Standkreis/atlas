import { canonicalContent, contentDigest } from './catalogue-gallery-transfer'
import { canonicalReferenceContent, normalizedRemoteUrl, referenceAssetBeforeImage, validReferenceImage, type ReferenceRow } from '../src/domain/referenceImages'

export const REFERENCE_GALLERY_RECEIPT_VERSION = 1
export const CUSTOM_GRANT_HIDDEN_REASON = 'custom-attribution-grant-outside-supported-policy'
export const hiddenReasonForEvidence = (evidence: ReferenceReviewEvidence) => [
  evidence.rights.status === 'unverified' ? 'unverified-rights' : evidence.rights.status === 'custom-attribution-grant' ? CUSTOM_GRANT_HIDDEN_REASON : null,
  evidence.subject.status === 'unverified' ? 'unverified-subject' : evidence.subject.status === 'confirmed-conflict' ? 'confirmed-subject-conflict' : null,
].filter((reason): reason is string => reason !== null).join('+') || null

export type ReferenceAsset = ReferenceRow & {
  taxonId: string | null
  sightingId: string | null
  ownerId: string | null
  avatarOf?: unknown
  caption?: string | null
  meta?: unknown
  byteSize?: number
}

export type ReferenceReviewEvidence = {
  rights: { status: 'verified-supported-licence' | 'unverified' | 'custom-attribution-grant'; source: string }
  subject: { status: 'verified' | 'unverified' | 'confirmed-conflict'; source: string }
  renderedUrl: { url: string; source: string }
  notes: string
}

export type ReferenceAssetReview = {
  assetId: string
  decision: 'eligible' | 'hidden'
  hiddenReason: string | null
  correctedLicenceUrl: string | null
  sourceAssetFingerprint: string
  evidence: ReferenceReviewEvidence
  evidenceFingerprint: string
  reviewer: string
  reviewedAt: string
}

export type PlannedReferenceVisibility = {
  assetId: string
  catalogueVersionId: string
  taxonId: string
  eligible: boolean
  targetPosition: number | null
  hiddenReason: string | null
  correctedLicenceUrl: string | null
  sourceAssetFingerprint: string
  evidence: ReferenceReviewEvidence
  evidenceFingerprint: string
  reviewer: string
  reviewedAt: string
}

export type ReferenceGalleryPlanInput = {
  catalogueVersionId: string
  taxonId: string
  existingAssets: readonly ReferenceAsset[]
  incomingAssets: readonly ReferenceAsset[]
  reviews: readonly ReferenceAssetReview[]
}

export type ReferenceGalleryPlan = {
  retainedAssets: ReferenceAsset[]
  visibility: PlannedReferenceVisibility[]
  eligibleAssets: Array<ReferenceAsset & { position: number; licenceUrl: string }>
  sourceSnapshot: unknown
  sourceFingerprint: string
  resultSnapshot: unknown
  resultFingerprint: string
}

export type ReferenceGalleryReceipt = {
  schemaVersion: 1
  catalogueVersionId: string
  taxonId: string
  sourceSnapshot: unknown
  sourceFingerprint: string
  evidence: unknown
  evidenceFingerprint: string
  resultSnapshot: unknown
  resultFingerprint: string
  reviewer: string
  reviewedAt: string
}

const nonempty = (value: unknown): value is string => typeof value === 'string' && Boolean(value.trim())
const timestamp = (value: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) && Number.isFinite(Date.parse(value))
const avatar = (value: unknown) => value !== null && value !== undefined && value !== false
// Include every global taxon image, even an imported/unknown origin. Unsupported origins can only
// become explicit hidden rows; excluding them here would let an old unreviewed reference escape the
// receipt merely because its source metadata is incomplete.
const globalReference = (asset: ReferenceAsset, taxonId: string) => asset.taxonId === taxonId && asset.kind === 'image' && asset.ownerId === null && asset.sightingId === null && !avatar(asset.avatarOf)
const ordered = <T extends ReferenceAsset>(assets: readonly T[]) => [...assets].sort((a, b) => a.position - b.position || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id.localeCompare(b.id))

export const referenceAssetFingerprint = (asset: ReferenceAsset) => contentDigest(referenceAssetBeforeImage(asset))

function validateReview(asset: ReferenceAsset, review: ReferenceAssetReview) {
  if (review.assetId !== asset.id || review.sourceAssetFingerprint !== referenceAssetFingerprint(asset)) throw new Error(`reference review evidence drift for ${asset.id}`)
  if (review.evidenceFingerprint !== contentDigest(review.evidence)) throw new Error(`reference review evidence fingerprint drift for ${asset.id}`)
  if (!nonempty(review.reviewer) || !timestamp(review.reviewedAt) || !nonempty(review.evidence.notes) ||
    !nonempty(review.evidence.rights.source) || !nonempty(review.evidence.subject.source) || !nonempty(review.evidence.renderedUrl.source) ||
    review.evidence.renderedUrl.url !== asset.url) throw new Error(`invalid reference review evidence for ${asset.id}`)
  if (review.decision === 'hidden') {
    if (!nonempty(review.hiddenReason) || review.correctedLicenceUrl !== null) throw new Error(`invalid hidden reference review for ${asset.id}`)
    const evidenceReason = hiddenReasonForEvidence(review.evidence)
    if (evidenceReason && review.hiddenReason !== evidenceReason) throw new Error(`hidden reason does not encode all evidence findings for ${asset.id}: expected ${evidenceReason}`)
    return
  }
  if (review.hiddenReason !== null || review.evidence.rights.status !== 'verified-supported-licence' || review.evidence.subject.status !== 'verified') throw new Error(`eligible reference lacks verified rights or subject evidence for ${asset.id}`)
  if (review.correctedLicenceUrl !== null && review.correctedLicenceUrl === asset.licenceUrl) throw new Error(`licence URL correction is not a change for ${asset.id}`)
  const effective = { ...asset, position: 0, licenceUrl: review.correctedLicenceUrl ?? asset.licenceUrl }
  if (!validReferenceImage(effective)) throw new Error(`eligible reference metadata is invalid for ${asset.id}`)
}

/**
 * Pure target planner. It never mutates/deletes/reassigns an Asset or Taxon. Existing references
 * are considered before incoming references, so an eligible old lead remains first; every other
 * source row is retained with explicit hidden evidence when it is reviewed out, duplicated or capped.
 */
export function planTargetReferenceGallery(input: ReferenceGalleryPlanInput): ReferenceGalleryPlan {
  if (!nonempty(input.catalogueVersionId) || !nonempty(input.taxonId)) throw new Error('target gallery requires catalogue and taxon ids')
  const storedById = new Map<string, ReferenceAsset>()
  for (const asset of input.existingAssets) {
    if (storedById.has(asset.id)) throw new Error(`duplicate existing Asset id ${asset.id}`)
    storedById.set(asset.id, asset)
  }
  for (const asset of input.incomingAssets) {
    const stored = storedById.get(asset.id)
    if (stored && canonicalReferenceContent(referenceAssetBeforeImage(stored)) !== canonicalReferenceContent(referenceAssetBeforeImage(asset))) throw new Error(`incoming Asset id collides with retained evidence for ${asset.id}`)
  }
  const existingReferences = ordered(input.existingAssets.filter((asset) => globalReference(asset, input.taxonId)))
  if (input.incomingAssets.some((asset) => !globalReference(asset, input.taxonId))) throw new Error('incoming target gallery contains a non-reference or reassigned asset')
  const incomingReferences = ordered(input.incomingAssets)
  const byId = new Map<string, ReferenceAsset>()
  const candidates: ReferenceAsset[] = []
  for (const asset of [...existingReferences, ...incomingReferences]) {
    const prior = byId.get(asset.id)
    if (prior) {
      if (canonicalReferenceContent(referenceAssetBeforeImage(prior)) !== canonicalReferenceContent(referenceAssetBeforeImage(asset))) throw new Error(`asset id collision changes original evidence for ${asset.id}`)
      continue
    }
    byId.set(asset.id, asset); candidates.push(asset)
  }
  const reviews = new Map<string, ReferenceAssetReview>()
  for (const review of input.reviews) {
    if (reviews.has(review.assetId)) throw new Error(`duplicate reference review for ${review.assetId}`)
    reviews.set(review.assetId, review)
  }
  if (reviews.size !== candidates.length || candidates.some((asset) => !reviews.has(asset.id))) throw new Error('every target reference requires exactly one explicit review')
  for (const id of reviews.keys()) if (!byId.has(id)) throw new Error(`reference review does not identify a target asset ${id}`)

  const pages = new Set<string>(), urls = new Set<string>()
  const eligibleAssets: ReferenceGalleryPlan['eligibleAssets'] = []
  const visibility: PlannedReferenceVisibility[] = []
  for (const asset of candidates) {
    const review = reviews.get(asset.id)!
    validateReview(asset, review)
    let eligible = review.decision === 'eligible'
    let hiddenReason = review.hiddenReason
    const effectiveLicenceUrl = review.correctedLicenceUrl ?? asset.licenceUrl
    if (eligible) {
      const page = normalizedRemoteUrl(asset.sourceUrl), url = normalizedRemoteUrl(asset.url)
      if (pages.has(page) || urls.has(url)) { eligible = false; hiddenReason = 'duplicate-reference' }
      else if (eligibleAssets.length === 12) { eligible = false; hiddenReason = 'gallery-cap' }
      else {
        pages.add(page); urls.add(url)
        eligibleAssets.push({ ...asset, position: eligibleAssets.length, licenceUrl: effectiveLicenceUrl! })
      }
    }
    visibility.push({
      assetId: asset.id, catalogueVersionId: input.catalogueVersionId, taxonId: input.taxonId,
      eligible, targetPosition: eligible ? eligibleAssets.length - 1 : null,
      hiddenReason: eligible ? null : hiddenReason, correctedLicenceUrl: eligible ? review.correctedLicenceUrl : null,
      sourceAssetFingerprint: review.sourceAssetFingerprint, evidence: review.evidence,
      evidenceFingerprint: review.evidenceFingerprint, reviewer: review.reviewer, reviewedAt: review.reviewedAt,
    })
  }
  if (visibility.some((row) => !row.eligible && !nonempty(row.hiddenReason))) throw new Error('every retained hidden reference requires an explicit reason')

  const incomingIds = new Set(incomingReferences.map((asset) => asset.id))
  const existingIds = new Set(input.existingAssets.map((asset) => asset.id))
  const newAssets = candidates.filter((asset) => incomingIds.has(asset.id) && !existingIds.has(asset.id))
  const retainedAssets = [...input.existingAssets, ...newAssets]
  const sourceSnapshot = {
    schemaVersion: REFERENCE_GALLERY_RECEIPT_VERSION, catalogueVersionId: input.catalogueVersionId, taxonId: input.taxonId,
    existing: existingReferences.map(referenceAssetBeforeImage), incoming: incomingReferences.map(referenceAssetBeforeImage),
    reviews: candidates.map((asset) => reviews.get(asset.id)),
  }
  const resultSnapshot = {
    schemaVersion: REFERENCE_GALLERY_RECEIPT_VERSION,
    retainedAssetIds: candidates.map((asset) => asset.id),
    eligible: eligibleAssets.map((asset) => ({ assetId: asset.id, position: asset.position, url: asset.url, author: asset.author, licence: asset.licence, licenceUrl: asset.licenceUrl, sourceUrl: asset.sourceUrl, origin: asset.origin, caption: asset.caption ?? null })),
    hidden: visibility.filter((row) => !row.eligible).map(({ assetId, hiddenReason }) => ({ assetId, reason: hiddenReason })),
  }
  return { retainedAssets, visibility, eligibleAssets, sourceSnapshot, sourceFingerprint: contentDigest(sourceSnapshot), resultSnapshot, resultFingerprint: contentDigest(resultSnapshot) }
}

export function makeReferenceGalleryReceipt(input: ReferenceGalleryPlanInput, review: { evidence: unknown; reviewer: string; reviewedAt: string }): ReferenceGalleryReceipt {
  if (!nonempty(review.reviewer) || !timestamp(review.reviewedAt) || ['null', '{}', '[]'].includes(canonicalContent(review.evidence))) throw new Error('target gallery receipt requires review evidence, reviewer and UTC time')
  const plan = planTargetReferenceGallery(input)
  return {
    schemaVersion: REFERENCE_GALLERY_RECEIPT_VERSION, catalogueVersionId: input.catalogueVersionId, taxonId: input.taxonId,
    sourceSnapshot: plan.sourceSnapshot, sourceFingerprint: plan.sourceFingerprint,
    evidence: review.evidence, evidenceFingerprint: contentDigest(review.evidence),
    resultSnapshot: plan.resultSnapshot, resultFingerprint: plan.resultFingerprint,
    reviewer: review.reviewer, reviewedAt: review.reviewedAt,
  }
}

export function assertReferenceGalleryReceipt(input: ReferenceGalleryPlanInput, receipt: ReferenceGalleryReceipt) {
  const expected = makeReferenceGalleryReceipt(input, { evidence: receipt.evidence, reviewer: receipt.reviewer, reviewedAt: receipt.reviewedAt })
  if (canonicalContent(receipt) !== canonicalContent(expected)) throw new Error('target gallery receipt does not bind the current reviewed source and result snapshots')
  return planTargetReferenceGallery(input)
}
