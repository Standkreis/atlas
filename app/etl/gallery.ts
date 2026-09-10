import { commonsRejected, inatLicence, inatLicenceUrl, inatLicensed } from './prune'
import { normalizedRemoteUrl, commonsLicenceFamily, commonsLicenceUrlMatches } from '../src/domain/referenceImages'
export { normalizedRemoteUrl, commonsLicenceFamily, commonsLicenceUrlMatches } from '../src/domain/referenceImages'

export const GALLERY_LIMIT = 12

export type ScientificGalleryReview = {
  ruleId: string
  reason: 'ambiguous-species-attribution'
  evidence: string
  evidenceSha256: string
}

const RED_BARTSIA_REVIEW = {
  ruleId: 'commons-red-bartsia-ambiguous-species-v1',
  reason: 'ambiguous-species-attribution' as const,
  evidence: 'app/etl/README.md#reviewed-scientific-image-exclusions',
  evidenceSha256: '075799c48c4aad347569c306d8acaa84d5ddcb7de89f99fd300ba3018920818f',
} satisfies ScientificGalleryReview

const CROSS_TAXON_EVIDENCE_SHA256 = 'eff063fe88ce9921c651318300a225f42cf03a2732540f12927b4e7b86e9a8e1'
const CROSS_TAXON_EVIDENCE = 'app/etl/README.md#reviewed-scientific-image-exclusions'
const INAT_CORNUS_REVIEW = {
  ruleId: 'inat-photo-437081607-cross-taxon-ambiguous-v1',
  reason: 'ambiguous-species-attribution' as const,
  evidence: CROSS_TAXON_EVIDENCE,
  evidenceSha256: CROSS_TAXON_EVIDENCE_SHA256,
} satisfies ScientificGalleryReview
const INAT_CARASSIUS_REVIEW = {
  ruleId: 'inat-photo-575158298-cross-taxon-ambiguous-v1',
  reason: 'ambiguous-species-attribution' as const,
  evidence: CROSS_TAXON_EVIDENCE,
  evidenceSha256: CROSS_TAXON_EVIDENCE_SHA256,
} satisfies ScientificGalleryReview
const COMMONS_CHRYSOTOXUM_REVIEW = {
  ruleId: 'commons-chrysotoxum-cautum-richard-bartz-ambiguous-species-v1',
  reason: 'ambiguous-species-attribution' as const,
  evidence: CROSS_TAXON_EVIDENCE,
  evidenceSha256: CROSS_TAXON_EVIDENCE_SHA256,
} satisfies ScientificGalleryReview

const reviewedInat = new Map<number, ScientificGalleryReview>([
  [437081607, INAT_CORNUS_REVIEW],
  [575158298, INAT_CARASSIUS_REVIEW],
])
const reviewedCommons = new Map<string, { review: ScientificGalleryReview; renderPath: RegExp }>([
  ['File:Red bartsia 800.jpg', { review: RED_BARTSIA_REVIEW, renderPath: /^\/wikipedia\/commons\/(?:thumb\/)?d\/db\/Red_bartsia_800\.jpg(?:\/[^/]+)?$/ }],
  ['File:Chrysotoxum cautum Richard Bartz.jpg', { review: COMMONS_CHRYSOTOXUM_REVIEW, renderPath: /^\/wikipedia\/commons\/(?:thumb\/)?a\/a5\/Chrysotoxum_cautum_Richard_Bartz\.jpg(?:\/[^/]+)?$/ }],
])

const commonsTitle = (value: string) => {
  try {
    const raw = value.startsWith('commons:') ? value.slice('commons:'.length) : value
    return decodeURIComponent(raw).replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
  } catch { return '' }
}

const inatPhotoId = (value: string) => {
  const match = value.trim().match(/^(?:inat:)?(\d+)$/)
  return match ? Number(match[1]) : null
}

