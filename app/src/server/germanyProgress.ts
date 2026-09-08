import type { PrismaClient } from '@/generated/prisma/client'
import { germanLocationProgress, hasValidCoordinates } from '@/domain/germanyProgress'
import { bkgLandContainment } from './regionGeometry'

/** A resolver must match the exact registry snapshot; unavailable is distinct from no containing keys. */
export type GermanyGeometry = (point: { lat: number; lng: number }, registryId: string, artifactSha256: string) => Promise<
  { status: 'geometry-unavailable' } | { status: 'ok'; regionKeys: string[] }
>

/** One coherent database snapshot even when a catalogue/registry is activated during the request. */
export async function germanyProgress(db: PrismaClient, identityId: string, geometry: GermanyGeometry = bkgLandContainment) {
  const snapshot = await db.$transaction(async (tx) => {
    const catalogue = await tx.catalogueVersion.findFirst({
      where: { countryCode: 'DE', status: 'active' },
      select: {
        id: true, runKey: true, generatedAt: true, activatedAt: true,
        plausibleRulesVersion: true, tileMappingVersion: true, yearFrom: true, yearTo: true,
        registryVersion: { select: { id: true, version: true } },
      },
    })
    const registry = await tx.regionRegistryVersion.findFirst({
      where: { countryCode: 'DE', active: true },
      select: {
        id: true, version: true, artifactSha256: true,
        entries: { select: { regionId: true, region: { select: { canonicalKey: true } } } },
      },
    })
    // Membership has one row per accepted GBIF species (unique Taxon.gbifKey). No Asset joins.
    const membership = catalogue ? { catalogueVersionId: catalogue.id } : null
    const collection = membership ? {
      species: await tx.catalogueTaxon.count({ where: membership }),
      discovered: await tx.catalogueTaxon.count({ where: { ...membership, taxon: { sightings: { some: { identityId, wildness: 'wild' } } } } }),
      studied: await tx.catalogueTaxon.count({ where: { ...membership, taxon: { studies: { some: { identityId } } } } }),
    } : null
    const sightings = registry ? await tx.sighting.findMany({
      where: { identityId, wildness: 'wild', lat: { not: null }, lng: { not: null } },
      select: { lat: true, lng: true },
    }) : []
    return { catalogue, collection, registry, sightings }
  }, { isolationLevel: 'RepeatableRead' })

  const { catalogue, collection, registry, sightings } = snapshot
  const regionsByKey = new Map(registry?.entries.flatMap((entry) => entry.region.canonicalKey ? [[entry.region.canonicalKey, entry.regionId] as const] : []) ?? [])
  const containingRegion = new Map<string, string | null>()
  let geometryAvailable = registry !== null
  if (registry) {
    // An empty journal still checks geometry availability; (0, 0) is only an availability probe.
    const points = sightings.filter(hasValidCoordinates)
    for (const point of points.length ? points : [{ lat: 0, lng: 0 }]) {
      const key = `${point.lat},${point.lng}`
      if (containingRegion.has(key)) continue
      const result = await geometry({ lat: point.lat, lng: point.lng }, registry.id, registry.artifactSha256)
      if (result.status === 'geometry-unavailable') { geometryAvailable = false; break }
      // Official shared boundaries count once, independent of geometry/source iteration order.
      containingRegion.set(key, result.regionKeys.filter((key) => regionsByKey.has(key)).sort()[0] ?? null)
    }
  }
  const locations = geometryAvailable ? germanLocationProgress(sightings, (lat, lng) => containingRegion.get(`${lat},${lng}`) ?? null, new Set(regionsByKey.keys())) : null
  return {
    countryCode: 'DE' as const,
    catalogue: catalogue && collection ? { ...catalogue, ...collection } : null,
    territory: registry ? {
      registry: { id: registry.id, version: registry.version },
      regions: registry.entries.length,
      // Null counters explicitly distinguish unavailable geometry from no personal evidence.
      germanSightings: locations?.germanSightings ?? null,
      visitedRegions: locations?.visitedRegionKeys.length ?? null,
      visitedRegionIds: locations ? locations.visitedRegionKeys.map((key) => regionsByKey.get(key)!) : null,
    } : null,
  }
}
