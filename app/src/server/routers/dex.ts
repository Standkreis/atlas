import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { Tile } from '@/generated/prisma/enums'
import { isNow, nowRatio, perMille } from '@/domain/rules'
import { publicProcedure, router } from '../trpc'
import { legacyRegions } from '../regionCompatibility'
import { locateRegion, regionSearchInput, searchRegions } from '../regionSearch'

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

  /** Compatibility alias. `gadmGid` now holds the canonical public key; use regions.search/locate for new clients. */
  lookupRegion: publicProcedure
    .input(
      z
        .object({ q: z.string().trim().min(2).max(80).optional(), lat: z.number().min(-90).max(90).optional(), lng: z.number().min(-180).max(180).optional() })
        .refine((i) => i.q !== undefined || (i.lat !== undefined && i.lng !== undefined), 'q or lat+lng'),
    )
    .query(async ({ ctx, input }) => {
      const located = input.q === undefined ? await locateRegion(ctx.db, { permission: 'granted', lat: input.lat!, lng: input.lng! }) : null
      const regions = input.q !== undefined ? (await searchRegions(ctx.db, regionSearchInput.parse({ q: input.q }))).results : located?.region ? [located.region] : []
      return regions.map((region) => ({ gadmGid: region.canonicalKey, name: region.name, higher: region.higher, parent: region.stateName, type: 'Kreisregion', typeEn: 'District region', region: { id: region.id, status: region.status } }))
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

  regions: publicProcedure.query(({ ctx }) => legacyRegions(ctx.db, ctx.identity.id, thisMonth())),
})
