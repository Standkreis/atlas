import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { Tile } from '@/generated/prisma/enums'
import { get, q } from '../http'
import { isNow, nowRatio, perMille } from '@/domain/rules'
import { publicProcedure, router } from '../trpc'

const GBIF = 'https://api.gbif.org/v1'
type GadmHit = { id: string; name: string; gadmLevel: number; type?: string[]; englishType?: string[]; higherRegions?: { id: string; name: string }[] }
type GadmSearch = { results: GadmHit[] }
type ReverseHit = { id: string; type: string; title: string; distance: number }

const gadmSearch = (params: Record<string, string | number>) => get<GadmSearch>(`${GBIF}/geocode/gadm/search?${q({ ...params, limit: 10 })}`).then((j) => j?.results ?? [])
const gadmById = (gid: string) => gadmSearch({ gadmGid: gid }).then((r) => r.find((h) => h.id === gid) ?? null)

/** One level-2 unit as the onboarding shows it: name · type, parent. `type` is GADM's native word (Landkreis), `typeEn` the English one (District). */
const toUnit = (h: GadmHit) => {
  const higher = h.higherRegions ?? []
  return { gadmGid: h.id, name: h.name, higher: higher.map((x) => x.name).join(' › '), parent: higher.at(-1)?.name ?? null, type: h.type?.[0] ?? null, typeEn: h.englishType?.[0] ?? null }
}
type Unit = ReturnType<typeof toUnit>

const tile = z.enum(Object.values(Tile) as [Tile, ...Tile[]])

const INAT = 'https://inaturalist-open-data.s3.amazonaws.com/'
const WIKI_THUMB = 330 // one of the widths Wikimedia serves without a scaler run (250, 330, 500, 960 ...); 110 px cell at 3×
/**
 * The grid's image variant (handoff 0009 Track A) for a 110 px cell. iNaturalist `medium.*` (500 px, ~45–60 KB)
 * becomes `small.*` (240 px, ~30 KB). A Wikimedia thumb (960 px, 70–325 KB) becomes the 330 px one (~17 KB); an
 * unscaled original (250 KB to over 1 MB, rate-limited with 429 when fetched in bulk) becomes its 330 px thumb.
 * Own photos stay as they are. The species page keeps the full variants. Measured in findings 0009 §C2.
 */