/** Exact reviewed source identity, not a species/name/category or licence-family exclusion. */
export function scientificGalleryExclusion(image: { origin: string; sourceId?: string; sourceUrl?: string | null; url?: string | null }) {
  if (image.origin === 'inat') {
    if (image.sourceId) {
      const review = reviewedInat.get(inatPhotoId(image.sourceId) ?? -1)
      if (review) return review
    }
    try {
      const page = new URL(image.sourceUrl ?? '')
      const match = page.pathname.match(/^\/photos\/(\d+)\/?$/)
      if (['www.inaturalist.org', 'inaturalist.org'].includes(page.hostname) && match) {
        const review = reviewedInat.get(Number(match[1]))
        if (review) return review
      }
    } catch { /* Invalid source URLs remain subject to the separate metadata gate. */ }
    try {
      const render = new URL(image.url ?? '')
      const match = decodeURIComponent(render.pathname).match(/^\/photos\/(\d+)\/(?:square|small|medium|large|original)\.[a-z0-9]+$/i)
      if (render.hostname === 'inaturalist-open-data.s3.amazonaws.com' && match) {
        const review = reviewedInat.get(Number(match[1]))
        if (review) return review
      }
    } catch { /* Invalid render URLs remain subject to the separate metadata gate. */ }
    return null
  }
  if (image.origin !== 'commons') return null
  if (image.sourceId) {
    const match = reviewedCommons.get(commonsTitle(image.sourceId))
    if (match) return match.review
  }
  try {
    const page = new URL(image.sourceUrl ?? '')
    const title = page.pathname.startsWith('/wiki/') ? commonsTitle(page.pathname.slice(6))
      : page.pathname === '/w/index.php' ? commonsTitle(page.searchParams.get('title') ?? '') : ''
    const match = reviewedCommons.get(title)
    if (page.hostname === 'commons.wikimedia.org' && match) return match.review
  } catch { /* Invalid source URLs remain subject to the separate metadata gate. */ }
  try {
    const render = new URL(image.url ?? '')
    if (['upload.wikimedia.org', 'thumb.wikimedia.org'].includes(render.hostname)) {
      const path = decodeURIComponent(render.pathname)
      for (const { review, renderPath } of reviewedCommons.values()) if (renderPath.test(path)) return review
    }
  } catch { /* Invalid render URLs remain subject to the separate metadata gate. */ }
  return null
}

export type InatPhotoProvenance = {
  status: 'native-free-local-photo' | 'unverified-imported-licence' | 'unknown-provenance'
  detailedRecords: number
  totalRecords: number
  conflictingMetadata: boolean
  evidence: Array<{ photoId: number; detailed: boolean; type: string | null; nativePageUrl: string | null; nativePhotoId: string | number | null; missingFields: string[]; licenseCode: string | null; attribution: string | null; attributionName: string | null; mediumUrl: string | null; url: string | null }>
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
  review?: ScientificGalleryReview
}

export type GallerySelection = {
  status: 'ok'
  assets: GalleryAsset[]
  acceptedEvidence: GalleryAcceptedEvidence[]
  rejections: GalleryRejection[]
}

export type GalleryAcceptedEvidence = GalleryAsset & ({
  origin: 'inat'
  sourceId: string
  taxonId: number
  matchedName: string
  photoId: number
  provenance: InatPhotoProvenance
} | {
  origin: 'commons'
  sourceId: string
})

type Candidate = Omit<GalleryAsset, 'position'> & {
  sourceId: string
  order: number
  inat?: { taxonId: number; matchedName: string; photoId: number; provenance: InatPhotoProvenance }
}

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

function inatCandidate(photo: InatPhotoCandidate, sourceTaxon: InatGallerySource, sciName: string, rejections: GalleryRejection[]): Candidate | null {
  const source = `inat:${photo.id}`
  if (!Number.isSafeInteger(photo.id) || photo.id <= 0) return reject(rejections, source, 'invalid-source-id')
  const exclusion = scientificGalleryExclusion({ origin: 'inat', sourceId: source, sourceUrl: `https://www.inaturalist.org/photos/${photo.id}`, url: photo.renderUrl })
  if (exclusion) {
    rejections.push({ source, reason: exclusion.reason, review: exclusion })
    return null
  }
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
    inat: { taxonId: sourceTaxon.taxonId, matchedName: sourceTaxon.matchedName, photoId: photo.id, provenance: photo.provenance },
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
  const defaultAsset = defaultPhoto ? inatCandidate(defaultPhoto, input.inat!, input.scientificName, rejections) : null
  const commonsAsset = input.commons ? commonsCandidate(input.commons, input.scientificName, rejections) : null
  const alternates = photos
    .filter((photo) => photo.id !== input.inat?.defaultPhotoId)
    .map((photo) => inatCandidate(photo, input.inat!, input.scientificName, rejections))
    .filter((candidate): candidate is Candidate => candidate !== null)

  const ordered = defaultAsset ? [defaultAsset, ...(commonsAsset ? [commonsAsset] : []), ...alternates] : commonsAsset ? [commonsAsset, ...alternates] : alternates
  const limit = Math.max(0, Math.min(GALLERY_LIMIT, Math.trunc(input.limit ?? GALLERY_LIMIT)))
  const sourceIds = new Set<string>()
  const pages = new Set<string>()
  const urls = new Set<string>()
  const assets: GalleryAsset[] = []
  const acceptedEvidence: GalleryAcceptedEvidence[] = []
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
    const asset: GalleryAsset = {
      position: assets.length,
      url: candidate.url,
      author: candidate.author,
      licence: candidate.licence,
      licenceUrl: candidate.licenceUrl,
      sourceUrl: candidate.sourceUrl,
      origin: candidate.origin,
      caption: candidate.caption,
    }
    assets.push(asset)
    acceptedEvidence.push(candidate.origin === 'inat'
      ? { ...asset, origin: 'inat', sourceId: candidate.sourceId, ...candidate.inat! }
      : { ...asset, origin: 'commons', sourceId: candidate.sourceId })
  }
  return { status: 'ok', assets, acceptedEvidence, rejections }
}
