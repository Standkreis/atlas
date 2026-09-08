import { createHash } from 'node:crypto'
import type { Prisma } from '../src/generated/prisma/client'
import { db } from './db'
import { requests } from './fetch'
import { commonsLicenceUrlMatches, normalizedRemoteUrl, selectGallery, type GalleryAsset, type GallerySelection } from './gallery'
import { commonsFileOf, INAT_LICENCES, inatLicence, inatLicenceUrl } from './prune'
import { commonsInfo, commonsLicenceUrl, fetchInatGallery } from './sources'
import { runTaxonWork, type TaxonWorkResult } from './taxon-work'
import { wikidataFor } from './wikidata'

export const GALLERY_VERSION = 'licensed-gallery-v1'
export type GalleryTaxon = { id: string; gbifKey: number; sciName: string }
export type GalleryFetch = GallerySelection & { coverage: { inat: boolean; commons: boolean } }

/** Only ETL-owned reference images qualify; user media can also have a taxonId. */
export const referenceImages = (taxonId: string): Prisma.AssetWhereInput => ({
  taxonId, kind: 'image', origin: { in: ['inat', 'commons'] }, sightingId: null, ownerId: null, avatarOf: null,
})

const galleryFields = { position: true, url: true, author: true, licence: true, licenceUrl: true, sourceUrl: true, origin: true, caption: true } as const
const galleryValue = (a: GalleryAsset) => [a.position, a.url, a.author, a.licence, a.licenceUrl, a.sourceUrl, a.origin, a.caption]

/** Caller owns the transaction: validation precedes deletion, and identical galleries retain IDs. */
export async function replaceReferenceGallery(tx: Prisma.TransactionClient, taxonId: string, assets: GalleryAsset[]) {
  if (assets.length > 12 || assets.some((a, i) => a.position !== i || !['inat', 'commons'].includes(a.origin))) throw new Error('invalid ordered gallery')
  const seen = new Set<string>()
  for (const asset of assets) {
    if (![asset.url, asset.sourceUrl, asset.licenceUrl].every((value) => { try { return new URL(value).protocol === 'https:' } catch { return false } }) ||
      !asset.author.trim() || !asset.caption.trim() || !(asset.origin === 'commons' ? commonsLicenceUrlMatches(asset.licence, asset.licenceUrl)
        : [...INAT_LICENCES].some((code) => inatLicence(code) === asset.licence && inatLicenceUrl(code) === asset.licenceUrl))) throw new Error('invalid licensed gallery asset')
    const key = normalizedRemoteUrl(asset.url)
    if (seen.has(key)) throw new Error('duplicate gallery image')
    seen.add(key)
  }
  // Serialize all gallery writes for a taxon, including legacy content refreshes.
  await tx.$queryRaw`SELECT "id" FROM "Taxon" WHERE "id" = ${taxonId} FOR UPDATE`
  const old = await tx.asset.findMany({ where: referenceImages(taxonId), select: galleryFields, orderBy: [{ position: 'asc' }, { id: 'asc' }] })
  if (JSON.stringify(old.map((a) => galleryValue(a as GalleryAsset))) === JSON.stringify(assets.map(galleryValue))) return false
  await tx.asset.deleteMany({ where: referenceImages(taxonId) })
  if (assets.length) await tx.asset.createMany({ data: assets.map((a) => ({ ...a, taxonId, kind: 'image' as const })) })
  return true
}

/** Fetch the entire candidate list before any write. Missing sources are coverage, malformed sources fail. */
export async function fetchReferenceGallery(taxon: GalleryTaxon): Promise<GalleryFetch> {
  const inat = await fetchInatGallery(taxon.sciName)
  if (inat.status === 'failure') throw new Error(`iNaturalist ${inat.reason}: ${inat.detail}`)
  const wd = (await wikidataFor([taxon])).get(taxon.gbifKey)
  const p18 = wd?.item?.img
  const info = p18 ? (await commonsInfo([p18], true)).get(commonsFileOf(p18)) : undefined
  const commons = info ? {
    sourceId: info.title, title: info.title, categories: info.cats, renderUrl: info.thumb,
    author: info.artist, licence: info.licence, licenceUrl: commonsLicenceUrl(info.licence, info.licenceUrl, info.descriptionUrl), sourceUrl: info.descriptionUrl,
  } : null
  return {
    ...selectGallery({ scientificName: taxon.sciName, inat: inat.status === 'ok' ? inat.source : null, commons }),
    coverage: { inat: inat.status === 'ok', commons: Boolean(info) },
  }
}

export type GalleryOptions = {
  catalogueVersionId: string
  region?: string
  keys?: number[]
  limit?: number
  concurrency?: number
  log?: (message: string) => void
  fetchGallery?: (taxon: GalleryTaxon) => Promise<GalleryFetch>
}

export type GalleryReport = {
  catalogueVersionId: string
  scope: { region: string | null; keys: number[] | null; taxa: number; limit: number | null }
  examined: number; changed: number; unchanged: number; zero: number; capped: number; rejected: number
  failed: number; lost: number; images: number
  sources: { inat: number; commons: number; inatImages: number; commonsImages: number }
  rejections: Record<string, number>
  work: TaxonWorkResult
  requests: ReturnType<typeof requests>
  seconds: number
}

