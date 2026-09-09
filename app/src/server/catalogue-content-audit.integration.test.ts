import { createHash } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Client } from 'pg'
import { db } from '../../etl/db'
import { CONTENT_WORK_VERSIONS, contentDigest } from '../../etl/catalogue-gallery-transfer'
import { buildContentAudit, loadContentSnapshot, networkReviewTemplate, writeContentAuditBundle } from '../../etl/catalogue-content-audit'

const prefix = 'issue21-content-audit'
const registry = `${prefix}-registry`, catalogue = `${prefix}-catalogue`, member = `${prefix}-member`, outside = `${prefix}-outside`, owner = `${prefix}-owner`, sighting = `${prefix}-sighting`
const names = { outcome: 'scientific-fallback', reason: 'no source names', selected: {}, added: {}, changed: false, source: { qid: null, path: 'none', labels: { de: null, en: null, ja: null }, sitelinks: { de: null, en: null }, note: null } }
const gallery = { images: 1, zero: false, changed: false, coverage: { inat: true, commons: false }, rejections: [], inatImages: 1, commonsImages: 0 }
const at = new Date('2026-09-09T10:00:00.000Z')
const directories: string[] = []
let priorRegistry: string | undefined
let priorCatalogue: { id: string; updatedAt: Date } | null = null

