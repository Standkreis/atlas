import { describe, expect, it } from 'vitest'
import { aggregateCompositeCounts, cutCompositeTile, type QueryUnitCounts, type ResolvedSpeciesCount } from './composite-aggregation'
import type { Species } from './gbif'

const months = (january = 0, february = 0) => [january, february, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
const taxon = (key: number, extra: Partial<Species> = {}): Species => ({ key, rank: 'SPECIES', ...extra })
const count = (sourceKey: number, acceptedKey: number, obs: number, byMonth: number[], species: Species = taxon(acceptedKey)): ResolvedSpeciesCount => ({
  sourceKey,
  acceptedKey,
  obs,
  byMonth,
  species,
})

describe('aggregateCompositeCounts', () => {
  it('sums constituents and synonymous facet keys before a floor or cut is applied', () => {
    const units: QueryUnitCounts[] = [
      {
        queryUnitKey: 'DEU.11.24_1',
        total: 80,
        monthTotals: months(50, 30),
        species: [
          count(100, 100, 6, months(4, 2), taxon(100, { canonicalName: 'Accepted species', kingdom: 'Animalia', phylum: 'Arthropoda' })),
          count(101, 100, 3, months(2, 1), taxon(100, { canonicalName: 'Accepted species', kingdom: 'Animalia', phylum: 'Arthropoda' })),
          count(200, 200, 10, months(6, 4)),
        ],
      },
      {
        queryUnitKey: 'DEU.11.30_1',
        total: 40,
        monthTotals: months(25, 15),
        species: [count(102, 100, 5, months(3, 2), taxon(100, { canonicalName: 'Accepted species', kingdom: 'Animalia', phylum: 'Arthropoda' })), count(300, 300, 10, months(7, 3))],
      },
    ]

    const result = aggregateCompositeCounts(units)

    expect(result.total).toBe(120)
    expect(result.monthTotals).toEqual(months(75, 45))
    expect(result.species.map(({ key, obs, byMonth, sourceKeys, queryUnitKeys }) => ({ key, obs, byMonth, sourceKeys, queryUnitKeys }))).toEqual([
      { key: 100, obs: 14, byMonth: months(9, 5), sourceKeys: [100, 101, 102], queryUnitKeys: ['DEU.11.24_1', 'DEU.11.30_1'] },
      { key: 200, obs: 10, byMonth: months(6, 4), sourceKeys: [200], queryUnitKeys: ['DEU.11.24_1'] },
      { key: 300, obs: 10, byMonth: months(7, 3), sourceKeys: [300], queryUnitKeys: ['DEU.11.30_1'] },
    ])
    expect(result.species[0]!.species.phylum).toBe('Arthropoda')
    expect(cutCompositeTile(result.species, 1, 10).map((row) => row.key)).toEqual([100, 200, 300])
  })

  it('preserves provider counts and performs no record-level deduplication', () => {
    const result = aggregateCompositeCounts([
      { queryUnitKey: 'DEU.1_1', total: 12, monthTotals: months(12), species: [count(10, 10, 12, months(12))] },
    ])

    // The provider facet may include syndicated duplicate records. With no occurrence ids available, all 12 remain.
    expect(result.total).toBe(12)
    expect(result.species[0]!.obs).toBe(12)
    expect(result.species[0]!.byMonth[0]).toBe(12)
  })

  it('leaves an equivalent single-unit result unchanged', () => {
    const unit: QueryUnitCounts = {
      queryUnitKey: 'DEU.11.19_1',
      total: 31,
      monthTotals: months(20, 11),
      species: [count(7, 7, 20, months(13, 7), taxon(7, { canonicalName: 'Seven' })), count(9, 9, 11, months(7, 4), taxon(9, { canonicalName: 'Nine' }))],
    }

    const result = aggregateCompositeCounts([unit])

    expect(result.total).toBe(unit.total)
    expect(result.monthTotals).toEqual(unit.monthTotals)
    expect(result.species.map(({ key, obs, byMonth, species }) => ({ key, obs, byMonth, species }))).toEqual(
      unit.species.map((row) => ({ key: row.acceptedKey, obs: row.obs, byMonth: row.byMonth, species: row.species })),
    )
  })

  it('is deterministic across constituent and source-row order', () => {
    const complete = taxon(20, { canonicalName: 'Alpha', kingdom: 'Plantae' })
    const first: QueryUnitCounts = { queryUnitKey: 'B', total: 10, monthTotals: months(10), species: [count(21, 20, 5, months(5), complete), count(20, 20, 5, months(5), complete)] }
    const second: QueryUnitCounts = { queryUnitKey: 'A', total: 10, monthTotals: months(10), species: [count(10, 10, 10, months(10))] }

    const forward = aggregateCompositeCounts([first, second])
    const reverse = aggregateCompositeCounts([
      second,
      { ...first, species: [...first.species].reverse() },
    ])

    expect(reverse).toEqual(forward)
    expect(forward.species.map((row) => row.key)).toEqual([10, 20])
    expect(forward.species[1]!.species).toEqual(complete)
  })

  it('selects an equal-count cut boundary by accepted key regardless of input order', () => {
    const candidates = [{ key: 20, obs: 80 }, { key: 30, obs: 10 }, { key: 10, obs: 10 }]

    expect(cutCompositeTile(candidates).map((row) => row.key)).toEqual([20, 10])
    expect(cutCompositeTile([...candidates].reverse()).map((row) => row.key)).toEqual([20, 10])
  })

  it('rejects repeated query units and unresolved accepted records', () => {
    const unit: QueryUnitCounts = { queryUnitKey: 'DEU.1_1', total: 1, monthTotals: months(1), species: [] }
    expect(() => aggregateCompositeCounts([unit, unit])).toThrow('duplicate query unit DEU.1_1')
    expect(() =>
      aggregateCompositeCounts([
        { ...unit, species: [count(99, 100, 1, months(1), taxon(99))] },
      ]),
    ).toThrow('accepted record key 99 does not match acceptedKey 100')
  })

  it('rejects duplicate source facet keys inside one query unit', () => {
    const duplicate = count(10, 10, 5, months(5))
    expect(() =>
      aggregateCompositeCounts([{ queryUnitKey: 'DEU.1_1', total: 10, monthTotals: months(10), species: [duplicate, duplicate] }]),
    ).toThrow('DEU.1_1 contains duplicate sourceKey 10')
  })

  it('blocks conflicting terminal metadata for one accepted key', () => {
    expect(() =>
      aggregateCompositeCounts([
        {
          queryUnitKey: 'DEU.1_1',
          total: 10,
          monthTotals: months(10),
          species: [
            count(10, 10, 5, months(5), taxon(10, { canonicalName: 'First identity' })),
            count(11, 10, 5, months(5), taxon(10, { canonicalName: 'Conflicting identity' })),
          ],
        },
      ]),
    ).toThrow('acceptedKey 10 has conflicting terminal taxonomy metadata')
  })

  it('rejects malformed count vectors before they can corrupt composite totals', () => {
    expect(() => aggregateCompositeCounts([{ queryUnitKey: 'A', total: 1, monthTotals: [1], species: [] }])).toThrow('must contain exactly 12 months')
    expect(() => aggregateCompositeCounts([{ queryUnitKey: 'A', total: -1, monthTotals: months(), species: [] }])).toThrow('must be a non-negative safe integer')
  })
})
