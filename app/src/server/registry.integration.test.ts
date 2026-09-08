import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { importRegionRegistry } from '../../etl/registry-import'
import { parseRegionQueryMapping } from '../../etl/registry-mapping'
import { parseRegionRegistry, type RegionRegistry } from '../../etl/registry/registry'
import { db } from './db'

const REGISTRY_ID = 'de-krg-2099-12-31'
const OTHER_REGISTRY_ID = 'de-krg-2098-12-31'
const ARTIFACT_SHA = 'c'.repeat(64)
const legacyGids = ['DEU.11.19_1', 'DEU.11.30_1']
const source = (id: string, role: 'regions' | 'kreisUnits', product: string, layer: string) => ({
  id,
  role,
  authority: 'Bundesamt für Kartographie und Geodäsie (BKG)',
  product,
  layer,
  topicDate: '2099-12-31',
  archiveUrl: `https://example.test/${id}.zip`,
  downloadedOn: '2099-12-31',
  archiveSha256: id === 'test-ge' ? 'a'.repeat(64) : 'b'.repeat(64),
  productUrl: `https://example.test/${product}`,
  licence: { id: 'dl-de/by-2-0', name: 'Datenlizenz Deutschland – Namensnennung 2.0', url: 'https://www.govdata.de/dl-de/by-2-0' },
  attribution: '© BKG test fixture dl-de/by-2-0',
  dataSourcesUrl: `https://example.test/${id}.pdf`,
  changeNotice: 'Test fixture; no geometry.',
})

const aliases = (...values: string[]) => [...new Set(values)].sort()
const fixture = parseRegionRegistry({
  schemaVersion: 1,
  registry: {
    key: REGISTRY_ID,
    countryCode: 'DE',
    topicDate: '2099-12-31',
    counts: { regions: 3, kreisUnits: 5, states: 1, singletonRegions: 2, twoUnitRegions: 0, threeUnitRegions: 1 },
    sources: [source('test-ge', 'regions', 'GE250', 'KRG250'), source('test-vg', 'kreisUnits', 'VG250', 'vg250_krs (GF = 4)')],
  },
  regions: [
    {
      key: 'de-krg-07339000', sourceKey: '07339000', displayName: 'Mainz-Bingen', sourceName: 'Mainz-Bingen', stateCode: '07', stateName: 'Rheinland-Pfalz',
      aliases: aliases('Landkreis Mainz-Bingen', 'Mainz-Bingen', 'Rheinland-Pfalz'),
      kreisUnits: [{ key: 'de-krs-07339', ags: '07339', name: 'Mainz-Bingen', type: 'Landkreis' }],
    },
    {
      key: 'de-krg-07340000', sourceKey: '07340000', displayName: 'Südwestpfalz', sourceName: 'Südwestpfalz/Pirmasens/Zweibrücken', stateCode: '07', stateName: 'Rheinland-Pfalz',
      aliases: aliases('Pirmasens', 'Rheinland-Pfalz', 'Südwestpfalz', 'Südwestpfalz/Pirmasens/Zweibrücken', 'Zweibrücken'),
      kreisUnits: [
        { key: 'de-krs-07317', ags: '07317', name: 'Pirmasens', type: 'Kreisfreie Stadt' },
        { key: 'de-krs-07320', ags: '07320', name: 'Zweibrücken', type: 'Kreisfreie Stadt' },
        { key: 'de-krs-07340', ags: '07340', name: 'Südwestpfalz', type: 'Landkreis' },
      ],
    },
    {
      key: 'de-krg-07341000', sourceKey: '07341000', displayName: 'Testkreis', sourceName: 'Testkreis', stateCode: '07', stateName: 'Rheinland-Pfalz',
      aliases: aliases('Rheinland-Pfalz', 'Testkreis'),
      kreisUnits: [{ key: 'de-krs-07341', ags: '07341', name: 'Testkreis', type: 'Landkreis' }],
    },
  ],
} satisfies RegionRegistry)

