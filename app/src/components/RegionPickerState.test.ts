import { describe, expect, it } from 'vitest'
import { constituentMatch, matchingFallback, pickerCanSelect, pickerIsGermanFallback, recentRegionIds, type PickerRegion } from './RegionPickerState'

const southWest: PickerRegion = {
  id: 'southwest',
  name: 'Südwestpfalz',
  higher: 'Deutschland › Rheinland-Pfalz',
  stateName: 'Rheinland-Pfalz',
  sourceName: 'Südwestpfalz/Pirmasens/Zweibrücken',
  status: 'ready',
  selectable: true,
  constituents: [
    { name: 'Landkreis Südwestpfalz', kind: 'Landkreis' },
    { name: 'Pirmasens', kind: 'Kreisfreie Stadt' },
    { name: 'Zweibrücken', kind: 'Kreisfreie Stadt' },
  ],
}

describe('region picker state', () => {
  it('explains a constituent match but not the displayed region itself', () => {
    expect(constituentMatch(southWest, 'Pirmasens')).toEqual({ name: 'Pirmasens', kind: 'Kreisfreie Stadt' })
    expect(constituentMatch(southWest, 'ZWEIBRUECKEN')?.name).toBe('Zweibrücken')
    expect(constituentMatch(southWest, 'Südwestpfalz')).toBeNull()
  })

  it('keeps the compatibility fallback bounded and token-qualified', () => {
    const rows = Array.from({ length: 30 }, (_, index) => ({ ...southWest, id: `r-${index}` }))
    expect(matchingFallback(rows, 'Pirmasens Rheinland-Pfalz')).toHaveLength(20)
    expect(matchingFallback(rows, 'pirmasens bayern')).toEqual([])
    expect(matchingFallback(rows, 'a')).toEqual([])
  })

  it('fails closed for non-German and retired standalone legacy regions', () => {
    const legacyRows = [
      { ...southWest, id: 'kyoto', name: 'Kyoto', higher: 'Japan › Kansai', sourceName: 'Kyoto' },
      { ...southWest, id: 'pirmasens', name: 'Pirmasens', sourceName: 'Pirmasens' },
      { ...southWest, id: 'mainz-bingen', name: 'Mainz-Bingen', sourceName: 'Mainz-Bingen' },
    ]

    expect(matchingFallback(legacyRows, 'Kyoto')).toEqual([])
    expect(matchingFallback(legacyRows, 'Pirmasens')).toEqual([])
    expect(matchingFallback(legacyRows, 'Mainz')).toEqual([legacyRows[2]])
    expect(legacyRows.filter(pickerIsGermanFallback)).toEqual([legacyRows[2]])
  })

  it('honours explicit availability and maintains a bounded unique recent list', () => {
    expect(pickerCanSelect(southWest)).toBe(true)
    expect(pickerCanSelect({ ...southWest, selectable: false })).toBe(false)
    expect(recentRegionIds(['a', 'b', 'c'], 'b')).toEqual(['b', 'a', 'c'])
    expect(recentRegionIds(['a', 'b', 'c'], 'd', 2)).toEqual(['d', 'a'])
  })
})