export async function galleryScope(options: GalleryOptions): Promise<GalleryTaxon[]> {
  const catalogue = await db.catalogueVersion.findUniqueOrThrow({ where: { id: options.catalogueVersionId } })
  if (catalogue.countryCode !== 'DE' || !['complete', 'audited', 'active'].includes(catalogue.status)) throw new Error('gallery work requires a completed German catalogue')
  if (options.keys && (options.keys.length === 0 || options.keys.some((key) => !Number.isSafeInteger(key) || key <= 0))) throw new Error('gallery keys must be positive GBIF integers')
  let buildId: string | undefined
  if (options.region) {
    const builds = await db.catalogueRegionBuild.findMany({
      where: { catalogueVersionId: catalogue.id, status: 'complete', registryEntry: { OR: [
        { region: { canonicalKey: options.region } }, { displayName: { equals: options.region, mode: 'insensitive' } }, { regionId: options.region },
      ] } }, select: { id: true },
    })
    if (builds.length !== 1) throw new Error('gallery region must uniquely match a completed region in this catalogue')
    buildId = builds[0].id
  }
  const taxa = await db.taxon.findMany({
    where: { catalogues: { some: { catalogueVersionId: catalogue.id } },
      ...(buildId ? { cataloguePlausibility: { some: { regionBuildId: buildId } } } : {}),
      ...(options.keys ? { gbifKey: { in: options.keys } } : {}),
    }, select: { id: true, gbifKey: true, sciName: true }, orderBy: { gbifKey: 'asc' },
  })
  if (options.keys && new Set(taxa.map((t) => t.gbifKey)).size !== new Set(options.keys).size) throw new Error('gallery keys must all belong to the selected catalogue/region scope')
  return taxa
}

export async function runGallery(options: GalleryOptions): Promise<GalleryReport> {
  const url = new URL(process.env.DATABASE_URL ?? 'postgresql://dex:dex@localhost:5433/dex')
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('gallery enrichment requires local Postgres')
  const start = Date.now()
  const before = requests()
  const log = options.log ?? console.log
  const taxa = await galleryScope(options)
  const byId = new Map(taxa.map((taxon) => [taxon.id, taxon]))
  const counts = { examined: 0, changed: 0, unchanged: 0, zero: 0, capped: 0, rejected: 0, images: 0 }
  const sources = { inat: 0, commons: 0, inatImages: 0, commonsImages: 0 }
  const rejections: Record<string, number> = {}
  log(`gallery: ${taxa.length} unique taxa in ${options.catalogueVersionId}`)
  const work = await runTaxonWork({
    catalogueVersionId: options.catalogueVersionId, kind: 'gallery', version: GALLERY_VERSION,
    taxonIds: taxa.map((t) => t.id), limit: options.limit, concurrency: options.concurrency ?? 2,
    worker: async ({ taxonId }, signal) => {
      const taxon = byId.get(taxonId)!
      counts.examined++
      try {
        const fetched = await (options.fetchGallery ?? fetchReferenceGallery)(taxon)
        signal.throwIfAborted()
        const summary = { images: fetched.assets.length, zero: fetched.assets.length === 0, changed: false, coverage: fetched.coverage, rejections: fetched.rejections,
          inatImages: fetched.assets.filter((a) => a.origin === 'inat').length, commonsImages: fetched.assets.filter((a) => a.origin === 'commons').length }
        return {
          resultSummary: summary,
          sourceFingerprint: createHash('sha256').update(JSON.stringify(fetched)).digest('hex'),
          publish: async (tx) => { signal.throwIfAborted(); summary.changed = await replaceReferenceGallery(tx, taxonId, fetched.assets) },
        }
      } catch (error) {
        log(`gallery failed: ${taxon.gbifKey} ${taxon.sciName}: ${error instanceof Error ? error.message : String(error)}`)
        throw error
      }
    },
    onComplete: (_key, outcome) => {
      const summary = outcome.resultSummary as { images: number; zero: boolean; changed: boolean; coverage: { inat: boolean; commons: boolean }; rejections: { reason: string }[]; inatImages: number; commonsImages: number }
      counts[summary.changed ? 'changed' : 'unchanged']++
      counts.zero += Number(summary.zero)
      counts.images += summary.images
      counts.capped += Number(summary.rejections.some((r) => r.reason === 'gallery-cap'))
      counts.rejected += summary.rejections.filter((r) => r.reason !== 'gallery-cap').length
      for (const rejection of summary.rejections) rejections[rejection.reason] = (rejections[rejection.reason] ?? 0) + 1
      sources.inat += Number(summary.coverage.inat); sources.commons += Number(summary.coverage.commons)
      sources.inatImages += summary.inatImages; sources.commonsImages += summary.commonsImages
      if ((counts.changed + counts.unchanged) % 25 === 0) log(`gallery: ${counts.examined} examined · ${counts.changed} changed · ${counts.zero} without images · ${((Date.now() - start) / 60000).toFixed(1)} min`)
    },
  })
  const after = requests()
  return {
    catalogueVersionId: options.catalogueVersionId,
    scope: { region: options.region ?? null, keys: options.keys ?? null, taxa: taxa.length, limit: options.limit ?? null },
    ...counts, sources, rejections, failed: work.failed, lost: work.lost, work,
    requests: { perHost: Object.fromEntries(Object.entries(after.perHost).map(([host, n]) => [host, n - (before.perHost[host] ?? 0)])),
      networkAttempts: (after.networkAttempts ?? 0) - (before.networkAttempts ?? 0), hits: after.hits - before.hits, misses: after.misses - before.misses,
      retries: after.retries - before.retries, tooMany: after.tooMany - before.tooMany },
    seconds: (Date.now() - start) / 1000,
  }
}

export const formatGalleryReport = (r: GalleryReport) => `gallery ${r.catalogueVersionId}: ${r.examined} examined · ${r.changed} changed · ${r.unchanged} unchanged · ${r.zero} zero · ${r.capped} capped · ${r.rejected} rejected · ${r.failed} failed · ${r.lost} lost\n${r.images} images · sources ${JSON.stringify(r.sources)} · work ${JSON.stringify(r.work.counts)}\n${r.seconds.toFixed(1)} s · requests ${JSON.stringify(r.requests)}`
