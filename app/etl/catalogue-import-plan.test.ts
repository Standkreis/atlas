import { describe, expect, it, vi } from 'vitest'
import { contentDigest } from './catalogue-gallery-transfer'
import { buildReviewedGalleryPlan, cataloguePostgresTimestamp, type CatalogueTargetRow, type TargetCatalogueSnapshot } from './catalogue-import-plan'
import type { ReferenceAsset, ReferenceReviewEvidence } from './reference-gallery-preservation'

const reviewedAt = '2026-09-11T10:00:00.000Z'

function asset(id: string, taxonId: string, extras: CatalogueTargetRow = {}): CatalogueTargetRow {
  return {
    id, kind: 'image', url: `https://images.example/${id}.jpg`, author: 'Author', licence: 'CC BY 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: `https://source.example/${id}`,
    origin: 'commons', caption: null, meta: null, position: 0, createdAt: '2026-09-01T12:00:00.000',
    taxonId, sightingId: null, ownerId: null, byteSize: 100, ...extras,
  }
}

function snapshot(tables: Record<string, readonly CatalogueTargetRow[]>): TargetCatalogueSnapshot {
  return { tables: new Map(Object.entries(tables)) }
}

function evidence(asset: ReferenceAsset): ReferenceReviewEvidence {
  return {
    rights: { status: 'verified-supported-licence', source: 'review:test' },
    subject: { status: 'verified', source: 'review:test' },
    renderedUrl: { url: asset.url, source: 'review:test' },
    notes: 'Checked against the pinned source.',
  }
}

