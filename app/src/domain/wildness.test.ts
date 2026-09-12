import { describe, expect, it } from 'vitest'
import { sightingWildnessChoices } from './wildness'
import { TILES } from './rules'

describe('saved sighting wildness choices', () => {
  it.each(['wild', 'cultivated'] as const)('offers the full plant correction round trip from %s', stored => {
    expect(sightingWildnessChoices('plant', stored)).toEqual(['wild', 'cultivated'])
  })
  it.each(TILES.filter(tile => tile !== 'plant'))('keeps the capture contract for %s', tile => {
    for (const stored of ['wild', 'captive'] as const) expect(sightingWildnessChoices(tile, stored)).toEqual(['wild', 'captive'])
  })
  it('retains a legacy captive plant without losing the canonical correction', () => {
    expect(sightingWildnessChoices('plant', 'captive')).toEqual(['wild', 'cultivated', 'captive'])
  })
  it.each(TILES.filter(tile => tile !== 'plant'))('retains a legacy cultivated %s until corrected', tile => {
    expect(sightingWildnessChoices(tile, 'cultivated')).toEqual(['wild', 'captive', 'cultivated'])
  })
})
