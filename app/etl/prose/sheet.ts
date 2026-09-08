// The fact sheets the prose is written from (handoff 0028; scripts/prose-grill/sheets.mjs ported). Codes become words
// through src/i18n/{de,en}.json with the page's rendering rules (SpeciesPage.tsx factWords / lifespanWords /
// reproductionWords), one sheet per language, so the English text is written from an English sheet, never translated.
//   full · V1: GBIF row, names, status, every fact, GloBI edges as the page shows them (12 per kind), every region's months
//   eco  · ECO2: diet, habitat, activity, pollination, the run region's month profile, and GloBI edges after the harder
//          filter (both ends named, in-set or ≥ 2 records, cap 8, one line per edge with its real record count)
// Only edges with `prose: true` (0027 F1/F2 applied by content.ts). An edge fetched before 0028 has no studies: F2 never
// fired on it; the sheet counts those as `unfetched` and the CLI warns. Pure: the DB read lives in load.ts.
import { createHash } from 'node:crypto'
import deJson from '../../src/i18n/de.json'
import enJson from '../../src/i18n/en.json'
import type { Kind } from '../prune'

export type Lang = 'de' | 'en'
export type Line = { id: string; key: string; source: string; text: string }
export type Sheet = { full: Line[]; eco: Line[]; unfetched: number }
export type SheetEdge = { kind: Kind; sciName: string; commonNames: Record<string, string>; inSet: boolean; studies: Record<string, number>; real: number; prose: boolean }
export type SheetRegion = { name: string; obs: number; monthShare: number[]; peak: number; words: string }
export type SheetTaxon = {
  gbifKey: number
  sciName: string
  rank: string
  tile: string
  class: string | null
  order: string | null
  iucn: string | null
  commonNames: Record<string, string>
  facts: Record<string, { value: string; source: string }> | null
  regions: SheetRegion[]
  edges: SheetEdge[]
}

