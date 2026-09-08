import { describe, expect, it, vi } from 'vitest'
import { germanLocationProgress } from './germanyProgress'

describe('German location evidence', () => {
  it('rejects missing, incomplete and invalid coordinates before containment', () => {
    const resolve = vi.fn(() => 'north')
    expect(germanLocationProgress([
      { lat: null, lng: null }, { lat: 50, lng: null }, { lat: null, lng: 8 },
      { lat: NaN, lng: 8 }, { lat: 50, lng: Infinity }, { lat: 91, lng: 8 }, { lat: 50, lng: -181 },
    ], resolve, new Set(['north']))).toEqual({ germanSightings: 0, visitedRegionKeys: [] })
    expect(resolve).not.toHaveBeenCalled()
  })

  it('counts every contained sighting but each active region only once', () => {
    const resolve = (lat: number) => lat === 50 ? 'north' : lat === 49 ? 'south' : lat === 48 ? 'retired' : null
    expect(germanLocationProgress([50, 50, 49, 48, 47].map((lat) => ({ lat, lng: 8 })), resolve, new Set(['north', 'south'])))
      .toEqual({ germanSightings: 3, visitedRegionKeys: ['north', 'south'] })
  })
})
