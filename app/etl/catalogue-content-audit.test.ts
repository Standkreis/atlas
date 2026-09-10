import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { buildContentAudit, networkReviewTemplate, parseContentAuditArgs, parseContentNetworkReview, parseContentUrlReport, requireLocalContentDatabase, validateOfficialApiRecord, type ContentAuditReport, type ContentAuditSnapshot, type ContentNetworkReview, type ContentAsset, type ContentWork, type ContentUrlCheckReport } from './catalogue-content-audit'
import { CONTENT_WORK_VERSIONS, contentDigest, contentSnapshotDigests } from './catalogue-gallery-transfer'
import { scientificGalleryExclusion } from './gallery'
import { responseEvidenceFingerprint } from './fetch'

const at = '2026-09-09T10:00:00.000Z'
const clock = () => new Date(at)
function fixture(): ContentAuditSnapshot {
  const sizes = [0, 1, 2, 12]
  const taxa = sizes.map((_, i) => ({ id: `taxon-${i}`, gbifKey: i + 1, sciName: `Species ${i}`, rank: 'species', tile: ['bird', 'plant', 'fungus', 'insect'][i]!, commonNames: i ? { de: `Art ${i}`, en: `Common ${i}` } : {}, intro: null, facts: null, prose: null, contentAt: null }))
  const assets: ContentAsset[] = sizes.flatMap((n, i) => Array.from({ length: n }, (_, position) => ({
    id: `asset-${i}-${position}`, taxonId: taxa[i]!.id, kind: 'image', position, createdAt: at,
    url: `https://inaturalist-open-data.s3.amazonaws.com/photos/${i * 100 + position}/medium.jpg`, author: 'Author', licence: 'CC BY 4.0', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: `https://www.inaturalist.org/photos/${i * 100 + position}`,
    origin: 'inat', caption: 'Organism', ownerId: null, sightingId: null, avatarOf: false,
  })))
  const work: ContentWork[] = taxa.flatMap((taxon, i) => Object.entries(CONTENT_WORK_VERSIONS).map(([kind, version]) => {
    const selected = assets.filter((asset) => asset.taxonId === taxon.id)
    const sourceResponses = [{ url: `https://api.inaturalist.org/v1/taxa/${taxon.gbifKey}`, responseFingerprint: `${i + 1}`.repeat(64) }]
    const acceptedEvidence = selected.map((asset) => {
      const photoId = Number(new URL(asset.sourceUrl).pathname.split('/').at(-1))
      return { position: asset.position, url: asset.url, author: asset.author, licence: asset.licence, licenceUrl: asset.licenceUrl, sourceUrl: asset.sourceUrl, origin: 'inat', caption: asset.caption,
        sourceId: `inat:${photoId}`, taxonId: taxon.gbifKey, matchedName: taxon.sciName, photoId,
        provenance: { status: 'native-free-local-photo', detailedRecords: 1, totalRecords: 1, conflictingMetadata: false, evidence: [{ photoId, detailed: true, type: 'LocalPhoto', nativePageUrl: null, nativePhotoId: null,
          missingFields: [], licenseCode: 'cc-by', attribution: null, attributionName: asset.author, mediumUrl: asset.url, url: null }] } }
    })
    return { taxonId: taxon.id, kind, version, status: 'complete', attempts: 1, completedAt: at, error: null, leaseOwner: null, leaseExpiresAt: null,
      sourceFingerprint: kind === 'gallery' ? responseEvidenceFingerprint(sourceResponses) : 'a'.repeat(64),
      resultSummary: kind === 'gallery' ? { images: sizes[i], zero: sizes[i] === 0, changed: true, coverage: { inat: i > 0, commons: false }, rejections: [], acceptedEvidence, sourceResponses, inatImages: sizes[i], commonsImages: 0 }
        : { outcome: 'scientific-fallback', reason: 'No source name', selected: {}, added: {}, changed: false, source: { qid: null, path: 'none', labels: { de: null, en: null, ja: null }, sitelinks: { de: null, en: null }, note: null } } }
  }))
  return { catalogue: { id: 'cat', runKey: 'germany-v2', countryCode: 'DE', status: 'active', registryVersionId: 'registry', unionFingerprint: contentDigest([1, 2, 3, 4]), unionTaxa: 4, expectedRegions: 362, completedRegions: 362, inputFingerprint: 'b'.repeat(64), responseFingerprint: 'c'.repeat(64) }, taxa, assets, work, taxonomyQuarantine: { nonSpecies: 2 }, optional: { soundTaxa: 1, interactionTaxa: 2 } }
}
function approved(audit: ContentAuditReport): ContentNetworkReview {
  return { schemaVersion: 1, catalogueId: audit.catalogue.id, contentFingerprint: audit.contentFingerprint, reviewer: 'Reviewer', reviewedAt: at, notes: 'Representative images decoded and attribution/source licences checked.',
    samples: audit.network.targets.map((asset) => ({ assetId: asset.assetId, url: asset.url, method: 'browser', rendered: true, sourcePageChecked: true, attributionChecked: true, licenceChecked: true, evidence: `local-review/${asset.assetId}.png` })) }
}
function checkedUrls(data: ContentAuditSnapshot, generatedAt = at): ContentUrlCheckReport {
  const assets = [...data.assets].sort((a, b) => a.id.localeCompare(b.id)).map(({ id, taxonId, position, url }) => ({ id, taxonId, position, url }))
  const urls = [...new Set(assets.map((asset) => asset.url))]
  return { schemaVersion: 1, catalogueId: data.catalogue.id, unionFingerprint: data.catalogue.unionFingerprint, generatedAt,
    targetsFingerprint: createHash('sha256').update(JSON.stringify(assets)).digest('hex'), assets: assets.length, urls: urls.length, passed: urls.length, failed: 0, pending: 0,
    checks: urls.map((url) => ({ url, checkedAt: generatedAt, ok: true, status: 200, method: 'HEAD', contentType: 'image/jpeg', finalUrl: url, reason: null })) }
}
const codes = (snapshot: ContentAuditSnapshot) => buildContentAudit(snapshot).defects.map((defect) => defect.code)

