import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { importRegionRegistry } from '../../etl/registry-import'
import { parseRegionQueryMapping } from '../../etl/registry-mapping'
import { parseRegionRegistry, type RegionRegistry } from '../../etl/registry/registry'
import { db } from './db'

const REGISTRY_ID = 'de-krg-2099-12-31'
const OTHER_REGISTRY_ID = 'de-krg-2098-12-31'
const ARTIFACT_SHA = 'c'.repeat(64)
const regionKeys = ['de-krg-99000001', 'de-krg-99000002', 'de-krg-99000003'] as const
const legacyGids = [`DEU.99.1_${randomUUID()}`, `DEU.99.2_${randomUUID()}`]
const dependencies = { legacySuccessors: { [regionKeys[0]]: legacyGids[0], [regionKeys[1]]: legacyGids[1] } }
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
      key: regionKeys[0], sourceKey: '99000001', displayName: 'Mainz-Bingen', sourceName: 'Mainz-Bingen', stateCode: '99', stateName: 'Fixtureland',
      aliases: aliases('Landkreis Mainz-Bingen', 'Mainz-Bingen', 'Fixtureland'),
      kreisUnits: [{ key: 'de-krs-99001', ags: '99001', name: 'Mainz-Bingen', type: 'Landkreis' }],
    },
    {
      key: regionKeys[1], sourceKey: '99000002', displayName: 'Südwestpfalz', sourceName: 'Südwestpfalz/Pirmasens/Zweibrücken', stateCode: '99', stateName: 'Fixtureland',
      aliases: aliases('Pirmasens', 'Fixtureland', 'Südwestpfalz', 'Südwestpfalz/Pirmasens/Zweibrücken', 'Zweibrücken'),
      kreisUnits: [
        { key: 'de-krs-99002', ags: '99002', name: 'Pirmasens', type: 'Kreisfreie Stadt' },
        { key: 'de-krs-99003', ags: '99003', name: 'Zweibrücken', type: 'Kreisfreie Stadt' },
        { key: 'de-krs-99004', ags: '99004', name: 'Südwestpfalz', type: 'Landkreis' },
      ],
    },
    {
      key: regionKeys[2], sourceKey: '99000003', displayName: 'Testkreis', sourceName: 'Testkreis', stateCode: '99', stateName: 'Fixtureland',
      aliases: aliases('Fixtureland', 'Testkreis'),
      kreisUnits: [{ key: 'de-krs-99005', ags: '99005', name: 'Testkreis', type: 'Landkreis' }],
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
    { sourceUnitKey: 'de-krs-99001', providerKeys: ['DEU.99.1_999'] },
    { sourceUnitKey: 'de-krs-99002', providerKeys: ['DEU.99.2_999'] },
    { sourceUnitKey: 'de-krs-99003', providerKeys: ['DEU.99.3_999'] },
    { sourceUnitKey: 'de-krs-99004', providerKeys: ['DEU.99.4_999', 'DEU.99.5_999'] },
    { sourceUnitKey: 'de-krs-99005', providerKeys: ['DEU.99.6_999'] },
  ],
})

const legacy: { id: string }[] = []
let identityId: string
let taxonId: string
let newRegionId: string | undefined

async function removeRegistry() {
  await db.regionQueryUnit.deleteMany({ where: { registryVersionId: REGISTRY_ID } })
  await db.regionRegistryAlias.deleteMany({ where: { registryEntry: { registryVersionId: REGISTRY_ID } } })
  await db.regionSourceUnit.deleteMany({ where: { registryVersionId: REGISTRY_ID } })
  await db.regionRegistryEntry.deleteMany({ where: { registryVersionId: REGISTRY_ID } })
  await db.regionRegistrySource.deleteMany({ where: { registryVersionId: REGISTRY_ID } })
  await db.regionRegistryVersion.deleteMany({ where: { id: REGISTRY_ID } })
}

