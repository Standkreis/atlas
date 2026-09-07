// The bulk trait datasets in etl/data/ (handoff 0021 D3, grill 0019 S1): AVONET and EltonTraits for birds, EltonTraits
// and PanTHERIA for mammals, AmphiBIO for amphibians, joined by the binomial (the caller adds GBIF synonyms for the
// misses). Pure apart from reading the five files once. Values: metric strings with an ASCII decimal point (the client
// prints the German comma), enum-like values as codes the client translates (`species.facts.values.*`), lists joined
// by ", ". Every fact names its dataset and licence.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Fact } from './sources'

export const DATA = join(dirname(fileURLToPath(import.meta.url)), 'data')

type Ref = { source: string; licence: string; url: string }
export const REFS = {
  avonet: { source: 'AVONET', licence: 'CC BY 4.0', url: 'https://doi.org/10.6084/m9.figshare.16586228' },
  elton: { source: 'EltonTraits', licence: 'CC0 1.0', url: 'https://doi.org/10.6084/m9.figshare.3559887' },
  pantheria: { source: 'PanTHERIA', licence: 'CC BY 4.0 (figshare wrapper; the archive names none)', url: 'https://doi.org/10.1890/08-1494.1' },
  amphibio: { source: 'AmphiBIO', licence: 'CC BY 4.0', url: 'https://doi.org/10.6084/m9.figshare.4644424' },
} satisfies Record<string, Ref>
const FILES = {
  avonet: { file: 'AVONET1_BirdLife.csv', sep: ',', key: 'Species1' },
  eltonBird: { file: 'BirdFuncDat.txt', sep: '\t', key: 'Scientific' },
  eltonMam: { file: 'MamFuncDat.txt', sep: '\t', key: 'Scientific' },
  pantheria: { file: 'PanTHERIA_1-0_WR05_Aug2008.txt', sep: '\t', key: 'MSW05_Binomial' },
  amphibio: { file: 'AmphiBIO_v1.csv', sep: ',', key: 'Species' },
} as const
type Dataset = keyof typeof FILES
type Row = Record<string, string>

/** The first two words: "Turdus merula" from "Turdus merula Linnaeus, 1758" or a subspecies. */
export const binomial = (s: string) => s.trim().split(/\s+/).slice(0, 2).join(' ')

/** CSV/TSV → rows as objects; quoted fields may hold the separator and newlines (as the grill's reader). */
export function table(text: string, sep: string): Row[] {
  const rows: string[][] = []
  let row: string[] = [], cur = '', q = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if (q) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++ } else if (ch === '"') q = false; else cur += ch }
    else if (ch === '"') q = true
    else if (ch === sep) { row.push(cur); cur = '' }
    else if (ch === '\n') { row.push(cur.replace(/\r$/, '')); rows.push(row); row = []; cur = '' }
    else cur += ch
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row) }
  const [head, ...body] = rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''))
  return body.map((r) => Object.fromEntries(head!.map((h, i) => [h.trim(), (r[i] ?? '').trim()])))
}

let indexes: Record<Dataset, Map<string, Row>> | null = null
/** The five files, read once, keyed by binomial. */
export function bulk(): Record<Dataset, Map<string, Row>> {
  if (indexes) return indexes
  const out = {} as Record<Dataset, Map<string, Row>>
  for (const [k, f] of Object.entries(FILES) as [Dataset, (typeof FILES)[Dataset]][]) {
    const rows = table(readFileSync(join(DATA, f.file), 'latin1'), f.sep)
    const m = new Map<string, Row>()
    for (const r of rows) { const n = binomial(r[f.key] ?? ''); if (n && !m.has(n)) m.set(n, r) }
    out[k] = m
  }
  return (indexes = out)
}

/** The datasets a tile joins; a taxon whose binomial misses one of them gets its GBIF synonyms tried. */
export const DATASETS_OF: Partial<Record<string, Dataset[]>> = { bird: ['avonet', 'eltonBird'], mammal: ['eltonMam', 'pantheria'], amphibian: ['amphibio'] }