describe('German catalogue content audit', () => {
  it('independently blocks the reviewed excluded photo despite complete v6 work and passing network evidence', () => {
    const data = fixture(), asset = data.assets[0]!
    Object.assign(asset, { origin: 'commons', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Red%20bartsia%20800.jpg',
      url: 'https://upload.wikimedia.org/wikipedia/commons/d/db/Red_bartsia_800.jpg?utm_source=commons',
      licence: 'CC BY-SA 3.0', licenceUrl: 'https://creativecommons.org/licenses/by-sa/3.0/' })
    const summary = data.work.find((row) => row.taxonId === asset.taxonId && row.kind === 'gallery')!.resultSummary as Record<string, unknown>
    const { position, url, author, licence, licenceUrl, sourceUrl, origin, caption } = asset
    const sourceResponses = [{ url: 'https://commons.wikimedia.org/w/api.php?action=query&titles=File%3ARed_bartsia_800.jpg', responseFingerprint: 'e'.repeat(64) }]
    Object.assign(summary, { inatImages: 0, commonsImages: 1, coverage: { inat: false, commons: true }, acceptedEvidence: [{ position, url, author, licence, licenceUrl, sourceUrl, origin, caption, sourceId: 'commons:File:Red bartsia 800.jpg' }], sourceResponses })
    data.work.find((row) => row.taxonId === asset.taxonId && row.kind === 'gallery')!.sourceFingerprint = responseEvidenceFingerprint(sourceResponses)
    const audit = buildContentAudit(data, approved(buildContentAudit(data)), checkedUrls(data), clock)
    expect(audit.versions.gallery).toBe('licensed-gallery-v6')
    expect(audit.work.gallery.complete).toBe(4)
    expect(audit.defects.map((finding) => finding.code)).toEqual(['gallery-scientific-exclusion'])
    expect(audit.verdict).toBe('blocked')
  })

  it('requires current v6 checkpoints and retains scientific exclusion evidence separately from licence rejection', () => {
    const data = fixture()
    for (const row of data.work.filter((work) => work.kind === 'gallery')) row.version = 'licensed-gallery-v5'
    expect(buildContentAudit(data).work.gallery).toMatchObject({ missing: 4, complete: 0 })
    for (const row of data.work.filter((work) => work.kind === 'gallery')) row.version = CONTENT_WORK_VERSIONS.gallery
    const summary = data.work.find((row) => row.kind === 'gallery')!.resultSummary as Record<string, unknown>
    const rejection = { source: 'commons:File:Red bartsia 800.jpg', reason: 'ambiguous-species-attribution',
      review: scientificGalleryExclusion({ origin: 'commons', sourceId: 'File:Red bartsia 800.jpg' }) }
    summary.rejections = [rejection]
    expect(buildContentAudit(data).galleries.rejections).toEqual({ 'ambiguous-species-attribution': 1 })
    expect(codes(data)).toEqual([])
    rejection.review = null
    expect(codes(data)).toContain('gallery-exclusion-evidence')
  })

  it('requires representative network evidence without confusing metadata validity with image rendering', () => {
    const data = fixture(), audit = buildContentAudit(data)
    expect(audit.defects).toEqual([])
    expect(audit.verdict).toBe('blocked')
    expect(audit.network.status).toBe('pending')
    expect(audit.galleries.sizes).toEqual({ '0': 1, '1': 1, '2-11': 1, '12': 1 })
    expect(audit.galleries.images).toBe(15)
    expect(audit.galleries.completedZero).toBe(1)
    expect(audit.taxa).toMatchObject({ total: 4, germanNames: 3, scientificFallbacks: 1 })
    expect(audit.work.names.complete).toBe(4)
    expect(audit.work.gallery.complete).toBe(4)
    expect(audit.network.targets.flatMap((target) => target.reasons)).toEqual(expect.arrayContaining(['lead', 'non-lead', 'gallery-size:1', 'gallery-size:2-11', 'gallery-size:12']))
    expect(networkReviewTemplate(audit).samples.every((sample) => sample.rendered === false)).toBe(true)
    expect(buildContentAudit(data, approved(audit)).blockers).toContain('full image URL report missing')
    expect(buildContentAudit(data, approved(audit), checkedUrls(data), clock).verdict).toBe('ready-for-transfer')
  })

  it('requires explicit completed gallery work even for zero images and reports pending/failure separately', () => {
    const data = fixture()
    data.work = data.work.filter((w) => w.taxonId !== 'taxon-0' || w.kind !== 'gallery')
    data.work.find((w) => w.kind === 'names')!.status = 'pending'
    const failed = data.work.find((w) => w.kind === 'gallery')!
    failed.status = 'failed'; failed.error = 'provider timeout'
    const audit = buildContentAudit(data)
    expect(audit.work.gallery).toMatchObject({ missing: 1, failed: 1, complete: 2 })
    expect(audit.work.names.pending).toBe(1)
    expect(audit.galleries.completedZero).toBe(0)
    expect(audit.failures).toEqual([{ taxonId: failed.taxonId, kind: 'gallery', error: 'provider timeout' }])
    expect(audit.taxonomyQuarantine).toEqual({ nonSpecies: 2 })
    expect(audit.defects).toEqual([])
    expect(audit.blockers).toEqual(expect.arrayContaining(['gallery: 1 missing checkpoints', 'gallery: 1 failed checkpoints', 'names: 1 pending checkpoints']))
    expect(audit.verdict).toBe('blocked')
  })

  it.each(['ownerId', 'sightingId', 'avatarOf'] as const)('rejects protected assets through %s', (field) => {
    const data = fixture()
    if (field === 'avatarOf') data.assets[0]!.avatarOf = true
    else data.assets[0]![field] = 'personal-owner'
    expect(codes(data)).toContain('unqualified-asset')
  })

  it('rejects duplicate URLs despite image-size/query differences, position gaps and invalid licences', () => {
    const data = fixture()
    const a = data.assets.find((asset) => asset.taxonId === 'taxon-2')!, b = data.assets.find((asset) => asset.taxonId === 'taxon-2' && asset.position === 1)!
    b.url = a.url.replace('/medium.jpg', '/small.jpg?foo=bar')
    expect(codes(data)).toContain('gallery-duplicate')
    b.position = 3
    expect(codes(data)).toContain('gallery-order')
    b.licenceUrl = 'https://example.test/not-a-licence'
    expect(codes(data)).toContain('gallery-metadata')
  })

  it('rejects source/checkpoint drift and invalid fallback identity', () => {
    const data = fixture()
    data.taxa[0]!.sciName = ''
    data.work.find((w) => w.kind === 'gallery')!.resultSummary = { images: 4 }
    expect(codes(data)).toEqual(expect.arrayContaining(['taxon-identity', 'gallery-work-summary']))
  })

  it('requires complete accepted native provenance and binds captured responses to the checkpoint fingerprint', () => {
    type GallerySummary = { acceptedEvidence: Array<{ author: string; photoId: number; provenance: { status: string; totalRecords: number; conflictingMetadata: boolean; evidence: Array<{ photoId: number }> } }>; sourceResponses: Array<{ url: string; responseFingerprint: string }> }
    const data = fixture()
    expect(codes(data)).toEqual([])
    const row = data.work.find((work) => work.kind === 'gallery' && (work.resultSummary as { images: number }).images > 0)!
    const missing = structuredClone(data)
    ;(missing.work.find((work) => work.taxonId === row.taxonId && work.kind === 'gallery')!.resultSummary as GallerySummary).acceptedEvidence = []
    expect(codes(missing)).toContain('gallery-source-evidence')
    const drifted = structuredClone(data)
    ;(drifted.work.find((work) => work.taxonId === row.taxonId && work.kind === 'gallery')!.resultSummary as GallerySummary).acceptedEvidence[0]!.author = 'Different author'
    expect(codes(drifted)).toContain('gallery-accepted-evidence')
    const mismatched = structuredClone(data)
    ;(mismatched.work.find((work) => work.taxonId === row.taxonId && work.kind === 'gallery')!.resultSummary as GallerySummary).acceptedEvidence[0]!.photoId++
    expect(codes(mismatched)).toContain('gallery-accepted-provenance')
    const contradictory = structuredClone(data)
    ;(contradictory.work.find((work) => work.taxonId === row.taxonId && work.kind === 'gallery')!.resultSummary as GallerySummary).acceptedEvidence[0]!.provenance.conflictingMetadata = true
    expect(codes(contradictory)).toContain('gallery-accepted-provenance')
    const imported = structuredClone(data)
    ;(imported.work.find((work) => work.taxonId === row.taxonId && work.kind === 'gallery')!.resultSummary as GallerySummary).acceptedEvidence[0]!.provenance.status = 'unverified-imported-licence'
    expect(codes(imported)).toContain('gallery-accepted-provenance')
    const truncated = structuredClone(data)
    const truncatedEvidence = (truncated.work.find((work) => work.taxonId === row.taxonId && work.kind === 'gallery')!.resultSummary as GallerySummary).acceptedEvidence[0]!.provenance
    truncatedEvidence.totalRecords++
    expect(codes(truncated)).toContain('gallery-accepted-provenance')
    const changedResponse = structuredClone(data)
    ;(changedResponse.work.find((work) => work.taxonId === row.taxonId && work.kind === 'gallery')!.resultSummary as GallerySummary).sourceResponses[0]!.responseFingerprint = 'f'.repeat(64)
    expect(codes(changedResponse)).toContain('gallery-source-evidence')
  })

  it('validates added name publication against the stored common names', () => {
    const data = fixture()
    const row = data.work.find((w) => w.kind === 'names')!
    const summary = row.resultSummary as Record<string, unknown>
    summary.outcome = 'matched'; summary.selected = { de: 'New name' }; summary.added = { de: 'New name' }; summary.changed = true
    expect(codes(data)).toContain('names-publication-drift')
    data.taxa[0]!.commonNames = { de: 'New name' }
    expect(codes(data)).not.toContain('names-publication-drift')
  })

  it('separates gallery cap/source rejection evidence from incomplete work', () => {
    const data = fixture()
    const row = data.work.find((w) => w.kind === 'gallery')!
    ;(row.resultSummary as Record<string, unknown>).rejections = [{ source: 'inat:1', reason: 'unsupported-licence' }, { source: 'inat:2', reason: 'gallery-cap' }]
    const audit = buildContentAudit(data)
    expect(audit.defects).toEqual([])
    expect(audit.galleries).toMatchObject({ rejectedCandidates: 1, cappedTaxa: 1, rejections: { 'unsupported-licence': 1, 'gallery-cap': 1 } })
  })

  it('binds network review to the exact immutable content snapshot and every required target', () => {
    const data = fixture(), review = approved(buildContentAudit(data))
    const missing = structuredClone(review); missing.samples.pop()
    expect(buildContentAudit(data, missing).defects.some((f) => f.code === 'network-review-missing')).toBe(true)
    const failed = structuredClone(review); failed.samples[0]!.rendered = false
    expect(buildContentAudit(data, failed).network.status).toBe('failed')
    data.taxa[0]!.commonNames = { de: 'Changed after review' }
    expect(buildContentAudit(data, review).defects.some((f) => f.code === 'network-review-binding')).toBe(true)
  })

  it('accepts explicitly reviewed official API provenance without claiming the public page was viewed', () => {
    const data = fixture(), review = approved(buildContentAudit(data))
    const sample = review.samples[0]!, asset = data.assets.find((a) => a.id === sample.assetId)!
    sample.sourcePageChecked = false
    sample.officialApiEvidence = { provider: 'iNaturalist', photoId: Number(new URL(asset.sourceUrl).pathname.split('/').at(-1)),
      sourcePageUrl: asset.sourceUrl, requestUrl: 'https://api.inaturalist.org/v1/taxa/123', cachePath: '/tmp/retained-official-record.json', cacheSha256: 'd'.repeat(64), retrievedAt: at,
      licenceMappingUrl: `https://github.com/inaturalist/inaturalist/blob/${'a'.repeat(40)}/app/models/photo.rb` }
    expect(parseContentNetworkReview(review).samples[0]!.sourcePageChecked).toBe(false)
    expect(buildContentAudit(data, review, checkedUrls(data), clock).verdict).toBe('ready-for-transfer')
    sample.licenceChecked = false
    expect(buildContentAudit(data, review, checkedUrls(data), clock).verdict).toBe('blocked')
  })

  it.each(['photo-id', 'source-url', 'request-host', 'request-query', 'request-path', 'mapping-host', 'unpinned-mapping', 'stale', 'future', 'missing-digest'])(
    'rejects mismatched or incomplete official API evidence: %s', (variant) => {
      const data = fixture(), review = approved(buildContentAudit(data))
      const sample = review.samples[0]!, asset = data.assets.find((a) => a.id === sample.assetId)!
      sample.sourcePageChecked = false
      sample.officialApiEvidence = { provider: 'iNaturalist', photoId: Number(new URL(asset.sourceUrl).pathname.split('/').at(-1)),
        sourcePageUrl: asset.sourceUrl, requestUrl: 'https://api.inaturalist.org/v1/taxa/123', cachePath: '/tmp/retained-official-record.json', cacheSha256: 'd'.repeat(64), retrievedAt: at,
        licenceMappingUrl: `https://github.com/inaturalist/inaturalist/blob/${'a'.repeat(40)}/app/models/photo.rb` }
      const evidence = sample.officialApiEvidence
      if (variant === 'photo-id') evidence.photoId++
      if (variant === 'source-url') evidence.sourcePageUrl += '/different'
      if (variant === 'request-host') evidence.requestUrl = 'https://example.org/v1/taxa/123'
      if (variant === 'request-query') evidence.requestUrl += '?other=record'
      if (variant === 'request-path') evidence.requestUrl = 'https://api.inaturalist.org/v1/observations/123'
      if (variant === 'mapping-host') evidence.licenceMappingUrl = 'https://example.org/licences'
      if (variant === 'unpinned-mapping') evidence.licenceMappingUrl = 'https://github.com/inaturalist/inaturalist/blob/main/app/models/photo.rb'
      if (variant === 'stale') evidence.retrievedAt = '2026-08-10T10:00:00.000Z'
      if (variant === 'future') evidence.retrievedAt = '2026-09-09T10:00:00.001Z'
      if (variant === 'missing-digest') evidence.cacheSha256 = ''
      expect(buildContentAudit(data, review, checkedUrls(data), clock).verdict).toBe('blocked')
    },
  )

  it('binds retained API bytes to the exact taxon/photo, published URL, author and licence code', () => {
    const data = fixture(), review = approved(buildContentAudit(data))
    const sample = review.samples[0]!, asset = data.assets.find((a) => a.id === sample.assetId)!, scientificName = data.taxa.find((taxon) => taxon.id === asset.taxonId)!.sciName
    sample.sourcePageChecked = false
    sample.officialApiEvidence = { provider: 'iNaturalist', photoId: Number(new URL(asset.sourceUrl).pathname.split('/').at(-1)), sourcePageUrl: asset.sourceUrl,
      requestUrl: 'https://api.inaturalist.org/v1/taxa/123', cachePath: '/tmp/retained-official-record.json', cacheSha256: 'd'.repeat(64), retrievedAt: at,
      licenceMappingUrl: `https://github.com/inaturalist/inaturalist/blob/${'a'.repeat(40)}/app/models/photo.rb` }
    const photo = { id: sample.officialApiEvidence.photoId, url: asset.url.replace('/medium.jpg', '/square.jpg'), attribution: '(c) Author, some rights reserved', license_code: 'cc-by', type: 'LocalPhoto', native_page_url: null, native_photo_id: null }
    const record = { results: [{ id: 123, name: scientificName, default_photo: photo, taxon_photos: [{ photo }] }] }
    expect(() => validateOfficialApiRecord(sample, asset, scientificName, record)).not.toThrow()
    expect(sample.sourcePageChecked).toBe(false)
    const abbreviatedDefault = { id: photo.id, url: photo.url, attribution: photo.attribution, license_code: photo.license_code }
    expect(() => validateOfficialApiRecord(sample, asset, scientificName, { results: [{ ...record.results[0], default_photo: abbreviatedDefault }] })).not.toThrow()
    // A detailed-looking default is not taxon_photos evidence, nor is another photo's detail.
    for (const details of [undefined, [], [{ photo: { ...photo, id: photo.id + 1 } }]]) {
      expect(() => validateOfficialApiRecord(sample, asset, scientificName, { results: [{ ...record.results[0], taxon_photos: details }] })).toThrow('does not reproduce')
    }
    // A clean peer cannot hide any incomplete matching detailed record, in either order.
    for (const missing of [{ type: undefined }, { native_page_url: undefined }, { native_photo_id: undefined }]) {
      const incomplete = { photo: { ...photo, ...missing } }
      for (const details of [[{ photo }, incomplete], [incomplete, { photo }]]) {
        expect(() => validateOfficialApiRecord(sample, asset, scientificName, { results: [{ ...record.results[0], taxon_photos: details }] })).toThrow('does not reproduce')
      }
    }
    expect(() => validateOfficialApiRecord(sample, asset, scientificName, { results: [{ id: 123, name: scientificName, taxon_photos: [{ photo: { ...photo, attribution_name: 'Author' } }] }] })).not.toThrow()
    for (const malformed of [null, {}, { results: [] }, { results: [record.results[0], record.results[0]] },
      { results: [{ ...record.results[0], id: 124 }] }, { results: [{ ...record.results[0], name: 'Different species' }] },
      { results: [{ ...record.results[0], taxon_photos: [null] }] }]) {
      expect(() => validateOfficialApiRecord(sample, asset, scientificName, malformed)).toThrow('does not reproduce')
    }
    for (const changed of [{ id: photo.id + 1 }, { url: asset.url.replace('/medium.jpg', '/different.jpg') }, { attribution: 'Someone else' }, { license_code: 'cc-by-nc' }, { license_code: null },
      { type: 'FlickrPhoto' }, { native_page_url: 'https://www.flickr.com/photos/example/123' }, { native_photo_id: '123' }, { type: undefined, native_page_url: undefined, native_photo_id: undefined }]) {
      expect(() => validateOfficialApiRecord(sample, asset, scientificName, { results: [{ id: 123, name: scientificName, taxon_photos: [{ photo: { ...photo, ...changed } }] }] })).toThrow('does not reproduce')
    }
    // A duplicate photo ID with conflicting source metadata must not be hidden by a first-match lookup.
    expect(() => validateOfficialApiRecord(sample, asset, scientificName, { results: [{ ...record.results[0], taxon_photos: [{ photo: { ...photo, license_code: null } }] }] })).toThrow('does not reproduce')
    expect(() => validateOfficialApiRecord(sample, asset, scientificName, { results: [{ ...record.results[0], taxon_photos: [{ photo: { ...photo, type: 'FlickrPhoto' } }] }] })).toThrow('does not reproduce')
  })

  it('keeps deterministic content digests independent of loader row order', () => {
    const data = fixture(), other = structuredClone(data)
    other.taxa.reverse(); other.assets.reverse(); other.work.reverse()
    expect(contentSnapshotDigests(other)).toEqual(contentSnapshotDigests(data))
    other.assets[0]!.author = 'Different attribution'
    expect(contentSnapshotDigests(other).contentFingerprint).not.toBe(contentSnapshotDigests(data).contentFingerprint)
  })

  it('binds supplied full URL checks to every current target, checks entries, and keeps MIME distinct from rendering', () => {
    const data = fixture(), audit = buildContentAudit(data)
    const report = checkedUrls(data)
    expect(buildContentAudit(data, null, report, clock).network.status).toBe('pending')
    expect(buildContentAudit(data, approved(audit), report, clock).verdict).toBe('ready-for-transfer')
    report.checks[0]!.contentType = 'text/html'
    const failed = buildContentAudit(data, approved(audit), report, clock)
    expect(failed.verdict).toBe('blocked')
    expect(failed.network.urlChecks.failed).toBe(1)
    expect(failed.defects.some((f) => f.code === 'url-report-incomplete')).toBe(true)
    report.checks.shift()
    expect(buildContentAudit(data, approved(audit), report, clock).network.urlChecks.pending).toBe(1)
    report.targetsFingerprint = 'a'.repeat(64)
    expect(buildContentAudit(data, approved(audit), report, clock).defects.some((f) => f.code === 'url-report-binding')).toBe(true)
    expect(() => parseContentUrlReport(null)).toThrow()
  })

  it('rejects bodyless 2xx URL checks while accepting a bounded partial GET', () => {
    const data = fixture(), audit = buildContentAudit(data), report = checkedUrls(data)
    report.checks[0]!.status = 204
    report.passed = report.checks.length
    expect(buildContentAudit(data, approved(audit), report, clock).defects.map((finding) => finding.code)).toContain('url-report-incomplete')
    report.checks[0]!.status = 206
    report.checks[0]!.method = 'GET'
    expect(buildContentAudit(data, approved(audit), report, clock).verdict).toBe('ready-for-transfer')
  })

  it('rejects URL reports and checks outside the absolute freshness window', () => {
    const data = fixture(), audit = buildContentAudit(data)
    const stale = checkedUrls(data, '2026-09-08T09:59:59.999Z')
    expect(buildContentAudit(data, approved(audit), stale, clock).defects.map((finding) => finding.code)).toEqual(expect.arrayContaining(['url-report-binding', 'url-report-incomplete']))
    const future = checkedUrls(data, '2026-09-09T10:00:00.001Z')
    expect(buildContentAudit(data, approved(audit), future, clock).defects.map((finding) => finding.code)).toContain('url-report-binding')
    const oldCheck = checkedUrls(data); oldCheck.checks[0]!.checkedAt = '2026-09-08T09:59:59.999Z'
    expect(buildContentAudit(data, approved(audit), oldCheck, clock).network.urlChecks.failed).toBe(1)
  })

  it('treats a catalogue with no reference assets as vacuously URL-complete', () => {
    const data = fixture()
    data.assets = []
    for (const row of data.work.filter((work) => work.kind === 'gallery')) {
      row.resultSummary = { images: 0, zero: true, changed: false, coverage: { inat: false, commons: false }, rejections: [], acceptedEvidence: [], sourceResponses: [], inatImages: 0, commonsImages: 0 }
      row.sourceFingerprint = responseEvidenceFingerprint([])
    }
    const audit = buildContentAudit(data, null, null, clock)
    expect(audit.network.urlChecks).toMatchObject({ supplied: false, urls: 0, passed: 0, failed: 0, pending: 0 })
    expect(audit.verdict).toBe('ready-for-transfer')
  })

  it('fails closed on malformed review arguments and non-local database targets', () => {
    expect(() => requireLocalContentDatabase('postgresql://remote.invalid/dex')).toThrow('local')
    expect(() => requireLocalContentDatabase('')).toThrow('explicit')
    expect(() => parseContentAuditArgs(['--catalogue', 'cat', '--output', '/tmp/audit', '--output', '/tmp/other'])).toThrow()
    expect(() => parseContentNetworkReview(networkReviewTemplate(buildContentAudit(fixture())))).toThrow()
  })
})
