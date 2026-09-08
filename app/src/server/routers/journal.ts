import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { Wildness } from '@/generated/prisma/enums'
import { publicProcedure, router, type Context } from '../trpc'
import { queuePhotoDeletes, retryPendingPhotoDeletes } from '@/server/photos'
import { lock } from '../quotas'

// The Tagebuch and the single sighting (spec §🎨 8, handoff 0008 Track B). The sighting is the atom; the diary is the
// sequence: sightings and studies of one identity, newest first, grouped by the reader's local day.

const DAYS_PER_PAGE = 30
const ROW_CAP = 600 // bounded page; dense days continue through an exact row cursor

const taxonCard = { id: true, gbifKey: true, sciName: true, commonNames: true, tile: true, assets: { where: { kind: 'image' }, orderBy: { createdAt: 'asc' }, take: 1, select: { url: true } } } as const
type CardRow = { id: string; gbifKey: number; sciName: string; commonNames: unknown; tile: string; assets: { url: string }[] }
const card = (t: CardRow) => ({ id: t.id, gbifKey: t.gbifKey, sciName: t.sciName, names: t.commonNames as Record<string, string>, tile: t.tile, lead: t.assets[0]?.url ?? null })

const photoSelect = { id: true, url: true, author: true, licence: true, licenceUrl: true, sourceUrl: true, origin: true } as const
const wildness = z.enum(Object.values(Wildness) as [Wildness, ...Wildness[]])

/** Local day key (YYYY-MM-DD) of an instant in an IANA zone; an unknown zone falls back to UTC. */
function dayKey(at: Date, tz: string) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at)
  } catch {
    return at.toISOString().slice(0, 10)
  }
}

/**
 * The one rule for "first", shared with Track A's `sighting.create` (handoff 0008 §🛠️): the earliest WILD sighting per
 * taxon, ties by createdAt. Captive and cultivated rows never count. Returns the ids of those first rows.
 */
