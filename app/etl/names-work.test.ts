import { describe, expect, it } from 'vitest'
import { parseNamesArgs, summarizeNames } from './names-work'

const taxon = { id: 'taxon', gbifKey: 123, sciName: 'Turdus merula' }

describe('names-only Wikidata enrichment', () => {
  it('parses only explicit bounded scope arguments', () => {
    expect(parseNamesArgs(['--catalogue', 'cat', '--region', 'de-1', '--keys', '1,2', '--limit', '10', '--concurrency', '4', '--json'])).toEqual({
      catalogueVersionId: 'cat', region: 'de-1', keys: [1, 2], limit: 10, concurrency: 4, json: true,
    })
    for (const args of [[], ['--catalogue', 'cat', '--keys'], ['--catalogue', 'cat', '--keys', '1,no'], ['--catalogue', 'cat', '--limit', '0'], ['--catalogue', 'cat', '--concurrency', '9'], ['--catalogue', 'cat', '--force'], ['--catalogue', 'cat', '--json', '--json']]) {
      expect(() => parseNamesArgs(args)).toThrow()
    }
  })

  it('uses sitelinks while rejecting scientific labels', () => {
    expect(summarizeNames(taxon, { path: 'P846', item: { qid: 'Q1', rank: 'http://www.wikidata.org/entity/Q7432', deLabel: taxon.sciName, enLabel: taxon.sciName, jaLabel: 'クロウタドリ', dewiki: 'https://de.wikipedia.org/wiki/Amsel_(Vogel)', enwiki: 'https://en.wikipedia.org/wiki/Common_blackbird' } })).toMatchObject({
      outcome: 'matched', selected: { de: 'Amsel', en: 'Common blackbird', ja: 'クロウタドリ' }, source: { qid: 'Q1', path: 'P846', labels: { de: taxon.sciName }, sitelinks: { de: 'https://de.wikipedia.org/wiki/Amsel_(Vogel)' } },
    })
  })

  it('completes explicit scientific, non-species, and ambiguous fallbacks without choosing names', () => {
    expect(summarizeNames(taxon, { path: 'none', item: null })).toMatchObject({ outcome: 'scientific-fallback', selected: {}, reason: 'no Wikidata match' })
    expect(summarizeNames(taxon, { path: 'none', item: null, note: 'Q2 via P846 is not a species (genus)' })).toMatchObject({ outcome: 'non-species', selected: {}, source: { note: 'Q2 via P846 is not a species (genus)' } })
    expect(summarizeNames(taxon, { path: 'P846', item: { qid: 'Q3', deLabel: 'Amsel' }, note: '2 items via P846, took Q3' })).toMatchObject({ outcome: 'ambiguous', selected: {}, reason: '2 items via P846, took Q3', source: { qid: 'Q3', labels: { de: 'Amsel' } } })
    expect(summarizeNames(taxon, { path: 'name', item: { qid: 'Q4', deLabel: taxon.sciName, enLabel: taxon.sciName } })).toMatchObject({ outcome: 'scientific-fallback', selected: {} })
  })
})
