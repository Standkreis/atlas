// The per-species sources of the content job: iNaturalist photos, Commons file info, Wikipedia summaries, AnAge pages.
// Ported from scripts/etl-probe/assets.mjs and coverage.mjs (record 0002 E7 E8).
import { get, q } from './fetch'
import { commonsLicenceFamily, commonsLicenceUrlMatches, type InatGallerySource, type InatPhotoCandidate } from './gallery'
import { commonsFileOf, commonsRejected, inatLicence, inatLicenceUrl, inatLicensed, parseAnAge, wikiPage } from './prune'

export type AssetDraft = { url: string; author: string; licence: string; licenceUrl: string | null; sourceUrl: string; origin: string; caption: string }

// ── iNaturalist ──────────────────────────────────────────────────────────────
type InatPhoto = { id: number; license_code: string | null; attribution?: string; attribution_name?: string; medium_url?: string; url?: string }
type InatTaxon = { id: number; name: string; default_photo?: InatPhoto | null; taxon_photos?: { photo: InatPhoto }[] }

const secure = (value: string | null | undefined) => {
  try { return !!value && new URL(value).protocol === 'https:' } catch { return false }
}

const inatAsset = (p: InatPhoto, sciName: string): AssetDraft | null => {
  const url = p.medium_url ?? p.url?.replace('square', 'medium')
  const author = (p.attribution_name ?? p.attribution?.replace(/^\(c\) /, '').replace(/,.*$/, ''))?.trim()
  if (!Number.isSafeInteger(p.id) || p.id <= 0 || !secure(url) || !author || !inatLicensed(p.license_code)) return null
  return {
    url: url!,
    author,
    licence: inatLicence(p.license_code!),
    licenceUrl: inatLicenceUrl(p.license_code!),
    sourceUrl: `https://www.inaturalist.org/photos/${p.id}`,
    origin: 'inat',
    caption: sciName,
  }
}

/** The iNat taxon for a scientific name (one call) with its default photo. */
export async function inatTaxon(sciName: string): Promise<InatTaxon | null> {
  const j = await get<{ results: InatTaxon[] }>(`https://api.inaturalist.org/v1/taxa?${q({ q: sciName, rank: 'species', per_page: 3 })}`)
  return j?.results.find((t) => t.name === sciName) ?? null
}
/** Ladder step 1: the default photo when licensed. */
export const inatDefault = (t: InatTaxon | null, sciName: string) => (t?.default_photo && inatLicensed(t.default_photo.license_code) ? inatAsset(t.default_photo, sciName) : null)
/** Ladder step 3: the next licensed photo among the taxon's curated photos (one more call). */
export async function inatNext(t: InatTaxon, sciName: string): Promise<AssetDraft | null> {
  const j = await get<{ results: InatTaxon[] }>(`https://api.inaturalist.org/v1/taxa/${t.id}`)
  const p = j?.results[0]?.taxon_photos?.map((x) => x.photo).find((x) => inatLicensed(x.license_code) && x.id !== t.default_photo?.id)
  return p ? inatAsset(p, sciName) : null
}

export type InatGalleryFetchResult =
  | { status: 'ok'; source: InatGallerySource }
  | { status: 'failure'; reason: 'provider' | 'malformed' | 'unsafe-match'; detail: string }

type JsonFetch = <T>(url: string) => Promise<T | null>

const photoCandidate = (photo: InatPhoto, curatedPosition: number): InatPhotoCandidate => ({
  id: photo.id,
  licenseCode: photo.license_code,
  attribution: photo.attribution,
  attributionName: photo.attribution_name,
  renderUrl: photo.medium_url ?? (photo.url ? photo.url.replace('square', 'medium') : undefined),
  curatedPosition,
})

