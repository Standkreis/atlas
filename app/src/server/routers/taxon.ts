import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import type { InteractionKind } from '@/generated/prisma/enums'
import { get, q, UA, gbifSpecies } from '../http'
import { isNow, nowRatio, perMille, tileOf } from '@/domain/rules'
import { parseProseForRegion } from '../prose'
import { takeSearchToken } from '../searchCap'
import { publicProcedure, router } from '../trpc'
import { leadAsset, leadAssetSelection, referenceAssetOrder, referenceImageWhere, referenceVisibilitySelection } from '../leadAssetSelection'
import { referenceGallery, type ReferenceRow } from '@/domain/referenceImages'
import { taxonNames } from '@/domain/taxonNames'
import { resolveRegionIds } from '../regionCompatibility'

const thisMonth = () => new Date().getMonth() + 1
// A card on the species page (look-alike, ecology chip) carries its first image, greyscaled by dex state (handoff 0007 Track B),
// with its attribution for the section's ⓘ sheet (handoff 0014 D3: attribution per image view, spec §⚖️).
const taxonCard = { id: true, gbifKey: true, sciName: true, commonNames: true, tile: true, contentAt: true, assets: leadAssetSelection } as const
const ensureSelect = taxonCard
const BACKBONE = 'd7dddbf4-2cf0-4f39-9b2a-bb099caae36c'
type SearchHit = { key: number; nubKey?: number; canonicalName?: string; rank?: string; vernacularNames?: { vernacularName: string; language?: string }[] }
/** One GBIF `species/search` call, uncached: a typed query is new every time. Empty on any failure. */
const gbifSearch = async (params: Record<string, string | number>) => {
  try {
    const r = await fetch(`https://api.gbif.org/v1/species/search?${q({ ...params })}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(6000) })
    return r.ok ? ((await r.json()) as { results: SearchHit[] }).results : []
  } catch {
    return []
  }
}
/**
 * The vernacular names GBIF holds for one key (handoff 0025 A8, findings 0008 A5): the German and English name most
 * checklists agree on, one cached `species/{key}/vernacularNames` call. `ensure` writes them on the fresh row so the
 * fill sheet shows the German name at once; the content kick replaces them with Wikidata's labels when it lands.
 */
async function gbifVernacular(gbifKey: number): Promise<Record<string, string>> {
  const r = await get<{ results: { vernacularName: string; language?: string }[] }>(`https://api.gbif.org/v1/species/${gbifKey}/vernacularNames?limit=200`).catch(() => null)
  const counts: Record<'de' | 'en', Map<string, number>> = { de: new Map(), en: new Map() }
  for (const v of r?.results ?? []) {
    const lang = v.language === 'deu' ? 'de' : v.language === 'eng' ? 'en' : null
    if (lang && v.vernacularName) counts[lang].set(v.vernacularName, (counts[lang].get(v.vernacularName) ?? 0) + 1)
  }
  const names: Record<string, string> = {}
  for (const lang of ['de', 'en'] as const) {
    const top = [...counts[lang].entries()].sort((a, b) => b[1] - a[1])[0]
    if (top) names[lang] = top[0]
  }
  return names
}
type Card = { id: string; gbifKey: number; sciName: string; commonNames: unknown; tile: string; assets: ReferenceRow[] }
const card = (t: Card) => {
  const lead = leadAsset(t.assets)
  return { id: t.id, gbifKey: t.gbifKey, sciName: t.sciName, names: taxonNames(t.commonNames), tile: t.tile, lead: lead?.url ?? null,
    leadInfo: lead ? { author: lead.author, licence: lead.licence, licenceUrl: lead.licenceUrl, sourceUrl: lead.sourceUrl, origin: lead.origin } : null }
}

type Occurrences = { results: { decimalLatitude?: number; decimalLongitude?: number }[] }
/** A stand-in centroid for a GADM unit (no geometry column, record 0002 E1): the midpoint of the bbox of 300 GBIF records inside it. Cached on disk by the fetch layer. */
async function regionCentre(gadmGid: string): Promise<{ lat: number; lng: number } | null> {
  const j = await get<Occurrences>(`https://api.gbif.org/v1/occurrence/search?${q({ gadmGid, hasCoordinate: true, limit: 300 })}`)
  const pts = (j?.results ?? []).filter((r): r is { decimalLatitude: number; decimalLongitude: number } => typeof r.decimalLatitude === 'number' && typeof r.decimalLongitude === 'number')
  if (pts.length < 10) return null
  const lats = pts.map((p) => p.decimalLatitude), lngs = pts.map((p) => p.decimalLongitude)
  return { lat: (Math.min(...lats) + Math.max(...lats)) / 2, lng: (Math.min(...lngs) + Math.max(...lngs)) / 2 }
}

export type SearchRow = { gbifKey: number; sciName: string; names: Record<string, string>; tile: string }
/**
 * The backbone for the log's typed search (handoff 0008 Track A), also the scan's join for names outside the set (handoff 0016 A3).
 * Three GBIF calls: vernacular names over every checklist dataset folded to the backbone key (`nubKey`), because the backbone's own
 * vernaculars are thin ("Eichenprozessionsspinner" is not among them); the same query over every field, because `qField=VERNACULAR`
 * is whole-word and misses the hyphenated "Eichen-Prozessionsspinner" that the plain search matches; plus scientific names in the
 * backbone itself (rank SPECIES, status ACCEPTED). Each key is then read through the cached `species/{key}` for its ranks; keys that
 * fit no tile drop. Ten rows, the keys most checklists agree on first.
 */
export async function backboneSearch(query: string): Promise<SearchRow[]> {
  const [vern, any, sci] = await Promise.all([
    gbifSearch({ q: query, qField: 'VERNACULAR', limit: 40 }),
    gbifSearch({ q: query, limit: 40 }),
    gbifSearch({ q: query, qField: 'SCIENTIFIC', datasetKey: BACKBONE, rank: 'SPECIES', status: 'ACCEPTED', limit: 10 }),
  ])
  // Fold the vernacular and any-field hits by backbone key; the more checklists agree, the higher the row.
  const folded = new Map<number, { hits: number; names: Record<string, Set<string>> }>()
  for (const h of [...vern, ...any]) {
    const key = h.nubKey ?? (h.key && sci.some((s) => s.key === h.key) ? h.key : undefined)
    if (!key) continue
    const f = folded.get(key) ?? { hits: 0, names: { de: new Set(), en: new Set() } }
    f.hits++
    for (const v of h.vernacularNames ?? []) { const lang = v.language === 'deu' ? 'de' : v.language === 'eng' ? 'en' : null; if (lang) f.names[lang].add(v.vernacularName) }
    folded.set(key, f)
  }
  const order = [...[...folded.entries()].sort((a, b) => b[1].hits - a[1].hits).map(([k]) => k), ...sci.map((s) => s.key)]
  const keys = [...new Set(order)].slice(0, 14)
  const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const pick = (set: Set<string> | undefined) => { const all = [...(set ?? [])]; return all.find((n) => fold(n).includes(fold(query))) ?? all[0] ?? null }
  const rows = await Promise.all(
    keys.map(async (key) => {
      const s = await gbifSpecies(key)
      if (!s || (s.rank && s.rank !== 'SPECIES')) return null
      const tile = tileOf(s)
      if (!tile) return null
      const f = folded.get(key)
      const names: Record<string, string> = {}
      const de = pick(f?.names.de), en = pick(f?.names.en)
      if (de) names.de = de
      if (en) names.en = en
      for (const v of sci.find((x) => x.key === key)?.vernacularNames ?? []) { if (v.language === 'deu' && !names.de) names.de = v.vernacularName; if (v.language === 'eng' && !names.en) names.en = v.vernacularName }
      return { gbifKey: key, sciName: s.canonicalName ?? s.scientificName ?? String(key), names, tile }
    }),
  )
  return rows.filter((r): r is NonNullable<typeof r> => !!r).slice(0, 10)
}

// The species page (spec §🎨 3). Pure read; the dex state row (studiert · entdeckt) is the client's join (M5/M6).
export const taxonRouter = router({
  /**
   * Everything the page renders: names, intro, facts, assets with attribution, the region's plausibility (bars and
   * words), look-alikes within that region's set, interactions grouped by kind with each target's set membership.
   * Out-of-set species (E13) have `plausibility: null`: no bars, "hier selten gemeldet".
   */
  page: publicProcedure
    .input(z.object({ gbifKey: z.number().int(), regionId: z.string().uuid().optional(), month: z.number().int().min(1).max(12).optional() }))
    .query(async ({ ctx, input }) => {
      const month = input.month ?? thisMonth()
      const resolution = input.regionId ? await resolveRegionIds(ctx.db, [input.regionId]) : null
      const t = await ctx.db.taxon.findUnique({
        where: { gbifKey: input.gbifKey },
        include: { assets: { where: { OR: [referenceImageWhere, { kind: 'sound', ownerId: null, sightingId: null, avatarOf: null }] }, orderBy: [...referenceAssetOrder], include: { avatarOf: { select: { id: true } }, referenceVisibility: referenceVisibilitySelection } }, interactionsFrom: { include: { target: { select: taxonCard } } } },
      })
      if (!t) return null
      const regionId = resolution?.resolutions[0]?.regionId ?? undefined
      const [p, lookalikes, inSet] = regionId
        ? await Promise.all([
            ctx.db.plausibility.findUnique({ where: { taxonId_regionId: { taxonId: t.id, regionId } } }),
            ctx.db.lookalike.findMany({ where: { taxonId: t.id, regionId }, include: { sibling: { select: taxonCard } } }),
            ctx.db.plausibility.findMany({ where: { regionId, taxonId: { in: t.interactionsFrom.map((i) => i.targetId) } }, select: { taxonId: true } }).then((rows) => new Set(rows.map((r) => r.taxonId))),
          ])
        : [null, [], new Set<string>()]
      const grouped: Partial<Record<InteractionKind, (ReturnType<typeof card> & { inSet: boolean; evidence: { realRecords: number; studyCount: number; origin: string } })[]>> = {}
      for (const i of t.interactionsFrom.filter((edge) => edge.prose && edge.real > 0)) (grouped[i.kind] ??= []).push({ ...card(i.target), inSet: inSet.has(i.targetId), evidence: { realRecords: i.real, studyCount: Object.keys((i.studies ?? {}) as object).length, origin: i.origin } })
      return {
        catalogueVersion: resolution?.catalogueVersion ?? null,
        registryVersion: resolution?.registryVersion ?? null,
        id: t.id,
        gbifKey: t.gbifKey,
        wikidataId: t.wikidataId,
        sciName: t.sciName,
        names: taxonNames(t.commonNames),
        rank: t.rank,
        tile: t.tile,
        class: t.class,
        order: t.order,
        genus: t.genus,
        iucn: t.iucn,
        tags: t.tags,
        intro: t.intro as { text: string; lang: string; source: string; licence: string } | null,
        facts: t.facts as Record<string, { value: string; source: string }> | null,
        // `parseProseForRegion` guards the shape: a persisted query may hold an old row without it (0025 lesson).
        prose: parseProseForRegion(t.prose, regionId),
        contentAt: t.contentAt,
        assets: [...referenceGallery(t.assets), ...t.assets.filter((a) => a.kind === 'sound')].map((a) => ({ id: a.id, kind: a.kind, position: a.position, url: a.url, author: a.author, licence: a.licence, licenceUrl: a.licenceUrl, sourceUrl: a.sourceUrl, origin: a.origin, caption: a.caption, meta: a.meta as { xcId: number; type: string; length: number; quality: string } | null })),
        plausibility: p
          ? { obs: p.obs, monthShare: p.monthShare.map(perMille), peak: perMille(p.peak), words: p.words, month, nowRatio: +nowRatio(p.monthShare, p.peak, month).toFixed(3), now: isNow(p.monthShare, p.peak, month) }
          : null,
        lookalikes: lookalikes.map((l) => card(l.sibling)),
        interactions: grouped,
      }
    }),

  /**
   * Where the species map centres (handoff 0007 Track B): the region has no geometry column (record 0002 E1), so the
   * midpoint of the bounding box of 300 GBIF records inside the GADM unit stands in. One cached GBIF call per region.
   */
  mapCentre: publicProcedure.input(z.object({ regionId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const resolution = await resolveRegionIds(ctx.db, [input.regionId])
    const regionId = resolution.resolutions[0]?.regionId
    if (!regionId) return null
    const region = await ctx.db.region.findUnique({ where: { id: regionId }, select: { gadmGid: true, name: true } })
    if (!region) return null
    const centre = region.gadmGid ? await regionCentre(region.gadmGid) : null
    return centre && {
      catalogueVersion: resolution.catalogueVersion,
      registryVersion: resolution.registryVersion,
      name: region.name,
      ...centre,
    }
  }),

  /**
   * A backbone species outside every set (record 0002 E13), used by the log flow: creates the Taxon row from GBIF
   * species/{key} when missing, then starts the content job for that one key in-process, not awaited (the same rule as
   * M5's region job; M8 brings a queue). A row without content (a GloBI target, an earlier failure) gets the kick too.
   */
  ensure: publicProcedure.input(z.object({ gbifKey: z.number().int() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.taxon.findUnique({ where: { gbifKey: input.gbifKey }, select: ensureSelect })
    if (existing) {
      let commonNames = existing.commonNames
      if (!existing.contentAt) {
        // A row without content and without a name (a GloBI target, a kick that died): GBIF's names now, the kick's later (0025 A8).
        if (!Object.keys((commonNames ?? {}) as object).length) {
          const names = await gbifVernacular(input.gbifKey)
          if (Object.keys(names).length) commonNames = (await ctx.db.taxon.update({ where: { id: existing.id }, data: { commonNames: names }, select: { commonNames: true } })).commonNames
        }
      }
      return { id: existing.id, gbifKey: existing.gbifKey, sciName: existing.sciName, tile: existing.tile, contentAt: existing.contentAt, commonNames: taxonNames(commonNames), lead: leadAsset(existing.assets)?.url ?? null, leadInfo: card(existing).leadInfo, created: false }
    }
    const [s, names] = await Promise.all([gbifSpecies(input.gbifKey), gbifVernacular(input.gbifKey)])
    if (!s) throw new Error(`GBIF has no taxon ${input.gbifKey}`)
    const tile = tileOf(s)
    if (!tile) throw new Error(`taxon ${input.gbifKey} (${s.canonicalName}) fits no tile`)
    const data = { gbifKey: s.key, sciName: s.canonicalName ?? s.scientificName ?? String(s.key), rank: (s.rank ?? 'SPECIES').toLowerCase(), tile, class: s.class ?? null, order: s.order ?? null, genus: s.genus ?? null, commonNames: names }
    // Two taps at once (0025 A9): the second create hits the unique key; it reads the row the first one made instead of failing.
    let raced = false
    const created = await ctx.db.taxon.create({ data, select: ensureSelect }).catch(async (e: unknown) => {
      if (!(e instanceof Error && 'code' in e && e.code === 'P2002')) throw e
      raced = true
      return ctx.db.taxon.findUniqueOrThrow({ where: { gbifKey: s.key }, select: ensureSelect })
    })
    return { id: created.id, gbifKey: created.gbifKey, sciName: created.sciName, tile: created.tile, contentAt: created.contentAt, commonNames: taxonNames(created.commonNames), lead: leadAsset(created.assets)?.url ?? null, leadInfo: card(created).leadInfo, created: !raced }
  }),

  /** The typed search, capped per identity (handoff 0009 Track B); the work is `backboneSearch`. `locale` is accepted for the client's cache key. */
  search: publicProcedure.input(z.object({ q: z.string().trim().min(2).max(80), locale: z.enum(['de', 'en']) })).query(async ({ ctx, input }) => {
    if (!takeSearchToken(ctx.identity.id)) throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'search cap' })
    return backboneSearch(input.q)
  }),
})
