import { z } from 'zod'
import type { PrismaClient } from '../generated/prisma/client'

export const LEGACY_REGION_SUCCESSORS = {
  'DEU.11.19_1': 'de-krg-07339000',
  'DEU.11.30_1': 'de-krg-07340000',
  'JPN.22.13_1': null,
  'NLD.9.73_1': null,
} as const

type CompatibilityDb = Pick<PrismaClient, 'catalogueVersion' | 'region' | 'regionRegistryEntry'>
type RegionResolution = {
  inputId: string
  regionId: string | null
  canonicalKey: string | null
  reason: 'active' | 'successor' | 'retired' | 'unknown'
}

/** Compatibility activates only with the matched active catalogue and registry. */
export async function activeGermanyCatalogue(db: Pick<PrismaClient, 'catalogueVersion'>) {
  const catalogue = await db.catalogueVersion.findFirst({
    where: { countryCode: 'DE', status: 'active', registryVersion: { active: true } },
    select: { id: true, registryVersionId: true, registryVersion: { select: { id: true, version: true, artifactSha256: true } } },
  })
  return catalogue ?? null
}
export type ActiveGermanyCatalogue = NonNullable<Awaited<ReturnType<typeof activeGermanyCatalogue>>>

/**
 * Resolve stored/requested region UUIDs without mutating them. Before cutover (no matched active
 * German catalogue), existing ready IDs pass through. After cutover only active-registry members
 * and the four reviewed legacy outcomes survive.
 */
export async function resolveRegionIds(db: CompatibilityDb, ids: readonly string[], snapshot?: ActiveGermanyCatalogue | null) {
  const unique = [...new Set(ids)]
  const catalogue = snapshot === undefined ? await activeGermanyCatalogue(db) : snapshot
  if (!catalogue) {
    // Legacy mode still accepts every existing ready region, including the reviewed historical
    // fixtures. An arbitrary/missing UUID cannot be passed through: a queued scan created after
    // activation may outlive a rollback which removed that canonical data cohort.
    const ready = unique.length ? await db.region.findMany({
      where: { id: { in: unique }, status: 'ready' }, select: { id: true, canonicalKey: true },
    }) : []
    const byId = new Map(ready.map((row) => [row.id, row]))
    return {
      catalogueVersion: null,
      registryVersion: null,
      resolutions: unique.map((inputId): RegionResolution => {
        const row = byId.get(inputId)
        return row
          ? { inputId, regionId: inputId, canonicalKey: row.canonicalKey, reason: 'active' }
          : { inputId, regionId: null, canonicalKey: null, reason: 'unknown' }
      }),
    }
  }
  const rows = unique.length ? await db.region.findMany({
    where: { id: { in: unique } },
    select: { id: true, gadmGid: true, canonicalKey: true },
  }) : []
  const byId = new Map(rows.map((row) => [row.id, row]))
  const activeEntries = unique.length ? await db.regionRegistryEntry.findMany({
    where: { registryVersionId: catalogue.registryVersionId, regionId: { in: unique } },
    select: { regionId: true, region: { select: { canonicalKey: true } } },
  }) : []
  const activeById = new Map(activeEntries.map((entry) => [entry.regionId, entry.region.canonicalKey]))
  const successorKeys = [...new Set(rows.flatMap((row) => {
    const successor = row.gadmGid ? LEGACY_REGION_SUCCESSORS[row.gadmGid as keyof typeof LEGACY_REGION_SUCCESSORS] : undefined
    return successor ? [successor] : []
  }))]
  const successors = successorKeys.length ? await db.regionRegistryEntry.findMany({
    where: { registryVersionId: catalogue.registryVersionId, region: { canonicalKey: { in: successorKeys }, countryCode: 'DE' } },
    select: { regionId: true, region: { select: { canonicalKey: true } } },
  }) : []
  const successorByKey = new Map(successors.map((entry) => [entry.region.canonicalKey!, entry.regionId]))
  const resolutions = unique.map((inputId): RegionResolution => {
    const activeKey = activeById.get(inputId)
    if (activeKey) return { inputId, regionId: inputId, canonicalKey: activeKey, reason: 'active' }
    const row = byId.get(inputId)
    const mapped = row?.gadmGid ? LEGACY_REGION_SUCCESSORS[row.gadmGid as keyof typeof LEGACY_REGION_SUCCESSORS] : undefined
    if (mapped === null) return { inputId, regionId: null, canonicalKey: null, reason: 'retired' }
    if (mapped) {
      const regionId = successorByKey.get(mapped) ?? null
      return { inputId, regionId, canonicalKey: mapped, reason: regionId ? 'successor' : 'unknown' }
    }
    return { inputId, regionId: null, canonicalKey: row?.canonicalKey ?? null, reason: 'unknown' }
  })
  return { catalogueVersion: catalogue.id, registryVersion: catalogue.registryVersionId, resolutions }
}

