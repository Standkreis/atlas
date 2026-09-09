import { commonsRejected, inatLicence, inatLicenceUrl, inatLicensed } from './prune'
import { normalizedRemoteUrl, commonsLicenceFamily, commonsLicenceUrlMatches } from '../src/domain/referenceImages'
export { normalizedRemoteUrl, commonsLicenceFamily, commonsLicenceUrlMatches } from '../src/domain/referenceImages'

export const GALLERY_LIMIT = 12

const RED_BARTSIA_REVIEW = {
  ruleId: 'commons-red-bartsia-ambiguous-species-v1',
  reason: 'ambiguous-species-attribution' as const,
  evidence: 'app/etl/README.md#reviewed-scientific-image-exclusions',
  evidenceSha256: '075799c48c4aad347569c306d8acaa84d5ddcb7de89f99fd300ba3018920818f',
}

/** Exact reviewed source identity, not a species/name/category or licence-family exclusion. */
export function scientificGalleryExclusion(image: { origin: string; sourceId?: string; sourceUrl?: string | null; url?: string | null }) {
  if (image.origin !== 'commons') return null
  const file = (value: string) => {
    try { return decodeURIComponent(value).replace(/_/g, ' ').trim() === 'File:Red bartsia 800.jpg' } catch { return false }
  }
  if (image.sourceId && file(image.sourceId)) return RED_BARTSIA_REVIEW
  try {
    const page = new URL(image.sourceUrl ?? '')
    if (page.hostname === 'commons.wikimedia.org' &&
      ((page.pathname.startsWith('/wiki/') && file(page.pathname.slice(6))) ||
        (page.pathname === '/w/index.php' && file(page.searchParams.get('title') ?? '')))) return RED_BARTSIA_REVIEW
  } catch { /* Invalid source URLs remain subject to the separate metadata gate. */ }
  try {
    const render = new URL(image.url ?? '')
    if (render.hostname === 'upload.wikimedia.org' && /^\/wikipedia\/commons\/(?:thumb\/)?d\/db\/Red_bartsia_800\.jpg(?:\/[^/]+)?$/.test(decodeURIComponent(render.pathname))) return RED_BARTSIA_REVIEW
  } catch { /* Invalid render URLs remain subject to the separate metadata gate. */ }
  return null
}

export type InatPhotoProvenance = {
  status: 'native-free-local-photo' | 'unverified-imported-licence' | 'unknown-provenance'
  detailedRecords: number
  totalRecords: number
  conflictingMetadata: boolean
  evidence: Array<{ detailed: boolean; type: string | null; nativePageUrl: string | null; nativePhotoId: string | number | null; missingFields: string[] }>
}

export type GalleryAsset = {
  position: number
  url: string
  author: string
  licence: string
  licenceUrl: string
  sourceUrl: string
  origin: 'inat' | 'commons'
  caption: string
}

export type InatPhotoCandidate = {
  id: number
  licenseCode: string | null
  attribution?: string
  attributionName?: string
  renderUrl?: string
  curatedPosition: number
  provenance?: InatPhotoProvenance
}

export type InatGallerySource = {
  taxonId: number
  matchedName: string
  defaultPhotoId: number | null
  photos: InatPhotoCandidate[]
}

export type CommonsCandidate = {
  sourceId: string
  title: string
  categories: string
  renderUrl?: string
  author?: string
  licence?: string
  licenceUrl?: string | null
  sourceUrl?: string
}

export type GalleryRejectionReason =
  | 'unsafe-scientific-match'
  | 'invalid-source-id'
  | 'missing-render-url'
  | 'insecure-render-url'
  | 'missing-author'
  | 'missing-licence'
  | 'unsupported-licence'
  | 'missing-licence-url'
  | 'invalid-licence-url'
  | 'missing-source-page'
  | 'insecure-source-page'
  | 'rejected-commons-subject'
  | 'duplicate-source'
  | 'duplicate-url'
  | 'gallery-cap'
  | 'unverified-imported-licence'
  | 'unknown-provenance'
  | 'ambiguous-species-attribution'

