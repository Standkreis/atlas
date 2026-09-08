import { z } from 'zod'
import type { Prisma, PrismaClient } from '../generated/prisma/client'
import { normalizeRegionAlias } from '../domain/regionAlias'
import { bkgLandContainment } from './regionGeometry'

export const REGION_SEARCH_LIMIT = 20
export const regionSearchInput = z.object({
  q: z.string().max(80).default(''),
  limit: z.number().int().min(1).max(REGION_SEARCH_LIMIT).default(10),
  after: z.string().regex(/^de-krg-\d{8}$/).optional(),
  registryVersion: z.string().max(100).optional(),
  month: z.number().int().min(1).max(12).optional(),
}).default({ q: '', limit: 10 })

// Explicit projections keep search independent of taxon media and constituent query mappings.
const entrySelect = {
  id: true, regionId: true, displayName: true, sourceName: true, stateCode: true, stateName: true,
  region: { select: { canonicalKey: true, status: true } },
  sourceUnits: { orderBy: { sourceCode: 'asc' }, select: { canonicalKey: true, name: true, kind: true } },
} satisfies Prisma.RegionRegistryEntrySelect
type Entry = Prisma.RegionRegistryEntryGetPayload<{ select: typeof entrySelect }>
type SearchDb = Pick<PrismaClient, 'regionRegistryVersion' | 'regionRegistryEntry' | 'catalogueRegionBuild' | 'filter'>
const activeRegistry = (db: SearchDb) => db.regionRegistryVersion.findFirst({
  where: { countryCode: 'DE', active: true }, select: { id: true, version: true, artifactSha256: true },
})

async function summaries(db: SearchDb, entries: Entry[], registryId: string, month: number) {
  const builds = entries.length ? await db.catalogueRegionBuild.findMany({
    where: { registryVersionId: registryId, registryEntryId: { in: entries.map((entry) => entry.id) }, status: 'complete', catalogueVersion: { countryCode: 'DE', status: 'active' } },
    select: { registryEntryId: true, catalogueVersionId: true, regionSize: true, nowCounts: true, perTile: true, completedAt: true },
  }) : []
  const byEntry = new Map(builds.map((build) => [build.registryEntryId, build]))
  return entries.map((entry) => {
    const build = byEntry.get(entry.id)
    const available = build?.regionSize != null && build.nowCounts.length === 12
    return {
      id: entry.regionId, canonicalKey: entry.region.canonicalKey!, name: entry.displayName,
      sourceName: entry.sourceName, stateCode: entry.stateCode, stateName: entry.stateName,
      higher: `Deutschland › ${entry.stateName}`, constituents: entry.sourceUnits,
      status: entry.region.status, selectable: entry.region.status === 'ready' && available,
      summary: available ? {
        catalogueVersion: build.catalogueVersionId, refreshedAt: build.completedAt,
        setSize: build.regionSize!, nowCount: build.nowCounts[month - 1], month, perTile: build.perTile,
      } : null,
      summaryStatus: available ? 'available' as const : build ? 'stale' as const : 'unavailable' as const,
    }
  })
}

export async function searchRegions(db: SearchDb, input: z.output<typeof regionSearchInput>) {
  const registry = await activeRegistry(db)
  if (!registry) return { status: 'registry-unavailable' as const, registryVersion: null, results: [], next: null }
  if (input.registryVersion && input.registryVersion !== registry.id) {
    return { status: 'registry-changed' as const, registryVersion: registry.id, results: [], next: null }
  }
  const query = normalizeRegionAlias(input.q)
  if (query.length < 2) return { status: 'ok' as const, registryVersion: registry.id, results: [], next: null }
  // Each token can match a different alias: e.g. "Neustadt Bayern" disambiguates by Land.
  const entries = await db.regionRegistryEntry.findMany({
    where: {
      registryVersionId: registry.id,
      AND: query.split(' ').map((token) => ({ aliases: { some: { normalizedName: { contains: token } } } })),
      region: { countryCode: 'DE', canonicalKey: input.after ? { gt: input.after } : { not: null } },
    },
    orderBy: { region: { canonicalKey: 'asc' } }, take: input.limit + 1, select: entrySelect,
  })
  const page = entries.slice(0, input.limit)
  return {
    status: 'ok' as const, registryVersion: registry.id,
    results: await summaries(db, page, registry.id, input.month ?? new Date().getMonth() + 1),
    next: entries.length > input.limit ? page.at(-1)!.region.canonicalKey : null,
  }
}

