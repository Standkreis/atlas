import { describe, expect, it } from 'vitest'
import { contentDigest } from './catalogue-gallery-transfer'
import {
  CUSTOM_GRANT_HIDDEN_REASON, assertReferenceGalleryReceipt, makeReferenceGalleryReceipt,
  hiddenReasonForEvidence, planTargetReferenceGallery, referenceAssetFingerprint,
  type ReferenceAsset, type ReferenceAssetReview,
} from './reference-gallery-preservation'

const catalogueVersionId = 'catalogue-reviewed-target'
const taxonId = 'taxon-original'
const reviewedAt = '2026-09-10T20:00:00.000Z'
const asset = (id: string, position: number, overrides: Partial<ReferenceAsset> = {}): ReferenceAsset => ({
  id, taxonId, kind: 'image', position, createdAt: new Date(`2026-01-${String(position + 1).padStart(2, '0')}T00:00:00.000Z`),
  url: `https://images.example.test/${id}/medium.jpg`, author: 'Original author', licence: 'CC BY 4.0',
  licenceUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: `https://commons.wikimedia.org/wiki/File:${id}.jpg`,
  origin: 'commons', caption: id, meta: { source: id }, sightingId: null, ownerId: null, avatarOf: false, byteSize: 0,
  ...overrides,
})
const evidence = (row: ReferenceAsset, overrides: Partial<ReferenceAssetReview['evidence']> = {}): ReferenceAssetReview['evidence'] => ({
  rights: { status: 'verified-supported-licence', source: `original licence evidence for ${row.id}` },
  subject: { status: 'verified', source: `reviewed subject evidence for ${row.id}` },
  renderedUrl: { url: row.url, source: `rendered URL evidence for ${row.id}` }, notes: `Reviewed ${row.id}.`, ...overrides,
})
const review = (row: ReferenceAsset, overrides: Partial<ReferenceAssetReview> = {}): ReferenceAssetReview => {
  const proof = overrides.evidence ?? evidence(row)
  return { assetId: row.id, decision: 'eligible', hiddenReason: null, correctedLicenceUrl: null,
    sourceAssetFingerprint: referenceAssetFingerprint(row), evidence: proof, evidenceFingerprint: contentDigest(proof), reviewer: 'Issue 61 reviewer', reviewedAt, ...overrides }
}
const input = (existingAssets: ReferenceAsset[], incomingAssets: ReferenceAsset[], reviews = [...existingAssets, ...incomingAssets].filter((row) => row.kind === 'image' && row.origin !== 'user' && !row.ownerId && !row.sightingId && !row.avatarOf).map((row) => review(row))) =>
  ({ catalogueVersionId, taxonId, existingAssets, incomingAssets, reviews })