const mapping = parseRegionQueryMapping({
  schemaVersion: 1,
  registryId: REGISTRY_ID,
  provider: 'gbifGadm',
  providerVersion: '4.1-test',
  source: { name: 'GADM test fixture', url: 'https://example.test/gadm.gpkg', sha256: 'd'.repeat(64) },
  gbifEvidence: { name: 'GBIF geocoder test fixture', url: 'https://api.gbif.org/v1/geocode/gadm/search', sha256: 'e'.repeat(64) },
  resolvedAt: '2099-12-31T10:00:00Z',
  reviewedAt: '2099-12-31T11:00:00Z',
  counts: { sourceUnits: 5, mappedQueryUnits: 6, excludedQueryUnits: 0, providerInventory: 6 },
  review: { status: 'verified', method: 'minimal integration fixture', minimumLargestOverlap: 1, excluded: [] },
  mappings: [
    { sourceUnitKey: 'de-krs-07317', providerKeys: ['DEU.99.1_999'] },
    { sourceUnitKey: 'de-krs-07320', providerKeys: ['DEU.99.2_999'] },
    { sourceUnitKey: 'de-krs-07339', providerKeys: ['DEU.99.3_999'] },
    { sourceUnitKey: 'de-krs-07340', providerKeys: ['DEU.99.4_999', 'DEU.99.5_999'] },
    { sourceUnitKey: 'de-krs-07341', providerKeys: ['DEU.99.6_999'] },
  ],
})

type LegacySnapshot = { id: string; created: boolean; name: string; higher: string; canonicalKey: string | null; countryCode: string | null }
const legacy: LegacySnapshot[] = []
let identityId: string
let taxonId: string

async function removeRegistry() {
  await db.regionQueryUnit.deleteMany({ where: { registryVersionId: REGISTRY_ID } })
  await db.regionRegistryAlias.deleteMany({ where: { registryEntry: { registryVersionId: REGISTRY_ID } } })
  await db.regionSourceUnit.deleteMany({ where: { registryVersionId: REGISTRY_ID } })
  await db.regionRegistryEntry.deleteMany({ where: { registryVersionId: REGISTRY_ID } })
  await db.regionRegistrySource.deleteMany({ where: { registryVersionId: REGISTRY_ID } })
  await db.regionRegistryVersion.deleteMany({ where: { id: REGISTRY_ID } })
}

beforeAll(async () => {
  await removeRegistry()
  for (const [index, gadmGid] of legacyGids.entries()) {
    const found = await db.region.findUnique({ where: { gadmGid } })
    const row = found ?? await db.region.create({ data: { gadmGid, name: `Legacy ${index}`, higher: 'Legacy', status: 'ready' } })
    legacy.push({ id: row.id, created: !found, name: row.name, higher: row.higher, canonicalKey: row.canonicalKey, countryCode: row.countryCode })
  }
  const identity = await db.identity.create({ data: {} })
  identityId = identity.id
  await db.filter.create({ data: { identityId, regionId: legacy[0]!.id, regionIds: [legacy[0]!.id], tiles: ['bird'] } })
  const taxon = await db.taxon.create({ data: { gbifKey: -20991231, sciName: 'Registry fixture species', rank: 'species', tile: 'bird' } })
  taxonId = taxon.id
  await db.plausibility.create({ data: { taxonId, regionId: legacy[0]!.id, obs: 10, monthShare: Array(12).fill(1), peak: 1, words: 'Ganzes Jahr' } })
})

afterAll(async () => {
  await removeRegistry()
  await db.identity.delete({ where: { id: identityId } })
  await db.taxon.delete({ where: { id: taxonId } })
  await db.region.deleteMany({ where: { canonicalKey: 'de-krg-07341000' } })
  for (const row of legacy) {
    if (row.created) await db.region.delete({ where: { id: row.id } })
    else await db.region.update({ where: { id: row.id }, data: { name: row.name, higher: row.higher, canonicalKey: row.canonicalKey, countryCode: row.countryCode } })
  }
  await db.$disconnect()
})

