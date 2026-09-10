/** Local-only global-content audit; URL metadata checks never imply successful network rendering. */
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { Client } from 'pg'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { publishAuditBundle } from './audit-bundle'
import { TILES } from '../src/domain/rules'
import { inatLicence, inatLicenceUrl, inatLicensed, normalizedRemoteUrl, validReferenceImage } from '../src/domain/referenceImages'
import { safeReferenceUrl, type NetworkCheck } from './gallery-network-audit'
import { scientificGalleryExclusion } from './gallery'
import { responseEvidenceFingerprint } from './fetch'
import { CONTENT_WORK_VERSIONS, canonicalContent, contentDigest, contentSnapshotDigests, qualifiedReference, relevantWork, writeGalleryArtifact } from './catalogue-gallery-transfer'

export type ContentTaxon = Record<string, unknown> & { id: string; gbifKey: number; sciName: string; rank: string; tile: string; commonNames: unknown; intro: unknown; facts: unknown; prose: unknown; contentAt: unknown }
export type ContentAsset = Record<string, unknown> & { id: string; taxonId: string; kind: string; position: number; createdAt: string; url: string; author: string; licence: string; licenceUrl: string | null; sourceUrl: string; origin: string; caption: string | null; ownerId: string | null; sightingId: string | null; avatarOf: boolean }
export type ContentWork = Record<string, unknown> & { taxonId: string; kind: string; version: string; status: string; attempts: number; completedAt: string | null; error: string | null; resultSummary: unknown; sourceFingerprint: string | null }
export type ContentAuditSnapshot = {
  catalogue: { id: string; runKey: string; countryCode: string; status: string; registryVersionId: string; unionFingerprint: string | null; unionTaxa: number; expectedRegions: number; completedRegions: number; inputFingerprint: string; responseFingerprint: string | null }
  taxa: ContentTaxon[]
  assets: ContentAsset[]
  work: ContentWork[]
  taxonomyQuarantine: Record<string, number>
  optional: { soundTaxa: number; interactionTaxa: number }
}
type Finding = { code: string; scope: string; message: string }
type Sample = { assetId: string; gbifKey: number; tile: string; position: number; origin: string; url: string; sourceUrl: string; licence: string; licenceUrl: string | null; reasons: string[] }
const hash = z.string().regex(/^[0-9a-f]{64}$/)
const officialApiEvidenceSchema = z.object({
  provider: z.literal('iNaturalist'), photoId: z.number().int().positive(), sourcePageUrl: z.string().url(),
  requestUrl: z.string().url(),
  cachePath: z.string().trim().min(1), cacheSha256: hash, retrievedAt: z.string().datetime({ offset: true }),
  licenceMappingUrl: z.string().url(),
}).strict()
const networkReviewSchema = z.object({
  schemaVersion: z.literal(1), catalogueId: z.string().min(1), contentFingerprint: hash,
  reviewer: z.string().trim().min(1), reviewedAt: z.string().datetime({ offset: true }), notes: z.string().trim().min(1),
  samples: z.array(z.object({ assetId: z.string().min(1), url: z.string().url(), method: z.enum(['browser', 'decoded-image']), rendered: z.boolean(), sourcePageChecked: z.boolean(), officialApiEvidence: officialApiEvidenceSchema.optional(), attributionChecked: z.boolean(), licenceChecked: z.boolean(), evidence: z.string().trim().min(1) }).strict()),
}).strict()
export type ContentNetworkReview = z.infer<typeof networkReviewSchema>
export const parseContentNetworkReview = (value: unknown) => networkReviewSchema.parse(value)
export type ContentUrlCheckReport = { schemaVersion: number; catalogueId: string; unionFingerprint: string | null; generatedAt: string; targetsFingerprint: string; assets: number; urls: number; passed: number; failed: number; pending: number; checks: NetworkCheck[] }
const URL_CHECK_MAX_AGE_MS = 24 * 60 * 60_000
const urlReportSchema = z.object({ schemaVersion: z.literal(1), catalogueId: z.string().min(1), unionFingerprint: hash, generatedAt: z.string().datetime({ offset: true }), targetsFingerprint: hash,
  assets: z.number().int().nonnegative(), urls: z.number().int().nonnegative(), passed: z.number().int().nonnegative(), failed: z.number().int().nonnegative(), pending: z.number().int().nonnegative(),
  checks: z.array(z.object({ url: z.string(), checkedAt: z.string().datetime({ offset: true }), ok: z.boolean(), status: z.number().int().nullable(), method: z.enum(['HEAD', 'GET']), contentType: z.string().nullable(), finalUrl: z.string().nullable(), reason: z.string().nullable() }).strict()),
}).passthrough()
export const parseContentUrlReport = (value: unknown): ContentUrlCheckReport => urlReportSchema.parse(value)
export type ContentAuditReport = {
  schemaVersion: 1
  catalogue: ContentAuditSnapshot['catalogue']
  contentFingerprint: string
  taxonFingerprint: string
  versions: typeof CONTENT_WORK_VERSIONS
  taxa: { total: number; perTile: Record<string, number>; germanNames: number; englishNames: number; scientificFallbacks: number }
  galleries: { images: number; completedZero: number; sizes: Record<'0' | '1' | '2-11' | '12', number>; origins: Record<string, number>; leadOrigins: Record<string, number>; rejectedCandidates: number; cappedTaxa: number; rejections: Record<string, number> }
  work: Record<'names' | 'gallery', Record<string, number>>
  namesOutcomes: Record<string, number>
  taxonomyQuarantine: Record<string, number>
  optional: { introTaxa: number; factsTaxa: number; proseTaxa: number; contentAtTaxa: number; soundTaxa: number; interactionTaxa: number }
  defects: Finding[]
  blockers: string[]
  coverageLimits: Finding[]
  failures: Array<{ taxonId: string; kind: string; error: string | null }>
  network: { status: 'pending' | 'sample-passed' | 'failed'; sampledRenderingOnly: true; targets: Sample[]; reviewed: number; evidenceFingerprint: string | null; urlChecks: { supplied: boolean; reportFingerprint: string | null; urls: number; passed: number; failed: number; pending: number } }
  requestAccounting: string
  verdict: 'blocked' | 'ready-for-transfer'
}
const object = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
const nonempty = (value: unknown) => typeof value === 'string' && Boolean(value.trim())
const bump = (counts: Record<string, number>, key: string) => { counts[key] = (counts[key] ?? 0) + 1 }
const bucket = (size: number): '0' | '1' | '2-11' | '12' => size === 0 ? '0' : size === 1 ? '1' : size < 12 ? '2-11' : '12'

