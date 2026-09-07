import { describe, expect, it } from 'vitest'
import { barWidth, foldRows, groupsOf, onTiles, regionOf, rowsOf } from './GroupRows'

// Handoff 0014 P3: one row per tile of the set, counts over the group's size; an id seen twice counts once; an out-of-set
// find (E13) counts nowhere; a tile the set does not list gets no row.
describe('groupsOf', () => {
  const set = {
    tiles: [{ tile: 'bird' }, { tile: 'insect' }],
    species: [
      { taxonId: 'a', tile: 'bird' },
      { taxonId: 'b', tile: 'bird' },
      { taxonId: 'c', tile: 'insect' },
      { taxonId: 'd', tile: 'fish' },
    ],
  }
  it('is null until both reads are in', () => {
    expect(groupsOf(null, { studied: [], seen: [] })).toBeNull()
    expect(groupsOf(set, null)).toBeNull()
  })
  it('counts per tile over the group size', () => {
    expect(groupsOf(set, { studied: ['a', 'c', 'd'], seen: ['a', 'a', 'zzz'] })).toEqual([
      { tile: 'bird', studied: 1, seen: 1, possible: 2 },
      { tile: 'insect', studied: 1, seen: 0, possible: 1 },
    ])
  })
})

// Handoff 0022 P3/P4: the light `dex.setCounts` gives the same rows as `dex.set` (since 0025 B5 counted on the server);
// the region line sums the tiles on; a bar from 5 %; rows at 0 on both axes fold.
describe('progress card', () => {
  const order = ['bird', 'fish', 'insect', 'plant']
  it('rowsOf keeps the enum order, drops tiles without members and equals groupsOf on the same set', () => {
    const counts = { byTile: { plant: 1, bird: 2, fish: 0 }, seen: { bird: 1, plant: 0 }, studied: { plant: 1 } }
    const rows = rowsOf(counts, order)
    expect(rows).toEqual([
      { tile: 'bird', studied: 0, seen: 1, possible: 2 },
      { tile: 'plant', studied: 1, seen: 0, possible: 1 },
    ])
    expect(rowsOf(null, order)).toBeNull()
    const set = { tiles: [{ tile: 'bird' }, { tile: 'plant' }], species: [{ taxonId: 'b1', tile: 'bird' }, { taxonId: 'b2', tile: 'bird' }, { taxonId: 'p1', tile: 'plant' }] }
    expect(groupsOf(set, { studied: ['p1'], seen: ['b1', 'x'] })).toEqual(rows)
  })
  it('regionOf sums the tiles on; empty tiles mean all', () => {
    const rows = [
      { tile: 'bird', studied: 0, seen: 1, possible: 69 },
      { tile: 'plant', studied: 1, seen: 1, possible: 388 },
    ]
    expect(regionOf(onTiles(rows, []))).toEqual({ studied: 1, seen: 2, possible: 457 })
    expect(regionOf(onTiles(rows, ['bird']))).toEqual({ studied: 0, seen: 1, possible: 69 })
    expect(regionOf(onTiles(null, []))).toBeNull()
  })
  it('barWidth from 5 %, never over 100', () => {
    expect(barWidth(7, 69)).toBe('10%')
    expect(barWidth(4, 388)).toBeNull()
    expect(barWidth(3, 60)).toBe('5%')
    expect(barWidth(2, 41)).toBeNull() // 4.9 %
    expect(barWidth(0, 0)).toBeNull()
    expect(barWidth(5, 4)).toBe('100%')
  })
  it('foldRows keeps rows with a count on either axis', () => {
    const rows = [
      { tile: 'bird', studied: 0, seen: 1, possible: 69 },
      { tile: 'insect', studied: 0, seen: 0, possible: 429 },
      { tile: 'plant', studied: 1, seen: 0, possible: 388 },
    ]
    const { shown, folded } = foldRows(rows)
    expect(shown.map((r) => r.tile)).toEqual(['bird', 'plant'])
    expect(folded.map((r) => r.tile)).toEqual(['insect'])
  })
})
