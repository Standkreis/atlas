import { describe, expect, it } from 'vitest'
import { isMetaweb, pruneForProse, type Kind } from '../prune'
import { studyKey } from '../globi'
import grill from '../../scripts/prose-grill/sheets.json'

// Handoff 0028 / 0027 F1 F2 on the grill's fixtures: sheets.json holds every dropped edge of the twenty species with its
// rule, records, real count and studies (cut to 60 characters, enough for the METAWEB names), and the kept eco edges.
type Dropped = { kind: string; target: string; records: number; real: number; studies: string[]; drop: 'F1' | 'F2' }
type Fixture = { counts: { edges: number; full: { F1: number; F2: number; after: number }; eco: { after: number } }; dropped: Dropped[]; sheets: { de: { ecoEdges: { kind: string; target: string; real: number; records: number; studies: string[] }[]; eco: unknown[] } } }
const sheets = grill.sheets as unknown as Record<string, Fixture>

/** sheets.json cuts a citation to 60 characters; the one metaweb whose keyword sits beyond that (Redhead et al. 2018, "Potential landscape-scale pollinator networks across Great Britain") gets its tail back. */
const untruncate = (s: string) => (s.startsWith('Redhead, J.W.; Coombes, C.F.') ? `${s}… Potential landscape-scale pollinator networks across Great Britain` : s)
/** The `{ study: records }` map behind a fixture edge: metaweb copies spread over the metaweb studies, real records over the rest. */
const studiesOf = (e: { records: number; real: number; studies: string[] }) => {
  const m: Record<string, number> = {}
  const studies = e.studies.map(untruncate)
  const meta = studies.filter(isMetaweb), real = studies.filter((s) => !isMetaweb(s))
  meta.forEach((s, i) => (m[s] = i === 0 ? e.records - e.real - (meta.length - 1) : 1))
  real.forEach((s, i) => (m[s] = i === 0 ? e.real - (real.length - 1) : 1))
  return m
}
const edge = (e: { kind: string; records: number; real: number; studies: string[] }) => ({ kind: e.kind as Kind, real: e.real, studies: studiesOf(e) })

describe('METAWEB (F1)', () => {
  it('matches the two 0026 citations and the brief\'s keywords, nothing observational', () => {
    expect(isMetaweb('Reji Chacko, M., Albouy, C., Altermatt, F. (2024) trophiCH v1')).toBe(true)
    expect(isMetaweb('Maiorano, L., Montemaggiori, A. TETRA-EU 1.0')).toBe(true)
    expect(isMetaweb('A species-level trophic meta-web of European tetrapods')).toBe(true)
    expect(isMetaweb('http://iNaturalist.org is a place where you can record what you see')).toBe(false)
    expect(isMetaweb('Lintulaakso, K., Tatti, N. and Žliobaitė, I., 2023. Quantifying')).toBe(false)
  })
  it('studyKey drops the "Accessed at" tail and names the nameless "?"', () => {
    expect(studyKey({ study: 'Smith 2001. Accessed at https://x on 2024-01-01.' })).toBe('Smith 2001.')
    expect(studyKey({ study_title: 'GloBI' })).toBe('GloBI')
    expect(studyKey({})).toBe('?')
  })
})

describe('pruneForProse (F1, F2)', () => {
  it('F1: eats/eatenBy whose studies are all metawebs; F2: ≤ 1 real record from ≤ 1 real study; else kept', () => {
    expect(pruneForProse({ kind: 'eatenBy', real: 0, studies: { 'Maiorano TETRA-EU': 3 } })).toBe('F1')
    expect(pruneForProse({ kind: 'pollinates', real: 0, studies: { 'Reji Chacko trophiCH': 3 } })).toBe('F2') // not a trophic kind: F1 never, F2 yes
    expect(pruneForProse({ kind: 'eatenBy', real: 1, studies: { 'Reji Chacko': 6, iNaturalist: 1 } })).toBe('F2') // Rana ← Kuckuck: one real record plus six copies
    expect(pruneForProse({ kind: 'eats', real: 0, studies: {} })).toBe('F2') // the DB edge was not in GloBI's answer
    expect(pruneForProse({ kind: 'eats', real: 2, studies: { iNaturalist: 2 } })).toBeNull()
    expect(pruneForProse({ kind: 'eats', real: 2, studies: { 'Study A': 1, 'Study B': 1 } })).toBeNull()
    expect(pruneForProse({ kind: 'eatenBy', real: 10, studies: { 'Reji Chacko': 1, iNaturalist: 10 } })).toBeNull() // Salamandra ← Natrix helvetica
  })
  it('reproduces the grill\'s per-rule counts on every dropped edge of the twenty species', () => {
    for (const [name, f] of Object.entries(sheets)) {
      const byRule = { F1: 0, F2: 0, null: 0 }
      for (const d of f.dropped) byRule[pruneForProse(edge(d)) ?? 'null']++
      expect({ name, ...byRule }).toEqual({ name, F1: f.counts.full.F1, F2: f.counts.full.F2, null: 0 })
      for (const k of f.sheets.de.ecoEdges) expect(pruneForProse(edge(k)), `${name} keeps ${k.kind} ${k.target}`).toBeNull()
    }
  })
  it('Salamandra salamandra: 187 edges, 180 F1 + 2 F2 → 5 kept; Amanita muscaria: 8 F2 of 13, no eco line survives', () => {
    const s = sheets['Salamandra salamandra']!
    expect(s.counts.edges).toBe(187)
    expect(s.dropped.length).toBe(182)
    expect(s.dropped.filter((d) => pruneForProse(edge(d)) === 'F1').length).toBe(180)
    expect(s.dropped.filter((d) => pruneForProse(edge(d)) === 'F2').length).toBe(2)
    expect(s.counts.full.after).toBe(5)
    const a = sheets['Amanita muscaria']!
    expect(a.counts.edges).toBe(13)
    expect(a.dropped.map((d) => pruneForProse(edge(d)))).toEqual(Array(8).fill('F2'))
    expect(a.sheets.de.ecoEdges).toEqual([])
    expect(a.counts.eco.after).toBe(0)
  })
})
