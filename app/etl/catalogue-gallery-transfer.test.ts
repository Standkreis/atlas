import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { buildContentAudit, type ContentAuditSnapshot, type ContentNetworkReview, type ContentUrlCheckReport } from './catalogue-content-audit'
import { ASSET_TRANSFER_COLUMNS, CONTENT_WORK_VERSIONS, WORK_TRANSFER_COLUMNS, contentDigest, contentSnapshotDigests, writeGalleryArtifact } from './catalogue-gallery-transfer'

const paths: string[] = []
afterEach(async () => { for (const path of paths.splice(0)) await rm(path, { recursive: true, force: true }) })
async function output() { const path = await mkdtemp(join(tmpdir(), 'atlas-gallery-transfer-')); paths.push(path); return join(path, 'gallery.jsonl') }
function fixture(): ContentAuditSnapshot {
  const at = '2026-09-09T10:00:00.000Z'
  return {
    catalogue: { id: 'cat', runKey: 'v2', countryCode: 'DE', status: 'active', registryVersionId: 'registry', unionFingerprint: contentDigest([1]), unionTaxa: 1, expectedRegions: 1, completedRegions: 1, inputFingerprint: 'b'.repeat(64), responseFingerprint: 'c'.repeat(64) },
    taxa: [{ id: 'taxon', gbifKey: 1, sciName: 'Turdus merula', tile: 'bird', rank: 'species', commonNames: { de: 'Amsel' }, intro: null, facts: null, prose: null, contentAt: null }],
    assets: [{ id: 'photo', kind: 'image', url: 'https://inaturalist-open-data.s3.amazonaws.com/photos/1/medium.jpg', author: 'Photographer', licence: 'CC BY 4.0', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://www.inaturalist.org/photos/1', origin: 'inat', caption: 'Amsel', meta: null, position: 0, createdAt: at, taxonId: 'taxon', sightingId: null, ownerId: null, byteSize: 0, avatarOf: false }],
    work: Object.entries(CONTENT_WORK_VERSIONS).map(([kind, version]) => ({ taxonId: 'taxon', kind, version, status: 'complete', attempts: 1, leaseOwner: null, leaseExpiresAt: null, startedAt: at, completedAt: at, error: null,
      resultSummary: kind === 'gallery' ? { images: 1, zero: false, changed: false, coverage: { inat: true, commons: false }, rejections: [], inatImages: 1, commonsImages: 0 }
        : { outcome: 'matched', reason: null, selected: { de: 'Amsel' }, added: {}, changed: false, source: { qid: 'Q25345', path: 'P846', labels: { de: 'Amsel', en: null, ja: null }, sitelinks: { de: null, en: null }, note: null } },
      sourceFingerprint: 'a'.repeat(64), createdAt: at, updatedAt: at })),
    taxonomyQuarantine: {}, optional: { soundTaxa: 0, interactionTaxa: 0 },
  }
}
function auditOf(snapshot: ContentAuditSnapshot) {
  const initial = buildContentAudit(snapshot)
  const reviewedAt = '2026-09-09T11:00:00.000Z'
  const review: ContentNetworkReview = { schemaVersion: 1, catalogueId: 'cat', contentFingerprint: initial.contentFingerprint, reviewer: 'Reviewer', reviewedAt, notes: 'Decoded sample and reviewed its attribution/source licence.',
    samples: initial.network.targets.map((a) => ({ assetId: a.assetId, url: a.url, method: 'browser', rendered: true, sourcePageChecked: true, attributionChecked: true, licenceChecked: true, evidence: 'sample.png' })) }
  const assets = [...snapshot.assets].sort((a, b) => a.id.localeCompare(b.id)).map(({ id, taxonId, position, url }) => ({ id, taxonId, position, url }))
  const urls = [...new Set(assets.map((asset) => asset.url))]
  const report: ContentUrlCheckReport = { schemaVersion: 1, catalogueId: snapshot.catalogue.id, unionFingerprint: snapshot.catalogue.unionFingerprint, generatedAt: reviewedAt,
    targetsFingerprint: createHash('sha256').update(JSON.stringify(assets)).digest('hex'), assets: assets.length, urls: urls.length, passed: urls.length, failed: 0, pending: 0,
    checks: urls.map((url) => ({ url, checkedAt: reviewedAt, ok: true, status: 200, method: 'HEAD', contentType: 'image/jpeg', finalUrl: url, reason: null })) }
  return buildContentAudit(snapshot, review, report, () => new Date(reviewedAt))
}

describe('filtered catalogue gallery artifact', () => {
  it('exports only explicit Asset/work columns, preserving exact order and provenance with deterministic hashes', async () => {
    const snapshot = fixture(), audit = auditOf(snapshot), path = await output()
    expect(audit.defects).toEqual([])
    const first = await writeGalleryArtifact({ snapshot, audit, path })
    const lines = (await readFile(path, 'utf8')).trim().split('\n').map((line) => JSON.parse(line))
    expect(lines.filter((line) => line.type === 'table').map((line) => [line.table, line.columns])).toEqual([['Asset', ASSET_TRANSFER_COLUMNS], ['TaxonEnrichmentWork', WORK_TRANSFER_COLUMNS]])
    const row = lines.find((line) => line.type === 'row' && line.table === 'Asset').row
    const expected = Object.fromEntries(Object.entries(snapshot.assets[0]!).filter(([key]) => key !== 'avatarOf'))
    expect(row).toEqual(expected)
    expect(first.tables.map((table) => [table.table, table.rows])).toEqual([['Asset', 1], ['TaxonEnrichmentWork', 2]])
    expect((await writeGalleryArtifact({ snapshot, audit, path })).artifact.sha256).toBe(first.artifact.sha256)
  })

  it('refuses a stale reviewed content snapshot and an unfinished review', async () => {
    const snapshot = fixture(), audit = auditOf(snapshot), path = await output()
    await expect(writeGalleryArtifact({ snapshot, audit: buildContentAudit(snapshot), path })).rejects.toThrow('eligible audit')
    snapshot.assets[0]!.author = 'Changed attribution'
    await expect(writeGalleryArtifact({ snapshot, audit, path })).rejects.toThrow('unchanged content snapshot')
  })

  it.each(['private', 'sound', 'outside'])('fails closed if a %s row reaches the transfer boundary', async (kind) => {
    const snapshot = fixture(), path = await output()
    if (kind === 'private') snapshot.assets[0]!.ownerId = 'identity'
    if (kind === 'sound') snapshot.assets[0]!.kind = 'sound'
    if (kind === 'outside') snapshot.assets[0]!.taxonId = 'outside'
    const audit = { ...auditOf(snapshot), ...contentSnapshotDigests(snapshot), verdict: 'ready-for-transfer' as const }
    await expect(writeGalleryArtifact({ snapshot, audit, path })).rejects.toThrow('unqualified or out-of-union')
  })

  it('fails closed on an unexpected schema column instead of silently widening the export', async () => {
    const snapshot = fixture(), path = await output()
    snapshot.assets[0]!.unreviewedColumn = 'unexpected'
    await expect(writeGalleryArtifact({ snapshot, audit: auditOf(snapshot), path })).rejects.toThrow('expected')
  })
})
