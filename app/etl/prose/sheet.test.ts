import { describe, expect, it } from 'vitest'
import { ECO_CAP, MIN_LINES, factWords, inputHash, records, sheetFor, sheetsFor, type SheetEdge, type SheetTaxon } from './sheet'
import grill from '../../scripts/prose-grill/sheets.json'

// Handoff 0028: the sheet port against the grill's committed sheets (scripts/prose-grill/sheets.json, 2026-09-07): the
// same taxon rebuilt from its DB shape must give the same lines, id for id.
type Fixture = { sheets: Record<'de' | 'en', { full: { id: string; key: string; source: string; text: string }[]; eco: { id: string; key: string; source: string; text: string }[] }> }
const fixture = (name: string) => (grill.sheets as unknown as Record<string, Fixture>)[name]!.sheets

const REGION = 'Mainz-Bingen'
const months = (pct: number[]) => ({ monthShare: pct.map((p) => p * 100), peak: 10_000 })
const edge = (kind: SheetEdge['kind'], sciName: string, commonNames: Record<string, string>, inSet: boolean, studies: Record<string, number>, prose = true): SheetEdge => ({ kind, sciName, commonNames, inSet, studies, real: Object.entries(studies).filter(([s]) => !/reji chacko|maiorano/i.test(s)).reduce((n, [, c]) => n + c, 0), prose })

const salamandra: SheetTaxon = {
  gbifKey: 2431776, sciName: 'Salamandra salamandra', rank: 'species', tile: 'amphibian', class: 'Amphibia', order: 'Caudata', iucn: 'VU',
  commonNames: { de: 'Feuersalamander', en: 'Fire salamander', ja: 'ファイアサラマンダー' },
  facts: { diet: { value: 'arthropods', source: 'AmphiBIO' }, mass: { value: '36 g', source: 'AmphiBIO' }, length: { value: '28 cm', source: 'AmphiBIO' }, habitat: { value: 'terrestrial, aquatic, fossorial', source: 'AmphiBIO' }, activity: { value: 'diurnal, crepuscular, nocturnal', source: 'AmphiBIO' } },
  regions: [
    { name: 'Südwestpfalz', obs: 106, words: 'Feb–Mär · Sep–Dez', ...months([5, 85, 44, 20, 8, 3, 7, 2, 38, 92, 100, 64]) },
    { name: REGION, obs: 48, words: 'Mär–Mai · Aug–Dez', ...months([12, 0, 30, 50, 60, 18, 18, 30, 64, 100, 62, 42]) },
  ],
  edges: [
    edge('eatenBy', 'Natrix maura', {}, false, { 'Study Y': 2 }),
    edge('eatenBy', 'Natrix natrix', {}, false, { 'Study X': 2 }),
    edge('eatenBy', 'Felis catus', { en: 'Domestic Cat' }, true, { 'Lintulaakso, K., Tatti, N. and Žliobaitė, I., 2023. Quantifying': 2 }),
    edge('eatenBy', 'Natrix helvetica', { de: 'Barrenringelnatter', en: 'Barred grass snake' }, true, { 'Reji Chacko, M., Albouy, C.': 1, 'http://iNaturalist.org': 10 }),
    edge('eats', 'Lumbricidae', {}, false, { 'Study Z': 3 }),
    // F1/F2 casualties: the tile shows them, the sheet does not
    edge('eatenBy', 'Grus grus', { de: 'Kranich' }, true, { 'Reji Chacko, M.': 4, 'Maiorano, L.': 4 }, false),
    edge('eats', 'Limax dacampi', {}, false, { 'Reji Chacko, M.': 3 }, false),
  ],
}

describe('factWords (SpeciesPage rules)', () => {
  it('codes to words per language, metric commas in German, lifespan and reproduction templates', () => {
    expect(factWords('de', 'amphibian', 'diet', 'arthropods')).toBe('Gliederfüßer')
    expect(factWords('en', 'amphibian', 'habitat', 'terrestrial, aquatic, fossorial')).toBe('on land, in water, underground')
    expect(factWords('de', 'bird', 'mass', '102.7 g')).toBe('102,7 g')
    expect(factWords('en', 'bird', 'mass', '102.7 g')).toBe('102.7 g')
    expect(factWords('de', 'plant', 'height', '1.5 m')).toBe('bis 1,5 m')
    expect(factWords('de', 'bird', 'lifespan', '21.8 wild')).toBe('bis 21,8 Jahre (frei lebend)')
    expect(factWords('en', 'mammal', 'reproduction', 'litter 4 · perYear 2')).toBe('litter of 4 young · 2 litters a year')
    expect(factWords('de', 'fungus', 'edibility', 'medicinal, edible, poisonous')).toBe('giftig, essbar')
    expect(factWords('en', 'plant', 'flowering', 'Mai–Okt')).toBe('May–Oct')
  })
})