describe('versioned German region registry import', () => {
  it('is additive, idempotent and preserves legacy UUID references', async () => {
    const before = await db.regionRegistryVersion.count()
    const concurrent = await Promise.all([
      importRegionRegistry({ registry: fixture, artifactSha256: ARTIFACT_SHA, mapping }),
      importRegionRegistry({ registry: fixture, artifactSha256: ARTIFACT_SHA, mapping }),
    ])
    expect(concurrent.map((result) => result.created).sort()).toEqual([false, true])
    const first = concurrent.find((result) => result.created)!
    expect(first).toMatchObject({ created: true, regions: 3, sourceUnits: 5, queryUnits: 6, legacyRegionsReused: 2 })

    const [mainz, swp, newRegion, filter, plausibility, version] = await Promise.all([
      db.region.findUniqueOrThrow({ where: { canonicalKey: 'de-krg-07339000' } }),
      db.region.findUniqueOrThrow({ where: { canonicalKey: 'de-krg-07340000' } }),
      db.region.findUniqueOrThrow({ where: { canonicalKey: 'de-krg-07341000' } }),
      db.filter.findUniqueOrThrow({ where: { identityId } }),
      db.plausibility.findUniqueOrThrow({ where: { taxonId_regionId: { taxonId, regionId: legacy[0]!.id } } }),
      db.regionRegistryVersion.findUniqueOrThrow({ where: { id: REGISTRY_ID } }),
    ])
    expect(mainz.id).toBe(legacy[0]!.id)
    expect(swp.id).toBe(legacy[1]!.id)
    expect(filter.regionId).toBe(legacy[0]!.id)
    expect(filter.regionIds).toEqual([legacy[0]!.id])
    expect(plausibility.regionId).toBe(legacy[0]!.id)
    expect(newRegion).toMatchObject({ status: 'unprepared', gadmGid: null, countryCode: 'DE' })
    expect(version).toMatchObject({ active: false, artifactSha256: ARTIFACT_SHA, expectedRegions: 3, expectedSourceUnits: 5 })
    expect(await db.regionRegistryVersion.count()).toBe(before + 1)

    const importedAt = version.importedAt
    const second = await importRegionRegistry({ registry: fixture, artifactSha256: ARTIFACT_SHA, mapping })
    expect(second).toMatchObject({ created: false, regions: 3, sourceUnits: 5, queryUnits: 6 })
    expect((await db.regionRegistryVersion.findUniqueOrThrow({ where: { id: REGISTRY_ID } })).importedAt).toEqual(importedAt)
    expect(await db.regionQueryUnit.count({ where: { registryVersionId: REGISTRY_ID } })).toBe(6)

    await db.regionRegistryVersion.create({
      data: {
        id: OTHER_REGISTRY_ID,
        countryCode: 'DE',
        version: OTHER_REGISTRY_ID,
        artifactSha256: 'f'.repeat(64),
        expectedRegions: 0,
        expectedSourceUnits: 0,
      },
    })
    const regionsSource = await db.regionRegistrySource.findUniqueOrThrow({
      where: { registryVersionId_role: { registryVersionId: REGISTRY_ID, role: 'regions' } },
    })
    try {
      await expect(db.regionRegistryEntry.create({
        data: {
          id: `${OTHER_REGISTRY_ID}:cross-version-entry`,
          registryVersionId: OTHER_REGISTRY_ID,
          sourceId: regionsSource.id,
          regionId: newRegion.id,
          sourceCode: 'cross-version',
          sourceName: 'Cross-version fixture',
          displayName: 'Cross-version fixture',
          stateCode: '07',
          stateName: 'Rheinland-Pfalz',
        },
      })).rejects.toMatchObject({ code: 'P2003' })
    } finally {
      await db.regionRegistryEntry.deleteMany({ where: { id: `${OTHER_REGISTRY_ID}:cross-version-entry` } })
      await db.regionRegistryVersion.delete({ where: { id: OTHER_REGISTRY_ID } })
    }
  })
})
