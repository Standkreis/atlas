import { describe, expect, it } from 'vitest'
import { clampGalleryIndex, galleryIndexForScroll, galleryKeyTarget } from './SpeciesSliderState'

describe('species gallery navigation', () => {
  it('clamps missing, shrinking and out-of-range positions', () => {
    expect(clampGalleryIndex(11, 12)).toBe(11)
    expect(clampGalleryIndex(11, 2)).toBe(1)
    expect(clampGalleryIndex(-4, 12)).toBe(0)
    expect(clampGalleryIndex(Number.NaN, 12)).toBe(0)
    expect(clampGalleryIndex(4, 0)).toBe(0)
  })

  it('maps native scroll offsets to the nearest valid slide', () => {
    expect(galleryIndexForScroll(0, 360, 12)).toBe(0)
    expect(galleryIndexForScroll(539, 360, 12)).toBe(1)
    expect(galleryIndexForScroll(9000, 360, 12)).toBe(11)
    expect(galleryIndexForScroll(360, 0, 12)).toBe(0)
  })

  it('supports Arrow, Home and End without consuming unrelated keys', () => {
    expect(galleryKeyTarget('ArrowLeft', 0, 12)).toBe(0)
    expect(galleryKeyTarget('ArrowRight', 0, 12)).toBe(1)
    expect(galleryKeyTarget('Home', 7, 12)).toBe(0)
    expect(galleryKeyTarget('End', 7, 12)).toBe(11)
    expect(galleryKeyTarget('PageDown', 7, 12)).toBeNull()
    expect(galleryKeyTarget('End', 0, 1)).toBeNull()
  })
})
