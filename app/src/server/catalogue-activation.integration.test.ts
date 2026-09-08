import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { activateLocalCatalogue, buildCatalogueAudit, loadAuditSnapshot, makeReviewTemplate, sha256, type AuditRegistryContract, type ReviewFile } from '../../etl/catalogue-audit'
import { exportLocalCatalogueArtifact } from '../../etl/catalogue-transfer'
import { db } from '../../etl/db'

const REGISTRY_ID = 'de-krg-2096-12-31-audit'
const CATALOGUE_ID = 'catalogue-audit-activation-fixture'
const RUN_KEY = 'issue-19-activation-fixture'
const TAXON_KEY = 990_019_001
const IDENTITY_ID = 'issue-19-personal-fixture'
const SIGHTING_ID = 'issue-19-sighting-fixture'
const ASSET_ID = 'issue-19-asset-fixture'
const SAMPLE_KEYS = Array.from({ length: 6 }, (_, index) => `de-krg-98${String(index + 1).padStart(6, '0')}`)
const REGION_IDS = SAMPLE_KEYS.map((_, index) => `issue-19-region-${index + 1}`)
const ENTRY_IDS = SAMPLE_KEYS.map((_, index) => `issue-19-entry-${index + 1}`)
const SOURCE_IDS = ['issue-19-source-regions', 'issue-19-source-kreise', 'issue-19-source-query']
const UNIT_CODES = ['98001', '98002', '98003', '98004', '98005', '98006']
const TOPIC_DATE = new Date('2096-12-31T00:00:00.000Z')

const registryRows = SAMPLE_KEYS.map((key, index) => ({
  key,
  sourceCode: key.slice(-8),
  name: `Audit Region ${index + 1}`,
  sourceName: `Audit Region ${index + 1}`,
  stateCode: '98',
  state: 'Auditland',
  aliases: [`Audit Region ${index + 1}`],
  sourceUnits: [{ sourceCode: UNIT_CODES[index]!, name: `Audit Kreis ${index + 1}`, kind: 'Landkreis' }],
}))

const contract: AuditRegistryContract = {
  artifactSha256: 'a'.repeat(64),
  regions: 6,
  sourceUnits: 6,
  mappedQueryUnits: 6,
  provider: 'gbifGadm',
  providerVersion: '4.1-test',
  excludedQueryKeys: [],
  registryRows,
  sampleRegions: SAMPLE_KEYS.map((key, index) => ({ key, category: `fixture-${index + 1}` })),
  southwest: { key: SAMPLE_KEYS[5]!, sourceUnits: [UNIT_CODES[5]!] },
}

let previousActiveCatalogue: string | null = null
let previousActiveRegistry: string | null = null

async function cleanup() {
  const regionIds = REGION_IDS
  await db.asset.deleteMany({ where: { id: ASSET_ID } })
  await db.study.deleteMany({ where: { identityId: IDENTITY_ID } })
  await db.sighting.deleteMany({ where: { identityId: IDENTITY_ID } })
  await db.identity.deleteMany({ where: { id: IDENTITY_ID } })
  await db.lookalike.deleteMany({ where: { regionId: { in: regionIds } } })
  await db.plausibility.deleteMany({ where: { regionId: { in: regionIds } } })
  await db.catalogueLookalike.deleteMany({ where: { regionBuild: { catalogueVersionId: CATALOGUE_ID } } })
  await db.cataloguePlausibility.deleteMany({ where: { regionBuild: { catalogueVersionId: CATALOGUE_ID } } })
  await db.catalogueTaxon.deleteMany({ where: { catalogueVersionId: CATALOGUE_ID } })
  await db.catalogueTaxonomyResolution.deleteMany({ where: { catalogueVersionId: CATALOGUE_ID } })
  await db.catalogueRegionBuild.deleteMany({ where: { catalogueVersionId: CATALOGUE_ID } })
  await db.catalogueVersion.deleteMany({ where: { id: CATALOGUE_ID } })
  await db.regionQueryUnit.deleteMany({ where: { registryVersionId: REGISTRY_ID } })
  await db.regionRegistryAlias.deleteMany({ where: { registryEntryId: { in: ENTRY_IDS } } })
  await db.regionSourceUnit.deleteMany({ where: { registryVersionId: REGISTRY_ID } })
  await db.regionRegistryEntry.deleteMany({ where: { registryVersionId: REGISTRY_ID } })
  await db.regionRegistrySource.deleteMany({ where: { registryVersionId: REGISTRY_ID } })
  await db.regionRegistryVersion.deleteMany({ where: { id: REGISTRY_ID } })
  await db.region.deleteMany({ where: { id: { in: REGION_IDS } } })
  await db.taxon.deleteMany({ where: { gbifKey: TAXON_KEY } })
}

