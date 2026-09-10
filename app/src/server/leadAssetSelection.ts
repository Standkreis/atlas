import { referenceGallery, type ReferenceRow } from '@/domain/referenceImages'

/** Fetch every global taxon image so an unknown/imported origin cannot evade reviewed fail-closed logic. */
export const referenceImageWhere = { kind: 'image', sightingId: null, ownerId: null, avatarOf: null } as const
export const referenceAssetOrder = [{ position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }] as const
export const referenceAssetFields = { id: true, kind: true, position: true, createdAt: true, url: true, author: true, licence: true, licenceUrl: true, sourceUrl: true, origin: true, caption: true,
  referenceVisibility: { select: { eligible: true, targetPosition: true, hiddenReason: true, correctedLicenceUrl: true } } } as const
// Gallery storage is bounded to 12. Do not apply SQL take before legacy validation/deduplication:
// a malformed first row would otherwise hide the valid lead. Compact DTOs serialize only one.
export const leadAssetSelection = { where: referenceImageWhere, orderBy: [...referenceAssetOrder], select: referenceAssetFields }
export const leadAsset = <T extends ReferenceRow>(assets: readonly T[]) => {
  const selected = referenceGallery(assets, 1)[0]
  if (!selected) return null
  const publicAsset = { ...selected }
  delete publicAsset.referenceVisibility
  return publicAsset
}
