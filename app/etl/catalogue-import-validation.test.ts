import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { ASSET_TRANSFER_COLUMNS, CONTENT_WORK_VERSIONS, WORK_TRANSFER_COLUMNS, canonicalContent, contentDigest } from './catalogue-gallery-transfer'
import { TRANSFER_SPECS, writeTransferJsonl, type TransferSpec } from './catalogue-transfer'
import {
  validateCatalogueImportBundle,
  validateCatalogueReleaseEvidence,
  type CatalogueImportBundleInput,
  type CatalogueReleaseEvidenceInput,
  type ImportEvidenceFile,
} from './catalogue-import-validation'

const paths: string[] = []
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex')
const row = (columns: readonly string[], values: Record<string, unknown>) => Object.fromEntries(columns.map((column) => [column, values[column] ?? null]))
const pretty = (value: unknown) => `${JSON.stringify(JSON.parse(canonicalContent(value)), null, 2)}\n`

afterEach(async () => { await Promise.all(paths.splice(0).map((path) => rm(path, { recursive: true, force: true }))) })

async function evidence(path: string): Promise<ImportEvidenceFile> {
  const bytes = await readFile(path)
  return { path, sha256: digest(bytes), bytes: bytes.length }
}

async function fixture(options: { foreignAsset?: boolean; longCaption?: boolean; duplicateAsset?: boolean; personalAsset?: boolean; missingWork?: boolean; invalidSource?: boolean; countryCode?: string; incompleteBuild?: boolean } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'atlas-import-validation-')); paths.push(root)
  const baseDir = join(root, 'base'), galleryDir = join(root, 'gallery')
  const catalogueId = 'catalogue-1', taxonId = 'taxon-1', registryVersionId = 'registry-1'
  const identity = {
    id: catalogueId, runKey: 'germany-run', registryVersionId, inputFingerprint: '1'.repeat(64),
    responseFingerprint: '2'.repeat(64), unionFingerprint: '3'.repeat(64),
  }
  const countryCode = options.countryCode ?? 'DE'
  const values: Record<string, Record<string, unknown>[]> = {
    Region: [row(TRANSFER_SPECS.find((spec) => spec.table === 'Region')!.columns,
      { id: 'region-1', canonicalKey: 'de-krg-00000001', countryCode, name: 'Fixture region', higher: 'Fixture', status: 'ready' })],
    RegionRegistryVersion: [row(TRANSFER_SPECS.find((spec) => spec.table === 'RegionRegistryVersion')!.columns,
      { id: registryVersionId, countryCode, expectedRegions: 1, expectedSourceUnits: 1, active: true })],
    RegionRegistrySource: [row(TRANSFER_SPECS.find((spec) => spec.table === 'RegionRegistrySource')!.columns,
      { id: 'source-1', registryVersionId })],
    RegionRegistryEntry: [row(TRANSFER_SPECS.find((spec) => spec.table === 'RegionRegistryEntry')!.columns,
      { id: 'entry-1', registryVersionId, sourceId: 'source-1', regionId: 'region-1' })],
    RegionRegistryAlias: [],
    RegionSourceUnit: [row(TRANSFER_SPECS.find((spec) => spec.table === 'RegionSourceUnit')!.columns,
      { id: 'unit-1', registryVersionId, registryEntryId: 'entry-1', sourceId: 'source-1' })],
    RegionQueryUnit: [row(TRANSFER_SPECS.find((spec) => spec.table === 'RegionQueryUnit')!.columns,
      { id: 'query-1', registryVersionId, sourceUnitId: 'unit-1', sourceId: options.invalidSource ? 'missing-source' : 'source-1' })],
    Taxon: [row(TRANSFER_SPECS.find((spec) => spec.table === 'Taxon')!.columns, { id: taxonId, gbifKey: 1, sciName: 'Species fixture', tile: 'bird' })],
    CatalogueVersion: [row(TRANSFER_SPECS.find((spec) => spec.table === 'CatalogueVersion')!.columns,
      { ...identity, countryCode, unionTaxa: 1, expectedRegions: 1, completedRegions: options.incompleteBuild ? 0 : 1, status: 'active' })],
    CatalogueRegionBuild: [row(TRANSFER_SPECS.find((spec) => spec.table === 'CatalogueRegionBuild')!.columns,
      { id: 'build-1', catalogueVersionId: catalogueId, registryVersionId, registryEntryId: 'entry-1', status: options.incompleteBuild ? 'pending' : 'complete' })],
    CataloguePlausibility: [], CatalogueLookalike: [],
    CatalogueTaxon: [row(TRANSFER_SPECS.find((spec) => spec.table === 'CatalogueTaxon')!.columns, { catalogueVersionId: catalogueId, taxonId })],
    CatalogueTaxonomyResolution: [],
  }
  const asset = row(ASSET_TRANSFER_COLUMNS, {
    id: 'asset-1', kind: 'image', url: 'https://static.inaturalist.org/photos/1/medium.jpg', author: 'Author', licence: 'CC BY 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://www.inaturalist.org/photos/1',
    origin: 'inat', caption: options.longCaption ? 'x'.repeat(2048) : 'Species fixture', position: 0,
    createdAt: '2026-09-11T00:00:00.000', taxonId: options.foreignAsset ? 'missing-taxon' : taxonId,
    ownerId: options.personalAsset ? 'owner-1' : null, byteSize: 10,
  })
  const assets = options.duplicateAsset ? [asset, { ...asset }] : [asset]
  const work = [
    row(WORK_TRANSFER_COLUMNS, { taxonId, kind: 'gallery', version: CONTENT_WORK_VERSIONS.gallery, status: 'complete', resultSummary: {}, sourceFingerprint: '4'.repeat(64), createdAt: '2026-09-11T00:00:00.000', updatedAt: '2026-09-11T00:00:00.000' }),
    row(WORK_TRANSFER_COLUMNS, { taxonId, kind: 'names', version: CONTENT_WORK_VERSIONS.names, status: 'complete', resultSummary: {}, sourceFingerprint: '5'.repeat(64), createdAt: '2026-09-11T00:00:00.000', updatedAt: '2026-09-11T00:00:00.000' }),
  ].slice(0, options.missingWork ? 1 : 2)
  const baseArtifactPath = join(baseDir, 'transfer-artifact.jsonl')
  const baseTransfer = await writeTransferJsonl({ catalogueId, path: baseArtifactPath, specs: TRANSFER_SPECS,
    fetchPage: async (spec, limit, offset) => (values[spec.table] ?? []).slice(offset, offset + limit) })
  const gallerySpecs: TransferSpec[] = [
    { table: 'Asset', columns: ASSET_TRANSFER_COLUMNS, sql: 'fixture' },
    { table: 'TaxonEnrichmentWork', columns: WORK_TRANSFER_COLUMNS, sql: 'fixture' },
  ]
  const galleryArtifactPath = join(galleryDir, 'gallery-artifact.jsonl')
  const galleryTransfer = await writeTransferJsonl({ catalogueId, path: galleryArtifactPath, specs: gallerySpecs,
    fetchPage: async (spec, limit, offset) => (spec.table === 'Asset' ? assets : work).slice(offset, offset + limit) })

  const galleryCatalogue = { ...identity, countryCode, status: 'active', unionTaxa: 1, expectedRegions: 1, completedRegions: 1 }
  const taxa = values.Taxon
  const taxonFingerprint = contentDigest(taxa)
  const contentFingerprint = contentDigest({ catalogue: galleryCatalogue, taxa, assets: assets.map((item) => ({ ...item, avatarOf: false })), work })
  const baseReview = { targetId: 'region:de-krg-00000001', reviewer: 'Fixture reviewer', reviewedAt: '2026-09-10T00:00:00.000Z', notes: 'Reviewed exact region evidence.',
    checks: { species: 'pass', naming: 'pass', seasonality: 'pass', boundary: 'pass' } }
  const baseAudit = { schemaVersion: 1, catalogue: { ...identity, countryCode, status: 'active' }, defects: [], review: { required: 1, passed: 1, failed: 0, missing: 0 },
    reviewTargets: [{ id: baseReview.targetId, key: 'de-krg-00000001', name: 'Fixture region', state: 'Fixture', reasons: ['representative:fixture'], evidence: {}, review: baseReview }],
    verdict: 'ready-for-transfer' }
  const networkReview = { schemaVersion: 1, catalogueId, contentFingerprint, reviewer: 'Fixture reviewer', reviewedAt: '2026-09-10T00:00:00.000Z', notes: 'Decoded and checked exact reference.',
    samples: [{ assetId: 'asset-1', url: asset.url, method: 'browser', rendered: true, sourcePageChecked: true, attributionChecked: true, licenceChecked: true, evidence: 'fixture/image.png' }] }
  const urlTargets = assets.map((item) => ({ id: item.id, taxonId: item.taxonId, position: item.position, url: item.url }))
  const urlReport = (at: string) => ({ schemaVersion: 1, catalogueId, unionFingerprint: identity.unionFingerprint, generatedAt: at,
    targetsFingerprint: digest(JSON.stringify(urlTargets)), assets: assets.length, urls: new Set(assets.map((item) => item.url)).size,
    passed: new Set(assets.map((item) => item.url)).size, failed: 0, pending: 0,
    checks: [...new Set(assets.map((item) => item.url))].map((url) => ({ url, checkedAt: at, ok: true, status: 200, method: 'HEAD', contentType: 'image/jpeg', finalUrl: url, reason: null })) })
  const auditUrlReport = urlReport('2026-09-10T00:00:00.000Z')
  const currentUrlReport = urlReport('2026-09-11T03:00:00.000Z')
  const contentAudit = { schemaVersion: 1, catalogue: galleryCatalogue, contentFingerprint, taxonFingerprint,
    versions: CONTENT_WORK_VERSIONS, defects: [], blockers: [], failures: [],
    network: { status: 'sample-passed', reviewed: 1,
      targets: [{ assetId: 'asset-1', gbifKey: 1, tile: 'bird', position: 0, origin: 'inat', url: asset.url, sourceUrl: asset.sourceUrl, licence: asset.licence, licenceUrl: asset.licenceUrl, reasons: ['fixture'] }],
      evidenceFingerprint: contentDigest(networkReview),
      urlChecks: { supplied: true, reportFingerprint: contentDigest(auditUrlReport), passed: auditUrlReport.passed, urls: auditUrlReport.urls, failed: 0, pending: 0 } },
    verdict: 'ready-for-transfer' }
  const baseAuditFingerprint = contentDigest(baseAudit), contentAuditFingerprint = contentDigest(contentAudit)
  const baseManifest = { schemaVersion: 1, catalogue: identity, auditFingerprint: baseAuditFingerprint, eligible: true, blockers: [],
    payload: { format: 'standkreis-jsonl-v1', artifact: baseTransfer.artifact,
      tables: [...baseTransfer.tables].sort((a, b) => a.table.localeCompare(b.table)),
      excludes: ['Asset', 'EmailCode', 'Filter', 'Identity', 'Passkey', 'Sighting', 'Study'], containsPersonalRows: false } }
  const galleryManifest = { schemaVersion: 1, catalogue: galleryCatalogue, contentFingerprint, taxonFingerprint,
    auditFingerprint: contentAuditFingerprint, eligible: true, blockers: [], payload: galleryTransfer,
    excludes: ['Identity', 'Filter', 'Sighting', 'Study', 'Passkey', 'EmailCode', 'personal/owned/avatar Asset', 'sound Asset', 'outside-union Asset', 'unrelated/incomplete enrichment work'],
    networkClaim: 'Fixture review claim.' }
  const baseAuditPath = join(baseDir, 'audit.json'), baseManifestPath = join(baseDir, 'transfer-manifest.json')
  const contentAuditPath = join(galleryDir, 'content-audit.json'), galleryManifestPath = join(galleryDir, 'gallery-transfer-manifest.json')
  const networkReviewPath = join(galleryDir, 'network-review.json'), auditUrlReportPath = join(galleryDir, 'audit-url-report.json')
  const currentUrlReportPath = join(galleryDir, 'current-url-report.json')
  await Promise.all([
    writeFile(baseAuditPath, pretty(baseAudit)), writeFile(baseManifestPath, pretty(baseManifest)),
    writeFile(contentAuditPath, `${canonicalContent(contentAudit)}\n`), writeFile(galleryManifestPath, `${canonicalContent(galleryManifest)}\n`),
    writeFile(networkReviewPath, `${canonicalContent(networkReview)}\n`), writeFile(auditUrlReportPath, `${canonicalContent(auditUrlReport)}\n`),
    writeFile(currentUrlReportPath, `${canonicalContent(currentUrlReport)}\n`),
  ])
  const input: CatalogueImportBundleInput = {
    pins: { catalogueId, runKey: identity.runKey, registryVersionId, unionTaxa: 1,
      inputFingerprint: identity.inputFingerprint, responseFingerprint: identity.responseFingerprint, unionFingerprint: identity.unionFingerprint,
      baseAuditFingerprint, contentAuditFingerprint, contentFingerprint, taxonFingerprint },
    base: { audit: await evidence(baseAuditPath), manifest: await evidence(baseManifestPath), artifact: await evidence(baseArtifactPath) },
    gallery: { audit: await evidence(contentAuditPath), manifest: await evidence(galleryManifestPath), artifact: await evidence(galleryArtifactPath) },
  }
  const release: CatalogueReleaseEvidenceInput = {
    networkReview: await evidence(networkReviewPath), auditUrlReport: await evidence(auditUrlReportPath), currentUrlReport: await evidence(currentUrlReportPath),
  }
  return { input, release, paths: { baseAuditPath, baseManifestPath, baseArtifactPath, contentAuditPath, galleryManifestPath, galleryArtifactPath,
    networkReviewPath, auditUrlReportPath, currentUrlReportPath } }
}