beforeAll(async () => {
  previousActiveCatalogue = (await db.catalogueVersion.findFirst({ where: { countryCode: 'DE', status: 'active' }, select: { id: true } }))?.id ?? null
  previousActiveRegistry = (await db.regionRegistryVersion.findFirst({ where: { countryCode: 'DE', active: true }, select: { id: true } }))?.id ?? null
  await cleanup()

  const sourceRecords = [
    { role: 'regions', sha256: '1'.repeat(64), topicDate: '2096-12-31' },
    { role: 'kreisUnits', sha256: '2'.repeat(64), topicDate: '2096-12-31' },
    { role: 'queryMappings', sha256: '3'.repeat(64), topicDate: '2096-12-31' },
  ]
  const sourceFingerprint = sha256({ artifact: contract.artifactSha256, sources: sourceRecords })
  const occurrencePredicates = { basisOfRecord: ['HUMAN_OBSERVATION'], occurrenceStatus: 'PRESENT' }
  const inputFingerprint = sha256({ registryVersionId: REGISTRY_ID, registryVersion: REGISTRY_ID, sourceFingerprint, rules: { plausible: 1, tile: 1 }, observation: { version: 1, yearFrom: 2016, yearTo: 2026 }, occurrencePredicates })
  const unionFingerprint = sha256([TAXON_KEY])
  const regionalResponses = ENTRY_IDS.map((entry, index) => ({ entry, response: sha256(`response-${index}`) }))
  const responseFingerprint = sha256(regionalResponses)
  const taxonomyRecord = { version: 1, status: 'accepted', acceptedKey: TAXON_KEY, species: { key: TAXON_KEY, rank: 'SPECIES', canonicalName: 'Audita plantarum', kingdom: 'Plantae', genus: 'Audita' } }
  const mappingSource = { name: 'fixture query', url: 'https://example.test/query', sha256: sourceRecords[2]!.sha256 }
  const mappingMetadata = {
    provider: 'gbifGadm', providerVersion: '4.1-test', gbifEvidence: { name: 'fixture GBIF evidence', url: 'https://example.test/gbif', sha256: '5'.repeat(64) },
    resolvedAt: TOPIC_DATE.toISOString(), reviewedAt: TOPIC_DATE.toISOString(), counts: { sourceUnits: 6, mappedQueryUnits: 6, excludedQueryUnits: 0, providerInventory: 6 },
    review: { status: 'verified', method: 'fixture overlap', minimumLargestOverlap: 1, excluded: [] },
  }
  const mappingSha256 = sha256({ schemaVersion: 1, registryId: REGISTRY_ID, provider: mappingMetadata.provider, providerVersion: mappingMetadata.providerVersion, source: mappingSource, gbifEvidence: mappingMetadata.gbifEvidence, resolvedAt: mappingMetadata.resolvedAt, reviewedAt: mappingMetadata.reviewedAt, counts: mappingMetadata.counts, review: mappingMetadata.review, mappings: UNIT_CODES.map((sourceCode, index) => ({ sourceUnitKey: `de-krs-${sourceCode}`, providerKeys: [`DEU.96.${index + 1}_999`] })) })

  await db.$transaction(async (tx) => {
    await tx.regionRegistryVersion.create({ data: { id: REGISTRY_ID, countryCode: 'DE', version: REGISTRY_ID, artifactSha256: contract.artifactSha256, expectedRegions: 6, expectedSourceUnits: 6 } })
    await tx.regionRegistrySource.createMany({ data: [
      { id: SOURCE_IDS[0]!, registryVersionId: REGISTRY_ID, role: 'regions', name: 'fixture regions', url: 'https://example.test/regions', topicDate: TOPIC_DATE, downloadedAt: TOPIC_DATE, sha256: sourceRecords[0]!.sha256, licenceId: 'dl-de/by-2-0', attribution: 'fixture' },
      { id: SOURCE_IDS[1]!, registryVersionId: REGISTRY_ID, role: 'kreisUnits', name: 'fixture Kreise', url: 'https://example.test/kreise', topicDate: TOPIC_DATE, downloadedAt: TOPIC_DATE, sha256: sourceRecords[1]!.sha256, licenceId: 'dl-de/by-2-0', attribution: 'fixture' },
      { id: SOURCE_IDS[2]!, registryVersionId: REGISTRY_ID, role: 'queryMappings', name: 'fixture query → BKG VG250', url: mappingSource.url, topicDate: TOPIC_DATE, downloadedAt: TOPIC_DATE, sha256: mappingSource.sha256, licenceId: 'gadm-non-commercial', attribution: 'fixture', metadata: { ...mappingMetadata, mappingSha256, sourceUnitCount: 6, queryUnitCount: 6 } },
    ] })
    await tx.region.createMany({ data: REGION_IDS.map((id, index) => ({ id, canonicalKey: SAMPLE_KEYS[index]!, countryCode: 'DE', name: `Audit Region ${index + 1}`, higher: 'Deutschland › Auditland', status: 'unprepared' })) })
    await tx.regionRegistryEntry.createMany({ data: ENTRY_IDS.map((id, index) => ({ id, registryVersionId: REGISTRY_ID, sourceId: SOURCE_IDS[0]!, regionId: REGION_IDS[index]!, sourceCode: SAMPLE_KEYS[index]!.slice(-8), sourceName: `Audit Region ${index + 1}`, displayName: `Audit Region ${index + 1}`, stateCode: '98', stateName: 'Auditland' })) })
    await tx.regionRegistryAlias.createMany({ data: ENTRY_IDS.map((entryId, index) => ({ registryEntryId: entryId, kind: 'displayName', name: `Audit Region ${index + 1}`, normalizedName: `audit region ${index + 1}` })) })
    await tx.regionSourceUnit.createMany({ data: UNIT_CODES.map((sourceCode, index) => ({ id: `issue-19-unit-${index + 1}`, registryVersionId: REGISTRY_ID, registryEntryId: ENTRY_IDS[index]!, sourceId: SOURCE_IDS[1]!, canonicalKey: `de-krs-${sourceCode}`, sourceCode, name: `Audit Kreis ${index + 1}`, kind: 'Landkreis' })) })
    await tx.regionQueryUnit.createMany({ data: UNIT_CODES.map((sourceCode, index) => ({ id: `issue-19-query-${index + 1}`, registryVersionId: REGISTRY_ID, sourceUnitId: `issue-19-unit-${index + 1}`, sourceId: SOURCE_IDS[2]!, provider: 'gbifGadm', providerVersion: '4.1-test', providerKey: `DEU.96.${index + 1}_999`, reviewStatus: 'verified', reviewedAt: TOPIC_DATE, evidence: { sourceUnitKey: `de-krs-${sourceCode}`, mappingSha256, resolvedAt: mappingMetadata.resolvedAt, reviewMethod: mappingMetadata.review.method, minimumLargestOverlap: mappingMetadata.review.minimumLargestOverlap } })) })
    const taxon = await tx.taxon.create({ data: { gbifKey: TAXON_KEY, sciName: 'Audita plantarum', commonNames: { de: 'Auditpflanze' }, rank: 'species', tile: 'plant', genus: 'Audita', facts: { marker: { value: 'preserve', source: 'fixture' } }, prose: { version: 1, regions: Object.fromEntries([...REGION_IDS.map((id) => [id, { marker: 'invalidate' }]), ['another-region', { marker: 'preserve' }]]) } } })
    await tx.catalogueVersion.create({ data: { id: CATALOGUE_ID, countryCode: 'DE', runKey: RUN_KEY, registryVersionId: REGISTRY_ID, inputFingerprint, sourceFingerprint, responseFingerprint, unionFingerprint, plausibleRulesVersion: 1, tileMappingVersion: 1, observationWindowVersion: 1, yearFrom: 2016, yearTo: 2026, occurrencePredicates, status: 'complete', expectedRegions: 6, completedRegions: 6, unionTaxa: 1, generatedAt: TOPIC_DATE } })
    for (let index = 0; index < ENTRY_IDS.length; index++) {
      const monthTotals = Array(12).fill(100)
      const plausibility = [{ gbifKey: TAXON_KEY, obs: 10, monthShare: Array(12).fill(100), peak: 100, words: 'Ganzes Jahr' }]
      const taxa = [{ gbifKey: TAXON_KEY, sciName: 'Audita plantarum', rank: 'species', tile: 'plant', class: null, order: null, genus: 'Audita' }]
      const build = await tx.catalogueRegionBuild.create({ data: { catalogueVersionId: CATALOGUE_ID, registryVersionId: REGISTRY_ID, registryEntryId: ENTRY_IDS[index]!, status: 'complete', attempts: 1, startedAt: TOPIC_DATE, completedAt: TOPIC_DATE, totalObservations: 100, monthTotals, regionSize: 1, perTile: { plant: 1 }, rejectedTaxa: [], requestStats: {}, responseFingerprint: regionalResponses[index]!.response, setFingerprint: sha256({ regionKey: SAMPLE_KEYS[index]!, total: 100, monthTotals, perTile: { plant: 1 }, taxa, plausibility, lookalikes: [], rejectedTaxa: [] }) } })
      await tx.cataloguePlausibility.create({ data: { regionBuildId: build.id, taxonId: taxon.id, obs: 10, monthShare: Array(12).fill(100), peak: 100, words: 'Ganzes Jahr' } })
    }
    await tx.catalogueTaxon.create({ data: { catalogueVersionId: CATALOGUE_ID, taxonId: taxon.id } })
    await tx.catalogueTaxonomyResolution.create({ data: { catalogueVersionId: CATALOGUE_ID, sourceKey: TAXON_KEY, record: taxonomyRecord, recordFingerprint: sha256(taxonomyRecord), acceptedKey: TAXON_KEY } })
    await tx.plausibility.createMany({ data: REGION_IDS.map((regionId) => ({ taxonId: taxon.id, regionId, obs: 999, monthShare: Array(12).fill(1), peak: 1, words: 'stale' })) })
    await tx.identity.create({ data: { id: IDENTITY_ID, displayName: 'Preserve me' } })
    await tx.sighting.create({ data: { id: SIGHTING_ID, identityId: IDENTITY_ID, taxonId: taxon.id, at: TOPIC_DATE, place: 'Private place' } })
    await tx.study.create({ data: { identityId: IDENTITY_ID, taxonId: taxon.id, recapPassed: true } })
    await tx.asset.create({ data: { id: ASSET_ID, url: '/private.jpg', author: 'Fixture user', licence: 'private', sourceUrl: '/private.jpg', origin: 'user', ownerId: IDENTITY_ID, sightingId: SIGHTING_ID, taxonId: taxon.id, byteSize: 42 } })
  })
})