async function cleanup() {
  await db.identity.updateMany({ where: { id: owner }, data: { avatarAssetId: null } })
  await db.asset.deleteMany({ where: { id: { startsWith: prefix } } })
  await db.sighting.deleteMany({ where: { id: sighting } })
  await db.identity.deleteMany({ where: { id: owner } })
  await db.taxonEnrichmentWork.deleteMany({ where: { taxonId: { in: [member, outside] } } })
  await db.catalogueTaxon.deleteMany({ where: { catalogueVersionId: catalogue } })
  await db.catalogueVersion.deleteMany({ where: { id: catalogue } })
  await db.regionRegistryVersion.deleteMany({ where: { id: registry } })
  await db.taxon.deleteMany({ where: { id: { in: [member, outside] } } })
}
beforeAll(async () => {
  await cleanup()
  priorRegistry = (await db.regionRegistryVersion.findFirst({ where: { countryCode: 'DE', active: true }, select: { id: true } }))?.id
  priorCatalogue = await db.catalogueVersion.findFirst({ where: { countryCode: 'DE', status: 'active' }, select: { id: true, updatedAt: true } })
  if (priorRegistry) await db.regionRegistryVersion.update({ where: { id: priorRegistry }, data: { active: false } })
  if (priorCatalogue) await db.catalogueVersion.update({ where: { id: priorCatalogue.id }, data: { status: 'retired', updatedAt: priorCatalogue.updatedAt } })
  await db.regionRegistryVersion.create({ data: { id: registry, countryCode: 'DE', version: registry, artifactSha256: 'a'.repeat(64), expectedRegions: 1, expectedSourceUnits: 1, active: true } })
  await db.catalogueVersion.create({ data: { id: catalogue, countryCode: 'DE', runKey: catalogue, registryVersionId: registry, inputFingerprint: 'b'.repeat(64), sourceFingerprint: 'c'.repeat(64), responseFingerprint: 'd'.repeat(64), unionFingerprint: contentDigest([990021001]), plausibleRulesVersion: 1, tileMappingVersion: 1, observationWindowVersion: 1, yearFrom: 2016, yearTo: 2026, occurrencePredicates: {}, status: 'active', expectedRegions: 1, completedRegions: 1, unionTaxa: 1, generatedAt: at, auditedAt: at, activatedAt: at } })
  await db.taxon.createMany({ data: [{ id: member, gbifKey: 990021001, sciName: 'Reviewus contentus', rank: 'species', tile: 'bird' }, { id: outside, gbifKey: 990021002, sciName: 'Reviewus externus', rank: 'species', tile: 'bird' }] })
  await db.catalogueTaxon.create({ data: { catalogueVersionId: catalogue, taxonId: member } })
  await db.identity.create({ data: { id: owner, displayName: 'Private fixture owner' } })
  await db.sighting.create({ data: { id: sighting, taxonId: member, identityId: owner, at } })
  const image = { kind: 'image' as const, position: 0, url: 'https://inaturalist-open-data.s3.amazonaws.com/photos/123/medium.jpg', author: 'Photographer', licence: 'CC BY 4.0', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://www.inaturalist.org/photos/123', origin: 'inat', caption: 'Reference organism', taxonId: member }
  await db.asset.createMany({ data: [
    { ...image, id: `${prefix}-public` },
    { ...image, id: `${prefix}-owned`, ownerId: owner },
    { ...image, id: `${prefix}-sighting`, sightingId: sighting },
    { ...image, id: `${prefix}-avatar` },
    { ...image, id: `${prefix}-sound`, kind: 'sound', origin: 'xeno-canto' },
    { ...image, id: `${prefix}-user`, origin: 'user' },
    { ...image, id: `${prefix}-outside-image`, taxonId: outside },
  ] })
  await db.identity.update({ where: { id: owner }, data: { avatarAssetId: `${prefix}-avatar` } })
  for (const [kind, version] of [...Object.entries(CONTENT_WORK_VERSIONS), ['gallery', 'old-version'], ['prose', 'optional']]) {
    await db.taxonEnrichmentWork.create({ data: { taxonId: member, kind, version, status: 'complete', completedAt: at, sourceFingerprint: 'e'.repeat(64), resultSummary: kind === 'names' ? names : gallery } })
  }
  await db.taxonEnrichmentWork.create({ data: { taxonId: outside, kind: 'gallery', version: CONTENT_WORK_VERSIONS.gallery, status: 'complete', completedAt: at, sourceFingerprint: 'e'.repeat(64), resultSummary: gallery } })
})
afterAll(async () => {
  await cleanup()
  if (priorRegistry) await db.regionRegistryVersion.update({ where: { id: priorRegistry }, data: { active: true } })
  if (priorCatalogue) await db.catalogueVersion.update({ where: { id: priorCatalogue.id }, data: { status: 'active', updatedAt: priorCatalogue.updatedAt } })
  await db.$disconnect()
  for (const directory of directories) await rm(directory, { recursive: true, force: true })
})

describe('local content audit and gallery transfer selection', () => {
  it('excludes protected/sound/outside-union rows and unrelated work, preserving every source row', async () => {
    const before = await db.asset.findMany({ where: { id: { startsWith: prefix } }, orderBy: { id: 'asc' } })
    const client = new Client({ connectionString: process.env.DATABASE_URL })
    await client.connect()
    let snapshot
    try {
      await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
      snapshot = await loadContentSnapshot(client, catalogue)
      await client.query('COMMIT')
    } finally { await client.end() }
    expect(snapshot.assets.map((a) => a.id)).toEqual([`${prefix}-public`])
    expect(snapshot.work.map((w) => `${w.kind}/${w.version}`)).toEqual([`gallery/${CONTENT_WORK_VERSIONS.gallery}`, `names/${CONTENT_WORK_VERSIONS.names}`])
    expect(snapshot.optional.soundTaxa).toBe(1)
    const initial = buildContentAudit(snapshot)
    expect(initial.defects).toEqual([])
    expect(initial.network.status).toBe('pending')

    const directory = await mkdtemp(join(tmpdir(), 'atlas-content-audit-integration-')); directories.push(directory)
    const pending = await writeContentAuditBundle({ catalogue, output: directory })
    expect(pending.manifest.eligible).toBe(false)
    await expect(readFile(join(directory, 'gallery-artifact.jsonl'))).rejects.toThrow()
    const template = networkReviewTemplate(initial)
    const reviewPath = join(directory, 'review.json')
    await writeFile(reviewPath, JSON.stringify({ ...template, reviewer: 'Integration reviewer', reviewedAt: at.toISOString(), notes: 'Fixture review supplied by the test; no network claim about real source images.', samples: template.samples.map((sample) => ({ ...sample, rendered: true, sourcePageChecked: true, attributionChecked: true, licenceChecked: true, evidence: 'synthetic integration fixture' })) }))
    const assets = snapshot.assets.map(({ id, taxonId, position, url }) => ({ id, taxonId, position, url }))
    const urls = [...new Set(assets.map((asset) => asset.url))]
    const urlChecksPath = join(directory, 'url-checks.json')
    await writeFile(urlChecksPath, JSON.stringify({ schemaVersion: 1, catalogueId: catalogue, unionFingerprint: snapshot.catalogue.unionFingerprint, generatedAt: at.toISOString(),
      targetsFingerprint: createHash('sha256').update(JSON.stringify(assets)).digest('hex'), assets: assets.length, urls: urls.length, passed: urls.length, failed: 0, pending: 0,
      checks: urls.map((url) => ({ url, checkedAt: at.toISOString(), ok: true, status: 200, method: 'HEAD', contentType: 'image/jpeg', finalUrl: url, reason: null })) }))
    const checked = await writeContentAuditBundle({ catalogue, output: directory, networkReview: reviewPath, urlChecks: urlChecksPath, now: () => at })
    expect(checked.manifest.eligible).toBe(true)
    const lines = (await readFile(join(directory, 'gallery-artifact.jsonl'), 'utf8')).trim().split('\n').map((line) => JSON.parse(line))
    expect(lines.filter((line) => line.type === 'row' && line.table === 'Asset').map((line) => line.row.id)).toEqual([`${prefix}-public`])
    expect(lines.filter((line) => line.type === 'row' && line.table === 'TaxonEnrichmentWork')).toHaveLength(2)
    const cachePath = join(directory, 'official-api-record.json')
    const cacheBytes = JSON.stringify({ results: [{ id: 456, name: 'Reviewus contentus', default_photo: {
      id: 123, license_code: 'cc-by', attribution: 'Photographer', medium_url: 'https://inaturalist-open-data.s3.amazonaws.com/photos/123/medium.jpg',
      type: 'LocalPhoto', native_page_url: null, native_photo_id: null,
    }, taxon_photos: [] }] })
    await writeFile(cachePath, cacheBytes)
    const apiReview = { ...JSON.parse(await readFile(reviewPath, 'utf8')), samples: template.samples.map((sample) => ({ ...sample,
      rendered: true, sourcePageChecked: false, attributionChecked: true, licenceChecked: true, evidence: 'Synthetic retained official API fixture, not a live public page.',
      officialApiEvidence: { provider: 'iNaturalist', photoId: 123, sourcePageUrl: 'https://www.inaturalist.org/photos/123', requestUrl: 'https://api.inaturalist.org/v1/taxa/456', cachePath,
        cacheSha256: createHash('sha256').update(cacheBytes).digest('hex'), retrievedAt: at.toISOString(),
        licenceMappingUrl: `https://github.com/inaturalist/inaturalist/blob/${'a'.repeat(40)}/app/models/shared/license_module.rb` },
    })) }
    await writeFile(reviewPath, JSON.stringify(apiReview))
    expect((await writeContentAuditBundle({ catalogue, output: directory, networkReview: reviewPath, urlChecks: urlChecksPath, now: () => at })).manifest.eligible).toBe(true)
    await writeFile(cachePath, JSON.stringify({ results: [] }))
    await expect(writeContentAuditBundle({ catalogue, output: directory, networkReview: reviewPath, urlChecks: urlChecksPath, now: () => at })).rejects.toThrow('evidence bytes changed')
    expect(await db.asset.findMany({ where: { id: { startsWith: prefix } }, orderBy: { id: 'asc' } })).toEqual(before)
  })
})