describe('sheetFor (sheets.mjs port)', () => {
  it('Salamandra salamandra de: the 13 full lines and the 6 eco lines of sheets.json, id for id', () => {
    const s = sheetFor(salamandra, 'de', REGION)
    // Preserve the historical grill fixture; the new locale contract falls back to the scientific name.
    const f = JSON.parse(JSON.stringify(fixture('Salamandra salamandra').de).replaceAll('Domestic Cat', 'Felis catus'))
    expect(s.full).toEqual(f.full)
    expect(s.eco).toEqual(f.eco)
    expect(s.unfetched).toBe(0)
  })
  it('Salamandra salamandra en: the English sheet is written from English words and months, never translated', () => {
    const s = sheetFor(salamandra, 'en', REGION)
    const f = fixture('Salamandra salamandra').en
    expect(s.full).toEqual(f.full)
    expect(s.eco).toEqual(f.eco)
  })
  it('the run region\'s month line comes first in the full sheet and alone in the eco sheet', () => {
    const s = sheetFor(salamandra, 'de', 'Südwestpfalz')
    expect(s.full.filter((l) => l.key.startsWith('months.')).map((l) => l.key)).toEqual(['months.Südwestpfalz', 'months.Mainz-Bingen'])
    expect(s.eco.filter((l) => l.key.startsWith('months.')).map((l) => l.key)).toEqual(['months.Südwestpfalz'])
  })
  it('eco: named partner, in-set or ≥ 2 records (metaweb copies count there, not in the Beleg count), cap 8, one line per edge', () => {
    const many: SheetEdge[] = Array.from({ length: 12 }, (_, i) => edge('visitsFlowersOf', `Plantus ${i}`, { de: `Pflanze ${i}` }, i < 6, { iNat: 3 + i }))
    const t: SheetTaxon = { ...salamandra, facts: null, regions: [], edges: [...many, edge('eats', 'Nameless sp.', {}, false, { iNat: 9 }), edge('eats', 'Thin sp.', { de: 'Dünn' }, false, { iNat: 1, 'Reji Chacko': 1 })] }
    const s = sheetFor(t, 'de', REGION)
    expect(s.eco.length).toBe(ECO_CAP)
    expect(s.eco.every((l) => l.key === 'globi.visitsFlowersOf')).toBe(true)
    expect(s.eco[0]!.text).toBe('besucht Blüten von: Pflanze 5 (Plantus 5) — 8 GloBI-Belege.') // in-set first, then by real records
    expect(records({ studies: { iNat: 1, 'Reji Chacko': 1 } })).toBe(2)
    const thin = sheetFor({ ...t, edges: [edge('eats', 'Thin sp.', { de: 'Dünn' }, false, { iNat: 1, 'Reji Chacko': 1 })] }, 'de', REGION)
    expect(thin.eco.map((l) => l.text)).toEqual(['frisst: Dünn (Thin sp.) — 1 GloBI-Beleg.'])
  })
  it('Amanita muscaria shape: no eco facts, no surviving edge → 1 eco line, under the threshold of 3', () => {
    const amanita: SheetTaxon = { gbifKey: 5240355, sciName: 'Amanita muscaria', rank: 'species', tile: 'fungus', class: 'Agaricomycetes', order: 'Agaricales', iucn: null, commonNames: { de: 'Fliegenpilz', en: 'Fly agaric' }, facts: { edibility: { value: 'poisonous, psychoactive', source: 'Wikidata' } }, regions: [salamandra.regions[1]!], edges: Array.from({ length: 8 }, (_, i) => edge('eatenBy', `Fly ${i}`, {}, false, { iNat: 1 }, false)) }
    const s = sheetFor(amanita, 'de', REGION)
    expect(s.eco.map((l) => l.key)).toEqual(['months.Mainz-Bingen'])
    expect(s.eco.length).toBeLessThan(MIN_LINES)
    expect(s.full.map((l) => l.key)).toEqual(['taxon', 'name', 'name', 'edibility', 'months.Mainz-Bingen'])
  })
  it('unfetched: edges without studies (before 0028) stay in the sheet and are counted', () => {
    const s = sheetFor({ ...salamandra, edges: [edge('eats', 'Lumbricidae', {}, false, {}), edge('eatenBy', 'Natrix helvetica', { de: 'Barrenringelnatter' }, true, {})] }, 'de', REGION)
    expect(s.unfetched).toBe(2)
    expect(s.full.some((l) => l.key === 'globi.eats')).toBe(true)
    expect(s.eco.find((l) => l.key === 'globi.eatenBy')!.text).toContain('0 GloBI-Belege')
  })
  it('inputHash covers both languages and both sheets; a changed fact or edge changes it', () => {
    const h = inputHash(sheetsFor(salamandra, REGION))
    expect(h).toMatch(/^[0-9a-f]{40}$/)
    expect(inputHash(sheetsFor(salamandra, REGION))).toBe(h)
    expect(inputHash(sheetsFor({ ...salamandra, facts: { ...salamandra.facts, mass: { value: '37 g', source: 'AmphiBIO' } } }, REGION))).not.toBe(h)
    expect(inputHash(sheetsFor({ ...salamandra, edges: salamandra.edges.slice(1) }, REGION))).not.toBe(h)
  })
})
