export const INAT_LICENCES = new Set(['cc0', 'cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nc-sa', 'cc-by-nd', 'cc-by-nc-nd'])
export const inatLicensed = (code: string | null | undefined) => !!code && INAT_LICENCES.has(code)
export const inatLicence = (code: string) => code === 'cc0' ? 'CC0 1.0' : code.toUpperCase().replace(/^CC-/, 'CC ') + ' 4.0'
export const inatLicenceUrl = (code: string) => code === 'cc0' ? 'https://creativecommons.org/publicdomain/zero/1.0/' : `https://creativecommons.org/licenses/${code.replace(/^cc-/, '')}/4.0/`

const clean = (value: string) => value.replace(/\s+/g, ' ').trim()
type CommonsLicence = { family: 'cc0' | 'public-domain' | 'cc-by' | 'cc-by-sa'; version?: string; jurisdiction?: string }
export function commonsLicenceFamily(value: string): CommonsLicence | null {
  const licence = clean(value)
  if (/^CC0(?: 1\.0)?$/i.test(licence)) return { family: 'cc0', version: '1.0' }
  if (/^(?:Public domain|Public domain mark|PD-(?:old(?:-(?:50|70|80|95|100))?(?:-expired)?|old-auto(?:-expired)?|US(?:Gov)?|Art|self|ineligible|textlogo|shape|chem|NASA))$/i.test(licence)) return { family: 'public-domain' }
  const cc = /^CC BY(-SA)? (1\.0|2\.0|2\.5|3\.0|4\.0)(?: ([a-z]{2,3}))?$/i.exec(licence)
  return cc ? { family: cc[1] ? 'cc-by-sa' : 'cc-by', version: cc[2], jurisdiction: cc[3]?.toLowerCase() } : null
}
const https = (value: unknown): value is string => { try { return typeof value === 'string' && new URL(value).protocol === 'https:' } catch { return false } }
export function commonsLicenceUrlMatches(licence: string, value: string) {
  const family = commonsLicenceFamily(licence)
  if (!family || !https(value)) return false
  const url = new URL(value)
  if (url.hostname !== 'creativecommons.org' || url.username || url.password || url.port) return false
  const path = url.pathname.replace(/\/$/, '').toLowerCase()
  if (family.family === 'cc0') return path === '/publicdomain/zero/1.0'
  if (family.family === 'public-domain') return path === '/publicdomain/mark/1.0'
  return path === `/licenses/${family.family === 'cc-by-sa' ? 'by-sa' : 'by'}/${family.version}${family.jurisdiction ? `/${family.jurisdiction}` : ''}`
}
export function normalizedRemoteUrl(value: string) {
  const url = new URL(value)
  url.hash = ''; url.search = ''; url.hostname = url.hostname.toLowerCase()
  url.pathname = url.pathname.replace(/\/{2,}/g, '/').replace(/\/(square|small|medium|large|original)\.([a-z0-9]+)$/i, '/{size}.$2')
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/$/, '')
  return url.toString()
}

