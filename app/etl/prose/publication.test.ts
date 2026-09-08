import { describe, expect, it } from 'vitest'
import { publicationProblems, validate } from './validate'
import { proseFor } from './step'
import { parseProseForRegion } from '../../src/server/prose'
import type { Driver } from './driver'
import type { ProseTaxon } from './load'

const lines = [1, 2, 3].map((n) => ({ id: `F${n}`, key: 'diet', source: 'fixture', text: 'Diet: insects.' }))
const sheets = { de: { full: lines, eco: [], unfetched: 0 }, en: { full: lines, eco: [], unfetched: 0 } }
const taxon = { gbifKey: 1, sciName: 'Test species', commonNames: {} } as ProseTaxon
const draft = { paragraphs: [{ sentences: [{ text: 'It eats insects.', cites: ['F1'] }] }] }
const driver = (verdict: string) => ({ name: 'fixture', draft: async () => ({ json: draft }), audit: async () => ({ json: { sentences: [{ verdict }] } }) }) as unknown as Driver

describe('prose publication boundary', () => {
  it('rejects malformed model JSON without throwing', () => {
    for (const bad of [null, {}, { paragraphs: [null] }, { paragraphs: [{ sentences: [null, { text: 42, cites: 'F1' }] }] }]) {
      expect(validate(bad, lines, { paragraphs: 3, words: 200 }).length).toBeGreaterThan(0)
    }
  })

  it('quarantines partial/unsupported drafts despite valid audit shape', async () => {
    for (const verdict of ['partial', 'unsupported']) {
      const result = await proseFor(taxon, sheets, 'A', driver(verdict), () => {})
      expect(result.prose).toBeNull()
      expect(result.invalid).toBe(2)
    }
    expect(publicationProblems({ sentences: [{ verdict: 'supported' }] }, 2)).not.toEqual([])
  })
  it('publishes only matching region and complete supported citation counts', async () => {
    const { prose } = await proseFor(taxon, sheets, 'A', driver('supported'), () => {})
    expect(prose).not.toBeNull()
    const stored = { ...prose, inputHash: 'version1' }
    const envelope = { version: 1, regions: { a: stored } }
    expect(parseProseForRegion(envelope, 'a')?.inputHash).toBe('version1')
    expect(parseProseForRegion(envelope, 'b')).toBeNull()
    expect(parseProseForRegion(stored, 'a')).toBeNull()
    expect(parseProseForRegion(envelope)).toBeNull()
    expect(parseProseForRegion({ version: 1, regions: { a: { ...stored, judged: { supported: 1, partial: 0, unsupported: 0 } } } }, 'a')).toBeNull()
  })
  it('blocks ecology before drafting when a direction template is missing', async () => {
    const eco = lines.map((line) => ({ ...line, key: 'globi.unknown' }))
    const result = await proseFor(taxon, { de: { ...sheets.de, eco }, en: { ...sheets.en, eco } }, 'A', driver('supported'), () => {})
    expect(result.prose).toBeNull()
    expect(result.noTemplate).toBe(2)
  })
})