// ── Formatting ─────────────────────────────────────────────────────────────
const miss = (v: string | undefined) => v === undefined || v === '' || v === 'NA' || /^-999(\.0+)?$/.test(v)
const num = (v: string | undefined) => (miss(v) ? null : Number.isFinite(Number(v)) ? Number(v) : null)
const trim = (x: number) => String(Math.round(x * 10) / 10)
/** 120 g · 5.5 kg · 9.6 g */
export const grams = (g: number) => (g >= 1000 ? `${trim(g / 1000)} kg` : g < 10 ? `${trim(g)} g` : `${Math.round(g)} g`)
/** 8 mm · 12.8 cm · 1.4 m */
export const millimetres = (mm: number) => (mm < 10 ? `${trim(mm)} mm` : mm < 1000 ? `${trim(mm / 10)} cm` : `${trim(mm / 1000)} m`)
/** 30 cm · 1.5 m · 25 m */
export const metres = (m: number) => (m < 1 ? `${Math.round(m * 100)} cm` : `${trim(m)} m`)

const HABITAT: Record<string, string> = { Forest: 'forest', Woodland: 'woodland', Grassland: 'grassland', Wetland: 'wetland', Marine: 'marine', Coastal: 'coastal', Shrubland: 'shrubland', Desert: 'desert', Rock: 'rock', 'Human Modified': 'human', Riverine: 'riverine' }
const NICHE: Record<string, string> = { Invertivore: 'invertivore', Omnivore: 'omnivore', Granivore: 'granivore', Frugivore: 'frugivore', 'Herbivore terrestrial': 'herbivore', 'Herbivore aquatic': 'herbivoreAquatic', 'Aquatic predator': 'aquaticPredator', Vertivore: 'vertivore', Scavenger: 'scavenger', Nectarivore: 'nectarivore' }
const MIGRATION: Record<string, string> = { '1': 'resident', '2': 'partial', '3': 'full' }
// EltonTraits foraging strata (% of foraging time) folded to five words; the second word of a bird's habitat (0025 C2).
const STRATA: [string, string[]][] = [['water', ['ForStrat-watbelowsurf', 'ForStrat-wataroundsurf']], ['ground', ['ForStrat-ground']], ['understory', ['ForStrat-understory']], ['canopy', ['ForStrat-midhigh', 'ForStrat-canopy']], ['aerial', ['ForStrat-aerial']]]
/** The stratum the primary class already says: "Feuchtgebiet, Wasser" or "Grasland, Boden" would repeat itself. */
const SAID: Record<string, string> = { wetland: 'water', marine: 'water', coastal: 'water', riverine: 'water', grassland: 'ground', desert: 'ground', rock: 'ground', shrubland: 'understory' }
const flags = (row: Row, map: Record<string, string>) => Object.entries(map).filter(([col]) => row[col] === '1').map(([, code]) => code)

/** EltonTraits diet shares (%) → the categories at 20 % or more, largest first, at most three. */
export function dietFromShares(row: Row): string[] {
  const share = (cols: string[]) => cols.reduce((a, c) => a + (num(row[c]) ?? 0), 0)
  const cats: [string, number][] = [
    ['invertebrates', share(['Diet-Inv'])], ['vertebrates', share(['Diet-Vend', 'Diet-Vect', 'Diet-Vfish', 'Diet-Vunk'])], ['carrion', share(['Diet-Scav'])],
    ['fruit', share(['Diet-Fruit'])], ['nectar', share(['Diet-Nect'])], ['seeds', share(['Diet-Seed'])], ['plants', share(['Diet-PlantO'])],
  ]
  return cats.filter(([, s]) => s >= 20).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c)
}

/**
 * EltonTraits' foraging stratum as the second word of a bird's habitat (0025 C2): the stratum with at least half of the
 * foraging time, when the AVONET class does not say it already. Amsel: Forest + ground 60 → "forest, ground"; Mauersegler:
 * Human Modified + aerial 100 → "human, aerial"; Stockente: Wetland + water 80 → "wetland"; Buchfink: ground 40 → "forest".
 */
