import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { ASSET_TRANSFER_COLUMNS, CONTENT_WORK_VERSIONS, WORK_TRANSFER_COLUMNS, canonicalContent, contentDigest } from './catalogue-gallery-transfer'
import { TRANSFER_SPECS, writeTransferJsonl, type TransferSpec } from './catalogue-transfer'
import { validateCatalogueImportBundle, type CatalogueImportBundleInput, type ImportEvidenceFile } from './catalogue-import-validation'

const paths: string[] = []
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex')
const row = (columns: readonly string[], values: Record<string, unknown>) => Object.fromEntries(columns.map((column) => [column, values[column] ?? null]))
const pretty = (value: unknown) => `${JSON.stringify(JSON.parse(canonicalContent(value)), null, 2)}\n`

afterEach(async () => { await Promise.all(paths.splice(0).map((path) => rm(path, { recursive: true, force: true }))) })

async function evidence(path: string): Promise<ImportEvidenceFile> {
  const bytes = await readFile(path)
  return { path, sha256: digest(bytes), bytes: bytes.length }
}

async function fixture(options: { foreignAsset?: boolean; longCaption?: boolean; duplicateAsset?: boolean; personalAsset?: boolean; missingWork?: boolean } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'atlas-import-validation-')); paths.push(root)
  const baseDir = join(root, 'base'), galleryDir = join(root, 'gallery')
  const catalogueId = 'catalogue-1', taxonId = 'taxon-1', registryVersionId = 'registry-1'
  const identity = {
    id: catalogueId, runKey: 'germany-run', registryVersionId, inputFingerprint: '1'.repeat(64),
    responseFingerprint: '2'.repeat(64), unionFingerprint: '3'.repeat(64),
  }
  const values: Record<string, Record<string, unknown>[]> = {
    Region: [row(TRANSFER_SPECS.find((spec) => spec.table === 'Region')!.columns, { id: 'region-1' })],
    RegionRegistryVersion: [row(TRANSFER_SPECS.find((spec) => spec.table === 'RegionRegistryVersion')!.columns, { id: registryVersionId })],
    RegionRegistrySource: [],
    RegionRegistryEntry: [row(TRANSFER_SPECS.find((spec) => spec.table === 'RegionRegistryEntry')!.columns, { id: 'entry-1', registryVersionId, regionId: 'region-1' })],
    RegionRegistryAlias: [], RegionSourceUnit: [], RegionQueryUnit: [],
    Taxon: [row(TRANSFER_SPECS.find((spec) => spec.table === 'Taxon')!.columns, { id: taxonId, gbifKey: 1, sciName: 'Species fixture' })],
    CatalogueVersion: [row(TRANSFER_SPECS.find((spec) => spec.table === 'CatalogueVersion')!.columns, { ...identity, unionTaxa: 1, status: 'active' })],
    CatalogueRegionBuild: [row(TRANSFER_SPECS.find((spec) => spec.table === 'CatalogueRegionBuild')!.columns,
      { id: 'build-1', catalogueVersionId: catalogueId, registryVersionId, registryEntryId: 'entry-1' })],
    CataloguePlausibility: [], CatalogueLookalike: [],
    CatalogueTaxon: [row(TRANSFER_SPECS.find((spec) => spec.table === 'CatalogueTaxon')!.columns, { catalogueVersionId: catalogueId, taxonId })],
    CatalogueTaxonomyResolution: [],
  }
  const asset = row(ASSET_TRANSFER_COLUMNS, {
    id: 'asset-1', kind: 'image', url: 'https://example.test/image.jpg', author: 'Author', licence: 'CC BY 4.0',
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

  const galleryCatalogue = { ...identity, countryCode: 'DE', status: 'active', unionTaxa: 1, expectedRegions: 1, completedRegions: 1 }
  const taxa = values.Taxon
  const taxonFingerprint = contentDigest(taxa)
  const contentFingerprint = contentDigest({ catalogue: galleryCatalogue, taxa, assets: assets.map((item) => ({ ...item, avatarOf: false })), work })
  const baseAudit = { schemaVersion: 1, catalogue: identity, defects: [], review: { required: 0, passed: 0, failed: 0, missing: 0 }, reviewTargets: [], verdict: 'ready-for-transfer' }
  const contentAudit = { schemaVersion: 1, catalogue: galleryCatalogue, contentFingerprint, taxonFingerprint,
    versions: CONTENT_WORK_VERSIONS, defects: [], blockers: [], failures: [],
    network: { status: 'sample-passed', reviewed: 0, targets: [], urlChecks: { supplied: true, passed: assets.length, urls: assets.length, failed: 0, pending: 0 } },
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
  await Promise.all([
    writeFile(baseAuditPath, pretty(baseAudit)), writeFile(baseManifestPath, pretty(baseManifest)),
    writeFile(contentAuditPath, `${canonicalContent(contentAudit)}\n`), writeFile(galleryManifestPath, `${canonicalContent(galleryManifest)}\n`),
  ])
  const input: CatalogueImportBundleInput = {
    pins: { catalogueId, runKey: identity.runKey, registryVersionId, unionTaxa: 1,
      inputFingerprint: identity.inputFingerprint, responseFingerprint: identity.responseFingerprint, unionFingerprint: identity.unionFingerprint,
      baseAuditFingerprint, contentAuditFingerprint, contentFingerprint, taxonFingerprint },
    base: { audit: await evidence(baseAuditPath), manifest: await evidence(baseManifestPath), artifact: await evidence(baseArtifactPath) },
    gallery: { audit: await evidence(contentAuditPath), manifest: await evidence(galleryManifestPath), artifact: await evidence(galleryArtifactPath) },
  }
  return { input, paths: { baseAuditPath, baseManifestPath, baseArtifactPath, contentAuditPath, galleryManifestPath, galleryArtifactPath } }
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

describe('validateCatalogueImportBundle', () => {
  it('returns frozen decoded tables and can revalidate unchanged evidence', async () => {
    const { input } = await fixture()
    const validated = await validateCatalogueImportBundle(input)
    expect(validated.tables.size).toBe(16)
    expect(validated.tables.get('Asset')).toHaveLength(1)
    expect(validated.evidence.files).toHaveLength(6)
    expect(validated.evidence.tables).toHaveLength(16)
    expect(Object.isFrozen(validated.tables.get('Asset'))).toBe(true)
    expect(Object.isFrozen(validated.tables.get('Asset')![0])).toBe(true)
    await expect(validated.assertStillValid()).resolves.toBeUndefined()
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
