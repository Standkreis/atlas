import { describe, expect, it } from 'vitest'
import { orderedSavedRegions, regionRemovalGuard, savedRegionRows, uniqueRegionIds } from './RegionManagementState'

describe('profile region management', () => {
  it('shows only supplied saved regions with the active one first', () => {
    const saved = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    expect(orderedSavedRegions(saved, 'b').map((region) => region.id)).toEqual(['b', 'a', 'c'])
    expect(saved.map((region) => region.id)).toEqual(['a', 'b', 'c'])
  })

  it('guards the active and final saved regions', () => {
    expect(regionRemovalGuard(['a'], 'a', 'a')).toBe('last')
    expect(regionRemovalGuard(['a', 'b'], 'a', 'a')).toBe('active')
    expect(regionRemovalGuard(['a', 'b'], 'a', 'b')).toBeNull()
  })

  it('adds a region once while preserving personal order', () => {
    expect(uniqueRegionIds(['a', 'b'], 'c')).toEqual(['a', 'b', 'c'])
    expect(uniqueRegionIds(['a', 'b'], 'a')).toEqual(['a', 'b'])
  })

  it('keeps identity-owned saved rows when persisted catalogue discovery is stale', () => {
    const base = [{ id: 'a', summary: false }, { id: 'b', summary: false }]
    expect(savedRegionRows(['a'], 'a', base, [])).toEqual([{ id: 'a', summary: false }])
    expect(savedRegionRows(['a', 'b'], 'b', base, [{ id: 'b', summary: true }])).toEqual([
      { id: 'b', summary: true },
      { id: 'a', summary: false },
    ])
  })
})