type Words = { tile: Record<string, string>; iucn: Record<string, string>; facts: Record<string, string> & { values: Record<string, Record<string, string>> }; ecology: { kind: Record<string, string> } }
const I18N: Record<Lang, Words> = { de: deJson.species as unknown as Words, en: enJson.species as unknown as Words }
export const KINDS: Kind[] = ['eats', 'eatenBy', 'pollinates', 'visitsFlowersOf', 'hostOf', 'parasiteOf']
const MONTHS: Record<Lang, string[]> = { de: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] }
const MONTHS_EN: Record<string, string> = { Mär: 'Mar', Mai: 'May', Okt: 'Oct', Dez: 'Dec' }
const CODED = new Set(['migration', 'habitat', 'diet', 'activity', 'pollination', 'lifeform', 'edibility', 'sporePrint'])
const METRIC = new Set(['mass', 'wingspan', 'length', 'height'])
const EDIBILITY_ORDER = ['deadly', 'poisonous', 'psychoactive', 'inedible', 'choice', 'edible', 'unknown']
const ECO_FACTS = ['diet', 'habitat', 'activity', 'pollination']
export const ECO_CAP = 8
const FULL_PER_KIND = 12
const fmt = (lang: Lang, n: string | number) => new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(Number(n))
const tpl = (s: string, vars: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')

/** SpeciesPage.tsx:112-141, the page's own rendering of a fact value, per language. */
export function factWords(lang: Lang, tile: string, k: string, v: string): string {
  const T = I18N[lang].facts.values
  if (k === 'edibility') v = v.split(', ').filter((c) => c !== 'medicinal').sort((a, b) => EDIBILITY_ORDER.indexOf(a) - EDIBILITY_ORDER.indexOf(b)).join(', ')
  if (CODED.has(k)) return v.split(', ').map((c) => T[k]?.[c] ?? c).join(', ')
  if (k === 'flowering') return lang === 'en' ? v.replace(/Mär|Mai|Okt|Dez/g, (m) => MONTHS_EN[m] ?? m) : v
  const metric = METRIC.has(k) && lang === 'de' ? v.replace(/(\d)\.(\d)/g, '$1,$2') : v
  if (k === 'height') return tpl(T.height!.max!, { v: metric })
  if (METRIC.has(k)) return metric
  if (k === 'lifespan') {
    const m = v.match(/^([\d.]+)(?: (wild|captivity))?$/)
    if (!m) return v
    const y = tpl(T.lifespan!.years!, { n: fmt(lang, m[1]!) })
    return m[2] ? `${y} (${T.lifespan![m[2]]})` : y
  }
  if (k === 'reproduction') {
    const parts = v.split(' · ')
    const brood = parts.some((p) => p.startsWith('litter ')) || (!parts.some((p) => p.startsWith('clutch ')) && tile === 'mammal') ? 'littersPerYear' : 'clutchesPerYear'
    return parts.map((p) => { const m = p.match(/^(clutch|litter|perYear|maturity) ([\d.]+)$/); if (!m) return p; return tpl(T.reproduction![m[1] === 'perYear' ? brood : m[1]!]!, { n: fmt(lang, m[2]!) }) }).join(' · ')
  }
  return v
}

/** Total GloBI records behind an edge, metaweb copies included (the 0026 eco rule counts them; F2 counts `real`). */
export const records = (e: { studies: Record<string, number> }) => Object.values(e.studies).reduce((s, n) => s + n, 0)

/** The full and the eco sheet of one taxon in one language; `region` is the reader's region (its month line first, and the eco sheet's only one). */
export function sheetFor(t: SheetTaxon, lang: Lang, region: string): Sheet {
  const S = I18N[lang]
  const partner = (e: SheetEdge) => e.commonNames?.[lang] ?? e.sciName
  const live = t.edges.filter((e) => e.prose)
  const unfetched = live.filter((e) => !Object.keys(e.studies).length).length
  const pl = [...t.regions].sort((a, b) => (a.name === region ? -1 : b.name === region ? 1 : a.name.localeCompare(b.name)))
  const monthLine = (p: SheetRegion) => {
    const bars = p.monthShare.map((s, i) => `${MONTHS[lang][i]} ${Math.round((100 * s) / p.peak)}`).join(', ')
    const words = lang === 'en' ? p.words.replace(/Mär|Mai|Okt|Dez/g, (m) => MONTHS_EN[m] ?? m) : p.words
    return lang === 'de' ? `Region ${p.name}: ${p.obs} Meldungen in zehn Jahren; Hauptzeit „${words}“; Monatsprofil in % des stärksten Monats: ${bars}.` : `Region ${p.name}: ${p.obs} reports in ten years; main time "${words}"; month profile as % of the peak month: ${bars}.`
  }
  const factLine = (k: string, v: string) => `${S.facts[k] ?? k}: ${factWords(lang, t.tile, k, v)}.`
  const byReal = (a: SheetEdge, b: SheetEdge) => Number(b.inSet) - Number(a.inSet) || b.real - a.real

  // full
  const L: Line[] = []
  const add = (key: string, source: string, text: string) => L.push({ id: `F${L.length + 1}`, key, source, text })
  add('taxon', 'GBIF', lang === 'de' ? `Wissenschaftlicher Name ${t.sciName}; Rang ${t.rank === 'species' ? 'Art' : t.rank}; Klasse ${t.class ?? '?'}, Ordnung ${t.order ?? '?'}; Gruppe: ${S.tile[t.tile]}.` : `Scientific name ${t.sciName}; rank ${t.rank}; class ${t.class ?? '?'}, order ${t.order ?? '?'}; group: ${S.tile[t.tile]}.`)
  if (t.commonNames?.de) add('name', 'Wikidata', lang === 'de' ? `Deutscher Name: ${t.commonNames.de}.` : `German name: ${t.commonNames.de}.`)
  if (t.commonNames?.en) add('name', 'Wikidata', lang === 'de' ? `Englischer Name: ${t.commonNames.en}.` : `English name: ${t.commonNames.en}.`)
  if (t.iucn) add('status', 'IUCN Red List', `${S.facts.status}: ${t.iucn} (${S.iucn[t.iucn] ?? t.iucn}).`)
  for (const [k, f] of Object.entries(t.facts ?? {})) add(k, f.source, factLine(k, f.value))
  for (const k of KINDS) {
    const es = live.filter((e) => e.kind === k).sort(byReal)
    if (es.length) add(`globi.${k}`, 'GloBI', `${S.ecology.kind[k]}: ${es.slice(0, FULL_PER_KIND).map((e) => `${partner(e)} (${e.sciName})`).join(', ')}${es.length > FULL_PER_KIND ? (lang === 'de' ? ` und ${es.length - FULL_PER_KIND} weitere` : ` and ${es.length - FULL_PER_KIND} more`) : ''}.`)
  }
  for (const p of pl) add(`months.${p.name}`, 'GBIF occurrences', monthLine(p))

  // eco: the harder filter (0026 rule: a named partner, in-set or ≥ 2 records) on the edges F1/F2 left
  const E: Line[] = []
  const addE = (key: string, source: string, text: string) => E.push({ id: `F${E.length + 1}`, key, source, text })
  for (const k of ECO_FACTS) if (t.facts?.[k]) addE(k, t.facts[k].source, factLine(k, t.facts[k].value))
  const mb = pl.find((p) => p.name === region) ?? pl[0]
  if (mb) addE(`months.${mb.name}`, 'GBIF occurrences', monthLine(mb))
  const kept = live.filter((e) => (e.commonNames?.de || e.commonNames?.en) && (e.inSet || records(e) >= 2)).sort(byReal).slice(0, ECO_CAP)
  // One line per edge: a partner claim in the text then maps to exactly one id, and "≥ 3 lines" counts content, not kinds.
  // The count is the real (non-metaweb) records: a metaweb row is a potential link, not a Beleg.
  for (const k of KINDS) for (const e of kept.filter((e) => e.kind === k)) addE(`globi.${k}`, 'GloBI', `${S.ecology.kind[k]}: ${partner(e)} (${e.sciName})${lang === 'de' ? ` — ${e.real} GloBI-Beleg${e.real === 1 ? '' : 'e'}` : ` — ${e.real} GloBI record${e.real === 1 ? '' : 's'}`}.`)
  return { full: L, eco: E, unfetched }
}

export type Sheets = Record<Lang, Sheet>
export const sheetsFor = (t: SheetTaxon, region: string): Sheets => ({ de: sheetFor(t, 'de', region), en: sheetFor(t, 'en', region) })
/** sha1 of every line of both languages (full + eco); `Taxon.prose.inputHash` — the step rewrites when it changes. */
export const inputHash = (s: Sheets) => createHash('sha1').update(JSON.stringify([s.de.full, s.de.eco, s.en.full, s.en.eco].map((ls) => ls.map((l) => [l.id, l.source, l.text])))).digest('hex')
/** The sheets below the prose thresholds: a full sheet under 3 lines gets no text; an eco sheet under 3 gets no Ökologie paragraph. */
export const MIN_LINES = 3