beforeAll(async () => {
  const [registry, otherRegistry, regions] = await Promise.all([
    db.regionRegistryVersion.findUnique({ where: { id: REGISTRY_ID }, select: { id: true } }),
    db.regionRegistryVersion.findUnique({ where: { id: OTHER_REGISTRY_ID }, select: { id: true } }),
    db.region.findMany({ where: { OR: [{ canonicalKey: { in: [...regionKeys] } }, { gadmGid: { in: legacyGids } }] }, select: { id: true } }),
  ])
  if (registry || otherRegistry || regions.length) throw new Error('registry integration fixture identifiers already exist')
  for (const [index, gadmGid] of legacyGids.entries()) {
    const row = await db.region.create({ data: { gadmGid, name: `Legacy ${index}`, higher: 'Legacy', status: 'ready' } })
    legacy.push({ id: row.id })
  }
  const identity = await db.identity.create({ data: {} })
  identityId = identity.id
  await db.filter.create({ data: { identityId, regionId: legacy[0]!.id, regionIds: [legacy[0]!.id], tiles: ['bird'] } })
  const taxon = await db.taxon.create({ data: { gbifKey: -20991231, sciName: 'Registry fixture species', rank: 'species', tile: 'bird' } })
  taxonId = taxon.id
  await db.plausibility.create({ data: { taxonId, regionId: legacy[0]!.id, obs: 10, monthShare: Array(12).fill(1), peak: 1, words: 'Ganzes Jahr' } })
})

afterAll(async () => {
  try {
    await removeRegistry()
    await db.identity.deleteMany({ where: { id: { in: identityId ? [identityId] : [] } } })
    await db.taxon.deleteMany({ where: { id: { in: taxonId ? [taxonId] : [] } } })
    await db.region.deleteMany({ where: { id: { in: [...legacy.map((row) => row.id), newRegionId].filter(Boolean) as string[] } } })
  } finally {
    await db.$disconnect()
  }
})

describe('versioned German region registry import', () => {
  it('is additive, idempotent and preserves legacy UUID references', async () => {
    const before = await db.regionRegistryVersion.count()
    const concurrent = await Promise.all([
      importRegionRegistry({ registry: fixture, artifactSha256: ARTIFACT_SHA, mapping }, dependencies),
      importRegionRegistry({ registry: fixture, artifactSha256: ARTIFACT_SHA, mapping }, dependencies),
    ])
    expect(concurrent.map((result) => result.created).sort()).toEqual([false, true])
    const first = concurrent.find((result) => result.created)!
    expect(first).toMatchObject({ created: true, regions: 3, sourceUnits: 5, queryUnits: 6, legacyRegionsReused: 2 })

    const [mainz, swp, newRegion, filter, plausibility, version] = await Promise.all([
      db.region.findUniqueOrThrow({ where: { canonicalKey: regionKeys[0] } }),
      db.region.findUniqueOrThrow({ where: { canonicalKey: regionKeys[1] } }),
      db.region.findUniqueOrThrow({ where: { canonicalKey: regionKeys[2] } }),
      db.filter.findUniqueOrThrow({ where: { identityId } }),
      db.plausibility.findUniqueOrThrow({ where: { taxonId_regionId: { taxonId, regionId: legacy[0]!.id } } }),
      db.regionRegistryVersion.findUniqueOrThrow({ where: { id: REGISTRY_ID } }),
    ])
    expect(mainz.id).toBe(legacy[0]!.id)
    expect(swp.id).toBe(legacy[1]!.id)
    newRegionId = newRegion.id
    expect(filter.regionId).toBe(legacy[0]!.id)
    expect(filter.regionIds).toEqual([legacy[0]!.id])
    expect(plausibility.regionId).toBe(legacy[0]!.id)
    expect(newRegion).toMatchObject({ status: 'unprepared', gadmGid: null, countryCode: 'DE' })
    expect(version).toMatchObject({ active: false, artifactSha256: ARTIFACT_SHA, expectedRegions: 3, expectedSourceUnits: 5 })
    expect(await db.regionRegistryVersion.count()).toBe(before + 1)

    const importedAt = version.importedAt
    const second = await importRegionRegistry({ registry: fixture, artifactSha256: ARTIFACT_SHA, mapping }, dependencies)
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
          stateCode: '99',
          stateName: 'Fixtureland',
        },
      })).rejects.toMatchObject({ code: 'P2003' })
    } finally {
      await db.regionRegistryEntry.deleteMany({ where: { id: `${OTHER_REGISTRY_ID}:cross-version-entry` } })
      await db.regionRegistryVersion.delete({ where: { id: OTHER_REGISTRY_ID } })
    }
  })
})