export type GalleryRejection = {
  source: string
  reason: GalleryRejectionReason
  provenance?: InatPhotoProvenance
  review?: typeof RED_BARTSIA_REVIEW
}

export type GallerySelection = {
  status: 'ok'
  assets: GalleryAsset[]
  rejections: GalleryRejection[]
}

type Candidate = Omit<GalleryAsset, 'position'> & { sourceId: string; order: number }

const clean = (value: string | null | undefined) => value?.replace(/\s+/g, ' ').trim() ?? ''

const httpsUrl = (value: string | null | undefined) => {
  try {
    const url = new URL(clean(value))
    return url.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}


function reject(rejections: GalleryRejection[], source: string, reason: GalleryRejectionReason) {
  rejections.push({ source, reason })
  return null
}

function inatCandidate(photo: InatPhotoCandidate, sciName: string, rejections: GalleryRejection[]): Candidate | null {
  const source = `inat:${photo.id}`
  if (!Number.isSafeInteger(photo.id) || photo.id <= 0) return reject(rejections, source, 'invalid-source-id')
  if (photo.provenance?.status !== 'native-free-local-photo') {
    rejections.push({ source, reason: photo.provenance?.status === 'unverified-imported-licence' ? 'unverified-imported-licence' : 'unknown-provenance',
      ...(photo.provenance ? { provenance: photo.provenance } : {}) })
    return null
  }
  const render = httpsUrl(photo.renderUrl)
  if (!clean(photo.renderUrl)) return reject(rejections, source, 'missing-render-url')
  if (!render) return reject(rejections, source, 'insecure-render-url')
  const author = clean(photo.attributionName) || clean(photo.attribution).replace(/^\(c\)\s*/i, '').replace(/,.*$/, '').trim()
  if (!author) return reject(rejections, source, 'missing-author')
  if (!clean(photo.licenseCode)) return reject(rejections, source, 'missing-licence')
  if (!inatLicensed(photo.licenseCode)) return reject(rejections, source, 'unsupported-licence')
  return {
    sourceId: source,
    order: photo.curatedPosition,
    url: render.toString(),
    author,
    licence: inatLicence(photo.licenseCode!),
    licenceUrl: inatLicenceUrl(photo.licenseCode!),
    sourceUrl: `https://www.inaturalist.org/photos/${photo.id}`,
    origin: 'inat',
    caption: sciName,
  }
}

function commonsCandidate(raw: CommonsCandidate, sciName: string, rejections: GalleryRejection[]): Candidate | null {
  const sourceId = clean(raw.sourceId)
  const source = `commons:${sourceId || '?'}`
  if (!sourceId) return reject(rejections, source, 'invalid-source-id')
  const exclusion = scientificGalleryExclusion({ origin: 'commons', sourceId, sourceUrl: raw.sourceUrl, url: raw.renderUrl })
  if (exclusion) {
    rejections.push({ source, reason: exclusion.reason, review: exclusion })
    return null
  }
  if (commonsRejected(raw.title, raw.categories)) return reject(rejections, source, 'rejected-commons-subject')
  if (!clean(raw.renderUrl)) return reject(rejections, source, 'missing-render-url')
  const render = httpsUrl(raw.renderUrl)
  if (!render) return reject(rejections, source, 'insecure-render-url')
  const author = clean(raw.author)
  if (!author) return reject(rejections, source, 'missing-author')
  const licence = clean(raw.licence)
  if (!licence) return reject(rejections, source, 'missing-licence')
  if (!commonsLicenceFamily(licence)) return reject(rejections, source, 'unsupported-licence')
  if (!clean(raw.licenceUrl)) return reject(rejections, source, 'missing-licence-url')
  if (!commonsLicenceUrlMatches(licence, raw.licenceUrl!)) return reject(rejections, source, 'invalid-licence-url')
  if (!clean(raw.sourceUrl)) return reject(rejections, source, 'missing-source-page')
  const page = httpsUrl(raw.sourceUrl)
  if (!page) return reject(rejections, source, 'insecure-source-page')
  return {
    sourceId: source,
    order: 0,
    url: render.toString(),
    author,
    licence,
    licenceUrl: new URL(raw.licenceUrl!).toString(),
    sourceUrl: page.toString(),
    origin: 'commons',
    caption: clean(raw.title).replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '') || sciName,
  }
}