describe('preservation-first target gallery planning', () => {
  it('keeps the valid old lead, appends incoming assets, deduplicates and caps without deleting any media class', () => {
    const existing = [
      asset('old-lead', 0), asset('old-second', 1),
      asset('sound', 0, { kind: 'sound', origin: 'xeno-canto' }),
      asset('personal', 0, { origin: 'user', ownerId: 'identity' }),
      asset('avatar', 0, { origin: 'user', ownerId: 'identity', avatarOf: { id: 'identity' } }),
    ]
    const incoming = [
      ...Array.from({ length: 11 }, (_, index) => asset(`new-${index}`, index)),
      asset('duplicate', 11, { url: `${existing[0]!.url}?size=medium`, sourceUrl: `${existing[0]!.sourceUrl}#same` }),
    ]
    const plan = planTargetReferenceGallery(input(existing, incoming))
    expect(plan.retainedAssets.map((row) => row.id)).toEqual([...existing, ...incoming].map((row) => row.id))
    expect(plan.eligibleAssets.map((row) => row.id)).toEqual(['old-lead', 'old-second', ...Array.from({ length: 10 }, (_, index) => `new-${index}`)])
    expect(plan.eligibleAssets.map((row) => row.position)).toEqual(Array.from({ length: 12 }, (_, index) => index))
    expect(plan.visibility.find((row) => row.assetId === 'new-10')).toMatchObject({ eligible: false, hiddenReason: 'gallery-cap' })
    expect(plan.visibility.find((row) => row.assetId === 'duplicate')).toMatchObject({ eligible: false, hiddenReason: 'duplicate-reference' })
    expect(plan.visibility.some((row) => ['sound', 'personal', 'avatar'].includes(row.assetId))).toBe(false)
    expect(existing.map((row) => [row.id, row.position, row.url, row.taxonId])).toEqual([
      ['old-lead', 0, existing[0]!.url, taxonId], ['old-second', 1, existing[1]!.url, taxonId],
      ['sound', 0, existing[2]!.url, taxonId], ['personal', 0, existing[3]!.url, taxonId], ['avatar', 0, existing[4]!.url, taxonId],
    ])
  })

  it('does not let a zero-source result erase an existing gallery', () => {
    const existing = [asset('old-lead', 0), asset('old-second', 1)]
    const plan = planTargetReferenceGallery(input(existing, []))
    expect(plan.retainedAssets).toEqual(existing)
    expect(plan.eligibleAssets.map((row) => row.id)).toEqual(['old-lead', 'old-second'])
    expect(() => planTargetReferenceGallery(input(
      [asset('protected-id', 0, { origin: 'user', ownerId: 'identity' })],
      [asset('protected-id', 0)],
      [review(asset('protected-id', 0))],
    ))).toThrow('collides with retained evidence')
  })

  it('requires proof for every source and accurately retains unknown rights and the custom grant as hidden', () => {
    const unknown = asset('unknown-rights', 0, { origin: 'imported-unknown', licence: 'unknown', licenceUrl: null })
    const custom = asset('Thalpophila-5110213', 1, { licence: 'custom attribution grant', licenceUrl: null })
    const unknownEvidence = evidence(unknown, { rights: { status: 'unverified', source: 'Source metadata only; no original grant.' } })
    const customEvidence = evidence(custom, { rights: { status: 'custom-attribution-grant', source: 'Reviewed custom attribution grant.' } })
    const reviews = [
      review(unknown, { decision: 'hidden', hiddenReason: 'unverified-rights', evidence: unknownEvidence, evidenceFingerprint: contentDigest(unknownEvidence) }),
      review(custom, { decision: 'hidden', hiddenReason: CUSTOM_GRANT_HIDDEN_REASON, evidence: customEvidence, evidenceFingerprint: contentDigest(customEvidence) }),
    ]
    const plan = planTargetReferenceGallery(input([], [unknown, custom], reviews))
    expect(plan.eligibleAssets).toEqual([])
    expect(plan.resultSnapshot).toMatchObject({ hidden: [
      { assetId: 'unknown-rights', reason: 'unverified-rights' },
      { assetId: 'Thalpophila-5110213', reason: CUSTOM_GRANT_HIDDEN_REASON },
    ] })
    expect(() => planTargetReferenceGallery(input([], [unknown], []))).toThrow('exactly one explicit review')
    expect(() => planTargetReferenceGallery(input([], [unknown], [review(unknown, { evidence: unknownEvidence, evidenceFingerprint: contentDigest(unknownEvidence) })]))).toThrow('verified rights')
  })

  it('retains every simultaneous rights and subject finding in one deterministic compound reason', () => {
    const unknownConflict = asset('unknown-conflict', 0, { licence: 'unknown', licenceUrl: null })
    const customConflict = asset('custom-conflict', 1, { licence: 'custom attribution grant', licenceUrl: null })
    const unknownProof = evidence(unknownConflict, {
      rights: { status: 'unverified', source: 'No original rights grant.' },
      subject: { status: 'confirmed-conflict', source: 'Reviewed as a different subject.' },
    })
    const customProof = evidence(customConflict, {
      rights: { status: 'custom-attribution-grant', source: 'A custom grant outside supported policy.' },
      subject: { status: 'confirmed-conflict', source: 'Reviewed as a different subject.' },
    })
    const unknownReason = hiddenReasonForEvidence(unknownProof)!
    const customReason = hiddenReasonForEvidence(customProof)!
    expect(unknownReason).toBe('unverified-rights+confirmed-subject-conflict')
    expect(customReason).toBe(`${CUSTOM_GRANT_HIDDEN_REASON}+confirmed-subject-conflict`)
    const plan = planTargetReferenceGallery(input([], [unknownConflict, customConflict], [
      review(unknownConflict, { decision: 'hidden', hiddenReason: unknownReason, evidence: unknownProof, evidenceFingerprint: contentDigest(unknownProof) }),
      review(customConflict, { decision: 'hidden', hiddenReason: customReason, evidence: customProof, evidenceFingerprint: contentDigest(customProof) }),
    ]))
    expect(plan.visibility.map(({ assetId, hiddenReason }) => [assetId, hiddenReason])).toEqual([
      ['unknown-conflict', unknownReason], ['custom-conflict', customReason],
    ])
    expect(() => planTargetReferenceGallery(input([], [unknownConflict], [
      review(unknownConflict, { decision: 'hidden', hiddenReason: 'unverified-rights', evidence: unknownProof, evidenceFingerprint: contentDigest(unknownProof) }),
    ]))).toThrow(`expected ${unknownReason}`)
  })

  it('allows only a same-rights licence URL overlay and keeps the original before-image', () => {
    const original = asset('url-fix', 0, { licence: 'CC BY 3.0', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/' })
    const fixed = review(original, { correctedLicenceUrl: 'https://creativecommons.org/licenses/by/3.0/' })
    const plan = planTargetReferenceGallery(input([original], [], [fixed]))
    expect(plan.eligibleAssets[0]).toMatchObject({ licence: 'CC BY 3.0', licenceUrl: 'https://creativecommons.org/licenses/by/3.0/' })
    expect(plan.retainedAssets[0]).toMatchObject({ licence: 'CC BY 3.0', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/' })
    expect(plan.sourceSnapshot).toMatchObject({ existing: [{ licence: 'CC BY 3.0', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/' }] })
    expect(() => planTargetReferenceGallery(input([original], [], [review(original, { correctedLicenceUrl: 'https://creativecommons.org/licenses/by-sa/3.0/' })]))).toThrow('metadata is invalid')
  })

  it('retains the known Glis source conflict hidden without taxon or photo-id reassignment', () => {
    const glis = asset('inat-photo-202516664', 0, { taxonId, sourceUrl: 'https://www.inaturalist.org/photos/202516664', origin: 'inat', licence: 'CC BY 4.0', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/' })
    const conflict = evidence(glis, { subject: { status: 'confirmed-conflict', source: 'Photo 202516664 identifies Chelidonium majus 5334186, not Glis glis 5706486.' } })
    const plan = planTargetReferenceGallery(input([glis], [], [review(glis, { decision: 'hidden', hiddenReason: 'confirmed-subject-conflict', evidence: conflict, evidenceFingerprint: contentDigest(conflict) })]))
    expect(plan.retainedAssets[0]).toMatchObject({ id: 'inat-photo-202516664', taxonId })
    expect(plan.visibility[0]).toMatchObject({ assetId: 'inat-photo-202516664', taxonId, eligible: false, hiddenReason: 'confirmed-subject-conflict' })
    expect(plan.eligibleAssets).toEqual([])
    expect(() => planTargetReferenceGallery(input([], [{ ...glis, taxonId: 'taxon-from-photo-id' }], [review(glis)]))).toThrow('reassigned asset')
  })

  it('binds exact source, evidence and effective result snapshots and rejects every replay drift', () => {
    const existing = [asset('old', 0)], incoming = [asset('new', 0)]
    const args = input(existing, incoming)
    const receiptEvidence = { source: 'reviewed target worksheet', sha256: 'a'.repeat(64) }
    const receipt = makeReferenceGalleryReceipt(args, { evidence: receiptEvidence, reviewer: 'Target reviewer', reviewedAt })
    const first = assertReferenceGalleryReceipt(args, receipt)
    const second = assertReferenceGalleryReceipt(args, receipt)
    expect(first).toEqual(second)
    expect(first.sourceFingerprint).toBe(receipt.sourceFingerprint)
    expect(first.resultFingerprint).toBe(receipt.resultFingerprint)
    expect(() => assertReferenceGalleryReceipt({ ...args, existingAssets: [{ ...existing[0]!, author: 'Drifted' }] }, receipt)).toThrow('evidence drift')
    expect(() => assertReferenceGalleryReceipt(args, { ...receipt, resultFingerprint: 'f'.repeat(64) })).toThrow('does not bind')
    expect(() => planTargetReferenceGallery({ ...args, reviews: [{ ...args.reviews[0]!, evidence: { ...args.reviews[0]!.evidence, notes: 'Changed.' } }, args.reviews[1]!] })).toThrow('evidence fingerprint drift')
  })
})
