// The `facts` step (handoff 0021 D3, D4): for every taxon in a region's set (or the given keys) without `factsAt`, the
// Steckbrief keys the grill found open: the bulk files for birds, mammals and amphibians (GBIF synonyms for the misses),
// GIFT for plants, the Wikidata mycomorphbox for fungi and P2050 with its unit for birds, plus the GBIF vernacular name
// where `names.en` is empty (never overwriting one). AnAge keys and the intro stay untouched; `--purge` clears only the
// new keys. Runs alone (`npm run etl -- facts --region …`) and at the end of the content job for the taxa it filled.
import { Prisma } from '../src/generated/prisma/client'
import { db } from './db'
import { get, pool, requests } from './fetch'
import { giftFacts } from './gift'
import type { Fact } from './sources'
import { bulkFacts, missesDataset } from './traits'

export const FACT_KEYS = ['mass', 'wingspan', 'length', 'migration', 'habitat', 'diet', 'activity', 'flowering', 'height', 'pollination', 'lifeform', 'edibility', 'sporePrint'] as const
export type FactsOpts = { region?: string; keys?: number[]; limit?: number; purge?: boolean; force?: boolean; log?: (s: string) => void }
export type FactsResult = { taxa: number; written: number; changed: number; failed: number; namesFilled: number; perKey: Record<string, Record<string, number>>; seconds: number; requests: ReturnType<typeof requests> }

type Taxon = { id: string; gbifKey: number; sciName: string; tile: string; wikidataId: string | null; commonNames: unknown; facts: unknown; factsAt: Date | null }
const select = { id: true, gbifKey: true, sciName: true, tile: true, wikidataId: true, commonNames: true, facts: true, factsAt: true } as const

async function selectTaxa({ region, keys, limit, force }: FactsOpts): Promise<Taxon[]> {
  if (keys) return db.taxon.findMany({ where: { gbifKey: { in: keys } }, select, orderBy: { gbifKey: 'asc' } })
  const regionRow = region ? await db.region.findFirst({ where: { OR: [{ name: region }, { gadmGid: region }] }, select: { id: true } }) : null
  if (region && !regionRow) throw new Error(`no region "${region}"`)
  return db.taxon.findMany({
    where: { ...(force ? {} : { factsAt: null }), plausibility: { some: regionRow ? { regionId: regionRow.id } : {} } },
    select,
    orderBy: { gbifKey: 'asc' },
    take: limit,
  })
}

// ── Wikidata: the mycomorphbox (P789 edibility, P787 spore print) and the wingspan with its unit (P2050) ───────────
const WD_UNIT: Record<string, number> = { Q11573: 100, Q174728: 1, Q174789: 0.1 } // metre, centimetre, millimetre → cm
const EDIBILITY: [RegExp, string][] = [[/deadly/, 'deadly'], [/poison/, 'poisonous'], [/psychoactive|hallucinogen/, 'psychoactive'], [/inedible/, 'inedible'], [/choice/, 'choice'], [/edible/, 'edible'], [/medicinal/, 'medicinal'], [/unknown/, 'unknown']]
const SPORE = ['white', 'cream', 'yellow', 'ochre', 'olive', 'brown', 'pink', 'purple', 'black', 'green', 'red', 'grey', 'orange', 'buff', 'salmon', 'lilac']
type WdFacts = { edibility?: string[]; sporePrint?: string[]; wingspanCm?: number[] }
type Binding = Record<string, { value: string } | undefined>