/** Owner-approved alternative to an inaccessible public page, never an alternative to checking rights. */
function officialApiSourcePassed(sample: ContentNetworkReview['samples'][number], asset: ContentAsset | undefined, now: number) {
  const evidence = sample.officialApiEvidence
  if (!evidence || !asset || asset.origin !== 'inat' || evidence.sourcePageUrl !== asset.sourceUrl) return false
  const source = new URL(evidence.sourcePageUrl), mapping = new URL(evidence.licenceMappingUrl), request = new URL(evidence.requestUrl)
  const retrieved = Date.parse(evidence.retrievedAt)
  return source.protocol === 'https:' && !source.username && !source.password && !source.port &&
    ['www.inaturalist.org', 'inaturalist.org'].includes(source.hostname) && source.pathname === `/photos/${evidence.photoId}` &&
    request.protocol === 'https:' && request.hostname === 'api.inaturalist.org' && !request.username && !request.password && !request.port && !request.search && !request.hash && /^\/v1\/taxa\/[1-9][0-9]*$/.test(request.pathname) &&
    mapping.protocol === 'https:' && !mapping.username && !mapping.password && !mapping.port &&
    (['www.inaturalist.org', 'inaturalist.org'].includes(mapping.hostname) ||
      (mapping.hostname === 'github.com' && /^\/inaturalist\/inaturalist\/blob\/[0-9a-f]{40}\//.test(mapping.pathname))) &&
    Number.isFinite(retrieved) && retrieved <= now && now - retrieved < 30 * 24 * 60 * 60_000
}

/** Bind the retained official detail response to the published photo, not merely a hash of arbitrary JSON. */
export function validateOfficialApiRecord(sample: ContentNetworkReview['samples'][number], asset: ContentAsset | undefined, scientificName: string | undefined, record: unknown) {
  const evidence = sample.officialApiEvidence
  const reject = () => { throw new Error(`official API record does not reproduce reviewed photo ${sample.assetId}`) }
  if (!evidence || !asset || asset.origin !== 'inat' || !scientificName) return reject()
  const payload = object(record)
  if (!Array.isArray(payload?.results) || payload.results.length !== 1) return reject()
  const taxon = object(payload.results[0])
  const request = new URL(evidence.requestUrl)
  if (!taxon || !Number.isSafeInteger(taxon.id) || request.pathname !== `/v1/taxa/${taxon.id}` || taxon.name !== scientificName ||
    (taxon.taxon_photos !== undefined && !Array.isArray(taxon.taxon_photos))) return reject()
  const photos: Record<string, unknown>[] = []
  const detailedPhotos: Record<string, unknown>[] = []
  if (taxon.default_photo !== null && taxon.default_photo !== undefined) {
    const photo = object(taxon.default_photo)
    if (!photo) return reject()
    photos.push(photo)
  }
  for (const entry of (taxon.taxon_photos ?? []) as unknown[]) {
    const photo = object(object(entry)?.photo)
    if (!photo) return reject()
    photos.push(photo)
    detailedPhotos.push(photo)
  }
  const matched = photos.filter((photo) => photo.id === evidence.photoId)
  const matchedDetailed = detailedPhotos.filter((photo) => photo.id === evidence.photoId)
  // The common iNaturalist version map is not proof of an imported source's original licence.
  // Only actual taxon_photos entries count as detailed evidence, even if default_photo has
  // identical fields. Every matching detailed peer must be complete and native-free.
  if (!matchedDetailed.length || !matchedDetailed.every((photo) => photo.type === 'LocalPhoto' && photo.native_page_url === null && photo.native_photo_id === null) ||
    matched.some((photo) => (photo.type != null && photo.type !== 'LocalPhoto') ||
      (photo.native_page_url != null && photo.native_page_url !== '') || (photo.native_photo_id != null && photo.native_photo_id !== ''))) return reject()
  const clean = (value: unknown) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
  for (const photo of matched) {
    const author = clean(photo.attribution_name) || clean(photo.attribution).replace(/^\(c\)\s*/i, '').replace(/,.*$/, '').trim()
    const code = typeof photo.license_code === 'string' ? photo.license_code : null
    const render = typeof photo.medium_url === 'string' ? photo.medium_url : typeof photo.url === 'string' ? photo.url.replace('square', 'medium') : null
    if (!render || !safeReferenceUrl(render) || normalizedRemoteUrl(render) !== normalizedRemoteUrl(asset.url) || author !== asset.author || !inatLicensed(code) ||
      inatLicence(code!) !== asset.licence || inatLicenceUrl(code!) !== asset.licenceUrl) return reject()
  }
}

function sampleTargets(snapshot: ContentAuditSnapshot): Sample[] {
  const taxa = new Map(snapshot.taxa.map((taxon) => [taxon.id, taxon]))
  const counts = new Map<string, number>()
  for (const asset of snapshot.assets) counts.set(asset.taxonId, (counts.get(asset.taxonId) ?? 0) + 1)
  const ordered = [...snapshot.assets].filter((a) => qualifiedReference(a) && validReferenceImage(a) && taxa.has(a.taxonId))
    .sort((a, b) => taxa.get(a.taxonId)!.gbifKey - taxa.get(b.taxonId)!.gbifKey || a.position - b.position || a.id.localeCompare(b.id))
  const reasons = new Map<string, Set<string>>()
  const add = (asset: ContentAsset | undefined, reason: string) => { if (asset) (reasons.get(asset.id) ?? reasons.set(asset.id, new Set()).get(asset.id)!).add(reason) }
  for (const tile of TILES) add(ordered.find((a) => taxa.get(a.taxonId)!.tile === tile), `tile:${tile}`)
  for (const origin of ['inat', 'commons']) add(ordered.find((a) => a.origin === origin), `origin:${origin}`)
  for (const size of ['1', '2-11', '12']) add(ordered.find((a) => bucket(counts.get(a.taxonId)!) === size), `gallery-size:${size}`)
  add(ordered.find((a) => a.position === 0), 'lead')
  add(ordered.find((a) => a.position > 0), 'non-lead')
  return ordered.filter((a) => reasons.has(a.id)).map((a) => ({ assetId: a.id, gbifKey: taxa.get(a.taxonId)!.gbifKey, tile: taxa.get(a.taxonId)!.tile,
    position: a.position, origin: a.origin, url: a.url, sourceUrl: a.sourceUrl, licence: a.licence, licenceUrl: a.licenceUrl, reasons: [...reasons.get(a.id)!].sort() }))
}

export function buildContentAudit(snapshot: ContentAuditSnapshot, review: ContentNetworkReview | null = null, urlReport: ContentUrlCheckReport | null = null, now: () => Date = () => new Date()): ContentAuditReport {
  const auditNow = now().getTime()
  if (!Number.isFinite(auditNow)) throw new Error('content audit clock must return a valid date')
  const defects: Finding[] = [], coverageLimits: Finding[] = []
  const fail = (code: string, scope: string, message: string) => defects.push({ code, scope, message })
  const digests = contentSnapshotDigests(snapshot)
  const ids = new Set(snapshot.taxa.map((taxon) => taxon.id))
  const keys = snapshot.taxa.map((taxon) => taxon.gbifKey).sort((a, b) => a - b)
  if (snapshot.catalogue.countryCode !== 'DE' || snapshot.catalogue.status !== 'active' || snapshot.catalogue.completedRegions !== snapshot.catalogue.expectedRegions) fail('catalogue-not-active-complete', 'catalogue', 'content handoff requires the active, complete German catalogue')
  if (ids.size !== snapshot.taxa.length || new Set(keys).size !== keys.length || keys.length !== snapshot.catalogue.unionTaxa || contentDigest(keys) !== snapshot.catalogue.unionFingerprint) fail('union-identity', 'catalogue', 'loaded taxon identities do not reproduce the accepted union count and fingerprint')
  const taxa = { total: snapshot.taxa.length, perTile: {} as Record<string, number>, germanNames: 0, englishNames: 0, scientificFallbacks: 0 }
  const optional = { introTaxa: 0, factsTaxa: 0, proseTaxa: 0, contentAtTaxa: 0, ...snapshot.optional }
  const names = new Set<string>()
  for (const taxon of snapshot.taxa) {
    if (!Number.isSafeInteger(taxon.gbifKey) || taxon.gbifKey <= 0 || taxon.rank !== 'species' || !(TILES as readonly string[]).includes(taxon.tile) || !nonempty(taxon.sciName) || taxon.sciName !== taxon.sciName.trim()) fail('taxon-identity', taxon.id, 'invalid accepted species identity, scientific fallback or tile')
    const canonical = taxon.sciName.normalize('NFKC').toLowerCase()
    if (names.has(canonical)) fail('duplicate-scientific-name', taxon.id, taxon.sciName)
    names.add(canonical)
    const common = object(taxon.commonNames)
    if (!common || Object.values(common).some((value) => !nonempty(value))) fail('common-name-shape', taxon.id, 'common names must contain nonempty strings')
    const named = (lang: string) => nonempty(common?.[lang]) && (common![lang] as string).trim().toLowerCase() !== canonical
    taxa.germanNames += Number(named('de')); taxa.englishNames += Number(named('en')); taxa.scientificFallbacks += Number(!named('de'))
    bump(taxa.perTile, taxon.tile)
    optional.introTaxa += Number(Boolean(object(taxon.intro) && Object.keys(object(taxon.intro)!).length))
    optional.factsTaxa += Number(Boolean(object(taxon.facts) && Object.keys(object(taxon.facts)!).length))
    optional.proseTaxa += Number(Boolean(object(taxon.prose) && Object.keys(object(taxon.prose)!).length))
    optional.contentAtTaxa += Number(taxon.contentAt !== null)
  }
  const galleries: ContentAuditReport['galleries'] = { images: snapshot.assets.length, completedZero: 0, sizes: { '0': 0, '1': 0, '2-11': 0, '12': 0 }, origins: {}, leadOrigins: {}, rejectedCandidates: 0, cappedTaxa: 0, rejections: {} }
  const byTaxon = Map.groupBy(snapshot.assets, (asset) => asset.taxonId)
  for (const asset of snapshot.assets) if (!ids.has(asset.taxonId) || !qualifiedReference(asset)) fail('unqualified-asset', asset.id, 'asset is outside the active union or is not an exclusively global reference image')
  for (const taxon of snapshot.taxa) {
    const assets = [...(byTaxon.get(taxon.id) ?? [])].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
    bump(galleries.sizes, bucket(assets.length))
    if (assets.length > 12 || assets.some((asset, index) => asset.position !== index)) fail('gallery-order', taxon.id, 'gallery must have zero to 12 images at consecutive positions starting at zero')
    const urls = new Set<string>(), pages = new Set<string>()
    for (const asset of assets) {
      const exclusion = scientificGalleryExclusion(asset)
      if (exclusion) fail('gallery-scientific-exclusion', asset.id, `${exclusion.ruleId}: ${exclusion.reason}; ${exclusion.evidence}`)
      bump(galleries.origins, asset.origin)
      if (asset.position === 0) bump(galleries.leadOrigins, asset.origin)
      if (!validReferenceImage(asset) || !safeReferenceUrl(asset.url) || !nonempty(asset.caption)) { fail('gallery-metadata', asset.id, 'invalid render/source URL, author, caption or licence metadata'); continue }
      const source = new URL(asset.sourceUrl)
      if (source.username || source.password || (source.port && source.port !== '443') || !(asset.origin === 'inat' ? ['www.inaturalist.org', 'inaturalist.org'].includes(source.hostname) && /^\/photos\/\d+\/?$/.test(source.pathname) : source.hostname === 'commons.wikimedia.org' && /^\/wiki\/File:/.test(source.pathname))) fail('gallery-source-origin', asset.id, 'source page does not belong to the claimed image provider')
      const url = normalizedRemoteUrl(asset.url), page = normalizedRemoteUrl(asset.sourceUrl)
      if (urls.has(url) || pages.has(page)) fail('gallery-duplicate', asset.id, 'normalized image URL or source page occurs more than once within this taxon')
      urls.add(url); pages.add(page)
    }
  }
  const work = { names: { missing: 0, pending: 0, running: 0, failed: 0, complete: 0 }, gallery: { missing: 0, pending: 0, running: 0, failed: 0, complete: 0 } } as ContentAuditReport['work']
  const namesOutcomes: Record<string, number> = {}, failures: ContentAuditReport['failures'] = []
  const currentWork = snapshot.work.filter(relevantWork)
  const workByKey = Map.groupBy(currentWork, (row) => `${row.taxonId}|${row.kind}`)
  for (const row of currentWork) if (!ids.has(row.taxonId)) fail('out-of-union-work', row.taxonId, 'work checkpoint is outside this catalogue')
  for (const taxon of snapshot.taxa) for (const kind of ['names', 'gallery'] as const) {
    const rows = workByKey.get(`${taxon.id}|${kind}`) ?? []
    if (rows.length !== 1) {
      work[kind].missing++
      if (rows.length) fail('duplicate-work', taxon.id, `expected exactly one ${kind} checkpoint for ${CONTENT_WORK_VERSIONS[kind]}`)
      continue
    }
    const row = rows[0]!
    bump(work[kind], row.status)
    if (row.status !== 'complete') {
      if (!['pending', 'running', 'failed'].includes(row.status)) fail('work-status', taxon.id, `${kind} has unknown status ${row.status}`)
      if (row.status === 'failed') failures.push({ taxonId: taxon.id, kind, error: row.error })
      continue
    }
    if (!row.completedAt || !Number.isFinite(Date.parse(row.completedAt)) || !row.sourceFingerprint || !/^[0-9a-f]{64}$/.test(row.sourceFingerprint) || row.error !== null || row.leaseOwner !== null || row.leaseExpiresAt !== null) fail('work-completion', taxon.id, `${kind} lacks a valid completed checkpoint`)
    const summary = object(row.resultSummary)
    if (!summary) { fail('work-summary', taxon.id, `${kind} summary is missing`); continue }
    if (kind === 'names') {
      const source = object(summary.source), selected = object(summary.selected), added = object(summary.added), currentNames = object(taxon.commonNames)
      const outcome = typeof summary.outcome === 'string' ? summary.outcome : 'invalid'
      if (!['matched', 'scientific-fallback', 'non-species', 'ambiguous'].includes(outcome) || !selected || !added || !source || !object(source.labels) || !object(source.sitelinks) || !['P846', 'name', 'none'].includes(String(source.path)) || typeof summary.changed !== 'boolean') fail('names-work-summary', taxon.id, 'completed names checkpoint lacks its outcome, selected/added names or source evidence')
      if (selected && Object.values(selected).some((value) => !nonempty(value))) fail('names-selected-shape', taxon.id, 'selected common names must be nonempty strings')
      if (added && (Object.entries(added).some(([language, name]) => !nonempty(name) || selected?.[language] !== name || currentNames?.[language] !== name) || summary.changed !== Boolean(Object.keys(added).length))) fail('names-publication-drift', taxon.id, 'added names no longer reproduce the completed publication')
      if (outcome !== 'matched' && selected && Object.keys(selected).length) fail('names-fallback-publication', taxon.id, 'ambiguous or fallback name work cannot publish candidate names')
      bump(namesOutcomes, outcome)
    } else {
      const assets = byTaxon.get(taxon.id) ?? []
      const coverage = object(summary.coverage)
      if (assets.length === 0 && summary.images === 0 && summary.zero === true) galleries.completedZero++
      if (summary.images !== assets.length || summary.zero !== (assets.length === 0) || summary.inatImages !== assets.filter((a) => a.origin === 'inat').length || summary.commonsImages !== assets.filter((a) => a.origin === 'commons').length || typeof coverage?.inat !== 'boolean' || typeof coverage?.commons !== 'boolean' || !Array.isArray(summary.rejections)) fail('gallery-work-summary', taxon.id, 'completed gallery checkpoint differs from live image counts or lacks source/rejection evidence')
      const accepted = Array.isArray(summary.acceptedEvidence) ? summary.acceptedEvidence.map(object) : []
      const responses = Array.isArray(summary.sourceResponses) ? summary.sourceResponses.map(object) : []
      const responseEvidence = responses.flatMap((entry) => entry && typeof entry.url === 'string' && typeof entry.responseFingerprint === 'string' &&
        (/^[0-9a-f]{64}$/.test(entry.responseFingerprint) || entry.responseFingerprint === '404')
        ? [{ url: entry.url, responseFingerprint: entry.responseFingerprint }] : [])
      if (!Array.isArray(summary.acceptedEvidence) || accepted.some((entry) => !entry) || accepted.length !== assets.length ||
        !Array.isArray(summary.sourceResponses) || responseEvidence.length !== responses.length || responseEvidenceFingerprint(responseEvidence) !== row.sourceFingerprint) {
        fail('gallery-source-evidence', taxon.id, 'completed gallery checkpoint does not bind every accepted asset and exact captured source response')
      }
      const evidenceAt = new Map<number, Record<string, unknown>>()
      for (const item of accepted) {
        if (!item || !Number.isSafeInteger(item.position) || evidenceAt.has(item.position as number)) continue
        evidenceAt.set(item.position as number, item)
      }
      for (const asset of assets) {
        const item = evidenceAt.get(asset.position)
        const sameAsset = item && ['origin', 'url', 'author', 'licence', 'licenceUrl', 'sourceUrl', 'caption'].every((field) => item[field] === asset[field])
        if (!sameAsset || typeof item!.sourceId !== 'string') {
          fail('gallery-accepted-evidence', asset.id, 'accepted source evidence does not reproduce the live ordered asset')
          continue
        }
        if (asset.origin === 'commons') {
          const normalizeTitle = (value: string) => {
            try { return decodeURIComponent(value).replace(/_/g, ' ').replace(/\s+/g, ' ').trim() } catch { return '' }
          }
          const sourceId = String(item!.sourceId)
          const title = sourceId.startsWith('commons:') ? normalizeTitle(sourceId.slice('commons:'.length)) : ''
          let pageTitle = ''
          try {
            const page = new URL(asset.sourceUrl)
            if (page.hostname === 'commons.wikimedia.org' && page.pathname.startsWith('/wiki/')) pageTitle = normalizeTitle(page.pathname.slice('/wiki/'.length))
            if (page.hostname === 'commons.wikimedia.org' && page.pathname === '/w/index.php') pageTitle = normalizeTitle(page.searchParams.get('title') ?? '')
          } catch { /* The separate asset metadata checks report malformed URLs. */ }
          const captured = responseEvidence.some((entry) => {
            if (entry.responseFingerprint === '404') return false
            try {
              const request = new URL(entry.url)
              return request.hostname === 'commons.wikimedia.org' && request.pathname === '/w/api.php' &&
                (request.searchParams.get('titles') ?? '').split('|').some((candidate) => normalizeTitle(candidate) === title)
            } catch { return false }
          })
          if (!title || title !== pageTitle || !captured) {
            fail('gallery-accepted-evidence', asset.id, 'Commons accepted evidence lacks its exact source identity or captured provider response')
          }
          continue
        }
        const photoId = item!.photoId
        const provenance = object(item!.provenance)
        const records = Array.isArray(provenance?.evidence) ? provenance.evidence.map(object) : []
        const detailed = records.filter((record) => record?.detailed === true)
        let metadataMatches = records.length > 0
        for (const record of records) {
          const author = typeof record?.attributionName === 'string' && record.attributionName.trim()
            ? record.attributionName.replace(/\s+/g, ' ').trim()
            : typeof record?.attribution === 'string' ? record.attribution.replace(/\s+/g, ' ').trim().replace(/^\(c\)\s*/i, '').replace(/,.*$/, '').trim() : ''
          const renderUrl = typeof record?.mediumUrl === 'string' && record.mediumUrl ? record.mediumUrl
            : typeof record?.url === 'string' ? record.url.replace('square', 'medium') : null
          if (!record || record.photoId !== photoId || !renderUrl ||
            !inatLicensed(typeof record.licenseCode === 'string' ? record.licenseCode : null) || author !== asset.author ||
            inatLicence(record.licenseCode as string) !== asset.licence || inatLicenceUrl(record.licenseCode as string) !== asset.licenceUrl) { metadataMatches = false; continue }
          try { if (normalizedRemoteUrl(renderUrl) !== normalizedRemoteUrl(asset.url)) metadataMatches = false } catch { metadataMatches = false }
        }
        const native = provenance?.status === 'native-free-local-photo' && provenance.conflictingMetadata === false &&
          provenance.totalRecords === records.length && provenance.detailedRecords === detailed.length && detailed.length > 0 &&
          records.every((record) => record && (record.type === null || record.type === 'LocalPhoto') &&
            (record.nativePageUrl === null || record.nativePageUrl === '') && (record.nativePhotoId === null || record.nativePhotoId === '') &&
            Array.isArray(record.missingFields)) && detailed.every((record) => record?.type === 'LocalPhoto' && record.nativePageUrl === null && record.nativePhotoId === null && (record.missingFields as unknown[]).length === 0)
        const detailUrl = Number.isSafeInteger(item!.taxonId) && Number(item!.taxonId) > 0 ? `https://api.inaturalist.org/v1/taxa/${item!.taxonId}` : null
        if (!Number.isSafeInteger(photoId) || Number(photoId) <= 0 || item!.sourceId !== `inat:${photoId}` || item!.sourceUrl !== `https://www.inaturalist.org/photos/${photoId}` ||
          item!.matchedName !== taxon.sciName || !native || !metadataMatches || !detailUrl || !responseEvidence.some((entry) => entry.url === detailUrl && entry.responseFingerprint !== '404')) {
          fail('gallery-accepted-provenance', asset.id, 'accepted iNaturalist asset lacks complete, consistent native LocalPhoto proof bound to its detail response')
        }
      }
      let capped = false
      for (const rejection of Array.isArray(summary.rejections) ? summary.rejections : []) {
        const item = object(rejection)
        if (!nonempty(item?.reason) || !nonempty(item?.source)) { fail('gallery-rejection-shape', taxon.id, 'malformed candidate rejection'); continue }
        const reason = item!.reason as string
        if (reason === 'ambiguous-species-attribution') {
          const source = item!.source as string
          const exclusion = source.startsWith('commons:') ? scientificGalleryExclusion({ origin: 'commons', sourceId: source.slice(8) }) : null
          if (!exclusion || canonicalContent(item!.review ?? null) !== canonicalContent(exclusion)) fail('gallery-exclusion-evidence', taxon.id, 'scientific source rejection lacks its exact reviewed rule/evidence')
        }
        bump(galleries.rejections, reason)
        if (reason === 'gallery-cap') capped = true
        else galleries.rejectedCandidates++
      }
      galleries.cappedTaxa += Number(capped)
    }
  }
  if (taxa.scientificFallbacks) coverageLimits.push({ code: 'scientific-name-fallback', scope: 'catalogue', message: `${taxa.scientificFallbacks} taxa use a scientific German-language fallback; missing common names are not missing species` })
  if (galleries.completedZero) coverageLimits.push({ code: 'zero-image-gallery', scope: 'catalogue', message: `${galleries.completedZero} completed gallery searches found no eligible reference image; unprocessed empty galleries are tracked separately as unfinished work` })
  if (galleries.rejectedCandidates) coverageLimits.push({ code: 'rejected-gallery-candidates', scope: 'catalogue', message: `${galleries.rejectedCandidates} source candidates were excluded by the gallery policy; reasons are reported separately` })
  const targets = sampleTargets(snapshot)
  let networkStatus: ContentAuditReport['network']['status'] = 'pending', reviewed = 0
  if (review) {
    const parsed = networkReviewSchema.safeParse(review)
    if (!parsed.success || review.catalogueId !== snapshot.catalogue.id || review.contentFingerprint !== digests.contentFingerprint) fail('network-review-binding', 'review', 'network evidence does not match this catalogue content snapshot')
    else {
      const sampleIds = new Set<string>()
      for (const sample of review.samples) {
        if (sampleIds.has(sample.assetId)) fail('network-review-duplicate', sample.assetId, 'network sample occurs more than once')
        sampleIds.add(sample.assetId)
        const asset = snapshot.assets.find((a) => a.id === sample.assetId)
        if (!asset || sample.url !== asset.url) fail('network-review-asset', sample.assetId, 'sample does not identify the current image URL')
        const apiPassed = officialApiSourcePassed(sample, asset, auditNow)
        if (sample.officialApiEvidence && !apiPassed) fail('network-review-api-evidence', sample.assetId, 'official API evidence must bind this iNaturalist photo, a recent retained record and official licence-version mapping')
        if (!sample.rendered || !(sample.sourcePageChecked || apiPassed) || !sample.attributionChecked || !sample.licenceChecked) fail('network-review-failed', sample.assetId, 'sample rendering, source, attribution or licence check failed')
      }
      for (const target of targets) {
        const sample = review.samples.find((s) => s.assetId === target.assetId)
        if (!sample) fail('network-review-missing', target.assetId, 'required representative image has no network review')
        else if (sample.rendered && (sample.sourcePageChecked || officialApiSourcePassed(sample, snapshot.assets.find((a) => a.id === sample.assetId), auditNow)) && sample.attributionChecked && sample.licenceChecked) reviewed++
      }
      networkStatus = defects.some((finding) => finding.code.startsWith('network-review-')) ? 'failed' : 'sample-passed'
    }
    if (networkStatus === 'pending') networkStatus = 'failed'
  }
  if (!targets.length && snapshot.assets.length === 0) networkStatus = 'sample-passed'
  if (networkStatus === 'pending') coverageLimits.push({ code: 'network-review-pending', scope: 'catalogue', message: 'URL syntax and metadata passed independently; representative image decoding/browser and source/licence review remain pending' })
  const currentUrls = new Set(snapshot.assets.map((asset) => asset.url))
  const urlChecks: ContentAuditReport['network']['urlChecks'] = { supplied: Boolean(urlReport), reportFingerprint: urlReport ? contentDigest(urlReport) : null, urls: currentUrls.size, passed: 0, failed: 0, pending: urlReport ? 0 : currentUrls.size }
  if (urlReport) {
    const assets = [...snapshot.assets].sort((a, b) => a.id.localeCompare(b.id)).map(({ id, taxonId, position, url }) => ({ id, taxonId, position, url }))
    const targetsFingerprint = createHash('sha256').update(JSON.stringify(assets)).digest('hex')
    const urls = new Set(assets.map((asset) => asset.url)), seen = new Set<string>()
    const generated = Date.parse(urlReport.generatedAt)
    if (urlReport.schemaVersion !== 1 || urlReport.catalogueId !== snapshot.catalogue.id || urlReport.unionFingerprint !== snapshot.catalogue.unionFingerprint || urlReport.targetsFingerprint !== targetsFingerprint || urlReport.assets !== assets.length || urlReport.urls !== urls.size || !Number.isFinite(generated) || generated > auditNow || auditNow - generated >= URL_CHECK_MAX_AGE_MS || !Array.isArray(urlReport.checks)) fail('url-report-binding', 'review', 'URL report does not describe the current, recent, complete image target set')
    urlChecks.urls = urls.size
    for (const raw of Array.isArray(urlReport.checks) ? urlReport.checks : []) {
      const check = object(raw)
      if (!check || typeof check.url !== 'string' || !urls.has(check.url) || seen.has(check.url)) { fail('url-report-check', 'review', 'URL checks contain a malformed, duplicate or unknown target'); continue }
      seen.add(check.url)
      const checked = typeof check.checkedAt === 'string' ? Date.parse(check.checkedAt) : NaN
      const passed = check.ok === true && Number.isInteger(check.status) && Number(check.status) >= 200 && Number(check.status) < 300 &&
        typeof check.contentType === 'string' && check.contentType.startsWith('image/') && typeof check.finalUrl === 'string' && safeReferenceUrl(check.finalUrl) &&
        ['HEAD', 'GET'].includes(String(check.method)) && check.reason === null && Number.isFinite(checked) && checked <= generated && checked <= auditNow && auditNow - checked < URL_CHECK_MAX_AGE_MS
      urlChecks[passed ? 'passed' : 'failed']++
    }
    urlChecks.pending = urls.size - seen.size
    if (urlChecks.failed || urlChecks.pending || urlReport.failed !== urlChecks.failed || urlReport.pending !== urlChecks.pending || urlReport.passed !== urlChecks.passed) fail('url-report-incomplete', 'review', 'supplied URL report has failed/missing/stale checks or inconsistent counts; HTTP checks do not replace sampled image decoding')
  }
  defects.sort((a, b) => a.code.localeCompare(b.code) || a.scope.localeCompare(b.scope))
  const blockers = [
    ...(defects.length ? [`${defects.length} content/evidence validation defects`] : []),
    ...Object.entries(work).flatMap(([kind, counts]) => Object.entries(counts).filter(([status, count]) => status !== 'complete' && count > 0).map(([status, count]) => `${kind}: ${count} ${status} checkpoints`)),
    ...(networkStatus !== 'sample-passed' ? [`sampled image review ${networkStatus}`] : []),
    ...(snapshot.assets.length > 0 && !urlReport ? ['full image URL report missing'] : []),
  ]
  return { schemaVersion: 1, catalogue: snapshot.catalogue, ...digests, versions: CONTENT_WORK_VERSIONS, taxa, galleries, work, namesOutcomes, taxonomyQuarantine: snapshot.taxonomyQuarantine,
    optional, defects, blockers, coverageLimits, failures, network: { status: networkStatus, sampledRenderingOnly: true, targets, reviewed, evidenceFingerprint: review ? contentDigest(review) : null, urlChecks },
    requestAccounting: 'Global work checkpoints record source outcomes, rejections and attempts; exact network/cache/retry counts belong to the separately retained per-run reports and cannot be reconstructed from attempts.',
    verdict: blockers.length === 0 ? 'ready-for-transfer' : 'blocked' }
}

export function networkReviewTemplate(audit: ContentAuditReport) {
  return { schemaVersion: 1, catalogueId: audit.catalogue.id, contentFingerprint: audit.contentFingerprint, reviewer: '', reviewedAt: '', notes: '',
    samples: audit.network.targets.map((sample) => ({ assetId: sample.assetId, url: sample.url, method: 'browser', rendered: false, sourcePageChecked: false, attributionChecked: false, licenceChecked: false, evidence: '' })) }
}

export function requireLocalContentDatabase(connectionString = process.env.DATABASE_URL) {
  if (!connectionString || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(connectionString).hostname)) throw new Error('content audit requires an explicit local Postgres DATABASE_URL')
  return connectionString
}

/** Caller owns the repeatable-read transaction; only allowlisted non-personal content is loaded. */
export async function loadContentSnapshot(client: Client, catalogueId: string): Promise<ContentAuditSnapshot> {
  const result = await client.query<ContentAuditSnapshot['catalogue']>(`SELECT id, "runKey", "countryCode", status, "registryVersionId", "unionFingerprint", "unionTaxa", "expectedRegions", "completedRegions", "inputFingerprint", "responseFingerprint" FROM "CatalogueVersion" WHERE id=$1 OR ("countryCode"='DE' AND "runKey"=$1)`, [catalogueId])
  if (result.rows.length !== 1) throw new Error('catalogue must uniquely identify an existing German run')
  const catalogue = result.rows[0]!
  const taxa = await client.query<{ row: ContentTaxon }>(`SELECT to_jsonb(t) AS row FROM "Taxon" t JOIN "CatalogueTaxon" c ON c."taxonId"=t.id WHERE c."catalogueVersionId"=$1 ORDER BY t.id`, [catalogue.id])
  const assets = await client.query<{ row: ContentAsset }>(`SELECT to_jsonb(a) || '{"avatarOf":false}'::jsonb AS row FROM "Asset" a JOIN "CatalogueTaxon" c ON c."taxonId"=a."taxonId" WHERE c."catalogueVersionId"=$1 AND a.kind='image' AND a.origin IN ('inat','commons') AND a."ownerId" IS NULL AND a."sightingId" IS NULL AND NOT EXISTS (SELECT 1 FROM "Identity" i WHERE i."avatarAssetId"=a.id) ORDER BY a.id`, [catalogue.id])
  const work = await client.query<{ row: ContentWork }>(`SELECT to_jsonb(w) AS row FROM "TaxonEnrichmentWork" w JOIN "CatalogueTaxon" c ON c."taxonId"=w."taxonId" WHERE c."catalogueVersionId"=$1 AND ((w.kind='names' AND w.version=$2) OR (w.kind='gallery' AND w.version=$3)) ORDER BY w."taxonId", w.kind, w.version`, [catalogue.id, CONTENT_WORK_VERSIONS.names, CONTENT_WORK_VERSIONS.gallery])
  const quarantine = await client.query<{ reason: string; count: number }>(`SELECT "rejectionReason" AS reason, count(*)::int AS count FROM "CatalogueTaxonomyResolution" WHERE "catalogueVersionId"=$1 AND "rejectionReason" IS NOT NULL GROUP BY "rejectionReason" ORDER BY "rejectionReason"`, [catalogue.id])
  const [optional] = (await client.query<ContentAuditSnapshot['optional']>(`SELECT
    (SELECT count(DISTINCT a."taxonId")::int FROM "Asset" a JOIN "CatalogueTaxon" c ON c."taxonId"=a."taxonId" WHERE c."catalogueVersionId"=$1 AND a.kind='sound' AND a."ownerId" IS NULL AND a."sightingId" IS NULL AND NOT EXISTS (SELECT 1 FROM "Identity" i WHERE i."avatarAssetId"=a.id)) AS "soundTaxa",
    (SELECT count(DISTINCT i."sourceId")::int FROM "Interaction" i JOIN "CatalogueTaxon" c ON c."taxonId"=i."sourceId" WHERE c."catalogueVersionId"=$1) AS "interactionTaxa"`, [catalogue.id])).rows
  return { catalogue, taxa: taxa.rows.map((r) => r.row), assets: assets.rows.map((r) => r.row), work: work.rows.map((r) => r.row), taxonomyQuarantine: Object.fromEntries(quarantine.rows.map((r) => [r.reason, r.count])), optional: optional! }
}

export async function writeContentAuditBundle(options: { catalogue: string; output: string; networkReview?: string; urlChecks?: string; now?: () => Date }) {
  const client = new Client({ connectionString: requireLocalContentDatabase() })
  const review = options.networkReview ? parseContentNetworkReview(JSON.parse(await readFile(resolve(options.networkReview), 'utf8'))) : null
  const apiRecords = new Map<string, unknown>()
  // Check retained bytes as well as the reviewer's assertion; no upstream calls or image mirroring.
  for (const sample of review?.samples ?? []) if (sample.officialApiEvidence) {
    const evidence = sample.officialApiEvidence
    const bytes = await readFile(resolve(evidence.cachePath))
    if (createHash('sha256').update(bytes).digest('hex') !== evidence.cacheSha256) throw new Error(`official API evidence bytes changed for ${sample.assetId}`)
    apiRecords.set(sample.assetId, JSON.parse(bytes.toString('utf8')))
  }
  const urlChecks = options.urlChecks ? parseContentUrlReport(JSON.parse(await readFile(resolve(options.urlChecks), 'utf8'))) : null
  await client.connect()
  try {
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
    const snapshot = await loadContentSnapshot(client, options.catalogue)
    for (const sample of review?.samples ?? []) if (sample.officialApiEvidence) {
      const asset = snapshot.assets.find((row) => row.id === sample.assetId)
      validateOfficialApiRecord(sample, asset, snapshot.taxa.find((taxon) => taxon.id === asset?.taxonId)?.sciName, apiRecords.get(sample.assetId))
    }
    const audit = buildContentAudit(snapshot, review, urlChecks, options.now)
    return await publishAuditBundle(options.output, async (staging) => {
      const transfer = audit.verdict === 'ready-for-transfer'
        ? await writeGalleryArtifact({ snapshot, audit, path: resolve(staging, 'gallery-artifact.jsonl') }) : null
      const manifest = { schemaVersion: 1, catalogue: snapshot.catalogue, contentFingerprint: audit.contentFingerprint, taxonFingerprint: audit.taxonFingerprint,
        auditFingerprint: contentDigest(audit), eligible: audit.verdict === 'ready-for-transfer' && Boolean(transfer), blockers: audit.blockers, payload: transfer,
        excludes: ['Identity', 'Filter', 'Sighting', 'Study', 'Passkey', 'EmailCode', 'personal/owned/avatar Asset', 'sound Asset', 'outside-union Asset', 'unrelated/incomplete enrichment work'],
        networkClaim: 'Eligibility requires current full-catalogue HTTP/image-MIME evidence and separately reviewed representative image decoding; neither guarantees future availability or scientific identification.' }
      await Promise.all([writeFile(resolve(staging, 'content-audit.json'), `${canonicalContent(audit)}\n`), writeFile(resolve(staging, 'gallery-transfer-manifest.json'), `${canonicalContent(manifest)}\n`), writeFile(resolve(staging, 'network-review-template.json'), `${canonicalContent(networkReviewTemplate(audit))}\n`)])
      await client.query('COMMIT')
      return { audit, manifest }
    })
  } catch (error) { await client.query('ROLLBACK').catch(() => undefined); throw error }
  finally { await client.end() }
}

export function parseContentAuditArgs(args: string[]) {
  const values = new Map<string, string>()
  for (let index = 0; index < args.length; index++) {
    const flag = args[index]!, value = args[++index]
    if (!['--catalogue', '--output', '--network-review', '--url-checks'].includes(flag) || values.has(flag) || !value || value.startsWith('--')) throw new Error(`invalid content audit argument ${flag}`)
    values.set(flag, value)
  }
  if (!values.has('--catalogue') || !values.has('--output')) throw new Error('usage: npx tsx etl/catalogue-content-audit.ts --catalogue <id-or-run-key> --output <directory> [--network-review <file>] [--url-checks <report>]')
  return { catalogue: values.get('--catalogue')!, output: values.get('--output')!, networkReview: values.get('--network-review'), urlChecks: values.get('--url-checks') }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  writeContentAuditBundle(parseContentAuditArgs(process.argv.slice(2))).then(({ audit }) => {
    console.log(`content audit ${audit.verdict}: ${audit.taxa.total} taxa, ${audit.galleries.images} images, ${audit.defects.length} defects; network ${audit.network.status}`)
    if (audit.verdict !== 'ready-for-transfer') process.exitCode = 2
  }).catch((error) => { console.error(error); process.exitCode = 1 })
}
