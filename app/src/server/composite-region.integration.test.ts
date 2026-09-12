import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { runGermany } from '../../etl/nationwide'
import { importRegionRegistry } from '../../etl/registry-import'
import { parseRegionQueryMapping } from '../../etl/registry-mapping'
import { parseRegionRegistry, type RegionRegistry } from '../../etl/registry/registry'
import { calculateRegistryRegion, refresh, runRegion, runRegistryRegion } from '../../etl/region'
import type { Facet, Species } from '../../etl/gbif'
import { db } from './db'

const REGISTRY_ID = 'de-krg-2097-12-31'
const COMPOSITE_KEY = 'de-krg-99011000'
const SINGLETON_KEY = 'de-krg-99013000'
const QUERY_A = 'DEU.97.1_999'
const QUERY_B = 'DEU.97.2_999'
const QUERY_C = 'DEU.97.3_999'
const ACCEPTED_SHARED = 990_017_001
const ACCEPTED_DOMINANT = 990_017_002
const ACCEPTED_BOUNDARY = 990_017_003
const ACCEPTED_SINGLETON = 990_017_004
const RAW_SYNONYM_A = 990_017_101
const RAW_SYNONYM_B = 990_017_102
const RAW_MONTH_ONLY = 990_017_103
const RAW_INVALID = 990_017_199
const GUARD_RUN = 'issue-115-active-guard'
const TAXON_KEYS = [ACCEPTED_SHARED, ACCEPTED_DOMINANT, ACCEPTED_BOUNDARY, ACCEPTED_SINGLETON]

const aliases = (...values: string[]) => [...new Set(values)].sort()
const source = (id: string, role: 'regions' | 'kreisUnits', product: string, layer: string) => ({
  id,
  role,
  authority: 'Bundesamt für Kartographie und Geodäsie (BKG)',
  product,
  layer,
  topicDate: '2097-12-31',
  archiveUrl: `https://example.test/${id}.zip`,
  downloadedOn: '2097-12-31',
  archiveSha256: id === 'composite-ge' ? 'a'.repeat(64) : 'b'.repeat(64),
  productUrl: `https://example.test/${product}`,
  licence: { id: 'dl-de/by-2-0', name: 'Datenlizenz Deutschland – Namensnennung 2.0', url: 'https://www.govdata.de/dl-de/by-2-0' },
  attribution: '© BKG composite integration fixture dl-de/by-2-0',
  dataSourcesUrl: `https://example.test/${id}.pdf`,
  changeNotice: 'Test fixture; no geometry.',
})

const registry = parseRegionRegistry({
  schemaVersion: 1,
  registry: {
    key: REGISTRY_ID,
    countryCode: 'DE',
    topicDate: '2097-12-31',
    counts: { regions: 2, kreisUnits: 3, states: 1, singletonRegions: 1, twoUnitRegions: 1, threeUnitRegions: 0 },
    sources: [
      source('composite-ge', 'regions', 'GE250', 'KRG250'),
      source('composite-vg', 'kreisUnits', 'VG250', 'vg250_krs (GF = 4)'),
    ],
  },
  regions: [
    {
      key: COMPOSITE_KEY,
      sourceKey: '99011000',
      displayName: 'Composite Test',
      sourceName: 'Composite Test/Unit A/Unit B',
      stateCode: '99',
      stateName: 'Testland',
      aliases: aliases('Composite Test', 'Composite Test/Unit A/Unit B', 'Testland', 'Unit A', 'Unit B'),
      kreisUnits: [
        { key: 'de-krs-99011', ags: '99011', name: 'Unit A', type: 'Landkreis' },
        { key: 'de-krs-99012', ags: '99012', name: 'Unit B', type: 'Kreisfreie Stadt' },
      ],
    },
    {
      key: SINGLETON_KEY,
      sourceKey: '99013000',
      displayName: 'Singleton Test',
      sourceName: 'Singleton Test',
      stateCode: '99',
      stateName: 'Testland',
      aliases: aliases('Singleton Test', 'Testland', 'Unit C'),
      kreisUnits: [{ key: 'de-krs-99013', ags: '99013', name: 'Unit C', type: 'Landkreis' }],
    },
  ],
} satisfies RegionRegistry)

