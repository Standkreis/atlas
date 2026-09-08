import { commonsRejected, inatLicence, inatLicenceUrl, inatLicensed } from './prune'

export const GALLERY_LIMIT = 12

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

export type GalleryRejection = {
  source: string
  reason: GalleryRejectionReason
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

/** A comparison key only: stored render URLs retain the provider's exact URL. */
export function normalizedRemoteUrl(value: string) {
  const url = new URL(value)
  url.hash = ''
  url.search = ''
  url.hostname = url.hostname.toLowerCase()
  url.pathname = url.pathname
    .replace(/\/{2,}/g, '/')
    .replace(/\/(square|small|medium|large|original)\.([a-z0-9]+)$/i, '/{size}.$2')
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/$/, '')
  return url.toString()
}

type CommonsLicence = { family: 'cc0' | 'public-domain' | 'cc-by' | 'cc-by-sa'; version?: string; jurisdiction?: string }

export function commonsLicenceFamily(value: string): CommonsLicence | null {
  const licence = clean(value)
  if (/^CC0(?: 1\.0)?$/i.test(licence)) return { family: 'cc0', version: '1.0' }
  if (/^(?:Public domain|Public domain mark|PD(?:-[a-z0-9 .+()-]+)?)$/i.test(licence)) return { family: 'public-domain' }
  const cc = /^CC BY(-SA)? (1\.0|2\.0|2\.5|3\.0|4\.0)(?: ([a-z]{2,3}))?$/i.exec(licence)
  return cc ? { family: cc[1] ? 'cc-by-sa' : 'cc-by', version: cc[2], jurisdiction: cc[3]?.toLowerCase() } : null
}

export function commonsLicenceUrlMatches(licence: string, value: string) {
  const family = commonsLicenceFamily(licence)
  const url = httpsUrl(value)
  if (!family || !url || url.hostname !== 'creativecommons.org') return false
  const path = url.pathname.replace(/\/$/, '').toLowerCase()
  if (family.family === 'cc0') return path === '/publicdomain/zero/1.0'
  if (family.family === 'public-domain') return path === '/publicdomain/mark/1.0'
  const jurisdiction = family.jurisdiction ? `/${family.jurisdiction}` : ''
  return path === `/licenses/${family.family === 'cc-by-sa' ? 'by-sa' : 'by'}/${family.version}${jurisdiction}`
}

function reject(rejections: GalleryRejection[], source: string, reason: GalleryRejectionReason) {
  rejections.push({ source, reason })
  return null
}

function inatCandidate(photo: InatPhotoCandidate, sciName: string, rejections: GalleryRejection[]): Candidate | null {
  const source = `inat:${photo.id}`
  if (!Number.isSafeInteger(photo.id) || photo.id <= 0) return reject(rejections, source, 'invalid-source-id')
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