/** Explicit recent IDs are device-owned; they are not sightings, visits or catalogue search. */
export async function personalRegions(db: SearchDb, identityId: string, recentIds: string[], month: number) {
  const [registry, filter] = await Promise.all([
    activeRegistry(db), db.filter.findUnique({ where: { identityId }, select: { regionId: true, regionIds: true } }),
  ])
  if (!registry) return { registryVersion: null, activeRegionId: null, selected: [], recent: [], unavailableIds: [...new Set([...(filter?.regionIds ?? []), ...recentIds])] }
  const selectedIds = [...new Set(filter?.regionIds ?? [])].slice(0, 20)
  const recent = [...new Set(recentIds)].filter((id) => !selectedIds.includes(id)).slice(0, 20)
  const ids = [...selectedIds, ...recent]
  const entries = ids.length ? await db.regionRegistryEntry.findMany({
    where: { registryVersionId: registry.id, regionId: { in: ids }, region: { countryCode: 'DE', canonicalKey: { not: null } } },
    take: 40, select: entrySelect,
  }) : []
  const rows = await summaries(db, entries, registry.id, month)
  const byId = new Map(rows.map((row) => [row.id, row]))
  return {
    registryVersion: registry.id, activeRegionId: filter?.regionId ?? null,
    selected: selectedIds.flatMap((id) => byId.get(id) ?? []),
    recent: recent.flatMap((id) => byId.get(id) ?? []), unavailableIds: ids.filter((id) => !byId.has(id)),
  }
}

export const regionLocationInput = z.discriminatedUnion('permission', [
  z.object({ permission: z.enum(['not-requested', 'denied']) }).strict(),
  z.object({ permission: z.literal('granted'), lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).strict(),
])
/** Server-owned BKG land containment adapter. No nearest region, GADM or bounding-box fallback. */
export type RegionContainment = (point: { lat: number; lng: number }, registryId: string, registrySha256?: string) => Promise<
  { status: 'geometry-unavailable' } | { status: 'ok'; regionKeys: string[] }
>
export async function locateRegion(db: SearchDb, input: z.output<typeof regionLocationInput>, containment: RegionContainment = bkgLandContainment) {
  if (input.permission !== 'granted') return { status: 'permission-required' as const, region: null }
  const registry = await activeRegistry(db)
  if (!registry) return { status: 'registry-unavailable' as const, region: null }
  const match = await containment({ lat: input.lat, lng: input.lng }, registry.id, registry.artifactSha256)
  if (match.status === 'geometry-unavailable') return { status: match.status, registryVersion: registry.id, region: null }
  const keys = [...new Set(match.regionKeys)].sort()
  if (!keys.length) return { status: 'no-result' as const, registryVersion: registry.id, region: null }
  // BKG boundary ties select the lexicographically lowest immutable public key.
  const entry = await db.regionRegistryEntry.findFirst({
    where: { registryVersionId: registry.id, region: { countryCode: 'DE', canonicalKey: keys[0] } }, select: entrySelect,
  })
  if (!entry) return { status: 'registry-mismatch' as const, registryVersion: registry.id, region: null }
  const [region] = await summaries(db, [entry], registry.id, new Date().getMonth() + 1)
  return { status: 'resolved' as const, registryVersion: registry.id, boundaryTie: keys.length > 1, region }
}
