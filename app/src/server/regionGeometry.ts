import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import manifest from './data/germany-land.manifest.json'

type Point = [number, number]
export type LandFeature = { key: string; bbox: number[]; polygons: Point[][][] }
type Geometry = { schemaVersion: number; registryVersion: string; features: LandFeature[] }
let cached: Geometry | undefined

function geometry() {
  if (cached) return cached
  const compressed = readFileSync(join(process.cwd(), 'src/server/data/germany-land.json.gz'))
  if (createHash('sha256').update(compressed).digest('hex') !== manifest.geometrySha256) throw new Error('BKG geometry digest mismatch')
  const data = JSON.parse(gunzipSync(compressed).toString()) as Geometry
  if (data.schemaVersion !== 1 || data.registryVersion !== manifest.registryVersion || data.features.length !== manifest.regionCount) throw new Error('BKG geometry manifest mismatch')
  return cached = data
}

/** -1 outside; 0 on the source segment; 1 inside. Coordinates are longitude/latitude. */
function ringContains([x, y]: Point, ring: Point[]) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[j], [bx, by] = ring[i]
    const length = Math.hypot(bx - ax, by - ay)
    if (length > 0 && Math.abs((x - ax) * (by - ay) - (y - ay) * (bx - ax)) <= 1e-10 * length &&
      x >= Math.min(ax, bx) - 1e-10 && x <= Math.max(ax, bx) + 1e-10 && y >= Math.min(ay, by) - 1e-10 && y <= Math.max(ay, by) + 1e-10) return 0
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside
  }
  return inside ? 1 : -1
}

export function containingLandKeys(features: LandFeature[], point: Point) {
  return features.filter(({ bbox: [west, south, east, north], polygons }) => {
    if (point[0] < west || point[0] > east || point[1] < south || point[1] > north) return false
    return polygons.some(([outer, ...holes]) => {
      const outerMatch = ringContains(point, outer)
      if (outerMatch < 0) return false
      const holeMatches = holes.map((hole) => ringContains(point, hole))
      return !holeMatches.includes(1)
    })
  }).map((feature) => feature.key).sort()
}

export async function bkgLandContainment(point: { lat: number; lng: number }, registryId: string, registrySha256?: string) {
  if (registryId !== manifest.registryVersion || registrySha256 !== manifest.registrySha256) return { status: 'geometry-unavailable' as const }
  try {
    return { status: 'ok' as const, regionKeys: containingLandKeys(geometry().features, [point.lng, point.lat]) }
  } catch {
    return { status: 'geometry-unavailable' as const }
  }
}