export type ReferenceVisibility = {
  catalogueVersionId: string
  taxonId: string
  eligible: boolean
  targetPosition: number | null
  hiddenReason: string | null
  correctedLicenceUrl: string | null
  sourceAssetFingerprint: string
  evidenceFingerprint: string
  reviewer: string
  reviewedAt: Date | string
  receipt: { sourceSnapshot: unknown; resultSnapshot: unknown }
}
export type ReferenceRow = {
  id: string
  kind: string
  position: number
  createdAt: Date | string
  url: string
  author: string
  licence: string
  licenceUrl: string | null
  sourceUrl: string
  origin: string
  caption?: string | null
  meta?: unknown
  taxonId?: string | null
  sightingId?: string | null
  ownerId?: string | null
  avatarOf?: unknown
  byteSize?: number
  referenceVisibility?: ReferenceVisibility | null
}
const avatar = (value: unknown) => value !== null && value !== undefined && value !== false
export function referenceAssetBeforeImage(asset: ReferenceRow) {
  return {
    id: asset.id, kind: asset.kind, url: asset.url, author: asset.author, licence: asset.licence,
    licenceUrl: asset.licenceUrl, sourceUrl: asset.sourceUrl, origin: asset.origin,
    caption: asset.caption ?? null, meta: asset.meta ?? null, position: asset.position,
    createdAt: asset.createdAt, taxonId: asset.taxonId ?? null, sightingId: asset.sightingId ?? null,
    ownerId: asset.ownerId ?? null, avatarOf: avatar(asset.avatarOf), byteSize: asset.byteSize ?? null,
  }
}
export function canonicalReferenceContent(value: unknown): string {
  const normalize = (item: unknown): unknown => {
    if (item === null || typeof item === 'string' || typeof item === 'boolean') return item
    if (typeof item === 'number' && Number.isFinite(item)) return item
    if (item instanceof Date) return item.toISOString()
    if (Array.isArray(item)) return item.map(normalize)
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item)
      .filter(([, child]) => child !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, normalize(child)]))
    throw new Error('reference evidence contains an unsupported JSON value')
  }
  return JSON.stringify(normalize(value))
}
const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
const reviewTime = (value: unknown) => value instanceof Date ? value.getTime() : typeof value === 'string' ? Date.parse(value) : NaN
function reviewBindsCurrentAsset(asset: ReferenceRow, visibility: ReferenceVisibility) {
  const source = record(visibility.receipt?.sourceSnapshot), result = record(visibility.receipt?.resultSnapshot)
  if (!source || !result || source.schemaVersion !== 1 || source.catalogueVersionId !== visibility.catalogueVersionId || source.taxonId !== visibility.taxonId) return false
  const beforeImages = [...(Array.isArray(source.existing) ? source.existing : []), ...(Array.isArray(source.incoming) ? source.incoming : [])]
    .filter((item) => record(item)?.id === asset.id)
  const current = canonicalReferenceContent(referenceAssetBeforeImage(asset))
  if (!beforeImages.length || beforeImages.some((item) => canonicalReferenceContent(item) !== current)) return false
  const reviews = (Array.isArray(source.reviews) ? source.reviews : []).filter((item) => record(item)?.assetId === asset.id).map(record)
  if (reviews.length !== 1) return false
  const review = reviews[0]!
  if (review.sourceAssetFingerprint !== visibility.sourceAssetFingerprint || review.evidenceFingerprint !== visibility.evidenceFingerprint ||
    review.reviewer !== visibility.reviewer || reviewTime(review.reviewedAt) !== reviewTime(visibility.reviewedAt) ||
    review.decision !== 'eligible' || review.correctedLicenceUrl !== visibility.correctedLicenceUrl) return false
  const eligible = (Array.isArray(result.eligible) ? result.eligible : []).filter((item) => record(item)?.assetId === asset.id).map(record)
  if (eligible.length !== 1) return false
  const effective = eligible[0]!
  return effective.position === visibility.targetPosition && effective.url === asset.url && effective.author === asset.author &&
    effective.licence === asset.licence && effective.licenceUrl === (visibility.correctedLicenceUrl ?? asset.licenceUrl) &&
    effective.sourceUrl === asset.sourceUrl && effective.origin === asset.origin && effective.caption === (asset.caption ?? null)
}
export function validReferenceImage(asset: ReferenceRow) {
  return asset.kind === 'image' && Number.isSafeInteger(asset.position) && asset.position >= 0 &&
    typeof asset.author === 'string' && Boolean(asset.author.trim()) && typeof asset.licence === 'string' &&
    https(asset.url) && https(asset.sourceUrl) && https(asset.licenceUrl) &&
    (asset.origin === 'commons' ? commonsLicenceUrlMatches(asset.licence, asset.licenceUrl)
      : asset.origin === 'inat' && [...INAT_LICENCES].some((code) => inatLicence(code) === asset.licence && inatLicenceUrl(code) === asset.licenceUrl))
}
/** Filter before ordering/capping: malformed legacy rows must not hide a valid lead. */
export function referenceGallery<T extends ReferenceRow>(rows: readonly T[], limit = 12): T[] {
  if (!Number.isSafeInteger(limit) || limit <= 0) return []
  const pages = new Set<string>(), urls = new Set<string>()
  const out: T[] = []
  // A completely unreviewed gallery keeps the legacy contract until the atomic cutover. Once any
  // reviewed row exists, missing/hidden decisions fail closed and only explicit target positions
  // are eligible. The original Asset metadata stays untouched; the reviewed same-rights URL is a
  // display overlay.
  const reviewed = rows.some((asset) => asset.referenceVisibility != null)
  const candidates = rows.flatMap((asset) => {
    const visibility = asset.referenceVisibility
    if (!reviewed) return validReferenceImage(asset) ? [asset] : []
    if (!visibility?.eligible || !Number.isSafeInteger(visibility.targetPosition) || visibility.targetPosition! < 0 || visibility.targetPosition! > 11 || !reviewBindsCurrentAsset(asset, visibility)) return []
    const effective = { ...asset, position: visibility.targetPosition!, licenceUrl: visibility.correctedLicenceUrl ?? asset.licenceUrl }
    return validReferenceImage(effective) ? [effective] : []
  })
  const ordered = candidates.sort((a, b) => a.position - b.position || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  for (const asset of ordered) {
    const page = normalizedRemoteUrl(asset.sourceUrl), url = normalizedRemoteUrl(asset.url)
    if (pages.has(page) || urls.has(url)) continue
    pages.add(page); urls.add(url); out.push(asset)
    if (out.length >= Math.min(12, limit)) break
  }
  return out
}