const mapping = parseRegionQueryMapping({
  schemaVersion: 1,
  registryId: REGISTRY_ID,
  provider: 'gbifGadm',
  providerVersion: '4.1-test',
  source: { name: 'GADM fixture', url: 'https://example.test/gadm.gpkg', sha256: 'c'.repeat(64) },
  gbifEvidence: { name: 'GBIF fixture', url: 'https://api.gbif.org/v1/geocode/gadm/search', sha256: 'd'.repeat(64) },
  resolvedAt: '2097-12-31T10:00:00Z',
  reviewedAt: '2097-12-31T11:00:00Z',
  counts: { sourceUnits: 3, mappedQueryUnits: 3, excludedQueryUnits: 0, providerInventory: 3 },
  review: { status: 'verified', method: 'integration fixture', minimumLargestOverlap: 1, excluded: [] },
  mappings: [
    { sourceUnitKey: 'de-krs-99011', providerKeys: [QUERY_A] },
    { sourceUnitKey: 'de-krs-99012', providerKeys: [QUERY_B] },
    { sourceUnitKey: 'de-krs-99013', providerKeys: [QUERY_C] },
  ],
})

const accepted = (key: number, canonicalName: string, genus: string): Species => ({
  key,
  rank: 'SPECIES',
  taxonomicStatus: 'ACCEPTED',
  canonicalName,
  scientificName: `${canonicalName} Author`,
  kingdom: 'Animalia',
  phylum: 'Chordata',
  class: 'Aves',
  order: 'Passeriformes',
  genus,
})
const speciesRecords = new Map<number, Species>([
  [RAW_SYNONYM_A, { ...accepted(RAW_SYNONYM_A, 'Old shared A', 'Oldus'), acceptedKey: ACCEPTED_SHARED, taxonomicStatus: 'SYNONYM' }],
  [RAW_SYNONYM_B, { ...accepted(RAW_SYNONYM_B, 'Old shared B', 'Oldus'), acceptedKey: ACCEPTED_SHARED, taxonomicStatus: 'SYNONYM' }],
  [RAW_MONTH_ONLY, { ...accepted(RAW_MONTH_ONLY, 'Old shared month', 'Oldus'), acceptedKey: ACCEPTED_SHARED, taxonomicStatus: 'SYNONYM' }],
  [ACCEPTED_SHARED, accepted(ACCEPTED_SHARED, 'Accepted shared', 'Sharedus')],
  [ACCEPTED_DOMINANT, accepted(ACCEPTED_DOMINANT, 'Accepted dominant', 'Sharedus')],
  [ACCEPTED_BOUNDARY, accepted(ACCEPTED_BOUNDARY, 'Accepted boundary', 'Otherus')],
  [ACCEPTED_SINGLETON, accepted(ACCEPTED_SINGLETON, 'Accepted singleton', 'Elseus')],
])

const count = (name: number, value: number) => ({ name: String(name), count: value })
const empty: Facet = { total: 0, counts: [] }
function facetFixture(gadmGid: unknown, month: unknown): Facet {
  if (gadmGid === QUERY_A) {
    if (month === undefined) return { total: 60, counts: [count(RAW_SYNONYM_A, 6), count(ACCEPTED_DOMINANT, 40), count(ACCEPTED_BOUNDARY, 5)] }
    if (month === 1) return { total: 40, counts: [count(RAW_SYNONYM_A, 4), count(ACCEPTED_DOMINANT, 20), count(ACCEPTED_BOUNDARY, 3)] }
    if (month === 2) return { total: 20, counts: [count(RAW_SYNONYM_A, 2), count(ACCEPTED_DOMINANT, 20), count(ACCEPTED_BOUNDARY, 2)] }
    return empty
  }
  if (gadmGid === QUERY_B) {
    if (month === undefined) return { total: 55, counts: [count(RAW_SYNONYM_B, 5), count(ACCEPTED_DOMINANT, 39), count(ACCEPTED_BOUNDARY, 5)] }
    if (month === 1) return { total: 30, counts: [count(RAW_SYNONYM_B, 3), count(RAW_MONTH_ONLY, 1), count(RAW_INVALID, 1), count(ACCEPTED_DOMINANT, 19), count(ACCEPTED_BOUNDARY, 2)] }
    if (month === 2) return { total: 25, counts: [count(RAW_SYNONYM_B, 2), count(ACCEPTED_DOMINANT, 20), count(ACCEPTED_BOUNDARY, 3)] }
    return empty
  }
  if (gadmGid === QUERY_C) {
    if (month === undefined) return { total: 100, counts: [count(ACCEPTED_SHARED, 20), count(ACCEPTED_SINGLETON, 80)] }
    if (month === 1) return { total: 50, counts: [count(ACCEPTED_SHARED, 10), count(ACCEPTED_SINGLETON, 40)] }
    if (month === 2) return { total: 50, counts: [count(ACCEPTED_SHARED, 10), count(ACCEPTED_SINGLETON, 40)] }
    return empty
  }
  throw new Error(`unexpected query unit ${String(gadmGid)}`)
}

