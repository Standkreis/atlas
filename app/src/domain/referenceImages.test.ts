import { describe, expect, it } from 'vitest'
import { referenceAssetBeforeImage, referenceGallery, type ReferenceRow, type ReferenceVisibility } from './referenceImages'

const row = (id: string, position: number, overrides: Partial<ReferenceRow> = {}): ReferenceRow => ({
  id, kind: 'image', position, createdAt: '2026-01-01T00:00:00.000Z', url: `https://images.example.test/${id}/medium.jpg`,
  author: 'Author', licence: 'CC BY 4.0', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
  sourceUrl: `https://commons.wikimedia.org/wiki/File:${id}.jpg`, origin: 'commons', caption: id, meta: { id },
  taxonId: 'taxon-reviewed', sightingId: null, ownerId: null, avatarOf: null, byteSize: 0, ...overrides,
})
const visibility = (asset: ReferenceRow, targetPosition: number, correctedLicenceUrl: string | null = null): ReferenceVisibility => {
  const sourceAssetFingerprint = 'a'.repeat(64), evidenceFingerprint = 'b'.repeat(64)
  const reviewer = 'Unit reviewer', reviewedAt = '2026-09-10T20:00:00.000Z'
  return {
    catalogueVersionId: 'catalogue-reviewed', taxonId: asset.taxonId!, eligible: true, targetPosition,
    hiddenReason: null, correctedLicenceUrl, sourceAssetFingerprint, evidenceFingerprint, reviewer, reviewedAt,
    receipt: {
      sourceSnapshot: {
        schemaVersion: 1, catalogueVersionId: 'catalogue-reviewed', taxonId: asset.taxonId,
        existing: [referenceAssetBeforeImage(asset)], incoming: [],
        reviews: [{ assetId: asset.id, decision: 'eligible', correctedLicenceUrl, sourceAssetFingerprint, evidenceFingerprint, reviewer, reviewedAt }],
      },
      resultSnapshot: { schemaVersion: 1, eligible: [{
        assetId: asset.id, position: targetPosition, url: asset.url, author: asset.author, licence: asset.licence,
        licenceUrl: correctedLicenceUrl ?? asset.licenceUrl, sourceUrl: asset.sourceUrl, origin: asset.origin,
        caption: asset.caption ?? null,
      }] },
    },
  }
}

describe('reviewed reference visibility', () => {
  it('keeps the complete no-row gallery backward compatible before cutover', () => {
    expect(referenceGallery([row('second', 1), row('lead', 0)]).map((asset) => asset.id)).toEqual(['lead', 'second'])
  })

  it('uses one shared eligible order after cutover and applies only its licence URL overlay', () => {
    const secondAsset = row('second', 0), leadAsset = row('lead', 9, { licence: 'CC BY 3.0', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/' })
    const hiddenAsset = row('hidden', 0), hidden: ReferenceVisibility = { ...visibility(hiddenAsset, 0), eligible: false, targetPosition: null, hiddenReason: 'confirmed-subject-conflict' }
    const assets = [row('legacy-without-row', 0), { ...hiddenAsset, referenceVisibility: hidden },
      { ...secondAsset, referenceVisibility: visibility(secondAsset, 1) },
      { ...leadAsset, referenceVisibility: visibility(leadAsset, 0, 'https://creativecommons.org/licenses/by/3.0/') }]
    const gallery = referenceGallery(assets)
    expect(gallery.map((asset) => [asset.id, asset.position, asset.licenceUrl])).toEqual([
      ['lead', 0, 'https://creativecommons.org/licenses/by/3.0/'], ['second', 1, 'https://creativecommons.org/licenses/by/4.0/'],
    ])
    expect(assets[3]).toMatchObject({ position: 9, licenceUrl: 'https://creativecommons.org/licenses/by/4.0/' })
  })

  it('fails malformed review state and every current Asset before-image drift closed', () => {
    const original = row('bound', 0), bound = visibility(original, 0)
    expect(referenceGallery([{ ...original, referenceVisibility: { ...bound, targetPosition: 12 } }])).toEqual([])
    for (const drift of [
      { url: 'https://images.example.test/replaced/medium.jpg' },
      { author: 'Different author' },
      { licence: 'CC BY-SA 4.0', licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
      { position: 1 },
    ]) expect(referenceGallery([{ ...original, ...drift, referenceVisibility: bound }])).toEqual([])
  })

  it('binds the same review instant after PostgreSQL normalizes timestamp precision', () => {
    const original = row('timestamp', 0), bound = visibility(original, 0)
    const snapshot = bound.receipt.sourceSnapshot as { reviews: Array<{ reviewedAt: string }> }
    snapshot.reviews[0]!.reviewedAt = '2026-09-10T20:00:00Z'
    bound.reviewedAt = new Date('2026-09-10T20:00:00.000Z')
    expect(referenceGallery([{ ...original, referenceVisibility: bound }])).toHaveLength(1)
    bound.reviewedAt = new Date('2026-09-10T20:00:00.001Z')
    expect(referenceGallery([{ ...original, referenceVisibility: bound }])).toEqual([])
    bound.reviewedAt = 'invalid'
    expect(referenceGallery([{ ...original, referenceVisibility: bound }])).toEqual([])
  })
})
