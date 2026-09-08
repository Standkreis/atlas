export function clampGalleryIndex(index: number, length: number) {
  if (!Number.isSafeInteger(length) || length <= 0) return 0
  const rounded = Number.isFinite(index) ? Math.round(index) : 0
  return Math.min(length - 1, Math.max(0, rounded))
}

export function galleryIndexForScroll(scrollLeft: number, slideWidth: number, length: number) {
  if (!Number.isFinite(slideWidth) || slideWidth <= 0) return 0
  return clampGalleryIndex(scrollLeft / slideWidth, length)
}

export function galleryKeyTarget(key: string, index: number, length: number): number | null {
  if (length <= 1) return null
  if (key === 'ArrowLeft') return clampGalleryIndex(index - 1, length)
  if (key === 'ArrowRight') return clampGalleryIndex(index + 1, length)
  if (key === 'Home') return 0
  if (key === 'End') return length - 1
  return null
}
