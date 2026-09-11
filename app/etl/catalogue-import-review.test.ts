import { describe, expect, it } from 'vitest'
import { contentDigest } from './catalogue-gallery-transfer'
import type { ValidatedCatalogueImport } from './catalogue-import-validation'
import { referenceAssetFromSnapshot, referenceTimestampUtc, targetGalleryReviewFromDocument as bindPinnedReview, type ReviewedTargetGalleryDocument } from './catalogue-import-review'
import type { TargetCatalogueSnapshot } from './catalogue-import-plan'
import { referenceAssetFingerprint } from './reference-gallery-preservation'

const asset = { id: 'source-image', taxonId: 'source-taxon', kind: 'image', origin: 'inat', url: 'https://images.example/image.jpg',
  sourceUrl: 'https://www.inaturalist.org/photos/1', author: 'Author', licence: 'CC BY 4.0', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
  position: 0, caption: 'Species', createdAt: '2026-09-11T01:00:00', ownerId: null, sightingId: null, meta: null, byteSize: null }
const targetGalleryReviewFromDocument = (source: ValidatedCatalogueImport, target: TargetCatalogueSnapshot, document: ReviewedTargetGalleryDocument) =>
  bindPinnedReview(source, target, document, { documentFingerprint: contentDigest(document), evidenceFingerprint: document.evidence.fingerprint })
function fixture() {
  const source = { pins: { catalogueId: 'catalogue' }, evidence: { files: [{ role: 'gallery artifact', sha256: 'a'.repeat(64) }], tables: [{ table: 'Asset', digest: 'b'.repeat(64) }] },
    tables: new Map([['Asset', [asset]], ['Taxon', [{ id: 'source-taxon', gbifKey: 1 }]], ['TaxonEnrichmentWork', [{ taxonId: 'source-taxon', kind: 'gallery', resultSummary: { acceptedEvidence: [{ ...asset }] } }]]]) } as unknown as ValidatedCatalogueImport
  const existing = referenceAssetFromSnapshot({ ...asset, id: 'old-image', taxonId: 'old-taxon' })
  const target = { tables: new Map<string, Readonly<Record<string, unknown>>[]>([['Asset', [existing]], ['Taxon', [{ id: 'old-taxon', gbifKey: 1 }]], ['Identity', []]]) }
  const evidence = { rights: { status: 'verified-supported-licence' as const, source: 'official-record' }, subject: { status: 'verified' as const, source: 'official-record' }, renderedUrl: { url: asset.url, source: 'checked-url' }, notes: 'Explicit target review.' }
  const document: ReviewedTargetGalleryDocument = { schemaVersion: 1, kind: 'reviewed-target-gallery', catalogueVersionId: 'catalogue', reviewer: 'test-reviewer', reviewedAt: '2026-09-11T02:00:00.000Z',
    evidence: { notes: 'Target evidence reviewed.', source: 'retained-response', fingerprint: 'c'.repeat(64) },
    sourceApproval: { decision: 'approved', artifactSha256: 'a'.repeat(64), assetTableDigest: 'b'.repeat(64), notes: 'Reviewed licensed source publication.' },
    existing: [{ assetId: existing.id, assetFingerprint: referenceAssetFingerprint(existing), review: { decision: 'eligible', hiddenReason: null, correctedLicenceUrl: null, evidence, evidenceFingerprint: contentDigest(evidence) } }], reuse: [] }
  return { source, target, document, existing }
}