export function stratumWord(row: Row, habitat: string | undefined): string | null {
  const share = (cols: string[]) => cols.reduce((a, c) => a + (num(row[c]) ?? 0), 0)
  const top = STRATA.map(([code, cols]) => [code, share(cols)] as const).sort((a, b) => b[1] - a[1])[0]
  if (!top || top[1] < 50) return null
  return habitat && SAID[habitat] === top[0] ? null : top[0]
}

/** The Steckbrief facts a taxon gets from the files; `names` = its binomial first, then GBIF synonyms. Empty for other tiles. */
export function bulkFacts(tile: string, names: string[]): Record<string, Fact> {
  const idx = bulk()
  const pick = (ds: Dataset) => { for (const n of names) { const r = idx[ds].get(binomial(n)); if (r) return r } return null }
  const out: Record<string, Fact> = {}
  const fact = (key: string, value: string | null | undefined, ref: Ref) => { if (value) out[key] = { value, source: ref.source, url: ref.url, licence: ref.licence } }
  if (tile === 'bird') {
    const a = pick('avonet'), e = pick('eltonBird')
    if (a) {
      const g = num(a.Mass); if (g) fact('mass', grams(g), REFS.avonet)
      fact('migration', MIGRATION[a.Migration ?? ''], REFS.avonet)
      const habitat = HABITAT[a.Habitat ?? '']
      const stratum = e ? stratumWord(e, habitat) : null
      if (habitat && stratum) out.habitat = { value: `${habitat}, ${stratum}`, source: 'AVONET, EltonTraits', url: REFS.avonet.url, licence: REFS.avonet.licence } // CC BY covers both, Elton is CC0
      else fact('habitat', habitat, REFS.avonet)
      fact('diet', NICHE[a['Trophic.Niche'] ?? ''], REFS.avonet)
    }
    if (e && !miss(e.Nocturnal)) fact('activity', e.Nocturnal === '1' ? 'nocturnal' : 'diurnal', REFS.elton)
  } else if (tile === 'mammal') {
    const e = pick('eltonMam'), p = pick('pantheria')
    const g = num(e?.['BodyMass-Value'])
    if (g) fact('mass', grams(g), REFS.elton)
    else { const pg = num(p?.['5-1_AdultBodyMass_g']); if (pg) fact('mass', grams(pg), REFS.pantheria) }
    const mm = num(p?.['13-1_AdultHeadBodyLen_mm']); if (mm) fact('length', millimetres(mm), REFS.pantheria)
    if (e) {
      fact('diet', dietFromShares(e).join(', ') || null, REFS.elton)
      fact('activity', flags(e, { 'Activity-Diurnal': 'diurnal', 'Activity-Crepuscular': 'crepuscular', 'Activity-Nocturnal': 'nocturnal' }).join(', ') || null, REFS.elton)
    }
  } else if (tile === 'amphibian') {
    const a = pick('amphibio')
    if (a) {
      const g = num(a.Body_mass_g); if (g) fact('mass', grams(g), REFS.amphibio) // 0021 doubt 18, written since 0024
      const mm = num(a.Body_size_mm); if (mm) fact('length', millimetres(mm), REFS.amphibio)
      fact('habitat', flags(a, { Ter: 'terrestrial', Aqu: 'aquatic', Arb: 'arboreal', Fos: 'fossorial' }).join(', ') || null, REFS.amphibio)
      fact('diet', flags(a, { Arthro: 'arthropods', Vert: 'vertebrates', Leaves: 'leaves', Seeds: 'seeds', Fruits: 'fruit', Flowers: 'flowers' }).join(', ') || null, REFS.amphibio)
      fact('activity', flags(a, { Diu: 'diurnal', Crepu: 'crepuscular', Noc: 'nocturnal' }).join(', ') || null, REFS.amphibio)
    }
  }
  return out
}

/** True when one of the tile's datasets has no row for the binomial: worth a GBIF synonym lookup. */
export const missesDataset = (tile: string, sciName: string) => (DATASETS_OF[tile] ?? []).some((ds) => !bulk()[ds].has(binomial(sciName)))
