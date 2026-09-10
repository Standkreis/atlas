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

export type ReferenceVisibility = { eligible: boolean; targetPosition: number | null; hiddenReason: string | null; correctedLicenceUrl: string | null }
export type ReferenceRow = { id: string; kind: string; position: number; createdAt: Date | string; url: string; author: string; licence: string; licenceUrl: string | null; sourceUrl: string; origin: string; referenceVisibility?: ReferenceVisibility | null }
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
    if (!visibility?.eligible || !Number.isSafeInteger(visibility.targetPosition) || visibility.targetPosition! < 0 || visibility.targetPosition! > 11) return []
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