describe('target gallery decision binding', () => {
  it('interprets PostgreSQL naive timestamps as UTC independently of the host timezone', () => {
    expect(referenceTimestampUtc('2026-09-11T01:00:00')).toBe('2026-09-11T01:00:00.000Z')
    expect(referenceTimestampUtc('2026-09-11T03:00:00+02:00')).toBe('2026-09-11T01:00:00.000Z')
    expect(referenceAssetFingerprint(referenceAssetFromSnapshot(asset))).toBe(referenceAssetFingerprint(referenceAssetFromSnapshot({ ...asset, createdAt: new Date('2026-09-11T01:00:00.000Z') })))
    expect(() => referenceTimestampUtc('not a timestamp')).toThrow()
  })
  it('binds original and mapped incoming evidence without copying target identity into source proof', () => {
    const { source, target, document, existing } = fixture()
    const review = targetGalleryReviewFromDocument(source, target, document)
    expect(review.reviewAsset({ kind: 'existing', asset: existing, sourceAsset: null, catalogueVersionId: 'catalogue', taxonId: 'old-taxon' }).decision).toBe('eligible')
    const original = referenceAssetFromSnapshot(asset)
    const result = review.reviewAsset({ kind: 'incoming', asset: { ...original, taxonId: 'old-taxon' }, sourceAsset: original, catalogueVersionId: 'catalogue', taxonId: 'old-taxon' })
    expect(result.decision).toBe('eligible')
    expect(result.evidenceFingerprint).toBe(contentDigest(result.evidence))
    document.existing[0].review.evidence.notes = 'caller changed it'
    expect(review.reviewAsset({ kind: 'existing', asset: existing, sourceAsset: null, catalogueVersionId: 'catalogue', taxonId: 'old-taxon' }).evidence.notes).toBe('Explicit target review.')
  })
  it('rejects unsigned, incomplete and stale target decisions', () => {
    const { source, target, document } = fixture()
    expect(() => targetGalleryReviewFromDocument(source, target, { ...document, kind: 'target-gallery-unsigned-category-manifest' } as unknown as ReviewedTargetGalleryDocument)).toThrow('target-specific')
    expect(() => targetGalleryReviewFromDocument(source, target, { ...document, existing: [] })).toThrow('exactly once')
    document.existing[0].assetFingerprint = '0'.repeat(64)
    expect(() => targetGalleryReviewFromDocument(source, target, document)).toThrow('decision drift')
  })
  it('rejects source approval drift and unreviewed reuse', () => {
    const { source, target, document } = fixture()
    expect(() => targetGalleryReviewFromDocument(source, target, { ...document, sourceApproval: { ...document.sourceApproval, artifactSha256: 'f'.repeat(64) } })).toThrow('validated artifact')
    expect(() => targetGalleryReviewFromDocument(source, target, { ...document, reuse: [{ sourceAssetId: 'source-image', targetAssetId: 'unknown' }] })).toThrow('eligible identity')
  })
  it('requires external approval pins and strict hidden evidence enums', () => {
    const { source, target, document } = fixture()
    expect(() => bindPinnedReview(source, target, document, { documentFingerprint: '0'.repeat(64), evidenceFingerprint: document.evidence.fingerprint })).toThrow('approval pin')
    const invalid = JSON.parse(JSON.stringify(document))
    invalid.existing[0].review.decision = 'hidden'
    invalid.existing[0].review.hiddenReason = 'anything'
    invalid.existing[0].review.evidence.rights.status = 'typo'
    invalid.existing[0].review.evidenceFingerprint = contentDigest(invalid.existing[0].review.evidence)
    expect(() => targetGalleryReviewFromDocument(source, target, invalid)).toThrow('valid evidence')
  })
  it('cannot mutate approved reuse, returned decisions or nested receipt evidence', () => {
    const { source, target, document, existing } = fixture()
    const review = targetGalleryReviewFromDocument(source, target, document)
    expect((review.reuseTargetAssetIdBySourceId as unknown as { set?: unknown }).set).toBeUndefined()
    const decision = review.reviewAsset({ kind: 'existing', asset: existing, sourceAsset: null, catalogueVersionId: 'catalogue', taxonId: 'old-taxon' })
    expect(Object.isFrozen(decision)).toBe(true)
    expect(Object.isFrozen(decision.evidence.rights)).toBe(true)
    expect(Object.isFrozen((review.receiptEvidence as { sourceApproval: unknown }).sourceApproval)).toBe(true)
  })
  it('requires source publication proof for reused assets as well as new assets', () => {
    const { source, target, document, existing } = fixture()
    document.reuse = [{ sourceAssetId: asset.id, targetAssetId: existing.id }]
    const review = targetGalleryReviewFromDocument(source, target, document)
    const context = { kind: 'existing' as const, asset: existing, sourceAsset: referenceAssetFromSnapshot(asset), catalogueVersionId: 'catalogue', taxonId: 'old-taxon' }
    expect(review.reviewAsset(context).decision).toBe('eligible')
    const work = source.tables.get('TaxonEnrichmentWork')![0] as { resultSummary: { acceptedEvidence: unknown[] } }
    work.resultSummary.acceptedEvidence = []
    expect(() => review.reviewAsset(context)).toThrow('unique audited source evidence')
  })
})