/** Search once, then fetch the one curated photo list only after an exact or separately verified synonym match. */
export async function fetchInatGallery(
  scientificName: string,
  verifiedSynonyms: readonly string[] = [],
  fetchJson: JsonFetch = get,
): Promise<InatGalleryFetchResult> {
  const acceptedNames = new Set([scientificName, ...verifiedSynonyms])
  try {
    const search = await fetchJson<unknown>(`https://api.inaturalist.org/v1/taxa?${q({ q: scientificName, rank: 'species', per_page: 3 })}`)
    if (!search || typeof search !== 'object' || !Array.isArray((search as { results?: unknown }).results)) {
      return { status: 'failure', reason: 'malformed', detail: 'iNaturalist taxon search has no results array' }
    }
    const match = (search as { results: unknown[] }).results.find((value): value is InatTaxon => {
      if (!value || typeof value !== 'object') return false
      const candidate = value as Partial<InatTaxon>
      return Number.isSafeInteger(candidate.id) && typeof candidate.name === 'string' && acceptedNames.has(candidate.name)
    })
    if (!match) return { status: 'failure', reason: 'unsafe-match', detail: 'no exact or verified-synonym iNaturalist taxon match' }

    const detail = await fetchJson<unknown>(`https://api.inaturalist.org/v1/taxa/${match.id}`)
    if (!detail || typeof detail !== 'object' || !Array.isArray((detail as { results?: unknown }).results)) {
      return { status: 'failure', reason: 'malformed', detail: 'iNaturalist taxon detail has no results array' }
    }
    const taxon = (detail as { results: unknown[] }).results[0]
    if (!taxon || typeof taxon !== 'object') return { status: 'failure', reason: 'malformed', detail: 'iNaturalist taxon detail is empty' }
    const parsed = taxon as Partial<InatTaxon>
    if (parsed.id !== match.id || typeof parsed.name !== 'string' || !acceptedNames.has(parsed.name)) {
      return { status: 'failure', reason: 'unsafe-match', detail: 'iNaturalist detail identity does not match the verified taxon' }
    }
    if (parsed.taxon_photos !== undefined && !Array.isArray(parsed.taxon_photos)) {
      return { status: 'failure', reason: 'malformed', detail: 'iNaturalist taxon_photos is not an array' }
    }
    const listed = parsed.taxon_photos ?? []
    if (listed.some((entry) => !entry || typeof entry !== 'object' || !entry.photo || typeof entry.photo !== 'object')) {
      return { status: 'failure', reason: 'malformed', detail: 'iNaturalist taxon_photos contains a malformed entry' }
    }
    const raw = [...(parsed.default_photo ? [parsed.default_photo] : []), ...listed.map((entry) => entry.photo)]
    const photos = raw.map(photoCandidate)
    return {
      status: 'ok',
      source: {
        taxonId: match.id,
        matchedName: parsed.name,
        defaultPhotoId: parsed.default_photo?.id ?? null,
        photos,
      },
    }
  } catch (error) {
    return { status: 'failure', reason: 'provider', detail: error instanceof Error ? error.message : String(error) }
  }
}

// ── Commons ──────────────────────────────────────────────────────────────────
type ImageInfo = { title: string; width: number; height: number; thumb: string; descriptionUrl: string; artist: string; licence: string; licenceUrl: string | null; cats: string }
type CommonsPage = { title: string; imageinfo?: { width: number; height: number; thumburl: string; descriptionurl: string; extmetadata?: Record<string, { value: string }> }[]; categories?: { title: string }[] }

const stripHtml = (s: string) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