export async function resolveRegionSelection(db: CompatibilityDb, regionIds: readonly string[], activeRegionId: string | null, snapshot?: ActiveGermanyCatalogue | null) {
  const resolved = await resolveRegionIds(db, [...regionIds, ...(activeRegionId ? [activeRegionId] : [])], snapshot)
  const byInput = new Map(resolved.resolutions.map((row) => [row.inputId, row.regionId]))
  const mappedIds = [...new Set(regionIds.flatMap((id) => byInput.get(id) ?? []))]
  const mappedActive = activeRegionId ? byInput.get(activeRegionId) ?? null : null
  return {
    ...resolved,
    regionIds: mappedIds,
    activeRegionId: mappedActive && mappedIds.includes(mappedActive) ? mappedActive : mappedIds[0] ?? null,
  }
}

const summary = z.object({ version: z.literal(1), setSize: z.number().int().nonnegative(), content: z.number().int().nonnegative(), introEn: z.number().int().nonnegative(), noGermanName: z.number().int().nonnegative(), nowCounts: z.array(z.number().int().nonnegative()).length(12), refreshedAt: z.string() })

/** Temporary numeric response for the existing picker. Missing summaries are omitted, never zeroed. */
export async function legacyRegions(db: Pick<PrismaClient, 'region' | 'filter' | 'catalogueVersion' | 'regionRegistryEntry'>, identityId: string, month: number) {
  const active = await activeGermanyCatalogue(db)
  // Once the national registry is active, identity.me/regions.personal own projected saved rows;
  // this compatibility list is suggestions only. Keeping it to two bounded queries also avoids
  // rereading legacy Region rows solely to render a fallback the canonical picker does not use.
  const filter = active ? null : await db.filter.findUnique({ where: { identityId }, select: { regionIds: true } })
  const selectedIds = [...new Set(filter?.regionIds ?? [])].slice(0, 20)
  const select = { id: true, gadmGid: true, name: true, higher: true, status: true, refreshedAt: true, pickerSummary: true } as const
  const activeScope = active ? { registryEntries: { some: { registryVersionId: active.registryVersionId } }, countryCode: 'DE' } : {}
  const [selected, suggestions] = await Promise.all([
    selectedIds.length ? db.region.findMany({ where: { id: { in: selectedIds }, status: { not: 'unprepared' }, ...activeScope }, take: 20, select }) : [],
    db.region.findMany({ where: { status: { not: 'unprepared' }, ...activeScope, ...(selectedIds.length ? { id: { notIn: selectedIds } } : {}) }, orderBy: [{ name: 'asc' }, { id: 'asc' }], take: 20, select }),
  ])
  return [...selected, ...suggestions].flatMap(({ pickerSummary, ...region }) => {
    const parsed = summary.safeParse(pickerSummary)
    if (!parsed.success) return []
    const { setSize, content, introEn, noGermanName, nowCounts } = parsed.data
    return [{ ...region, setSize, content, introEn, noGermanName, nowCount: nowCounts[month - 1], introEnShare: setSize ? +(introEn / setSize).toFixed(3) : 0 }]
  }).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
}