export async function firstWildIds(db: Context['db'], identityId: string, taxonIds?: string[]) {
  const rows = await db.sighting.findMany({
    where: { identityId, wildness: 'wild', ...(taxonIds ? { taxonId: { in: taxonIds } } : {}) },
    orderBy: [{ at: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true, taxonId: true },
  })
  const first = new Map<string, string>()
  for (const r of rows) if (!first.has(r.taxonId)) first.set(r.taxonId, r.id)
  return new Set(first.values())
}

export const journalRouter = router({
  /**
   * Day cards, newest first (findings 0002 §8 T1): `cursor` (tRPC's name for the handoff's `before`) pages by day, 30 days per page, `kind` filters to
   * sightings ("Entdeckt") or studies ("Studiert"). A day with only studies still gets its card. Rows carry the
   * taxon card, the Gemeinde (`place`), the own photo, note, wildness and `first`.
   */
  days: publicProcedure
    .input(z.object({ cursor: z.union([z.date(), z.object({ at: z.date(), id: z.string().uuid(), kind: z.enum(['sighting', 'study']) })]).nullish(), kind: z.enum(['all', 'seen', 'studied']).default('all'), tz: z.string().max(64).default('UTC') }))
    .query(async ({ ctx, input }) => {
      const id = ctx.identity.id
      const after = (kind: 'sighting' | 'study') => {
        const cursor = input.cursor
        if (!cursor) return {}
        if (cursor instanceof Date) return { at: { lt: cursor } }
        return { OR: [{ at: { lt: cursor.at } }, { at: cursor.at, id: kind < cursor.kind ? { lte: cursor.id } : { lt: cursor.id } }] }
      }
      const [sightings, studies] = await Promise.all([
        input.kind === 'studied'
          ? []
          : ctx.db.sighting.findMany({
              where: { identityId: id, ...after('sighting') },
              orderBy: [{ at: 'desc' }, { id: 'desc' }],
              take: ROW_CAP + 1,
              include: { taxon: { select: taxonCard }, photos: { where: { kind: 'image' }, orderBy: { createdAt: 'asc' }, take: 1, select: { url: true } } },
            }),
        input.kind === 'seen' ? [] : ctx.db.study.findMany({ where: { identityId: id, ...after('study') }, orderBy: [{ at: 'desc' }, { id: 'desc' }], take: ROW_CAP + 1, include: { taxon: { select: taxonCard } } }),
      ])
      const firsts = sightings.length ? await firstWildIds(ctx.db, id, [...new Set(sightings.map((s) => s.taxonId))]) : new Set<string>()

      type Row = {
        id: string; kind: 'sighting' | 'study'; at: Date; createdAt: Date; taxon: ReturnType<typeof card>
        place: string | null; photo: string | null; note: string | null; wildness: Wildness | null; first: boolean
      }
      const rows: Row[] = [
        ...sightings.map((s) => ({ id: s.id, kind: 'sighting' as const, at: s.at, createdAt: s.createdAt, taxon: card(s.taxon), place: s.place, photo: s.photos[0]?.url ?? null, note: s.note, wildness: s.wildness, first: firsts.has(s.id) })),
        ...studies.map((s) => ({ id: s.id, kind: 'study' as const, at: s.at, createdAt: s.at, taxon: card(s.taxon), place: null, photo: null, note: null, wildness: null, first: false })),
      ].sort((a, b) => b.at.getTime() - a.at.getTime() || (a.id < b.id ? 1 : a.id > b.id ? -1 : a.kind < b.kind ? 1 : a.kind > b.kind ? -1 : 0))

      // Merge source streams before cutting; this avoids skipping either stream when one dense day fills a page.
      const byDay = new Map<string, Row[]>()
      let shown = 0
      for (const r of rows) {
        const key = dayKey(r.at, input.tz)
        if (shown >= ROW_CAP || (!byDay.has(key) && byDay.size >= DAYS_PER_PAGE)) break
        if (!byDay.has(key)) byDay.set(key, [])
        byDay.get(key)!.push(r)
        shown++
      }
      const keys = [...byDay.keys()]
      const more = rows.length > shown
      const days = keys.map((key) => {
        const list = byDay.get(key)!
        const places = [...new Set(list.map((r) => r.place).filter((p): p is string => !!p))]
        return { day: key, places, rows: list.map((r) => ({ id: r.id, kind: r.kind, at: r.at, taxon: r.taxon, place: r.place, photo: r.photo, note: r.note, wildness: r.wildness, first: r.first })) }
      })
      // Next page starts before the earliest row shown (its exact instant): the next call's rows are all older days.
      const last = days.at(-1)?.rows.at(-1)
      return { days, nextBefore: more && last ? { at: last.at, id: last.id, kind: last.kind } : null }
    }),

  /** One sighting with its photo, taxon card and the exact point (spec §⚖️: exact only here). */
  get: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const s = await ctx.db.sighting.findFirst({
      where: { id: input.id, identityId: ctx.identity.id },
      include: { taxon: { select: { ...taxonCard, assets: { where: { kind: 'image' }, orderBy: { createdAt: 'asc' }, take: 1, select: photoSelect } } }, photos: { where: { kind: 'image' }, orderBy: { createdAt: 'asc' }, take: 1, select: photoSelect } },
    })
    if (!s) return null
    const firsts = await firstWildIds(ctx.db, ctx.identity.id, [s.taxonId])
    return {
      id: s.id, at: s.at, lat: s.lat, lng: s.lng, place: s.place, note: s.note, evidence: s.evidence, wildness: s.wildness,
      taxon: card(s.taxon),
      photo: s.photos[0] ?? null,
      reference: s.taxon.assets[0] ?? null,
      first: firsts.has(s.id),
    }
  }),

  /** Edit note, when and wildness; nothing else is editable (the species and the point are the sighting). */
  update: publicProcedure
    .input(z.object({ id: z.string().uuid(), note: z.string().trim().max(500).nullable().optional(), at: z.date().optional(), wildness: wildness.optional() }))
    .mutation(async ({ ctx, input }) => {
      const { count } = await ctx.db.sighting.updateMany({
        where: { id: input.id, identityId: ctx.identity.id },
        data: { ...(input.note !== undefined ? { note: input.note || null } : {}), ...(input.at ? { at: input.at } : {}), ...(input.wildness ? { wildness: input.wildness } : {}) },
      })
      if (!count) throw new TRPCError({ code: 'NOT_FOUND' })
      return ctx.db.sighting.findUniqueOrThrow({ where: { id: input.id }, select: { id: true, at: true, note: true, wildness: true } })
    }),

  /** Delete one sighting; its photo rows cascade, the files go first (Track A's helper). Deleting the only wild sighting of a taxon turns the cell grey (identity.progress follows). */
  remove: publicProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const count = await ctx.db.$transaction(async (tx) => {
      await lock(tx, `identity:${ctx.identity.id}`)
      const own = await tx.sighting.findFirst({ where: { id: input.id, identityId: ctx.identity.id }, select: { id: true, photos: { where: { origin: 'user' }, select: { id: true } } } })
      if (!own) throw new TRPCError({ code: 'NOT_FOUND' })
      await queuePhotoDeletes(tx, own.photos.map((a) => a.id))
      return (await tx.sighting.deleteMany({ where: { id: own.id, identityId: ctx.identity.id } })).count
    })
    await retryPendingPhotoDeletes()
    return { removed: count }
  }),
})