/** File info for many P18 URLs, 40 titles per call (as the probe). Missing files are absent from the map. */
export async function commonsInfo(p18Urls: string[]): Promise<Map<string, ImageInfo>> {
  const out = new Map<string, ImageInfo>()
  const titles = [...new Set(p18Urls.map(commonsFileOf))]
  for (let i = 0; i < titles.length; i += 40) {
    const j = await get<{ query?: { pages: Record<string, CommonsPage> }; normalized?: { from: string; to: string }[] }>(
      `https://commons.wikimedia.org/w/api.php?${q({ action: 'query', format: 'json', prop: 'imageinfo|categories', cllimit: 50, iiprop: 'url|size|extmetadata', iiurlwidth: 800, iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl|Categories', titles: titles.slice(i, i + 40).join('|') })}`,
    )
    for (const p of Object.values(j?.query?.pages ?? {})) {
      const ii = p.imageinfo?.[0]
      if (!ii) continue
      const m = ii.extmetadata ?? {}
      out.set(p.title, {
        title: p.title,
        width: ii.width,
        height: ii.height,
        thumb: ii.thumburl,
        descriptionUrl: ii.descriptionurl,
        artist: stripHtml(m.Artist?.value ?? ''),
        licence: m.LicenseShortName?.value ?? '',
        licenceUrl: m.LicenseUrl?.value ?? null,
        cats: `${m.Categories?.value ?? ''} ${(p.categories ?? []).map((c) => c.title).join('|')}`,
      })
    }
  }
  return out
}

/** Commons gives no LicenseUrl for public-domain and "Attribution" files: the PD mark, else the file page that states the terms. */
export const commonsLicenceUrl = (licence: string, url: string | null, descriptionUrl: string) => url ?? (/public domain|pd/i.test(licence) ? 'https://creativecommons.org/publicdomain/mark/1.0/' : descriptionUrl)

/** Ladder step 2: the P18 file unless it is a specimen, plate, larva, egg or map, or lacks author or licence. */
export function commonsAsset(info: Map<string, ImageInfo>, p18: string | undefined, sciName: string): AssetDraft | null {
  if (!p18) return null
  const f = info.get(commonsFileOf(p18))
  if (!f || commonsRejected(f.title, f.cats) || !f.artist || !secure(f.thumb) || !secure(f.descriptionUrl) || !commonsLicenceFamily(f.licence)) return null
  const licenceUrl = commonsLicenceUrl(f.licence, f.licenceUrl, f.descriptionUrl)
  if (!commonsLicenceUrlMatches(f.licence, licenceUrl)) return null
  return { url: f.thumb, author: f.artist, licence: f.licence, licenceUrl, sourceUrl: f.descriptionUrl, origin: 'commons', caption: f.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '') || sciName }
}

// ── Wikipedia ────────────────────────────────────────────────────────────────
export type Intro = { text: string; lang: string; source: string; licence: string }
type Summary = { extract?: string; content_urls?: { desktop?: { page?: string } } }

/** REST page/summary for one sitelink; null when the page is missing or the extract is too short to be an intro. */
export async function wikipediaIntro(sitelink: string | undefined, lang: 'de' | 'en'): Promise<Intro | null> {
  if (!sitelink) return null
  const s = await get<Summary>(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiPage(sitelink))}`)
  if (!s?.extract || s.extract.length < 80) return null
  return { text: s.extract, lang, source: s.content_urls?.desktop?.page ?? sitelink, licence: 'CC BY-SA 4.0' }
}

// ── AnAge ────────────────────────────────────────────────────────────────────
/** One Steckbrief cell (E8, 0021 D2): `licence` on every fact of the `facts` step; AnAge has none to name. */
export type Fact = { value: string; source: string; url?: string; licence?: string }

/** The AnAge entry behind Wikidata P4024, scraped for longevity and clutch or litter size (E8). */
export async function anageFacts(id: string | undefined): Promise<Record<string, Fact>> {
  if (!id) return {}
  const url = `https://genomics.senescence.info/species/entry.php?species=${encodeURIComponent(id)}`
  const html = await get(url, { text: true })
  const parsed = parseAnAge(html)
  const out: Record<string, Fact> = {}
  if (parsed.lifespan) out.lifespan = { value: parsed.lifespan, source: 'AnAge', url }
  if (parsed.reproduction) out.reproduction = { value: parsed.reproduction, source: 'AnAge', url }
  return out
}
