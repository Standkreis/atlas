import { describe, expect, it } from 'vitest'
import { bkgLandContainment, containingLandKeys, type LandFeature } from './regionGeometry'
import manifest from './data/germany-land.manifest.json'

describe('BKG land geometry', () => {
  it.each([
    ['Pirmasens', 49.2017, 7.6058, 'de-krg-07340000'],
    ['Zweibrücken', 49.2494, 7.364, 'de-krg-07340000'],
    ['Mainz', 49.999, 8.273, 'de-krg-07315000'],
  ])('contains %s in its official composite', async (_, lat, lng, key) => {
    expect(await bkgLandContainment({ lat: Number(lat), lng: Number(lng) }, manifest.registryVersion, manifest.registrySha256)).toEqual({ status: 'ok', regionKeys: [key] })
  })
  it.each([[0, 0], [52, 4], [47.6259, 9.3683], [54.4, 7.8]])('does not assign outside/open-water coordinate %s,%s to a nearest region', async (lat, lng) => {
    expect(await bkgLandContainment({ lat, lng }, manifest.registryVersion, manifest.registrySha256)).toEqual({ status: 'ok', regionKeys: [] })
  })
  it('refuses an unbound registry or changed registry artifact', async () => {
    expect(await bkgLandContainment({ lat: 49.2, lng: 7.6 }, 'new-version', manifest.registrySha256)).toEqual({ status: 'geometry-unavailable' })
    expect(await bkgLandContainment({ lat: 49.2, lng: 7.6 }, manifest.registryVersion, 'wrong-digest')).toEqual({ status: 'geometry-unavailable' })
  })
  it('preserves holes, detached islands and both sides of shared boundaries', () => {
    const features: LandFeature[] = [
      { key: 'a', bbox: [0, 0, 5, 5], polygons: [[[[0, 0], [3, 0], [3, 3], [0, 3], [0, 0]], [[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]]], [[[4, 4], [5, 4], [5, 5], [4, 5], [4, 4]]]] },
      { key: 'b', bbox: [3, 0, 6, 3], polygons: [[[[3, 0], [6, 0], [6, 3], [3, 3], [3, 0]]]] },
    ]
    expect(containingLandKeys(features, [1.5, 1.5])).toEqual([])
    expect(containingLandKeys(features, [4.5, 4.5])).toEqual(['a'])
    expect(containingLandKeys(features, [3, 1.5])).toEqual(['a', 'b'])
    expect(containingLandKeys(features, [1, 1.5])).toEqual(['a'])
    expect(containingLandKeys(features, [3, 0])).toEqual(['a', 'b'])
  })
})
