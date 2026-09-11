import { link, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { validateReleaseSpotReport, type ReleaseSpotContract, type ReleaseSpotReport } from './catalogue-release-spots'
import { assertReleaseSpotPaths, checkReleaseSpots, parseReleaseSpotArgs, runReleaseSpotAudit } from './catalogue-release-spots-cli'
import type { CatalogueImportExecutionConfig } from './catalogue-import-cli'
import { contentDigest } from './catalogue-gallery-transfer'

const now = new Date('2026-09-11T18:00:00.000Z'), url = 'https://static.inaturalist.org/photos/1/medium.jpg'
const contract: ReleaseSpotContract = { catalogueId: 'catalogue', unionFingerprint: '1'.repeat(64), contentFingerprint: '2'.repeat(64),
  sourceFilesFingerprint: '3'.repeat(64), sourcePinsFingerprint: '4'.repeat(64), auditUrlReportSha256: '5'.repeat(64),
  fullTargetsFingerprint: '6'.repeat(64), reviewedTargetsFingerprint: '7'.repeat(64), targets: [{ assetId: 'a', url }] }
function report(): ReleaseSpotReport { return { schemaVersion: 1, kind: 'catalogue-release-image-spots', contract: structuredClone(contract),
  generatedAt: now.toISOString(), attempted: 1, networkRequests: 1, reused: 0, limitation: 'HTTP only',
  checks: [{ url, checkedAt: now.toISOString(), ok: true, method: 'HEAD', status: 200, contentType: 'image/jpeg', finalUrl: url, reason: null }] } }
const owned: string[] = []
afterEach(async () => { vi.unstubAllGlobals(); await Promise.all(owned.splice(0).map((path) => rm(path, { recursive: true, force: true }))) })

async function fileFixture() {
  const root = await mkdtemp(join(tmpdir(), 'atlas-release-spots-')); owned.push(root)
  const input = join(root, 'input.json'), previous = join(root, 'previous-current.json'), configPath = join(root, 'config.json')
  await writeFile(input, '{}\n'); await writeFile(previous, '{"retained":"prior-current-report"}\n')
  const descriptor = { path: input, sha256: '1'.repeat(64) }, bundle = { audit: descriptor, manifest: descriptor, artifact: descriptor }
  const config: CatalogueImportExecutionConfig = { schemaVersion: 1, kind: 'catalogue-import-execution-config', expectedCommit: '1'.repeat(40),
    operationId: 'fixture', activationAt: now.toISOString(), frozenBundle: { base: bundle, gallery: bundle,
      pins: { catalogueId: 'c', runKey: 'r', registryVersionId: 'v', unionTaxa: 1, inputFingerprint: descriptor.sha256,
        responseFingerprint: descriptor.sha256, unionFingerprint: descriptor.sha256, baseAuditFingerprint: descriptor.sha256,
        contentAuditFingerprint: descriptor.sha256, contentFingerprint: descriptor.sha256, taxonFingerprint: descriptor.sha256 } },
    releaseEvidence: { networkReview: descriptor, auditUrlReport: descriptor, currentUrlReport: { ...descriptor, path: previous } },
    galleryReview: { document: descriptor, documentFingerprint: descriptor.sha256, evidenceFingerprint: descriptor.sha256 } }
  await writeFile(configPath, JSON.stringify(config))
  return { root, input, previous, config, options: { config: configPath, checkpoint: join(root, 'checkpoint.jsonl'), output: join(root, 'new-report.json'), limit: 1 } }
}

describe('versioned representative release availability', () => {
  it('accepts exact reviewed coverage and GET partial content', () => {
    expect(validateReleaseSpotReport(report(), contract, now).checks).toHaveLength(1)
    const value = report(); value.checks[0]!.method = 'GET'; value.checks[0]!.status = 206
    expect(validateReleaseSpotReport(value, contract, now).checks).toHaveLength(1)
  })
  it.each([
    ['stale report', (r: ReleaseSpotReport) => { r.generatedAt = '2026-09-10T18:00:00.000Z' }],
    ['future report', (r: ReleaseSpotReport) => { r.generatedAt = '2026-09-11T18:00:01.000Z' }],
    ['stale individual', (r: ReleaseSpotReport) => { r.checks[0]!.checkedAt = '2026-09-10T18:00:00.000Z' }],
    ['future individual', (r: ReleaseSpotReport) => { r.checks[0]!.checkedAt = '2026-09-11T18:00:01.000Z' }],
    ['invalid date', (r: ReleaseSpotReport) => { r.checks[0]!.checkedAt = '2026-02-30T18:00:00.000Z' }],
    ['missing', (r: ReleaseSpotReport) => { r.checks = [] }],
    ['duplicate', (r: ReleaseSpotReport) => { r.checks.push({ ...r.checks[0]! }) }],
    ['extra', (r: ReleaseSpotReport) => { r.checks.push({ ...r.checks[0]!, url: `${url}?extra` }) }],
    ['failed', (r: ReleaseSpotReport) => { r.checks[0]!.ok = false }],
    ['unsafe redirect', (r: ReleaseSpotReport) => { r.checks[0]!.finalUrl = 'https://example.com/image.jpg' }],
    ['unsafe URL', (r: ReleaseSpotReport) => { r.checks[0]!.url = 'https://example.com/image.jpg' }],
    ['wrong mime', (r: ReleaseSpotReport) => { r.checks[0]!.contentType = 'text/html' }],
    ['wrong status', (r: ReleaseSpotReport) => { r.checks[0]!.status = 206 }],
    ['failure reason', (r: ReleaseSpotReport) => { r.checks[0]!.reason = 'failed' }],
    ['source tamper', (r: ReleaseSpotReport) => { r.contract.sourceFilesFingerprint = 'a'.repeat(64) }],
    ['audit tamper', (r: ReleaseSpotReport) => { r.contract.auditUrlReportSha256 = 'a'.repeat(64) }],
    ['sample tamper', (r: ReleaseSpotReport) => { r.contract.targets = [] }],
    ['strata tamper', (r: ReleaseSpotReport) => { r.contract.reviewedTargetsFingerprint = 'a'.repeat(64) }],
  ])('rejects %s evidence', (_name, mutate) => {
    const value = report(); mutate(value)
    expect(() => validateReleaseSpotReport(value, contract, now)).toThrow()
  })
  it('checks every unique reviewed URL, reuses only bound fresh checkpoints, and retains damaged tails', async () => {
    const root = await mkdtemp(join(tmpdir(), 'atlas-release-spots-')); owned.push(root)
    const checkpoint = join(root, 'checks.jsonl'), successful = report().checks[0]!
    await writeFile(checkpoint, `${JSON.stringify({ contractFingerprint: 'wrong', check: successful })}\n{"interrupted":`)
    const check = vi.fn(async (_url, options) => { await options?.beforeRequest?.(); return successful })
    const result = await checkReleaseSpots(contract, { checkpoint, limit: 1 }, { check, now: () => now })
    expect(result).toMatchObject({ attempted: 1, reused: 0, networkRequests: 1 })
    expect(check).toHaveBeenCalledTimes(1)
    const again = await checkReleaseSpots(contract, { checkpoint, limit: 1 }, { check, now: () => now })
    expect(again).toMatchObject({ attempted: 0, reused: 1, networkRequests: 0 })
    expect(check).toHaveBeenCalledTimes(1)
    expect(await readFile(checkpoint, 'utf8')).toContain('{"interrupted":\n')
  })
  it('keeps failed/limited attempts only as checkpoint evidence, never a valid release', async () => {
    const root = await mkdtemp(join(tmpdir(), 'atlas-release-spots-')); owned.push(root)
    const checkpoint = join(root, 'checks.jsonl')
    const two = { ...contract, targets: [...contract.targets, { assetId: 'b', url: `${url}?b` }] }
    await expect(checkReleaseSpots(two, { checkpoint, limit: 1 }, { now: () => now, check: async () => report().checks[0]! })).rejects.toThrow('missing')
    const failed = { ...report().checks[0]!, ok: false, status: 404, reason: 'http-404' }
    await writeFile(checkpoint, `${JSON.stringify({ contractFingerprint: contentDigest(contract), check: failed })}\n`)
    await expect(checkReleaseSpots(contract, { checkpoint, limit: 1 }, { now: () => now, check: async () => failed })).rejects.toThrow('invalid')
    expect(await readFile(checkpoint, 'utf8')).toContain('http-404')
  })
  it('rejects unknown flags, duplicate flags, invalid limits and aliasing paths', () => {
    expect(parseReleaseSpotArgs(['--config', '/a', '--checkpoint', '/b', '--output', '/c']).limit).toBe(Infinity)
    for (const args of [['--keys', '1'], ['--config', '/a', '--config', '/b'],
      ['--config', '/a', '--checkpoint', '/a', '--output', '/c'],
      ['--config', '/a', '--checkpoint', '/b', '--output', '/c', '--limit', '0']]) expect(() => parseReleaseSpotArgs(args)).toThrow()
  })
  it.each(['path', 'hardlink'])('protects a previous current report used as checkpoint by %s before any network request', async (alias) => {
    const fixture = await fileFixture(), before = await readFile(fixture.previous)
    const request = vi.fn(); vi.stubGlobal('fetch', request)
    if (alias === 'hardlink') await link(fixture.previous, fixture.options.checkpoint)
    else fixture.options.checkpoint = fixture.previous
    await expect(runReleaseSpotAudit(fixture.options)).rejects.toThrow(/overwrite frozen evidence|aliases protected input/)
    expect(await readFile(fixture.previous)).toEqual(before)
    expect(request).not.toHaveBeenCalled()
  })
  it('allows a nonexistent ignored current descriptor but still protects later existing inputs', async () => {
    const fixture = await fileFixture()
    fixture.config.releaseEvidence.currentUrlReport.path = join(fixture.root, 'future-report.json')
    await writeFile(fixture.options.checkpoint, '')
    await expect(assertReleaseSpotPaths(fixture.config, fixture.options)).resolves.toBeUndefined()
    const galleryReviewPath = join(fixture.root, 'target-review.json')
    await link(fixture.options.checkpoint, galleryReviewPath)
    fixture.config.galleryReview.document = { ...fixture.config.galleryReview.document, path: galleryReviewPath }
    await expect(assertReleaseSpotPaths(fixture.config, fixture.options)).rejects.toThrow('aliases protected input')
  })
})