export const smallVariant = (url: string) => {
  if (url.startsWith(INAT)) return url.replace(/\/medium\.(\w+)$/, '/small.$1')
  const m = url.match(/^https:\/\/(?:thumb|upload)\.wikimedia\.org\/wikipedia\/commons\/(thumb\/)?([0-9a-f]\/[0-9a-f]{2}\/[^/?#]+)(?:\/\d+px-[^/?#]+)?(?:[?#].*)?$/)
  if (!m) return url
  const file = m[2].split('/').pop()!
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${m[2]}/${WIKI_THUMB}px-${file}${/\.svg$/i.test(file) ? '.png' : ''}`
}
const thisMonth = () => new Date().getMonth() + 1

// The grid's data (spec §🧬 "The plausible set", §🎨 2). Pure read: no identity, the dex state is joined by the client (M5).
export const dexRouter = router({
  /**
   * The species of a region's set for the given tiles, sorted "jetzt wahrscheinlich" (this month's share ÷ peak, then
   * observations). `nowOnly` keeps only the species at ≥ 25 % of their peak this month. The fish tile is hidden
   * (dropped from `tiles` and never returned) when the region's set has no fish (record 0002 E12).
   */
  set: publicProcedure
    .input(z.object({ regionId: z.string().uuid(), tiles: z.array(tile).min(1), nowOnly: z.boolean().default(false), month: z.number().int().min(1).max(12).optional() }))
    .query(async ({ ctx, input }) => {
      const month = input.month ?? thisMonth()
      const region = await ctx.db.region.findUnique({ where: { id: input.regionId }, select: { id: true, name: true, higher: true, status: true, refreshedAt: true, monthTotals: true } })
      if (!region) return null
      const counts = await ctx.db.plausibility.groupBy({ by: ['taxonId'], where: { regionId: region.id }, _count: true })
      const tilesPresent = await ctx.db.taxon.groupBy({ by: ['tile'], where: { plausibility: { some: { regionId: region.id } } }, _count: { _all: true } })
      const present = new Map(tilesPresent.map((t) => [t.tile, t._count._all]))
      const tiles = input.tiles.filter((t) => t !== 'fish' || (present.get('fish') ?? 0) > 0)
      const rows = await ctx.db.plausibility.findMany({
        where: { regionId: region.id, taxon: { tile: { in: tiles } } },
        include: { taxon: { include: { assets: { where: { kind: 'image' }, orderBy: { createdAt: 'asc' }, take: 1 } } } },
      })
      const species = rows
        .map((p) => ({
          taxonId: p.taxonId,
          gbifKey: p.taxon.gbifKey,
          sciName: p.taxon.sciName,
          names: p.taxon.commonNames as Record<string, string>,
          tile: p.taxon.tile,
          obs: p.obs,
          monthShare: p.monthShare.map(perMille),
          peak: perMille(p.peak),
          nowRatio: +nowRatio(p.monthShare, p.peak, month).toFixed(3),
          now: isNow(p.monthShare, p.peak, month),
          words: p.words,
          lead: p.taxon.assets[0] ?? null,
          leadSmall: p.taxon.assets[0] ? smallVariant(p.taxon.assets[0].url) : null,
          hasContent: p.taxon.contentAt !== null,
        }))
        .filter((s) => !input.nowOnly || s.now)
        .sort((a, b) => b.nowRatio - a.nowRatio || b.obs - a.obs)
      return {
        region,
        month,
        setSize: counts.length,
        tiles: (Object.values(Tile) as Tile[]).filter((t) => t !== 'fish' || (present.get('fish') ?? 0) > 0).map((t) => ({ tile: t, count: present.get(t) ?? 0 })),
        species,
      }
    }),

  /**
   * The set's counts for the profile's progress card (handoff 0022 P3, reworked in 0025 B5): per tile the members and,
   * among them, the calling identity's seen (wild sightings) and studied ones. The first version shipped the member ids
   * (~40 KB per region) for a client-side join; `identity.progress` carries no membership, so the intersection runs here
   * and the answer is ~200 bytes. The entry is persisted like `dex.set`, dropped with the identity (trpc/client.tsx
   * `watchIdentity`) and refetched on every mount of the card. A tile without members (fish, mostly) is absent, as
   * `set.tiles` drops it.
   */
  setCounts: publicProcedure
    .input(z.object({ regionId: z.string().uuid(), tiles: z.array(tile).min(1) }))
    .query(async ({ ctx, input }) => {
      const region = await ctx.db.region.findUnique({ where: { id: input.regionId }, select: { id: true, status: true } })
      if (!region) return null
      const [rows, studies, sightings] = await Promise.all([
        ctx.db.plausibility.findMany({ where: { regionId: region.id, taxon: { tile: { in: input.tiles } } }, select: { taxonId: true, taxon: { select: { tile: true } } } }),
        ctx.db.study.findMany({ where: { identityId: ctx.identity.id }, select: { taxonId: true } }),
        ctx.db.sighting.findMany({ where: { identityId: ctx.identity.id, wildness: 'wild' }, select: { taxonId: true }, distinct: ['taxonId'] }),
      ])
      const studiedIds = new Set(studies.map((s) => s.taxonId))
      const seenIds = new Set(sightings.map((s) => s.taxonId))
      // A tile with no member gets no key: fish vanishes on its own, the client lists the tiles present (as `set.tiles`).
      const byTile: Partial<Record<Tile, number>> = {}
      const seen: Partial<Record<Tile, number>> = {}
      const studied: Partial<Record<Tile, number>> = {}
      for (const r of rows) {
        const t = r.taxon.tile
        byTile[t] = (byTile[t] ?? 0) + 1
        seen[t] = (seen[t] ?? 0) + (seenIds.has(r.taxonId) ? 1 : 0)
        studied[t] = (studied[t] ?? 0) + (studiedIds.has(r.taxonId) ? 1 : 0)
      }
      return { region, total: rows.length, byTile, seen, studied }
    }),

  /**
   * Regions the ETL knows, for the onboarding picker and the filter drawer, with the honesty line of record 0002 E12:
   * `content` = set members the content job has run for, `introEn` = intros only in English, `noGermanName` = set
   * members without a German name. Shares are of `setSize`; the UI shows "N % nur auf Englisch" when it matters.
   */
  /**
   * The onboarding's region lookup, both paths through GBIF (record 0002 E1): a place name via `geocode/gadm/search`,
   * a point via `geocode/reverse`. Only level-2 units come back; a level-3 hit (Bingen am Rhein) is folded into its
   * level-2 parent (Mainz-Bingen). Each unit carries the Region row's id and status when the ETL already knows it.
   */
  lookupRegion: publicProcedure
    .input(
      z
        .object({ q: z.string().trim().min(2).max(80).optional(), lat: z.number().min(-90).max(90).optional(), lng: z.number().min(-180).max(180).optional() })
        .refine((i) => i.q !== undefined || (i.lat !== undefined && i.lng !== undefined), 'q or lat+lng'),
    )
    .query(async ({ ctx, input }) => {
      const units: Unit[] = []
      const seen = new Set<string>()
      const push = (u: Unit | null) => { if (u && !seen.has(u.gadmGid)) { seen.add(u.gadmGid); units.push(u) } }
      if (input.q !== undefined) {
        const hits = await gadmSearch({ q: input.q })
        for (const h of hits) {
          if (h.gadmLevel === 2) push(toUnit(h))
          else if (h.gadmLevel === 3) {
            const parent = h.higherRegions?.at(-1)
            if (parent && !seen.has(parent.id)) push(await gadmById(parent.id).then((p) => (p ? toUnit(p) : null)))
          }
        }
      } else {
        const hits = (await get<ReverseHit[]>(`${GBIF}/geocode/reverse?${q({ lat: input.lat!, lng: input.lng! })}`)) ?? []
        const nearest = hits.filter((h) => h.type === 'GADM2').sort((a, b) => a.distance - b.distance)[0]
        if (nearest) push(await gadmById(nearest.id).then((p) => (p ? toUnit(p) : null)))
      }
      const known = units.length ? await ctx.db.region.findMany({ where: { gadmGid: { in: units.map((u) => u.gadmGid) } }, select: { id: true, gadmGid: true, status: true } }) : []
      const byGid = new Map(known.map((r) => [r.gadmGid, { id: r.id, status: r.status }]))
      return units.map((u) => ({ ...u, region: byGid.get(u.gadmGid) ?? null }))
    }),

  /**
   * Make a region exist and be prepared: upserts the Region row `queued` and starts the region job and then the
   * content job in this process, not awaited. Idempotent: a ready region returns at once, a running job is joined,
   * a failed region is retried. The grid polls `identity.me` until `ready` (C2).
   */
  requestRegion: publicProcedure.input(z.object({ gadmGid: z.string().regex(/^[A-Z]{3}(\.\d+)+_\d+$/) })).mutation(async ({ ctx, input }) => {
    const { gadmGid } = input
    const pick = { id: true, name: true, status: true, error: true } as const
    const region = await ctx.db.region.findUnique({ where: { gadmGid }, select: pick })
    if (region?.status === 'ready') return region
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Region preparation is available only through the operator CLI.' })
  }),

  regions: publicProcedure.query(async ({ ctx }) => {
    const regions = await ctx.db.region.findMany({ orderBy: { name: 'asc' }, select: { id: true, gadmGid: true, name: true, higher: true, status: true, refreshedAt: true } })
    const month = thisMonth()
    return Promise.all(
      regions.map(async (r) => {
        const inSet = { plausibility: { some: { regionId: r.id } } }
        // `nowCount` (handoff 0018 R3): the set members at ≥ 25 % of their peak this month, the "nur jetzt" chip's number.
        const [setSize, nowCount, content, introEn, noGermanName] = await Promise.all([
          ctx.db.taxon.count({ where: inSet }),
          ctx.db.plausibility.findMany({ where: { regionId: r.id }, select: { monthShare: true, peak: true } }).then((rows) => rows.filter((p) => isNow(p.monthShare, p.peak, month)).length),
          ctx.db.taxon.count({ where: { ...inSet, contentAt: { not: null } } }),
          ctx.db.taxon.count({ where: { ...inSet, intro: { path: ['lang'], equals: 'en' } } }),
          ctx.db.taxon.count({ where: { ...inSet, contentAt: { not: null }, NOT: { commonNames: { path: ['de'], string_contains: '' } } } }),
        ])
        return { ...r, setSize, nowCount, content, introEn, noGermanName, introEnShare: setSize ? +(introEn / setSize).toFixed(3) : 0 }
      }),
    )
  }),
})
