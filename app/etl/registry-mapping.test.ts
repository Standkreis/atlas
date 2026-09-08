import { describe, expect, it } from 'vitest'
import { parseRegionQueryMapping } from './registry-mapping'

const document = () => ({
  schemaVersion: 1,
  registryId: 'de-krg-2099-12-31',
  provider: 'gbifGadm',
  providerVersion: '4.1',
  source: {
    name: 'GADM 4.1 Germany GeoPackage',
    url: 'https://example.test/gadm41_DEU.gpkg',
    sha256: 'a'.repeat(64),
  },
  gbifEvidence: {
    name: 'GBIF GADM geocoder snapshot',
    url: 'https://api.gbif.org/v1/geocode/gadm/search',
    sha256: 'b'.repeat(64),
  },
  resolvedAt: '2026-09-08T17:28:00Z',
  reviewedAt: '2026-09-08T17:41:00Z',
  counts: { sourceUnits: 2, mappedQueryUnits: 3, excludedQueryUnits: 1, providerInventory: 4 },
  review: {
    status: 'verified',
    method: 'largest polygon overlap',
    minimumLargestOverlap: 0.9265,
    excluded: [{ providerKey: 'DEU.1.5_1', name: 'Bodensee', type: 'Water body', reason: 'standalone open water is deferred' }],
  },
  mappings: [
    { sourceUnitKey: 'de-krs-03159', providerKeys: ['DEU.9.14_1', 'DEU.9.32_1'] },
    { sourceUnitKey: 'de-krs-07339', providerKeys: ['DEU.11.19_1'] },
  ],
})

describe('parseRegionQueryMapping', () => {
  it('accepts reviewed, sorted and disjoint operational mappings', () => {
    const parsed = parseRegionQueryMapping(document())
    expect(parsed.mappings).toHaveLength(2)
    expect(parsed.mappings.flatMap((row) => row.providerKeys)).toHaveLength(3)
  })

  it('rejects duplicate provider assignments', () => {
    const input = document()
    input.mappings[1]!.providerKeys = ['DEU.9.32_1']
    expect(() => parseRegionQueryMapping(input)).toThrow('provider keys must be assigned exactly once')
  })

  it('rejects unsorted source units', () => {
    const input = document()
    input.mappings.reverse()
    expect(() => parseRegionQueryMapping(input)).toThrow('mapping source-unit keys must be strictly sorted')
  })

  it('rejects a provider key that is both mapped and excluded', () => {
    const input = document()
    input.review.excluded[0]!.providerKey = 'DEU.11.19_1'
    expect(() => parseRegionQueryMapping(input)).toThrow('an excluded provider key cannot also be mapped')
  })

  it('rejects coverage totals that do not match the reviewed provider inventory', () => {
    const input = document()
    input.counts.mappedQueryUnits = 2
    expect(() => parseRegionQueryMapping(input)).toThrow('mapping counts.mappedQueryUnits must equal computed value 3')
  })

  it('rejects an apparently complete German source-unit mapping when two land query units are absent', () => {
    const input = document()
    input.registryId = 'de-krg-2024-12-31'
    input.mappings = Array.from({ length: 400 }, (_, index) => ({
      sourceUnitKey: `de-krs-${String(index + 1).padStart(5, '0')}`,
      providerKeys: [`DEU.99.${index + 1}_1`],
    }))
    input.counts = { sourceUnits: 400, mappedQueryUnits: 400, excludedQueryUnits: 1, providerInventory: 401 }

    expect(() => parseRegionQueryMapping(input)).toThrow('Germany registry query mapping counts.mappedQueryUnits must equal 402')
  })
})