async function repinArtifact(input: CatalogueImportBundleInput, side: 'base' | 'gallery') {
  const bundle = input[side]
  bundle.artifact = await evidence(bundle.artifact.path)
  const manifest = JSON.parse(await readFile(bundle.manifest.path, 'utf8'))
  manifest.payload.artifact.sha256 = bundle.artifact.sha256
  manifest.payload.artifact.bytes = bundle.artifact.bytes
  await writeFile(bundle.manifest.path, side === 'base' ? pretty(manifest) : `${canonicalContent(manifest)}\n`)
  bundle.manifest = await evidence(bundle.manifest.path)
}

async function repinBaseAudit(input: CatalogueImportBundleInput, audit: Record<string, unknown>) {
  await writeFile(input.base.audit.path, pretty(audit))
  input.base.audit = await evidence(input.base.audit.path)
  input.pins.baseAuditFingerprint = contentDigest(audit)
  const manifest = JSON.parse(await readFile(input.base.manifest.path, 'utf8'))
  manifest.auditFingerprint = input.pins.baseAuditFingerprint
  await writeFile(input.base.manifest.path, pretty(manifest))
  input.base.manifest = await evidence(input.base.manifest.path)
}

describe('validateCatalogueImportBundle', () => {
  it('returns frozen decoded tables and can revalidate unchanged evidence', async () => {
    const { input } = await fixture()
    const validated = await validateCatalogueImportBundle(input)
    expect(validated.tables.size).toBe(16)
    expect(validated.tables.get('Asset')).toHaveLength(1)
    expect(validated.evidence.files).toHaveLength(6)
    expect(validated.evidence.tables).toHaveLength(16)
    expect(validated.evidence.decodedFingerprint).toMatch(/^[a-f\d]{64}$/)
    expect(Object.isFrozen(validated.tables.get('Asset'))).toBe(true)
    expect(Object.isFrozen(validated.tables.get('Asset')![0])).toBe(true)
    expect('set' in validated.tables).toBe(false)
    expect(() => (validated.tables as Map<string, unknown>).set('Asset', [])).toThrow()
    expect(() => Object.assign(validated.tables.get('Asset')![0]!, { id: 'changed' })).toThrow()
    await expect(validated.assertStillValid()).resolves.toBeUndefined()
  })

  it('binds frozen review inputs while accepting a distinct fresh release URL report', async () => {
    const { input, release, paths: fixturePaths } = await fixture()
    const source = await validateCatalogueImportBundle(input)
    await expect(validateCatalogueReleaseEvidence(source, { ...release, currentUrlReport: release.auditUrlReport },
      { now: new Date('2026-09-10T01:00:00.000Z') })).resolves.toBeDefined()
    const validated = await validateCatalogueReleaseEvidence(source, release, { now: new Date('2026-09-11T04:00:00.000Z') })
    expect(validated.releaseEvidence).toHaveLength(3)
    await expect(validated.assertReleaseEvidenceStillValid(new Date('2026-09-11T04:00:00.000Z'))).resolves.toBeUndefined()
    await expect(validated.assertReleaseEvidenceStillValid(new Date('2026-09-12T03:00:00.000Z'))).rejects.toThrow('stale')
    await writeFile(fixturePaths.currentUrlReportPath, `${await readFile(fixturePaths.currentUrlReportPath, 'utf8')}\n`)
    await expect(validated.assertReleaseEvidenceStillValid(new Date('2026-09-11T04:00:00.000Z'))).rejects.toThrow('changed after release validation')
  })

  it('rejects missing embedded base review decisions even when audit and manifest are repinned', async () => {
    const { input, paths: fixturePaths } = await fixture()
    const audit = JSON.parse(await readFile(fixturePaths.baseAuditPath, 'utf8'))
    audit.review = { required: 0, passed: 0, failed: 0, missing: 0 }
    audit.reviewTargets = []
    await repinBaseAudit(input, audit)
    await expect(validateCatalogueImportBundle(input)).rejects.toThrow('reviewed targets')
  })

  it('rejects a gallery manifest catalogue envelope that differs from its frozen audit', async () => {
    const { input, paths: fixturePaths } = await fixture()
    const manifest = JSON.parse(await readFile(fixturePaths.galleryManifestPath, 'utf8'))
    manifest.catalogue.countryCode = 'NL'
    manifest.catalogue.status = 'retired'
    await writeFile(fixturePaths.galleryManifestPath, `${canonicalContent(manifest)}\n`)
    input.gallery.manifest = await evidence(fixturePaths.galleryManifestPath)
    await expect(validateCatalogueImportBundle(input)).rejects.toThrow('catalogue envelope mismatch')
  })

  it('rejects unbound review bytes and stale current reports without invalidating the historical audit report', async () => {
    const first = await fixture()
    const firstSource = await validateCatalogueImportBundle(first.input)
    const review = JSON.parse(await readFile(first.paths.networkReviewPath, 'utf8'))
    review.notes = 'Different review bytes.'
    await writeFile(first.paths.networkReviewPath, `${canonicalContent(review)}\n`)
    first.release.networkReview = await evidence(first.paths.networkReviewPath)
    await expect(validateCatalogueReleaseEvidence(firstSource, first.release, { now: new Date('2026-09-11T04:00:00.000Z') })).rejects.toThrow('evidence fingerprint')

    const second = await fixture()
    const secondSource = await validateCatalogueImportBundle(second.input)
    const report = JSON.parse(await readFile(second.paths.currentUrlReportPath, 'utf8'))
    report.generatedAt = '2026-09-10T03:59:59.999Z'
    for (const check of report.checks) check.checkedAt = report.generatedAt
    await writeFile(second.paths.currentUrlReportPath, `${canonicalContent(report)}\n`)
    second.release.currentUrlReport = await evidence(second.paths.currentUrlReportPath)
    await expect(validateCatalogueReleaseEvidence(secondSource, second.release, { now: new Date('2026-09-11T04:00:00.000Z') })).rejects.toThrow('stale')
  })

  it('rejects duplicate JSON fields even when the file and manifest hashes are repinned', async () => {
    const { input, paths: fixturePaths } = await fixture()
    const artifact = await readFile(fixturePaths.galleryArtifactPath, 'utf8')
    await writeFile(fixturePaths.galleryArtifactPath, artifact.replace('"type":"row"}', '"type":"row","type":"row"}'))
    await repinArtifact(input, 'gallery')
    await expect(validateCatalogueImportBundle(input)).rejects.toThrow('not canonical JSON')
  })

  it('rejects a table digest drift after the outer file hashes are repinned', async () => {
    const { input, paths: fixturePaths } = await fixture()
    const artifact = await readFile(fixturePaths.galleryArtifactPath, 'utf8')
    await writeFile(fixturePaths.galleryArtifactPath, artifact.replace('Species fixture', 'Changed caption'))
    await repinArtifact(input, 'gallery')
    await expect(validateCatalogueImportBundle(input)).rejects.toThrow('Asset digest mismatch')
  })

  it('rejects a canonical bundle whose gallery Asset has a foreign taxon', async () => {
    const { input } = await fixture({ foreignAsset: true })
    await expect(validateCatalogueImportBundle(input)).rejects.toThrow('Asset.taxonId does not reference')
  })

  it('rejects duplicate or out-of-order table primary keys', async () => {
    const { input } = await fixture({ duplicateAsset: true })
    await expect(validateCatalogueImportBundle(input)).rejects.toThrow('primary keys are duplicate or out of order')
  })

  it('rejects personal Assets and incomplete content work even when their fingerprints agree', async () => {
    const personal = await fixture({ personalAsset: true })
    await expect(validateCatalogueImportBundle(personal.input)).rejects.toThrow('unqualified reference Asset')
    const incomplete = await fixture({ missingWork: true })
    await expect(validateCatalogueImportBundle(incomplete.input)).rejects.toThrow('lacks complete work')
  })

  it('requires source references and composite registry versions to be coherent', async () => {
    const { input } = await fixture({ invalidSource: true })
    await expect(validateCatalogueImportBundle(input)).rejects.toThrow('RegionQueryUnit.sourceId does not reference')
  })

  it('requires the German registry and completed build cardinalities', async () => {
    const foreign = await fixture({ countryCode: 'NL' })
    await expect(validateCatalogueImportBundle(foreign.input)).rejects.toThrow('base audit countryCode mismatch')
    const incomplete = await fixture({ incompleteBuild: true })
    await expect(validateCatalogueImportBundle(incomplete.input)).rejects.toThrow('CatalogueVersion complete region count mismatch')
  })

  it('rejects audit pin and manifest eligibility drift', async () => {
    const first = await fixture()
    first.input.pins.baseAuditFingerprint = 'f'.repeat(64)
    await expect(validateCatalogueImportBundle(first.input)).rejects.toThrow('base audit fingerprint mismatch')
    const second = await fixture()
    const manifest = JSON.parse(await readFile(second.paths.baseManifestPath, 'utf8')); manifest.eligible = false
    await writeFile(second.paths.baseManifestPath, pretty(manifest)); second.input.base.manifest = await evidence(second.paths.baseManifestPath)
    await expect(validateCatalogueImportBundle(second.input)).rejects.toThrow('base manifest eligibility mismatch')
  })

  it('enforces the line memory limit', async () => {
    const { input } = await fixture({ longCaption: true })
    input.maxLineBytes = 1024
    await expect(validateCatalogueImportBundle(input)).rejects.toThrow('exceeds the line limit')
  })

  it('detects artifact changes after validation before apply', async () => {
    const { input, paths: fixturePaths } = await fixture()
    const validated = await validateCatalogueImportBundle(input)
    await writeFile(fixturePaths.galleryArtifactPath, `${await readFile(fixturePaths.galleryArtifactPath, 'utf8')}\n`)
    await expect(validated.assertStillValid()).rejects.toThrow('gallery artifact changed after validation')
  })

  it('requires the exporter final-newline contract', async () => {
    const { input, paths: fixturePaths } = await fixture()
    const artifact = await readFile(fixturePaths.galleryArtifactPath)
    await writeFile(fixturePaths.galleryArtifactPath, artifact.subarray(0, artifact.length - 1))
    await repinArtifact(input, 'gallery')
    await expect(validateCatalogueImportBundle(input)).rejects.toThrow('missing its final newline')
  })
})
