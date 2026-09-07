// Step 1 of the prose grill (0026): the fact sheets the models write from, for the 0019 ten plus ten insects, from the
// dev DB as it is today (read only). Codes become words through src/i18n/{de,en}.json with the page's rendering rules
// (SpeciesPage.tsx factWords / lifespanWords / reproductionWords), one sheet per language, so the English text is
// written from an English sheet, never translated. Two shapes per species and language:
//   full · P1: GBIF row, names, status, every fact, GloBI edges as the page shows them (0019 style, 12 per kind), months
//   eco  · P2: diet, habitat, activity, pollination, the month profile, and GloBI edges after the harder filter
//          (both ends named, six kinds, cap 8)
// GloBI records and their studies come from the interaction endpoint with includeObservations=true (≤ 10 pages of 1 000,
// cached). 0027 F1/F2: every edge carries its studies; one pruning (`prune`) for both sheets drops eats/eatenBy pairs whose
// studies are all metawebs (F1) and pairs with ≤ 1 real record from ≤ 1 real study (F2, in-set or not; "real" = not from a
// metaweb, so a pair with one observation plus eight metaweb copies is thin). Lines count and sort by real records.
// Counts per rule → sheets.json.
// Run from app/: node scripts/prose-grill/sheets.mjs → sheets.json
import pg from 'pg'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { HERE, DEV_DB, REGION, readJson, writeJson, getJson, md, norm } from './common.mjs'

const TEN = Object.keys(readJson(join(HERE, '../steckbrief-probe/facts.json')))
// The committed 0026 sheets, for the "kept (0026)" column; absent when the file is missing.
const sheets0026 = (() => { try { return JSON.parse(execFileSync('git', ['show', 'e58e14e:app/scripts/prose-grill/sheets.json'], { cwd: HERE, maxBuffer: 64 << 20 })).sheets } catch { return null } })()
// The ten Mainz-Bingen insects with the most GBIF records and a German name, the Nosferatu spider excluded (already in the ten).
const INSECTS = ['Bombus terrestris', 'Melanargia galathea', 'Mantis religiosa', 'Aglais io', 'Vanessa atalanta', 'Apis mellifera', 'Polyommatus icarus', 'Pieris rapae', 'Bombus pascuorum', 'Pieris napi']
export const TWENTY = [...TEN, ...INSECTS]
const I18N = { de: readJson(join(HERE, '../../src/i18n/de.json')).species, en: readJson(join(HERE, '../../src/i18n/en.json')).species }
const KINDS = ['eats', 'eatenBy', 'pollinates', 'visitsFlowersOf', 'hostOf', 'parasiteOf']
const FOLD = { eats: 'eats', preysOn: 'eats', eatenBy: 'eatenBy', preyedUponBy: 'eatenBy', pollinates: 'pollinates', hostOf: 'hostOf', parasiteOf: 'parasiteOf', visitsFlowersOf: 'visitsFlowersOf' }
const MONTHS = { de: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] }
const MONTHS_EN = { Mär: 'Mar', Mai: 'May', Okt: 'Oct', Dez: 'Dec' }
const CODED = new Set(['migration', 'habitat', 'diet', 'activity', 'pollination', 'lifeform', 'edibility', 'sporePrint'])
const METRIC = new Set(['mass', 'wingspan', 'length', 'height'])
const EDIBILITY_ORDER = ['deadly', 'poisonous', 'psychoactive', 'inedible', 'choice', 'edible', 'unknown']
const fmt = (lang, n) => new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(Number(n))
const tpl = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k])

/** SpeciesPage.tsx:112-141, the page's own rendering of a fact value, per language. */
export function factWords(lang, tile, k, v) {
  const T = I18N[lang].facts.values
  if (k === 'edibility') v = v.split(', ').filter((c) => c !== 'medicinal').sort((a, b) => EDIBILITY_ORDER.indexOf(a) - EDIBILITY_ORDER.indexOf(b)).join(', ')
  if (CODED.has(k)) return v.split(', ').map((c) => T[k]?.[c] ?? c).join(', ')
  if (k === 'flowering') return lang === 'en' ? v.replace(/Mär|Mai|Okt|Dez/g, (m) => MONTHS_EN[m] ?? m) : v
  const metric = METRIC.has(k) && lang === 'de' ? v.replace(/(\d)\.(\d)/g, '$1,$2') : v
  if (k === 'height') return tpl(T.height.max, { v: metric })
  if (METRIC.has(k)) return metric
  if (k === 'lifespan') { const m = v.match(/^([\d.]+)(?: (wild|captivity))?$/); if (!m) return v; const y = tpl(T.lifespan.years, { n: fmt(lang, m[1]) }); return m[2] ? `${y} (${T.lifespan[m[2]]})` : y }
  if (k === 'reproduction') {
    const parts = v.split(' · ')
    const brood = parts.some((p) => p.startsWith('litter ')) || (!parts.some((p) => p.startsWith('clutch ')) && tile === 'mammal') ? 'littersPerYear' : 'clutchesPerYear'
    return parts.map((p) => { const m = p.match(/^(clutch|litter|perYear|maturity) ([\d.]+)$/); if (!m) return p; return tpl(T.reproduction[m[1] === 'perYear' ? brood : m[1]], { n: fmt(lang, m[2]) }) }).join(' · ')
  }
  return v
}