afterAll(async () => {
  await cleanup()
  if (previousActiveRegistry) await db.regionRegistryVersion.update({ where: { id: previousActiveRegistry }, data: { active: true } })
  if (previousActiveCatalogue) await db.catalogueVersion.update({ where: { id: previousActiveCatalogue }, data: { status: 'active' } })
  await db.$disconnect()
})

describe('reviewed local catalogue activation', () => {
  it('publishes only derived regional state atomically and preserves reusable taxon content', async () => {
    const before = await loadAuditSnapshot(CATALOGUE_ID)
    const template = makeReviewTemplate(buildCatalogueAudit(before, null, contract))
    const review: ReviewFile = {
      ...template,
      reviews: template.reviews.map((row) => ({ ...row, reviewer: 'Integration Reviewer', reviewedAt: '2096-12-31T12:00:00.000Z', notes: 'Fixture evidence reviewed.', checks: { species: 'pass', naming: 'pass', seasonality: 'pass', boundary: 'pass' } })),
    }
    await activateLocalCatalogue({ catalogue: CATALOGUE_ID, review, activatedAt: TOPIC_DATE, registryContract: contract })

    const regions = await db.region.findMany({ where: { id: { in: REGION_IDS } }, select: { status: true, monthTotals: true, pickerSummary: true } })
    const live = await db.plausibility.findMany({ where: { regionId: { in: REGION_IDS } }, select: { obs: true, words: true } })
    const taxon = await db.taxon.findUniqueOrThrow({ where: { gbifKey: TAXON_KEY }, select: { facts: true, prose: true } })
    const catalogue = await db.catalogueVersion.findUniqueOrThrow({ where: { id: CATALOGUE_ID }, select: { status: true, auditedAt: true, activatedAt: true } })
    const registry = await db.regionRegistryVersion.findUniqueOrThrow({ where: { id: REGISTRY_ID }, select: { active: true } })
    const personal = await db.identity.findUniqueOrThrow({ where: { id: IDENTITY_ID }, select: { displayName: true, sightings: { select: { id: true, place: true } }, studies: { select: { taxonId: true, recapPassed: true } }, assets: { select: { id: true, byteSize: true } } } })
    expect(regions).toHaveLength(6)
    expect(regions.every((row) => row.status === 'ready' && row.monthTotals.length === 12)).toBe(true)
    expect(regions.every((row) => (row.pickerSummary as { setSize?: number; nowCounts?: number[] })?.setSize === 1 && (row.pickerSummary as { nowCounts?: number[] })?.nowCounts?.length === 12)).toBe(true)
    expect(live).toHaveLength(6)
    expect(live.every((row) => row.obs === 10 && row.words === 'Ganzes Jahr')).toBe(true)
    expect(taxon.facts).toEqual({ marker: { value: 'preserve', source: 'fixture' } })
    expect(taxon.prose).toEqual({ version: 1, regions: { 'another-region': { marker: 'preserve' } } })
    expect(catalogue).toMatchObject({ status: 'active', auditedAt: TOPIC_DATE, activatedAt: TOPIC_DATE })
    expect(registry.active).toBe(true)
    expect(personal).toMatchObject({ displayName: 'Preserve me', sightings: [{ id: SIGHTING_ID, place: 'Private place' }], studies: [{ recapPassed: true }], assets: [{ id: ASSET_ID, byteSize: 42 }] })

    const after = buildCatalogueAudit(await loadAuditSnapshot(CATALOGUE_ID), review, contract)
    expect(after.verdict).toBe('ready-for-transfer')
    expect(after.defects).toEqual([])

    const output = await mkdtemp(join(tmpdir(), 'atlas-activation-transfer-'))
    try {
      const transfer = await exportLocalCatalogueArtifact({ catalogueId: CATALOGUE_ID, path: join(output, 'transfer-artifact.jsonl'), pageSize: 2 })
      expect(transfer.tables.find((table) => table.table === 'CatalogueRegionBuild')).toMatchObject({ rows: 6 })
      expect(transfer.tables.find((table) => table.table === 'CatalogueRegionBuild')?.columns).toContain('completedAt')
      expect(transfer.tables.find((table) => table.table === 'Taxon')).toMatchObject({ rows: 1 })
      expect(transfer.artifact.rows).toBeGreaterThan(20)
    } finally {
      await rm(output, { recursive: true, force: true })
    }
  })
})
