import { describe, expect, it, vi } from 'vitest'
import type { Facet, Species } from './gbif'

const dbMocks = vi.hoisted(() => ({
  findEntries: vi.fn(),
  updateRegion: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('./db', () => ({
  db: {
    regionRegistryEntry: { findMany: dbMocks.findEntries },
    region: { update: dbMocks.updateRegion },
    $transaction: dbMocks.transaction,
  },
}))

import { calculateRegistryRegion } from './region'

const REGISTRY = 'de-krg-2096-12-31'
const REGION = 'de-krg-99001000'
const QUERY_UNIT = 'DEU.96.1_999'
const ACCEPTED = 10
const DOMINANT = 20
const SYNONYM = 101
const REJECTED = 999

const accepted = (key: number, name: string): Species => ({
  key,
  canonicalName: name,
  scientificName: `${name} Author`,
  rank: 'SPECIES',
  taxonomicStatus: 'ACCEPTED',
  kingdom: 'Animalia',
  phylum: 'Chordata',
  class: 'Aves',
  order: 'Passeriformes',
  genus: 'Fixtureus',
})

describe('calculateRegistryRegion', () => {
  it('returns deterministic serializable staging rows without mutating live catalogue state', async () => {
    dbMocks.findEntries.mockResolvedValueOnce([{
      id: 'registry-entry-fixture',
      registryVersionId: REGISTRY,
      region: { id: 'region-fixture', canonicalKey: REGION, gadmGid: null, name: 'Fixture region', higher: 'Deutschland › Testland' },
      sourceUnits: [{ queryUnits: [{ providerKey: QUERY_UNIT }] }],
    }])
    const facet = vi.fn(async (_field: string, params: Record<string, string | number | boolean | string[]>): Promise<Facet> => {
      if (params.month === undefined) {
        return { total: 101, counts: [{ name: String(SYNONYM), count: 12 }, { name: String(DOMINANT), count: 88 }, { name: String(REJECTED), count: 1 }] }
      }
      if (params.month === 1) {
        return { total: 101, counts: [{ name: String(SYNONYM), count: 12 }, { name: String(DOMINANT), count: 88 }, { name: String(REJECTED), count: 1 }] }
      }
      return { total: 0, counts: [] }
    })
    const speciesRecords = new Map<number, Species>([
      [SYNONYM, { ...accepted(SYNONYM, 'Old identity'), acceptedKey: ACCEPTED, taxonomicStatus: 'SYNONYM' }],
      [ACCEPTED, accepted(ACCEPTED, 'Accepted identity')],
      [DOMINANT, accepted(DOMINANT, 'Dominant identity')],
    ])
    const species = vi.fn(async (key: number) => speciesRecords.get(key) ?? null)
    const requests = { perHost: { 'api.gbif.org': 17 }, hits: 3, misses: 14, retries: 0, tooMany: 0 }

    const result = await calculateRegistryRegion(REGISTRY, REGION, () => undefined, {
      facet,
      species,
      requestStats: () => requests,
    })

    expect(result.target).toEqual({
      regionId: 'region-fixture',
      regionKey: REGION,
      registryEntryId: 'registry-entry-fixture',
      gadmGid: null,
      name: 'Fixture region',
      higher: 'Deutschland › Testland',
      queryUnits: [QUERY_UNIT],
      registryVersion: REGISTRY,
    })
    expect(result).toMatchObject({
      total: 101,
      monthTotals: [101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      perTile: { bird: 2 },
      lookalikePairs: [[ACCEPTED, DOMINANT], [DOMINANT, ACCEPTED]],
      rejectedTaxa: [{ sourceKey: REJECTED, reason: expect.stringContaining('did not resolve') }],
      requests,
    })
    expect(result.taxa.map((taxon) => taxon.gbifKey)).toEqual([ACCEPTED, DOMINANT])
    expect(result.plausibility.map((row) => row.gbifKey)).toEqual([ACCEPTED, DOMINANT])
    expect(result.taxonomyResolutions).toEqual([
      { sourceKey: DOMINANT, status: 'accepted', acceptedKey: DOMINANT, species: accepted(DOMINANT, 'Dominant identity') },
      { sourceKey: SYNONYM, status: 'accepted', acceptedKey: ACCEPTED, species: accepted(ACCEPTED, 'Accepted identity') },
      { sourceKey: REJECTED, status: 'rejected', reason: expect.stringContaining('did not resolve') },
    ])
    expect(JSON.parse(JSON.stringify(result))).toEqual(result)
    expect(facet).toHaveBeenCalledTimes(13)
    expect(dbMocks.updateRegion).not.toHaveBeenCalled()
    expect(dbMocks.transaction).not.toHaveBeenCalled()
  })
})