// F1 (0027): studies that list *potential* trophic links, not observed ones: species paired by guild, body size or
// co-occurrence. A json.v2 record carries `study` (= `study_title`, the citation string) and no DOI field; matched by name
// on the citation, case-insensitive. The two 0026 found by hand, then the brief's keywords. Note: "Reji Chacko" is
// trophiCH v1, a food web for Switzerland (2024), not a European metaweb; 25 657 of the 72 578 cached rows come from it.
const METAWEB = [
  /reji chacko/i, // Reji Chacko et al. (2024) trophiCH v1 – a food web for Switzerland, EnviDat 10.16904/envidat.467
  /maiorano/i, // Maiorano et al. (2020) TETRA-EU 1.0: a species-level trophic meta-web of European tetrapods
  /metaweb|meta-web/i, /potential/i, /tetra-eu/i, /eurotrophic/i, /trophich/i, /food web for/i,
]
export const isMetaweb = (study) => METAWEB.some((re) => re.test(study))
const studyKey = (r) => (r.study ?? r.study_title ?? '').replace(/\s*Accessed (at|on) .*$/, '').trim() || '?'

const GLOBI = 'https://api.globalbioticinteractions.org/interaction'
const MAX_PAGES = 50
const addRow = (pairs, r) => {
  const k = FOLD[r.interaction_type]
  if (!k || !r.target_taxon_name) return
  const p = (pairs[`${k}|${r.target_taxon_name}`] ??= { records: 0, studies: {} })
  p.records++
  p.studies[studyKey(r)] = (p.studies[studyKey(r)] ?? 0) + 1
}

/**
 * GloBI records per (folded kind, target name) for one species with the studies behind them; ≤ 50 pages of 1 000
 * (0026 stopped at 10: with F2 that made every unseen in-set pair a "0 records" drop, 196 of Apis mellifera's 200). A
 * species with more rows than that (Apis mellifera, > 200 000) gets one query per DB edge (sourceTaxon + targetTaxon) instead;
 * the per-pair answer also holds the target's subtaxa, which the paged answer does not.
 */
async function globiRecords(sciName, dbEdges) {
  let pairs = {}
  let pages = 0, rows = 0
  for (let offset = 0; offset < MAX_PAGES * 1000; offset += 1000) {
    const page = await getJson(`${GLOBI}?sourceTaxon=${encodeURIComponent(sciName)}&type=json.v2&includeObservations=true&limit=1000&offset=${offset}`)
    pages++; rows += page.length
    for (const r of page) addRow(pairs, r)
    if (page.length < 1000) break
  }
  const truncated = rows >= MAX_PAGES * 1000
  let perPair = 0
  if (truncated) {
    pairs = {}
    for (const target of new Set(dbEdges.map((e) => e.sciName))) {
      const rs = await getJson(`${GLOBI}?sourceTaxon=${encodeURIComponent(sciName)}&targetTaxon=${encodeURIComponent(target)}&type=json.v2&includeObservations=true&limit=1000`)
      perPair++
      for (const r of rs) if (r.target_taxon_name === target || r.target_taxon_path?.split(' | ').includes(target)) addRow(pairs, { ...r, target_taxon_name: target })
    }
  }
  return { pairs, pages, rows, truncated, perPair }
}

/**
 * The pruning of F1/F2 on the DB edges of one species, with the studies attached. Returns every edge tagged with the rule
 * that drops it (`drop: 'F1' | 'F2' | null`) so the report can count per rule; `real` = records not from a metaweb,
 * `realStudies` = the studies that are not metawebs.
 *   F1  eats/eatenBy whose studies are all metawebs → out (the Feuersalamander's duck predators)
 *   F2  ≤ 1 real record from ≤ 1 real study, in-set or not → out (Hirschkäfer eats Vogelkirsche: 1 record; Rana eaten by
 *       Kuckuck: 1 real record + 6 metaweb copies; 0 records = the DB edge was not in GloBI's answer at all)
 */