const facet = vi.fn(async (_field: string, params: Record<string, string | number | boolean | string[]>): Promise<Facet> => (
  facetFixture(params.gadmGid, params.month)
))
const species = vi.fn(async (key: number) => speciesRecords.get(key) ?? null)
const stats = () => ({ perHost: {}, hits: 0, misses: 0, retries: 0, tooMany: 0 })

async function removeGuardCatalogue() {
  const candidate = await db.catalogueVersion.findUnique({ where: { countryCode_runKey: { countryCode: 'DE', runKey: `${GUARD_RUN}-staged` } } })
  if (candidate) {
    await db.catalogueLookalike.deleteMany({ where: { regionBuild: { catalogueVersionId: candidate.id } } })
    await db.cataloguePlausibility.deleteMany({ where: { regionBuild: { catalogueVersionId: candidate.id } } })
    await db.catalogueTaxon.deleteMany({ where: { catalogueVersionId: candidate.id } })
    await db.catalogueTaxonomyResolution.deleteMany({ where: { catalogueVersionId: candidate.id } })
    await db.catalogueRegionBuild.deleteMany({ where: { catalogueVersionId: candidate.id } })
    await db.catalogueVersion.delete({ where: { id: candidate.id } })
  }
  const catalogue = await db.catalogueVersion.findUnique({ where: { countryCode_runKey: { countryCode: 'DE', runKey: GUARD_RUN } } })
  if (!catalogue) return
  await db.catalogueTaxon.deleteMany({ where: { catalogueVersionId: catalogue.id } })
  await db.catalogueVersion.delete({ where: { id: catalogue.id } })
}

async function activateGuardCatalogue() {
  const taxa = await db.plausibility.findMany({ where: { region: { canonicalKey: { in: [COMPOSITE_KEY, SINGLETON_KEY] } } }, select: { taxonId: true } })
  return db.catalogueVersion.create({ data: {
    countryCode: 'DE', runKey: GUARD_RUN, registryVersionId: REGISTRY_ID,
    inputFingerprint: 'guard-input', sourceFingerprint: 'guard-source', unionFingerprint: 'guard-union',
    plausibleRulesVersion: 1, tileMappingVersion: 1, observationWindowVersion: 1,
    yearFrom: 2016, yearTo: 2026, occurrencePredicates: {}, expectedRegions: 2, completedRegions: 2,
    unionTaxa: new Set(taxa.map(row => row.taxonId)).size, generatedAt: new Date('2097-01-01'), responseFingerprint: 'guard-response',
    status: 'active', auditedAt: new Date('2097-01-01'), activatedAt: new Date('2097-01-01'),
    taxa: { create: [...new Set(taxa.map(row => row.taxonId))].map(taxonId => ({ taxonId })) },
  } })
}

async function guardSnapshot() {
  return {
    regions: await db.region.findMany({ where: { canonicalKey: { in: [COMPOSITE_KEY, SINGLETON_KEY] } }, orderBy: { id: 'asc' } }),
    membership: await db.plausibility.findMany({ where: { region: { canonicalKey: { in: [COMPOSITE_KEY, SINGLETON_KEY] } } }, orderBy: { id: 'asc' } }),
    lookalikes: await db.lookalike.findMany({ where: { region: { canonicalKey: { in: [COMPOSITE_KEY, SINGLETON_KEY] } } }, orderBy: [{ regionId: 'asc' }, { taxonId: 'asc' }, { siblingId: 'asc' }] }),
    taxa: await db.taxon.findMany({ where: { gbifKey: { in: TAXON_KEYS } }, orderBy: { gbifKey: 'asc' } }),
    catalogue: await db.catalogueVersion.findUnique({ where: { countryCode_runKey: { countryCode: 'DE', runKey: GUARD_RUN } }, include: { taxa: { orderBy: { taxonId: 'asc' } } } }),
  }
}

