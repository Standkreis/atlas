/** Location evidence is separate from catalogue-scoped discovery/study (Germany contract). */
export type SightingLocation = { lat: number | null; lng: number | null }
export type RegionAtPoint = (lat: number, lng: number) => string | null

export function hasValidCoordinates(point: SightingLocation): point is { lat: number; lng: number } {
  return point.lat !== null && point.lng !== null && Number.isFinite(point.lat) && Number.isFinite(point.lng) && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180
}

/** Call with wild sightings only. The resolver uses the pinned official land geometry, never a nearest region. */
export function germanLocationProgress(sightings: readonly SightingLocation[], regionAtPoint: RegionAtPoint, activeRegionKeys: ReadonlySet<string>) {
  const visited = new Set<string>()
  let germanSightings = 0
  for (const point of sightings) {
    if (!hasValidCoordinates(point)) continue
    const { lat, lng } = point
    const key = regionAtPoint(lat, lng)
    if (key === null || !activeRegionKeys.has(key)) continue
    germanSightings++
    visited.add(key)
  }
  return { germanSightings, visitedRegionKeys: [...visited].sort() }
}
