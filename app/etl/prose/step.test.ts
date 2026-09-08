// The writer's output (handoff 0028 A): `assemble` builds exactly Track B's `Prose` shape (src/server/prose.ts) from the
// sheets and the validated drafts with their audits. Pure: no DB.
import { describe, expect, it } from 'vitest'
import type { Sheets } from './sheet'
import { assemble, type Written } from './step'
import type { Audit, Draft } from './validate'

const line = (id: string, text: string, source = 'AmphiBIO') => ({ id, key: 'x', source, text })
const sheets: Sheets = {
  de: { full: [line('F1', 'Nahrung: Gliederfüßer.'), line('F2', 'Länge: 28 cm.'), line('F3', 'wird gefressen von: Y.', 'GloBI')], eco: [line('F1', 'Nahrung: Gliederfüßer.'), line('F2', 'wird gefressen von: Y — 10 GloBI-Belege.', 'GloBI')], unfetched: 0 },
  en: { full: [line('F1', 'Diet: arthropods.'), line('F2', 'Length: 28 cm.'), line('F3', 'is eaten by: Y.', 'GloBI')], eco: [line('F1', 'Diet: arthropods.'), line('F2', 'is eaten by: Y — 10 GloBI records.', 'GloBI')], unfetched: 0 },
}
const draft = (text: string, ...cites: string[]): Draft => ({ paragraphs: [{ sentences: [{ text, cites }] }] })
const audit = (...verdicts: Audit['sentences'][number]['verdict'][]): Audit => ({ sentences: verdicts.map((verdict, i) => ({ n: i + 1, verdict })) })
const full: Written[] = [
  { lang: 'de', variant: 'full', draft: { paragraphs: [{ sentences: [{ text: 'Frisst Gliederfüßer.', cites: ['F1'] }, { text: 'Wird 28 cm lang.', cites: ['F2'] }] }, { sentences: [{ text: 'Y ist als Fressfeind verzeichnet.', cites: ['F3'] }] }] }, audit: audit('supported', 'supported', 'partial') },
  { lang: 'en', variant: 'full', draft: draft('Eats arthropods.', 'F1', 'F2'), audit: audit('unsupported') },
]
const eco: Written[] = [
  { lang: 'de', variant: 'eco', draft: draft('Y ist als Fressfeind verzeichnet.', 'F2'), audit: audit('supported') },
  { lang: 'en', variant: 'eco', draft: draft('Y is recorded as a predator.', 'F2'), audit: audit('supported') },
]
const AT = '2026-09-07T10:00:00.000Z'

describe('assemble (Track B shape)', () => {
  it('has exactly the keys of src/server/prose.ts, in Track B order', () => {
    expect(Object.keys(assemble(sheets, [...full, ...eco], AT))).toEqual(['de', 'en', 'eco', 'facts', 'ecoFacts', 'model', 'judged', 'at'])
  })
  it('keeps text and cites verbatim, facts per language without the sheet key, judged summed over every audit', () => {
    const p = assemble(sheets, [...full, ...eco], AT)
    expect(p.de).toEqual({ paragraphs: [{ sentences: [{ text: 'Frisst Gliederfüßer.', cites: ['F1'] }, { text: 'Wird 28 cm lang.', cites: ['F2'] }] }, { sentences: [{ text: 'Y ist als Fressfeind verzeichnet.', cites: ['F3'] }] }] })
    expect(p.en).toEqual({ paragraphs: [{ sentences: [{ text: 'Eats arthropods.', cites: ['F1', 'F2'] }] }] })
    expect(p.eco.en).toEqual({ paragraphs: [{ sentences: [{ text: 'Y is recorded as a predator.', cites: ['F2'] }] }] })
    expect(p.facts.de).toEqual([{ id: 'F1', source: 'AmphiBIO', text: 'Nahrung: Gliederfüßer.' }, { id: 'F2', source: 'AmphiBIO', text: 'Länge: 28 cm.' }, { id: 'F3', source: 'GloBI', text: 'wird gefressen von: Y.' }])
    expect(p.facts.en[2]).toEqual({ id: 'F3', source: 'GloBI', text: 'is eaten by: Y.' })
    expect(p.ecoFacts?.de.map((f) => f.id)).toEqual(['F1', 'F2'])
    expect(p.ecoFacts?.en[1]?.text).toBe('is eaten by: Y — 10 GloBI records.')
    expect(p.judged).toEqual({ supported: 4, partial: 1, unsupported: 1 })
    expect(p.model).toBe('claude-sonnet-5')
    expect(p.at).toBe(AT)
  })
  it('without an eco text: eco.de/en null and ecoFacts null, the full facts still there', () => {
    const p = assemble(sheets, full, AT)
    expect(p.eco).toEqual({ de: null, en: null })
    expect(p.ecoFacts).toBeNull()
    expect(p.facts.en).toHaveLength(3)
    expect(p.judged).toEqual({ supported: 2, partial: 1, unsupported: 1 })
  })
  it('the eco cites are not renamed: an eco F2 is the eco sheet line, not the full sheet one', () => {
    const p = assemble(sheets, [...full, ...eco], AT)
    const id = p.eco.de!.paragraphs[0]!.sentences[0]!.cites[0]!
    expect(p.ecoFacts!.de.find((f) => f.id === id)?.text).toBe('wird gefressen von: Y — 10 GloBI-Belege.')
    expect(p.facts.de.find((f) => f.id === id)?.text).toBe('Länge: 28 cm.')
  })
})