/**
 * Pure gallery policy from record 2026-09-08: default iNat, Commons P18, then curated iNat;
 * Commons follows the lead, then all remaining curated photos. Invalid candidates fail closed.
 */
export function selectGallery(input: {
  scientificName: string
  verifiedSynonyms?: readonly string[]
  inat?: InatGallerySource | null
  commons?: CommonsCandidate | null
  limit?: number
}): GallerySelection {
  const rejections: GalleryRejection[] = []
  const acceptedNames = new Set([input.scientificName, ...(input.verifiedSynonyms ?? [])])
  let photos: InatPhotoCandidate[] = []
  if (input.inat) {
    if (!acceptedNames.has(input.inat.matchedName)) {
      reject(rejections, `inat-taxon:${input.inat.taxonId}`, 'unsafe-scientific-match')
    } else {
      photos = [...input.inat.photos].sort((a, b) => a.curatedPosition - b.curatedPosition || a.id - b.id)
    }
  }

  const byId = new Map<number, InatPhotoCandidate>()
  // Even a direct caller cannot let an earlier clean duplicate mask contrary source evidence.
  const duplicates = Map.groupBy(photos, (photo) => photo.id)
  photos = photos.map((photo) => {
    const peers = duplicates.get(photo.id)!
    const restrictive = peers.find((peer) => peer.provenance?.status === 'unverified-imported-licence') ?? peers.find((peer) => peer.provenance?.status !== 'native-free-local-photo')
    return restrictive ? { ...photo, provenance: restrictive.provenance } : photo
  })
  for (const photo of photos) if (!byId.has(photo.id)) byId.set(photo.id, photo)
  const defaultPhoto = input.inat?.defaultPhotoId == null ? null : byId.get(input.inat.defaultPhotoId) ?? null
  if (input.inat?.defaultPhotoId != null && !defaultPhoto && acceptedNames.has(input.inat.matchedName)) {
    reject(rejections, `inat:${input.inat.defaultPhotoId}`, 'invalid-source-id')
  }
  const defaultAsset = defaultPhoto ? inatCandidate(defaultPhoto, input.scientificName, rejections) : null
  const commonsAsset = input.commons ? commonsCandidate(input.commons, input.scientificName, rejections) : null
  const alternates = photos
    .filter((photo) => photo.id !== input.inat?.defaultPhotoId)
    .map((photo) => inatCandidate(photo, input.scientificName, rejections))
    .filter((candidate): candidate is Candidate => candidate !== null)

  const ordered = defaultAsset ? [defaultAsset, ...(commonsAsset ? [commonsAsset] : []), ...alternates] : commonsAsset ? [commonsAsset, ...alternates] : alternates
  const limit = Math.max(0, Math.min(GALLERY_LIMIT, Math.trunc(input.limit ?? GALLERY_LIMIT)))
  const sourceIds = new Set<string>()
  const pages = new Set<string>()
  const urls = new Set<string>()
  const assets: GalleryAsset[] = []
  for (const candidate of ordered) {
    const page = normalizedRemoteUrl(candidate.sourceUrl)
    const url = normalizedRemoteUrl(candidate.url)
    if (sourceIds.has(candidate.sourceId) || pages.has(page)) {
      reject(rejections, candidate.sourceId, 'duplicate-source')
      continue
    }
    if (urls.has(url)) {
      reject(rejections, candidate.sourceId, 'duplicate-url')
      continue
    }
    if (assets.length >= limit) {
      reject(rejections, candidate.sourceId, 'gallery-cap')
      continue
    }
    sourceIds.add(candidate.sourceId)
    pages.add(page)
    urls.add(url)
    assets.push({
      position: assets.length,
      url: candidate.url,
      author: candidate.author,
      licence: candidate.licence,
      licenceUrl: candidate.licenceUrl,
      sourceUrl: candidate.sourceUrl,
      origin: candidate.origin,
      caption: candidate.caption,
    })
  }
  return { status: 'ok', assets, rejections }
}
