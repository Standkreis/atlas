// Step 1 of the prose grill (0026): the fact sheets the models write from, for the 0019 ten plus ten insects, from the
// dev DB as it is today (read only). Codes become words through src/i18n/{de,en}.json with the page's rendering rules
// (SpeciesPage.tsx factWords / lifespanWords / reproductionWords), one sheet per language, so the English text is
// written from an English sheet, never translated. Two shapes per species and language:
//   full · P1: GBIF row, names, status, every fact, GloBI edges as the page shows them (0019 style, 12 per kind), months
//   eco  · P2: diet, habitat, activity, pollination, the month profile, and GloBI edges after the harder filter
//          (both ends named, six kinds, in-set partner or ≥ 2 GloBI records for the pair, cap 8)
// GloBI record counts come from the interaction endpoint with includeObservations=true (≤ 10 pages of 1 000, cached).
// Run from app/: node scripts/prose-grill/sheets.mjs → sheets.json
import pg from 'pg'
import { join } from 'node:path'
import { HERE, DEV_DB, REGION, readJson, writeJson, getJson, md, norm } from './common.mjs'

const TEN = Object.keys(readJson(join(HERE, '../steckbrief-probe/facts.json')))
// The ten Mainz-Bingen insects with the most GBIF records and a German name, the Nosferatu spider excluded (already in the ten).
const INSECTS = ['Bombus terrestris', 'Melanargia galathea', 'Mantis religiosa', 'Aglais io', 'Vanessa atalanta', 'Apis mellifera', 'Polyommatus icarus', 'Pieris rapae', 'Bombus pascuorum', 'Pieris napi']
export const TWENTY = [...TEN, ...INSECTS]
const I18N = { de: readJson(join(HERE, '../../src/i18n/de.json')).species, en: readJson(join(HERE, '../../src/i18n/en.json')).species }
const KINDS = ['eats', 'eatenBy', 'pollinates', 'visitsFlowersOf', 'hostOf', 'parasiteOf']
const FOLD = { eats: 'eats', preysOn: 'eats', eatenBy: 'eatenBy', preyedUponBy: 'eatenBy', pollinates: 'pollinates', hostOf: 'hostOf', parasiteOf: 'parasiteOf', visitsFlowersOf: 'visitsFlowersOf' }
const MONTHS = { de: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] }
const MONTHS_EN = { Mär: 'Mar', Mai: 'May', Okt: 'Oct', Dez: 'Dec' }
// 0025 Track C adds the stratum word to bird habitat; the dev DB already holds "forest, ground" for the Amsel while this
// worktree's i18n has no key for it. Fallback here so the sheet never shows a raw code.
const STRATUM = { de: { ground: 'Boden', understory: 'Unterholz', canopy: 'Baumkronen', aerial: 'Luft', water: 'Wasser' }, en: { ground: 'ground', understory: 'understory', canopy: 'canopy', aerial: 'air', water: 'water' } }
const CODED = new Set(['migration', 'habitat', 'diet', 'activity', 'pollination', 'lifeform', 'edibility', 'sporePrint'])
const METRIC = new Set(['mass', 'wingspan', 'length', 'height'])
const EDIBILITY_ORDER = ['deadly', 'poisonous', 'psychoactive', 'inedible', 'choice', 'edible', 'unknown']
const fmt = (lang, n) => new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(Number(n))
const tpl = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k])

/** SpeciesPage.tsx:112-141, the page's own rendering of a fact value, per language. */
export function factWords(lang, tile, k, v) {
  const T = I18N[lang].facts.values
  if (k === 'edibility') v = v.split(', ').filter((c) => c !== 'medicinal').sort((a, b) => EDIBILITY_ORDER.indexOf(a) - EDIBILITY_ORDER.indexOf(b)).join(', ')
  if (CODED.has(k)) return v.split(', ').map((c) => T[k]?.[c] ?? STRATUM[lang][c] ?? c).join(', ')
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

/** GloBI records per (folded kind, target name) for one species; ≤ 10 pages of 1 000 observations. */
async function globiRecords(sciName) {
  const counts = {}
  let pages = 0, rows = 0
  for (let offset = 0; offset < 10000; offset += 1000) {
    const page = await getJson(`https://api.globalbioticinteractions.org/interaction?sourceTaxon=${encodeURIComponent(sciName)}&type=json.v2&includeObservations=true&limit=1000&offset=${offset}`)
    pages++; rows += page.length
    for (const r of page) { const k = FOLD[r.interaction_type]; if (k && r.target_taxon_name) counts[`${k}|${r.target_taxon_name}`] = (counts[`${k}|${r.target_taxon_name}`] ?? 0) + 1 }
    if (page.length < 1000) break
  }
  return { counts, pages, rows, truncated: rows >= 10000 }
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
  const globi = await globiRecords(sciName)
  const mine = edges.filter((e) => e.sourceId === t.id)
  const pl = plaus.filter((p) => p.taxonId === t.id).sort((a, b) => (a.region === REGION ? -1 : b.region === REGION ? 1 : a.region.localeCompare(b.region)))
  const out = { gbifKey: t.gbifKey, tile: t.tile, names: t.commonNames, iucn: t.iucn, factKeys: Object.keys(t.facts ?? {}), regions: pl.map((p) => p.region), globi: { pages: globi.pages, rows: globi.rows, truncated: globi.truncated }, sheets: {} }
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
    for (const e of mine) (byKind[e.kind] ??= []).push(e)
    for (const k of KINDS) {
      const es = (byKind[k] ?? []).sort((a, b) => Number(b.inSet) - Number(a.inSet))
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
    const named = mine.filter((e) => e.commonNames?.de || e.commonNames?.en).map((e) => ({ ...e, records: globi.counts[`${e.kind}|${e.sciName}`] ?? 0 })).filter((e) => e.inSet || e.records >= 2)
    named.sort((a, b) => Number(b.inSet) - Number(a.inSet) || b.records - a.records)
    const kept = named.slice(0, 8)
    // One line per edge: a partner claim in the text then maps to exactly one id, and "≥ 3 lines" counts content, not kinds.
    for (const k of KINDS) for (const e of kept.filter((e) => e.kind === k)) addE(`globi.${k}`, 'GloBI', `${S.ecology.kind[k]}: ${partner(e)} (${e.sciName})${lang === 'de' ? ` — ${e.records} GloBI-Beleg${e.records === 1 ? '' : 'e'}` : ` — ${e.records} GloBI record${e.records === 1 ? '' : 's'}`}.`)
    out.sheets[lang] = { full: L, eco: E, ecoEdges: kept.map((e) => ({ kind: e.kind, target: e.sciName, name: partner(e), inSet: e.inSet, records: e.records })), ecoCandidates: named.length }
  }
  sheets[sciName] = out
  const e = out.sheets.de
  stats.push([sciName, t.tile, out.factKeys.length, mine.length, `${globi.rows}${globi.truncated ? '+' : ''}`, e.ecoCandidates, e.ecoEdges.length, e.full.length, e.eco.length, e.eco.length >= 3 ? '✓' : '✗'])
  console.log(`${sciName}: ${out.factKeys.length} facts · ${mine.length} edges · GloBI ${globi.rows}${globi.truncated ? '+' : ''} records · eco ${e.ecoEdges.length}/${e.ecoCandidates} edges, ${e.eco.length} lines`)
}
writeJson(join(HERE, 'sheets.json'), { at: new Date().toISOString(), region: REGION, sheets })
console.log(md(['species', 'tile', 'fact keys', 'edges in DB', 'GloBI records', 'eco candidates', 'eco edges kept', 'full lines', 'eco lines', '≥ 3'], stats))