export function prune(edges, pairs) {
  return edges.map((e) => {
    const g = pairs[`${e.kind}|${e.sciName}`] ?? { records: 0, studies: {} }
    const studies = Object.keys(g.studies)
    const metaweb = studies.filter(isMetaweb)
    const real = g.records - metaweb.reduce((s, k) => s + g.studies[k], 0)
    const realStudies = studies.filter((s) => !isMetaweb(s))
    const metawebOnly = studies.length > 0 && metaweb.length === studies.length
    const drop = (e.kind === 'eats' || e.kind === 'eatenBy') && metawebOnly ? 'F1' : real <= 1 && realStudies.length <= 1 ? 'F2' : null
    return { ...e, records: g.records, real, studies, realStudies, metawebOnly, drop }
  })
}

const client = new pg.Client({ connectionString: DEV_DB })
await client.connect()
const { rows: taxa } = await client.query('select id, "gbifKey", "sciName", tile, class, "order", rank, iucn, "commonNames", facts from "Taxon" where "sciName" = any($1)', [TWENTY])
const ids = taxa.map((t) => t.id)
const { rows: edges } = await client.query(`select i."sourceId", i.kind, t."sciName", t."commonNames", exists(select 1 from "Plausibility" p where p."taxonId" = t.id) as "inSet" from "Interaction" i join "Taxon" t on t.id = i."targetId" where i."sourceId" = any($1)`, [ids])
const { rows: plaus } = await client.query('select p."taxonId", r.name as region, p.obs, p."monthShare", p.peak, p.words from "Plausibility" p join "Region" r on r.id = p."regionId" where p."taxonId" = any($1)', [ids])
await client.end()

