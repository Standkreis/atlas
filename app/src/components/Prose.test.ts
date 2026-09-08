import { createElement, type FunctionComponent } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl'
import { describe, expect, it } from 'vitest'
import de from '../i18n/de.json'
import en from '../i18n/en.json'
import { citedFacts, parseProse, type Prose as ProseData } from '../server/prose'
import { Prose } from './Prose'

// Handoff 0028 Track B: the Feuersalamander from 0027's P3 run, shaped as `Taxon.prose` (§🗄️). The eco sheet numbers
// its own lines (F1–F6), the full sheet F1–F12, so `ecoFacts` is set; `en` is null to test the skipped language.
const facts = {
  de: [
    { id: 'F1', source: 'GBIF', text: 'Wissenschaftlicher Name Salamandra salamandra; Rang Art; Klasse Amphibia, Ordnung Caudata; Gruppe: Amphibie.' },
    { id: 'F4', source: 'IUCN Red List', text: 'Status: VU (gefährdet).' },
    { id: 'F5', source: 'AmphiBIO', text: 'Nahrung: Gliederfüßer.' },
    { id: 'F7', source: 'AmphiBIO', text: 'Länge: 28 cm.' },
    { id: 'F8', source: 'AmphiBIO', text: 'Lebensraum: an Land, im Wasser, im Boden.' },
  ],
  en: [
    { id: 'F1', source: 'GBIF', text: 'Scientific name Salamandra salamandra; rank species; class Amphibia, order Caudata; group: amphibian.' },
    { id: 'F4', source: 'IUCN Red List', text: 'Status: VU (vulnerable).' },
    { id: 'F5', source: 'AmphiBIO', text: 'Diet: arthropods.' },
    { id: 'F7', source: 'AmphiBIO', text: 'Length: 28 cm.' },
    { id: 'F8', source: 'AmphiBIO', text: 'Habitat: on land, in water, underground.' },
  ],
}
const ecoFacts = {
  de: [
    { id: 'F1', source: 'AmphiBIO', text: 'Nahrung: Gliederfüßer.' },
    { id: 'F4', source: 'GBIF occurrences', text: 'Region Mainz-Bingen: 48 Meldungen in zehn Jahren; Hauptzeit „Mär–Mai · Aug–Dez“.' },
    { id: 'F5', source: 'GloBI', text: 'wird gefressen von: Barrenringelnatter (Natrix helvetica) — 10 GloBI-Belege.' },
  ],
  en: [
    { id: 'F1', source: 'AmphiBIO', text: 'Diet: arthropods.' },
    { id: 'F4', source: 'GBIF occurrences', text: 'Region Mainz-Bingen: 48 reports in ten years; main time "Mar–May · Aug–Dec".' },
    { id: 'F5', source: 'GloBI', text: 'is eaten by: barred grass snake (Natrix helvetica) — 10 GloBI records.' },
  ],
}
export const fixture: ProseData = {
  de: { paragraphs: [
    { sentences: [
      { text: 'Der Feuersalamander ist eine Amphibie aus der Ordnung der Schwanzlurche und wird bis 28 cm lang.', cites: ['F1', 'F7'] },
      { text: 'Er lebt an Land, im Wasser und im Boden und ernährt sich von Gliederfüßern.', cites: ['F8', 'F5'] },
    ] },
    { sentences: [{ text: 'Die Rote Liste der IUCN führt ihn als gefährdet.', cites: ['F4'] }] },
  ] },
  en: null,
  eco: {
    de: { paragraphs: [{ sentences: [
      { text: 'Der Feuersalamander ernährt sich von Gliederfüßern.', cites: ['F1'] },
      { text: 'Als Fressfeind ist die Barrenringelnatter (Natrix helvetica) verzeichnet.', cites: ['F5'] },
      { text: 'In Mainz-Bingen liegen 48 Meldungen aus zehn Jahren vor, mit Mär–Mai und Aug–Dez als Hauptzeit.', cites: ['F4'] },
    ] }] },
    en: { paragraphs: [{ sentences: [
      { text: 'The fire salamander eats arthropods.', cites: ['F1'] },
      { text: 'The barred grass snake is recorded as a predator.', cites: ['F5'] },
    ] }] },
  },
  facts,
  ecoFacts,
  inputHash: 'sha1',
  model: 'claude-sonnet-5',
  judged: { supported: 5, partial: 1, unsupported: 0 },
  at: '2026-09-07T10:00:00.000Z',
}