async function wikidataFacts(qids: string[]): Promise<Map<string, WdFacts>> {
  const out = new Map<string, WdFacts>()
  for (let i = 0; i < qids.length; i += 100) {
    const vals = qids.slice(i, i + 100).map((q) => `wd:${q}`).join(' ')
    const query = `SELECT ?item ?p ?vLabel ?amount ?unit WHERE { VALUES ?item { ${vals} } { ?item ?p ?v . VALUES ?p { wdt:P789 wdt:P787 } } UNION { ?item p:P2050/psv:P2050 ?n . ?n wikibase:quantityAmount ?amount ; wikibase:quantityUnit ?unit } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`
    const j = await get<{ results: { bindings: Binding[] } }>(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`)
    for (const b of j?.results.bindings ?? []) {
      const qid = b.item!.value.split('/').pop()!
      const rec = out.get(qid) ?? {}
      const label = b.vLabel?.value.toLowerCase() ?? ''
      if (b.p?.value.endsWith('P789')) { const code = EDIBILITY.find(([re]) => re.test(label))?.[1]; if (code) (rec.edibility ??= []).push(code) }
      else if (b.p?.value.endsWith('P787')) { const code = SPORE.find((c) => label.includes(c)); if (code) (rec.sporePrint ??= []).push(code) }
      else if (b.amount && b.unit) { const f = WD_UNIT[b.unit.value.split('/').pop()!]; const cm = Number(b.amount.value) * (f ?? NaN); if (Number.isFinite(cm) && cm > 0) (rec.wingspanCm ??= []).push(cm) }
      out.set(qid, rec)
    }
  }
  return out
}
const cm = (x: number) => (x >= 100 ? `${Math.round(x / 10) / 10} m` : `${Math.round(x)} cm`)
/** "36 cm" · "80–95 cm" · "2.2 m": the range when Wikidata holds more than one statement. */
export const wingspanWords = (values: number[]) => { const lo = Math.min(...values), hi = Math.max(...values); if (lo === hi) return cm(lo); const a = cm(lo), b = cm(hi); return a.split(' ')[1] === b.split(' ')[1] ? `${a.split(' ')[0]}–${b}` : `${a}–${b}` }
const uniq = <T,>(xs: T[]) => [...new Set(xs)]
/** JSON with sorted keys: Postgres returns jsonb in its own key order, so a plain stringify would call every row changed. */
const canon = (x: unknown): string => (x && typeof x === 'object' && !Array.isArray(x) ? `{${Object.keys(x).sort().map((k) => `${JSON.stringify(k)}:${canon((x as Record<string, unknown>)[k])}`).join(',')}}` : JSON.stringify(x))

// ── GBIF: synonyms for the bulk misses, the English vernacular ─────────────────────────────────────────────────────
async function synonyms(gbifKey: number): Promise<string[]> {
  const r = await get<{ results: { canonicalName?: string; scientificName?: string }[] }>(`https://api.gbif.org/v1/species/${gbifKey}/synonyms?limit=50`)
  return (r?.results ?? []).map((s) => s.canonicalName ?? s.scientificName ?? '').filter(Boolean)
}
/** The English name most GBIF checklists agree on, first letter upper-cased; null when none. */
export async function vernacularEn(gbifKey: number): Promise<string | null> {
  const r = await get<{ results: { vernacularName: string; language?: string }[] }>(`https://api.gbif.org/v1/species/${gbifKey}/vernacularNames?limit=200`)
  const count = new Map<string, { n: number; name: string }>()
  for (const v of r?.results ?? []) {
    if (v.language !== 'eng' || !v.vernacularName?.trim()) continue
    const name = v.vernacularName.trim().replace(/\s+/g, ' ')
    const k = name.toLowerCase()
    const c = count.get(k) ?? { n: 0, name }
    c.n++
    count.set(k, c)
  }
  const best = [...count.values()].sort((a, b) => b.n - a.n)[0]
  return best ? best.name[0]!.toUpperCase() + best.name.slice(1) : null
}

export async function runFacts(opts: FactsOpts): Promise<FactsResult> {
  const log = opts.log ?? console.log
  const t0 = Date.now()
  const taxa = await selectTaxa(opts)
  const r: FactsResult = { taxa: taxa.length, written: 0, changed: 0, failed: 0, namesFilled: 0, perKey: {}, seconds: 0, requests: requests() }
  if (opts.purge) {
    for (const t of taxa) {
      const facts = { ...((t.facts as Record<string, Fact> | null) ?? {}) }
      for (const k of FACT_KEYS) delete facts[k]
      await db.taxon.update({ where: { id: t.id }, data: { facts: Object.keys(facts).length ? facts : Prisma.DbNull, factsAt: null } })
      r.written++
    }
    log(`facts: purged the ${FACT_KEYS.length} keys on ${r.written} taxa`)
    r.seconds = (Date.now() - t0) / 1000
    return r
  }
  log(`facts: ${taxa.length} taxa`)
  if (!taxa.length) return r
  const wd = await wikidataFacts(uniq(taxa.filter((t) => (t.tile === 'fungus' || t.tile === 'bird') && t.wikidataId).map((t) => t.wikidataId!)))
  log(`  wikidata: ${wd.size} items with a mycomorphbox or wingspan`)

  let n = 0
  await pool(taxa, 4, async (t) => {
    try {
      const names = [t.sciName]
      if (missesDataset(t.tile, t.sciName)) names.push(...(await synonyms(t.gbifKey)))
      const fresh: Record<string, Fact> = bulkFacts(t.tile, names)
      if (t.tile === 'plant') Object.assign(fresh, await giftFacts(t.sciName))
      const w = t.wikidataId ? wd.get(t.wikidataId) : undefined
      const wdUrl = `https://www.wikidata.org/wiki/${t.wikidataId}`
      if (w?.edibility?.length) fresh.edibility = { value: uniq(w.edibility).join(', '), source: 'Wikidata', url: wdUrl, licence: 'CC0 1.0' }
      if (w?.sporePrint?.length) fresh.sporePrint = { value: uniq(w.sporePrint).join(', '), source: 'Wikidata', url: wdUrl, licence: 'CC0 1.0' }
      if (w?.wingspanCm?.length) fresh.wingspan = { value: wingspanWords(w.wingspanCm), source: 'Wikidata', url: wdUrl, licence: 'CC0 1.0' }

      const old = (t.facts as Record<string, Fact> | null) ?? {}
      const facts: Record<string, Fact> = { ...old }
      for (const k of FACT_KEYS) delete facts[k]
      Object.assign(facts, fresh)
      const names0 = (t.commonNames as Record<string, string>) ?? {}
      const commonNames = { ...names0 }
      if (!commonNames.en) { const en = await vernacularEn(t.gbifKey); if (en) { commonNames.en = en; r.namesFilled++ } }

      const changed = canon(facts) !== canon(old) || canon(commonNames) !== canon(names0)
      if (changed || !t.factsAt) {
        await db.taxon.update({ where: { id: t.id }, data: { facts: Object.keys(facts).length ? facts : Prisma.DbNull, commonNames, factsAt: new Date() } })
        r.written++
      }
      if (changed) r.changed++
      const bucket = (r.perKey[t.tile] ??= {})
      for (const k of Object.keys(fresh)) bucket[k] = (bucket[k] ?? 0) + 1
      if (Object.keys(fresh).length) bucket.any = (bucket.any ?? 0) + 1
    } catch (e) {
      r.failed++
      log(`  ✗ ${t.sciName} (${t.gbifKey}): ${e instanceof Error ? e.message : e}`)
    }
    if (++n % 100 === 0 || n === taxa.length) log(`  ${n}/${taxa.length} · ${((Date.now() - t0) / 60_000).toFixed(1)} min · ${JSON.stringify(requests().perHost)}`)
  })
  r.seconds = (Date.now() - t0) / 1000
  r.requests = requests()
  return r
}

/**
 * The `recode` step (handoff 0024): the AnAge cells written as English before 0024 ("21.8 years (wild)") become the codes
 * `parseAnAge` writes now, in place, for every taxon that carries one. Idempotent, no network, seconds against Neon.
 */
export async function runRecode(log: (s: string) => void = console.log): Promise<{ taxa: number; changed: number }> {
  const { recodeAnAge } = await import('./prune')
  const taxa = await db.taxon.findMany({ where: { facts: { not: Prisma.DbNull } }, select: { id: true, facts: true } })
  let changed = 0
  for (const t of taxa) {
    const facts = t.facts as Record<string, Fact>
    const next = { ...facts }
    for (const k of ['lifespan', 'reproduction'] as const) if (facts[k]) next[k] = { ...facts[k], value: recodeAnAge(k, facts[k].value) }
    if (canon(next) === canon(facts)) continue
    await db.taxon.update({ where: { id: t.id }, data: { facts: next } })
    changed++
  }
  log(`recode: ${changed} of ${taxa.length} taxa with facts rewritten`)
  return { taxa: taxa.length, changed }
}