describe('buildReviewedGalleryPlan', () => {
  it('reuses an explicitly bound identity and preserves the old lead before a new image', () => {
    const sourceReuse = asset('source-reuse', 'source-taxon')
    const sourceNew = asset('source-new', 'source-taxon', { position: 1, createdAt: '2026-09-01T14:00:00.000+02:00' })
    const targetLead = asset('target-lead', 'target-taxon', {
      licenceUrl: 'https://creativecommons.org/licenses/by/2.0/', sourceUrl: sourceReuse.sourceUrl, url: sourceReuse.url,
    })
    const reviewAsset = vi.fn(({ asset: reviewed }: { asset: ReferenceAsset }) => {
      expect(reviewed.createdAt).toBe('2026-09-01T12:00:00.000Z')
      const proof = evidence(reviewed)
      return {
        decision: 'eligible' as const, hiddenReason: null,
        correctedLicenceUrl: reviewed.id === 'target-lead' ? sourceReuse.licenceUrl as string : null,
        evidence: proof, evidenceFingerprint: contentDigest(proof),
      }
    })
    const result = buildReviewedGalleryPlan({
      catalogueVersionId: 'catalogue-v2', taxonIdBySourceId: new Map([['source-taxon', 'target-taxon']]),
      sourceAssets: [sourceReuse, sourceNew],
      target: snapshot({ Asset: [targetLead], Identity: [], ReferenceGalleryReceipt: [], ReferenceAssetVisibility: [] }),
      review: {
        reviewer: 'owner-review', reviewedAt, receiptEvidence: { decision: 'approved' },
        reuseTargetAssetIdBySourceId: new Map([['source-reuse', 'target-lead']]), reviewAsset,
      },
    })

    expect([...result.sourceAssetIdToTargetId]).toEqual([['source-reuse', 'target-lead'], ['source-new', 'source-new']])
    expect(result.summary).toMatchObject({ reusedAssets: 1, insertedAssets: 1, retainedExistingAssets: 1, receipts: 1, eligibleAssets: 2 })
    expect(result.assetMutations).toHaveLength(1)
    expect(result.assetMutations[0]?.after).toMatchObject({ id: 'source-new', taxonId: 'target-taxon', createdAt: '2026-09-01T12:00:00' })
    expect(result.visibilityMutations.map((item) => item.after)).toEqual(expect.arrayContaining([
      expect.objectContaining({ assetId: 'target-lead', targetPosition: 0, correctedLicenceUrl: sourceReuse.licenceUrl }),
      expect.objectContaining({ assetId: 'source-new', targetPosition: 1 }),
    ]))
    expect(result.visibilityMutations.every((item) => item.after?.reviewedAt === '2026-09-11T10:00:00' && item.after.createdAt === '2026-09-11T10:00:00')).toBe(true)
    expect(result.receiptMutations[0]?.after).toMatchObject({ reviewedAt: '2026-09-11T10:00:00', createdAt: '2026-09-11T10:00:00' })
    expect((result.receiptMutations[0]?.after?.sourceSnapshot as { reviews: Array<{ reviewedAt: string }> }).reviews.every((review) => review.reviewedAt === reviewedAt)).toBe(true)
    expect(reviewAsset).toHaveBeenCalledTimes(2)
  })

  it('rejects a reuse request when provider metadata changed', () => {
    const source = asset('source', 'source-taxon')
    const target = asset('target', 'target-taxon', { url: 'https://images.example/different.jpg' })
    expect(() => buildReviewedGalleryPlan({
      catalogueVersionId: 'catalogue-v2', taxonIdBySourceId: new Map([['source-taxon', 'target-taxon']]), sourceAssets: [source],
      target: snapshot({ Asset: [target], Identity: [], ReferenceGalleryReceipt: [], ReferenceAssetVisibility: [] }),
      review: {
        reviewer: 'owner-review', reviewedAt, receiptEvidence: {}, reuseTargetAssetIdBySourceId: new Map([['source', 'target']]),
        reviewAsset: ({ asset: reviewed }) => {
          const proof = evidence(reviewed)
          return {
            decision: 'eligible' as const,
            hiddenReason: null,
            correctedLicenceUrl: null,
            evidence: proof,
            evidenceFingerprint: contentDigest(proof),
          }
        },
      },
    })).toThrow('reuse identity or metadata conflicts')
  })

  it.each([
    ['personal', { ownerId: 'identity' }, []],
    ['sighting', { sightingId: 'sighting' }, []],
    ['avatar', {}, [{ avatarAssetId: 'target' }]],
    ['out-of-taxon', { taxonId: 'other-taxon' }, []],
  ])('rejects reuse onto a %s target Asset before it can escape the reviewed cohort', (_kind, extras, identities) => {
    const source = asset('source', 'source-taxon')
    const target = asset('target', 'target-taxon', { ...extras, url: source.url, sourceUrl: source.sourceUrl })
    expect(() => buildReviewedGalleryPlan({
      catalogueVersionId: 'catalogue-v2', taxonIdBySourceId: new Map([['source-taxon', 'target-taxon']]), sourceAssets: [source],
      target: snapshot({ Asset: [target], Identity: identities, ReferenceGalleryReceipt: [], ReferenceAssetVisibility: [] }),
      review: {
        reviewer: 'owner-review', reviewedAt, receiptEvidence: { decision: 'approved' },
        reuseTargetAssetIdBySourceId: new Map([['source', 'target']]),
        reviewAsset: ({ asset: reviewed }) => {
          const proof = evidence(reviewed)
          return { decision: 'eligible', hiddenReason: null, correctedLicenceUrl: null, evidence: proof, evidenceFingerprint: contentDigest(proof) }
        },
      },
    })).toThrow('cannot reuse a personal, sighting, avatar or out-of-taxon target Asset')
  })

  it('rejects reuse decisions that do not identify a validated source Asset', () => {
    expect(() => buildReviewedGalleryPlan({
      catalogueVersionId: 'catalogue-v2', taxonIdBySourceId: new Map(), sourceAssets: [],
      target: snapshot({ Asset: [], Identity: [], ReferenceGalleryReceipt: [], ReferenceAssetVisibility: [] }),
      review: {
        reviewer: 'owner-review', reviewedAt, receiptEvidence: { decision: 'approved' },
        reuseTargetAssetIdBySourceId: new Map([['missing-source', 'target']]),
        reviewAsset() { throw new Error('not reached') },
      },
    })).toThrow('absent from the validated source Assets')
  })

  it('canonicalizes scalar PostgreSQL timestamps without changing the UTC instant', () => {
    expect(cataloguePostgresTimestamp('2026-09-11T12:00:00.123Z')).toBe('2026-09-11T12:00:00.123')
    expect(cataloguePostgresTimestamp('2026-09-11T14:00:00.123+02:00')).toBe('2026-09-11T12:00:00.123')
    expect(cataloguePostgresTimestamp('2026-09-11T12:00:00')).toBe('2026-09-11T12:00:00')
    expect(cataloguePostgresTimestamp(new Date('2026-09-11T12:00:00.123Z'))).toBe('2026-09-11T12:00:00.123')
    expect(() => cataloguePostgresTimestamp('not-a-time', 'fixture timestamp')).toThrow('fixture timestamp is invalid')
  })
})