// A static server render is enough for the markup (no DOM in vitest): the provider's `children` goes as the third argument.
const Provider = NextIntlClientProvider as unknown as FunctionComponent<{ locale: string; messages: AbstractIntlMessages; timeZone: string }>
const render = (locale: 'de' | 'en', prose: ProseData | null, eco = false) =>
  renderToStaticMarkup(createElement(Provider, { locale, messages: locale === 'de' ? de : en, timeZone: 'Europe/Berlin' }, createElement(Prose, { prose, eco })))

describe('parseProse (0025 lesson: a cached shape never throws)', () => {
  it('returns null for null, old shapes and malformed rows', () => {
    for (const v of [null, undefined, 'text', 42, [], {}, { de: 'Der Feuersalamander' }, { de: { paragraphs: [] }, facts: [] }, { de: fixture.de }, { de: { paragraphs: [{ sentences: [{ text: 1, cites: [] }] }] }, facts: [] }, { de: fixture.de, facts: [{ id: 'F1' }] }])
      expect(parseProse(v), JSON.stringify(v)).toBeNull()
  })
  it('round-trips the fixture and keeps a flat fact list for both languages', () => {
    expect(parseProse(JSON.parse(JSON.stringify(fixture)))).toEqual(fixture)
    const flat = parseProse({ de: fixture.de, facts: facts.de })
    expect(flat?.facts).toEqual({ de: facts.de, en: facts.de })
    expect(flat?.ecoFacts).toBeNull()
    expect(flat?.eco).toEqual({ de: null, en: null })
    expect(flat?.judged).toBeNull()
  })
})

describe('citedFacts', () => {
  it('resolves the cites in prose order, each once, and skips an id the sheet lost', () => {
    expect(citedFacts(fixture.de!, facts.de).map((f) => f.id)).toEqual(['F1', 'F7', 'F8', 'F5', 'F4'])
    expect(citedFacts({ paragraphs: [{ sentences: [{ text: '', cites: ['F5', 'F99', 'F5'] }] }] }, facts.de).map((f) => f.id)).toEqual(['F5'])
  })
})

describe('<Prose> (handoff 0028 §🎨)', () => {
  it('renders nothing for null and for a language without text', () => {
    expect(render('de', null)).toBe('')
    expect(render('en', fixture)).toBe('')
    expect(render('en', { ...fixture, eco: { de: fixture.eco.de, en: null } }, true)).toBe('')
  })
  it('renders the paragraphs and source access without implying scientific verification', () => {
    const html = render('de', fixture)
    expect(html).toContain('data-testid="prose"')
    expect(html).toContain('<p class="text-[17px] leading-[1.45]">Der Feuersalamander ist eine Amphibie aus der Ordnung der Schwanzlurche und wird bis 28 cm lang. Er lebt an Land, im Wasser und im Boden und ernährt sich von Gliederfüßern.</p>')
    expect(html).toContain('<p class="mt-3 text-[17px] leading-[1.45]">Die Rote Liste der IUCN führt ihn als gefährdet.</p>')
    expect(html).toContain(de.species.prose.label)
    expect(html).not.toContain('5 von 6')
    expect(html).toContain('data-testid="prose-info"')
    expect(html).toContain('aria-label="Quellen des KI-Texts"')
    expect(html).not.toContain('data-testid="prose-sheet"') // closed until the tap
  })
  it('eco picks the Ökologie paragraph in the reader\'s language', () => {
    expect(render('de', fixture, true)).toContain('Als Fressfeind ist die Barrenringelnatter')
    const html = render('en', fixture, true)
    expect(html).toContain('data-testid="prose-eco"')
    expect(html).toContain('The barred grass snake is recorded as a predator.')
    // Aggregate checks belong in provenance, not the learning text.
    expect(html).toContain(en.species.prose.label)
    expect(html).not.toContain('sentences checked')
  })
  it('skips the judge count when the row has none', () => {
    const html = render('de', { ...fixture, judged: null })
    expect(html).toContain(de.species.prose.label)
    expect(html).not.toContain('geprüft')
  })
})