const sheets = {}
const stats = []
for (const sciName of TWENTY) {
  const t = taxa.find((x) => x.sciName === sciName)
  if (!t) throw new Error(`not in the dev DB: ${sciName}`)
  const mine = edges.filter((e) => e.sourceId === t.id)
  const globi = await globiRecords(sciName, mine)
  const pruned = prune(mine, globi.pairs)
  // The 0026 eco rule (named partner, in-set or ≥ 2 records) is the "before"; F1 then F2 in that order are the "after".
  const named = (es) => es.filter((e) => e.commonNames?.de || e.commonNames?.en)
  const before = named(pruned).filter((e) => e.inSet || e.records >= 2)
  const counts = { edges: mine.length, full: { before: mine.length, F1: pruned.filter((e) => e.drop === 'F1').length, F2: pruned.filter((e) => e.drop === 'F2').length, after: pruned.filter((e) => !e.drop).length }, eco: { before: before.length, F1: before.filter((e) => e.drop === 'F1').length, F2: before.filter((e) => e.drop === 'F2').length, after: before.filter((e) => !e.drop).length, kept0026: sheets0026?.[sciName]?.sheets.de.ecoEdges.length ?? null } }
  const pl = plaus.filter((p) => p.taxonId === t.id).sort((a, b) => (a.region === REGION ? -1 : b.region === REGION ? 1 : a.region.localeCompare(b.region)))
  const out = { gbifKey: t.gbifKey, tile: t.tile, names: t.commonNames, iucn: t.iucn, factKeys: Object.keys(t.facts ?? {}), regions: pl.map((p) => p.region), globi: { pages: globi.pages, rows: globi.rows, truncated: globi.truncated, perPair: globi.perPair }, counts, dropped: pruned.filter((e) => e.drop).map((e) => ({ kind: e.kind, target: e.sciName, inSet: e.inSet, records: e.records, real: e.real, studies: e.studies.map((s) => s.slice(0, 60)), drop: e.drop })), zeroRecords: pruned.filter((e) => e.drop === 'F2' && e.records === 0).length, sheets: {} }
  for (const lang of ['de', 'en']) {
    const S = I18N[lang]
    const partner = (e) => e.commonNames?.[lang] ?? e.commonNames?.[lang === 'de' ? 'en' : 'de'] ?? e.sciName
    const L = []
    const add = (key, source, text) => L.push({ id: `F${L.length + 1}`, key, source, text })
    // full
    add('taxon', 'GBIF', lang === 'de' ? `Wissenschaftlicher Name ${t.sciName}; Rang ${t.rank === 'species' ? 'Art' : t.rank}; Klasse ${t.class ?? '?'}, Ordnung ${t.order ?? '?'}; Gruppe: ${S.tile[t.tile]}.` : `Scientific name ${t.sciName}; rank ${t.rank}; class ${t.class ?? '?'}, order ${t.order ?? '?'}; group: ${S.tile[t.tile]}.`)
    if (t.commonNames?.de) add('name', 'Wikidata', lang === 'de' ? `Deutscher Name: ${t.commonNames.de}.` : `German name: ${t.commonNames.de}.`)
    if (t.commonNames?.en) add('name', 'Wikidata', lang === 'de' ? `Englischer Name: ${t.commonNames.en}.` : `English name: ${t.commonNames.en}.`)
    if (t.iucn) add('status', 'IUCN Red List', `${S.facts.status}: ${t.iucn} (${S.iucn[t.iucn] ?? t.iucn}).`)
    for (const [k, f] of Object.entries(t.facts ?? {})) add(k, f.source, `${S.facts[k] ?? k}: ${factWords(lang, t.tile, k, f.value)}.`)
    const byKind = {}
    for (const e of pruned.filter((e) => !e.drop)) (byKind[e.kind] ??= []).push(e)
    for (const k of KINDS) {
      const es = (byKind[k] ?? []).sort((a, b) => Number(b.inSet) - Number(a.inSet) || b.real - a.real)
      if (es.length) add(`globi.${k}`, 'GloBI', `${S.ecology.kind[k]}: ${es.slice(0, 12).map((e) => `${partner(e)} (${e.sciName})`).join(', ')}${es.length > 12 ? (lang === 'de' ? ` und ${es.length - 12} weitere` : ` and ${es.length - 12} more`) : ''}.`)
    }
    const monthLine = (p) => { const bars = p.monthShare.map((s, i) => `${MONTHS[lang][i]} ${Math.round((100 * s) / p.peak)}`).join(', '); const words = lang === 'en' ? p.words.replace(/Mär|Mai|Okt|Dez/g, (m) => MONTHS_EN[m] ?? m) : p.words; return lang === 'de' ? `Region ${p.region}: ${p.obs} Meldungen in zehn Jahren; Hauptzeit „${words}“; Monatsprofil in % des stärksten Monats: ${bars}.` : `Region ${p.region}: ${p.obs} reports in ten years; main time "${words}"; month profile as % of the peak month: ${bars}.` }
    for (const p of pl) add(`months.${p.region}`, 'GBIF occurrences', monthLine(p))
    // eco: the harder filter
    const E = []
    const addE = (key, source, text) => E.push({ id: `F${E.length + 1}`, key, source, text })
    for (const k of ['diet', 'habitat', 'activity', 'pollination']) if (t.facts?.[k]) addE(k, t.facts[k].source, `${S.facts[k]}: ${factWords(lang, t.tile, k, t.facts[k].value)}.`)
    const mb = pl.find((p) => p.region === REGION) ?? pl[0]
    if (mb) addE(`months.${mb.region}`, 'GBIF occurrences', monthLine(mb))
    const cand = before.filter((e) => !e.drop)
    cand.sort((a, b) => Number(b.inSet) - Number(a.inSet) || b.real - a.real)
    const kept = cand.slice(0, 8)
    // One line per edge: a partner claim in the text then maps to exactly one id, and "≥ 3 lines" counts content, not kinds.
    // The count is the real (non-metaweb) records: a metaweb row is a potential link, not a Beleg.
    for (const k of KINDS) for (const e of kept.filter((e) => e.kind === k)) addE(`globi.${k}`, 'GloBI', `${S.ecology.kind[k]}: ${partner(e)} (${e.sciName})${lang === 'de' ? ` — ${e.real} GloBI-Beleg${e.real === 1 ? '' : 'e'}` : ` — ${e.real} GloBI record${e.real === 1 ? '' : 's'}`}.`)
    out.sheets[lang] = { full: L, eco: E, ecoEdges: kept.map((e) => ({ kind: e.kind, target: e.sciName, name: partner(e), inSet: e.inSet, records: e.records, real: e.real, studies: e.studies.map((s) => s.slice(0, 60)) })), ecoCandidates: cand.length }
  }
  sheets[sciName] = out
  const e = out.sheets.de
  const c = counts
  stats.push([sciName, t.tile, `${globi.rows}${globi.truncated ? `+ (${globi.perPair} pair queries)` : ''}`, c.full.before, c.full.F1, c.full.F2, c.full.after, c.eco.before, c.eco.F1, c.eco.F2, c.eco.after, `${e.ecoEdges.length} (${c.eco.kept0026 ?? '—'})`, e.eco.length, e.eco.length >= 3 ? '✓' : '✗'])
  console.log(`${sciName}: ${mine.length} edges · GloBI ${globi.rows}${globi.truncated ? '+' : ''} records · full −F1 ${c.full.F1} −F2 ${c.full.F2} → ${c.full.after} · eco ${c.eco.before} −F1 ${c.eco.F1} −F2 ${c.eco.F2} → ${c.eco.after}, kept ${e.ecoEdges.length}, ${e.eco.length} lines`)
}
const table = md(['species', 'tile', 'GloBI records', 'DB edges', 'full −F1', 'full −F2', 'full after', 'eco before (0026 rule)', 'eco −F1', 'eco −F2', 'eco after', 'eco kept (0026)', 'eco lines', '≥ 3'], stats)
writeJson(join(HERE, 'sheets.json'), { at: new Date().toISOString(), region: REGION, metaweb: METAWEB.map(String), table, sheets })
console.log(table)