async function removeFixture() {
  await removeGuardCatalogue()
  await db.regionQueryUnit.deleteMany({ where: { registryVersionId: REGISTRY_ID } })
  await db.regionRegistryAlias.deleteMany({ where: { registryEntry: { registryVersionId: REGISTRY_ID } } })
  await db.regionSourceUnit.deleteMany({ where: { registryVersionId: REGISTRY_ID } })
  await db.regionRegistryEntry.deleteMany({ where: { registryVersionId: REGISTRY_ID } })
  await db.regionRegistrySource.deleteMany({ where: { registryVersionId: REGISTRY_ID } })
  await db.regionRegistryVersion.deleteMany({ where: { id: REGISTRY_ID } })
  await db.region.deleteMany({ where: { canonicalKey: { in: [COMPOSITE_KEY, SINGLETON_KEY] } } })
  await db.taxon.deleteMany({ where: { gbifKey: { in: TAXON_KEYS } } })
}

beforeAll(async () => {
  await removeFixture()
  await importRegionRegistry({ registry, artifactSha256: 'e'.repeat(64), mapping })
})

afterAll(async () => {
  await removeFixture()
  await db.$disconnect()
})

describe('composite region ETL', () => {
  it('keeps cold imported regions unprepared outside version-explicit orchestration', async () => {
    facet.mockClear()
    await expect(runRegion(COMPOSITE_KEY, () => undefined, { facet, species, requestStats: stats })).rejects.toThrow('is unprepared')
    expect(facet).not.toHaveBeenCalled()
    expect(await db.region.findUniqueOrThrow({ where: { canonicalKey: COMPOSITE_KEY } })).toMatchObject({ status: 'unprepared' })
  })

  it('aggregates before the floor/cut and reuses accepted taxa across regions', async () => {
    facet.mockClear()
    species.mockClear()
    const [composite, singleton] = await Promise.all([
      runRegistryRegion(REGISTRY_ID, COMPOSITE_KEY, () => undefined, { facet, species, requestStats: stats }),
      runRegistryRegion(REGISTRY_ID, SINGLETON_KEY, () => undefined, { facet, species, requestStats: stats }),
    ])

    expect(composite).toMatchObject({ total: 115, monthTotals: [70, 45, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], set: 2, lookalikes: 2 })
    expect(composite.queryUnits).toEqual([QUERY_A, QUERY_B])
    expect(composite.rejectedTaxa).toEqual([{ sourceKey: RAW_INVALID, reason: expect.stringContaining('did not resolve') }])
    expect(singleton).toMatchObject({ total: 100, set: 2 })
    expect(facet).toHaveBeenCalledTimes(39)
    expect(facet.mock.calls.every(([, params]) => (
      params.year === '2016,2026' && params.hasCoordinate === true && params.occurrenceStatus === 'PRESENT'
    ))).toBe(true)

    const compositeRegion = await db.region.findUniqueOrThrow({ where: { canonicalKey: COMPOSITE_KEY } })
    const singletonRegion = await db.region.findUniqueOrThrow({ where: { canonicalKey: SINGLETON_KEY } })
    const shared = await db.taxon.findUniqueOrThrow({ where: { gbifKey: ACCEPTED_SHARED } })
    const [compositeMembership, singletonMembership] = await Promise.all([
      db.plausibility.findUniqueOrThrow({ where: { taxonId_regionId: { taxonId: shared.id, regionId: compositeRegion.id } } }),
      db.plausibility.findUniqueOrThrow({ where: { taxonId_regionId: { taxonId: shared.id, regionId: singletonRegion.id } } }),
    ])
    expect(compositeMembership).toMatchObject({ obs: 11, monthShare: [11429, 8889, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] })
    expect(singletonMembership.taxonId).toBe(compositeMembership.taxonId)
    expect(await db.taxon.findMany({ where: { gbifKey: { in: [RAW_SYNONYM_A, RAW_SYNONYM_B, RAW_MONTH_ONLY] } } })).toEqual([])
    expect(await db.region.count({ where: { name: { in: ['Unit A', 'Unit B'] } } })).toBe(0)
    expect(await db.lookalike.count({ where: { regionId: compositeRegion.id } })).toBe(2)
  })

  it('preserves global content, replaces stale regional rows, and is idempotent under concurrent reruns', async () => {
    const compositeRegion = await db.region.findUniqueOrThrow({ where: { canonicalKey: COMPOSITE_KEY } })
    const singletonRegion = await db.region.findUniqueOrThrow({ where: { canonicalKey: SINGLETON_KEY } })
    const shared = await db.taxon.findUniqueOrThrow({ where: { gbifKey: ACCEPTED_SHARED } })
    const sharedOtherProse = { marker: 'other region remains' }
    await db.taxon.update({
      where: { id: shared.id },
      data: {
        commonNames: { de: 'Geteilter Testvogel' },
        intro: { text: 'Reusable content' },
        contentAt: new Date('2097-01-01T00:00:00Z'),
        prose: { version: 1, regions: { [compositeRegion.id]: { marker: 'stale composite prose' }, [singletonRegion.id]: sharedOtherProse } },
      },
    })
    const stale = await db.taxon.create({ data: { gbifKey: 990_017_999, sciName: 'Stale regional taxon', rank: 'species', tile: 'bird' } })
    await db.plausibility.create({ data: { taxonId: stale.id, regionId: compositeRegion.id, obs: 999, monthShare: Array(12).fill(1), peak: 1, words: 'Stale' } })
    await db.taxon.update({
      where: { id: stale.id },
      data: { prose: { version: 1, regions: { [compositeRegion.id]: { marker: 'removed membership prose' }, [singletonRegion.id]: { marker: 'unrelated prose' } } } },
    })

    await Promise.all([
      runRegistryRegion(REGISTRY_ID, COMPOSITE_KEY, () => undefined, { facet, species, requestStats: stats }),
      runRegistryRegion(REGISTRY_ID, COMPOSITE_KEY, () => undefined, { facet, species, requestStats: stats }),
    ])

    expect(await db.plausibility.count({ where: { regionId: compositeRegion.id } })).toBe(2)
    expect(await db.plausibility.findUnique({ where: { taxonId_regionId: { taxonId: stale.id, regionId: compositeRegion.id } } })).toBeNull()
    expect(await db.lookalike.count({ where: { regionId: compositeRegion.id } })).toBe(2)
    const preserved = await db.taxon.findUniqueOrThrow({ where: { gbifKey: ACCEPTED_SHARED } })
    expect(preserved).toMatchObject({
      id: shared.id,
      commonNames: { de: 'Geteilter Testvogel' },
      intro: { text: 'Reusable content' },
      contentAt: new Date('2097-01-01T00:00:00Z'),
    })
    expect(preserved.prose).toEqual({ version: 1, regions: { [singletonRegion.id]: sharedOtherProse } })
    expect((await db.taxon.findUniqueOrThrow({ where: { id: stale.id } })).prose).toEqual({
      version: 1,
      regions: { [singletonRegion.id]: { marker: 'unrelated prose' } },
    })
    await db.taxon.delete({ where: { id: stale.id } })
  })

  it('resolves a constituent alias to the composite and preserves the previous set on failure', async () => {
    const region = await db.region.findUniqueOrThrow({ where: { canonicalKey: COMPOSITE_KEY } })
    const before = await db.plausibility.findMany({ where: { regionId: region.id }, orderBy: { obs: 'desc' } })
    const failingFacet = vi.fn(async () => { throw new Error('fixture upstream failure') })

    await expect(runRegion('Unit A', () => undefined, { facet: failingFacet, species, requestStats: stats })).rejects.toThrow('fixture upstream failure')

    expect(await db.plausibility.findMany({ where: { regionId: region.id }, orderBy: { obs: 'desc' } })).toEqual(before)
    expect(await db.region.findUniqueOrThrow({ where: { id: region.id } })).toMatchObject({
      status: 'failed',
      error: 'fixture upstream failure',
      monthTotals: [70, 45, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    })

    await runRegistryRegion(REGISTRY_ID, COMPOSITE_KEY, () => undefined, { facet, species, requestStats: stats })
    expect((await db.region.findUniqueOrThrow({ where: { id: region.id } })).status).toBe('ready')
  })

  it('rejects direct active-catalogue refreshes before changed source membership or shared taxon writes', async () => {
    await activateGuardCatalogue()
    const before = await guardSnapshot()
    const changedFacet = vi.fn(async (): Promise<Facet> => ({ total: 100, counts: [count(ACCEPTED_BOUNDARY, 100)] }))
    const changedSpecies = vi.fn(async (key: number) => accepted(key, 'Changed provider name', 'Changedus'))
    const resolveLegacy = vi.fn(async () => ({ gadmGid: 'JPN.guard_115', name: 'Guard legacy', higher: 'Japan', level: 2 }))
    const dependencies = { facet: changedFacet, species: changedSpecies, resolveLegacy, requestStats: stats }
    try {
      await expect(runRegion(COMPOSITE_KEY, () => undefined, dependencies)).rejects.toThrow('active catalogue')
      await expect(runRegistryRegion(REGISTRY_ID, COMPOSITE_KEY, () => undefined, dependencies)).rejects.toThrow('active catalogue')
      await expect(runRegion('Unstored legacy guard region', () => undefined, dependencies)).rejects.toThrow('active catalogue')
      await expect(refresh(0, () => undefined)).rejects.toThrow('active catalogue')
      expect(changedFacet).not.toHaveBeenCalled()
      expect(changedSpecies).not.toHaveBeenCalled()
      expect(resolveLegacy).not.toHaveBeenCalled()
      expect(await guardSnapshot()).toEqual(before)
      expect(await db.region.findUnique({ where: { gadmGid: 'JPN.guard_115' } })).toBeNull()

      // The version-explicit calculation used by nationwide staging remains read-only.
      const staged = await calculateRegistryRegion(REGISTRY_ID, COMPOSITE_KEY, () => undefined, dependencies)
      expect(staged.plausibility.map(row => row.gbifKey)).toEqual([ACCEPTED_BOUNDARY])
      expect(staged.taxa[0].sciName).toBe('Changed provider name')
      expect(await guardSnapshot()).toEqual(before)

      // Explicit nationwide staging can build a different union while active membership stays frozen.
      const candidate = await runGermany({
        registryVersionId: REGISTRY_ID, runKey: `${GUARD_RUN}-staged`, log: () => undefined,
        regionDependencies: {
          facet: async () => ({ total: 100, counts: [count(ACCEPTED_SINGLETON, 100)] }),
          taxonomy: async keys => ({
            resolved: new Map(keys.map(key => [key, { sourceKey: key, acceptedKey: key, species: speciesRecords.get(key)! }])),
            rejected: [],
          }),
        },
      })
      expect(candidate.report).toMatchObject({ catalogue: { status: 'complete' }, national: { uniqueTaxa: 1 } })
      expect(await db.cataloguePlausibility.count({ where: { regionBuild: { catalogueVersionId: candidate.catalogueId } } })).toBe(2)
      const afterStaging = await guardSnapshot()
      // Staging deliberately upserts shared identities (and their timestamps), unlike calculation.
      expect(afterStaging.taxa.map(({ updatedAt: _updatedAt, ...taxon }) => taxon)).toEqual(before.taxa.map(({ updatedAt: _updatedAt, ...taxon }) => taxon))
      expect({ ...afterStaging, taxa: [] }).toEqual({ ...before, taxa: [] })
    } finally { await removeGuardCatalogue() }
  })


  it('preserves a catalogue activated while a legacy job is fetching changed membership', async () => {
    let activated: Promise<Awaited<ReturnType<typeof guardSnapshot>>> | undefined
    const activatingFacet = vi.fn(async (): Promise<Facet> => {
      activated ??= (async () => {
        await activateGuardCatalogue()
        // Activation owns the published ready state; the losing job must not mark it failed.
        await db.region.updateMany({ where: { canonicalKey: COMPOSITE_KEY }, data: { status: 'ready', error: null } })
        return guardSnapshot()
      })()
      await activated
      return { total: 100, counts: [count(ACCEPTED_BOUNDARY, 100)] }
    })
    try {
      await expect(runRegion(COMPOSITE_KEY, () => undefined, { facet: activatingFacet, species, requestStats: stats })).rejects.toThrow('active catalogue')
      expect(activatingFacet).toHaveBeenCalled()
      expect(activated).toBeDefined()
      expect(await guardSnapshot()).toEqual(await activated)
    } finally { await removeGuardCatalogue() }
  })

  it('retains supported direct legacy publication when no catalogue is active', async () => {
    const resolveLegacy = vi.fn(async () => ({ gadmGid: 'JPN.guard_115', name: 'Guard legacy', higher: 'Japan', level: 2 }))
    const legacyFacet = vi.fn(async (): Promise<Facet> => ({ total: 100, counts: [count(ACCEPTED_SHARED, 100)] }))
    try {
      const result = await runRegion('Unstored legacy guard region', () => undefined, { facet: legacyFacet, species, resolveLegacy, requestStats: stats })
      expect(result).toMatchObject({ set: 1, registryVersion: null, gadmGid: 'JPN.guard_115' })
      expect(resolveLegacy).toHaveBeenCalledOnce()
      expect(await db.plausibility.count({ where: { regionId: result.regionId } })).toBe(1)
    } finally { await db.region.deleteMany({ where: { gadmGid: 'JPN.guard_115' } }) }
  })

})
