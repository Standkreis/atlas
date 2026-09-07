import { describe, expect, it } from 'vitest'
import { wingspanWords } from '../../etl/facts'
import { floweringWords } from '../../etl/gift'
import { licenceName, pickClip, seconds } from '../../etl/clip'
import { bulkFacts, dietFromShares, grams, metres, millimetres, table } from '../../etl/traits'

// Handoff 0021 D2/D3/D5: the value formats the page prints, the joins on the bulk files, the clip pick.
describe('formats (D2)', () => {
  it('metric strings with an ASCII decimal point', () => {
    expect(grams(103)).toBe('103 g'); expect(grams(9.55)).toBe('9.6 g'); expect(grams(5480)).toBe('5.5 kg')
    expect(millimetres(8)).toBe('8 mm'); expect(millimetres(128)).toBe('12.8 cm'); expect(millimetres(1420)).toBe('1.4 m')
    expect(metres(0.3)).toBe('30 cm'); expect(metres(1.5)).toBe('1.5 m'); expect(metres(25)).toBe('25 m')
    expect(wingspanWords([36])).toBe('36 cm'); expect(wingspanWords([80, 95])).toBe('80–95 cm'); expect(wingspanWords([222])).toBe('2.2 m'); expect(wingspanWords([100, 150])).toBe('1–1.5 m'); expect(wingspanWords([95, 110])).toBe('95 cm–1.1 m')
  })
  it('flowering months in German like the year strip, null on "variable"', () => {
    expect(floweringWords('May', 'Oct')).toBe('Mai–Okt'); expect(floweringWords('Jun', 'Jun')).toBe('Jun'); expect(floweringWords('Mar', undefined)).toBe('Mär')
    expect(floweringWords('variable', 'variable')).toBeNull(); expect(floweringWords(undefined, undefined)).toBeNull()
  })
})

describe('bulk files (D3)', () => {
  it('parses quoted CSV fields with the separator inside', () => {
    expect(table('a,b\r\n"x, y",2\r\n', ',')).toEqual([{ a: 'x, y', b: '2' }])
  })
  it('EltonTraits diet shares → the categories at 20 % or more, largest first, at most three', () => {
    expect(dietFromShares({ 'Diet-Inv': '50', 'Diet-Fruit': '30', 'Diet-Seed': '20', 'Diet-PlantO': '0', 'Diet-Vend': '0' })).toEqual(['invertebrates', 'fruit', 'seeds'])
    expect(dietFromShares({ 'Diet-Vend': '30', 'Diet-Vect': '30', 'Diet-Inv': '10' })).toEqual(['vertebrates'])
  })
  it('joins the Amsel, the Fuchs and the Grasfrosch by binomial, every fact with its dataset and licence', () => {
    const amsel = bulkFacts('bird', ['Turdus merula'])
    expect(amsel.mass).toEqual({ value: '103 g', source: 'AVONET', url: 'https://doi.org/10.6084/m9.figshare.16586228', licence: 'CC BY 4.0' })
    expect(amsel.migration?.value).toBe('resident'); expect(amsel.activity).toMatchObject({ value: 'diurnal', source: 'EltonTraits', licence: 'CC0 1.0' })
    const fuchs = bulkFacts('mammal', ['Vulpes vulpes'])
    expect(fuchs.mass?.source).toBe('EltonTraits'); expect(fuchs.length?.source).toBe('PanTHERIA'); expect(fuchs.activity?.value).toContain('nocturnal')
    const frosch = bulkFacts('amphibian', ['Rana temporaria'])
    expect(frosch.mass?.value).toBe('48 g'); expect(frosch.length?.value).toBe('11 cm'); expect(frosch.habitat?.value).toContain('terrestrial')
    expect(bulkFacts('bird', ['Nomen dubium'])).toEqual({}); expect(bulkFacts('plant', ['Urtica dioica'])).toEqual({})
  })
})

describe('the clip (D5)', () => {
  const rec = (o: Partial<{ id: string; type: string; lic: string; q: string; length: string; name: string }>) => ({ id: o.id ?? '1', rec: 'R', type: o.type ?? 'song', url: '', file: '', 'file-name': o.name ?? 'XC1.mp3', lic: o.lic ?? '//creativecommons.org/licenses/by-nc-sa/4.0/', q: o.q ?? 'A', length: o.length ?? '0:20' })
  it('song over call, at most 30 s when possible, the shortest, never under 5 s, never ND, never a WAV', () => {
    expect(pickClip([rec({ id: 'call', type: 'call', length: '0:08' }), rec({ id: 'song', length: '0:25' })])?.id).toBe('song')
    expect(pickClip([rec({ id: 'long', length: '1:10' }), rec({ id: 'short', length: '0:14' })])?.id).toBe('short')
    expect(pickClip([rec({ id: 'snippet', length: '0:06' }), rec({ id: 'phrase', length: '0:18' })])?.id).toBe('phrase')
    expect(pickClip([rec({ id: 'snippet', length: '0:06' }), rec({ id: 'long', length: '0:50' })])?.id).toBe('snippet')
    expect(pickClip([rec({ id: 'tiny', length: '0:04' }), rec({ id: 'ok', length: '0:40' })])?.id).toBe('ok')
    expect(pickClip([rec({ id: 'nd', lic: '//creativecommons.org/licenses/by-nd/4.0/' }), rec({ id: 'b', q: 'B' }), rec({ id: 'wav', name: 'XC1.wav' })])).toBeNull()
  })
  it('licence name and seconds', () => {
    expect(licenceName('//creativecommons.org/licenses/by-nc-sa/4.0/')).toBe('CC BY-NC-SA 4.0'); expect(licenceName('//creativecommons.org/publicdomain/zero/1.0/')).toBe('CC0 1.0')
    expect(seconds('1:01')).toBe(61); expect(seconds('0:14')).toBe(14)
  })
})
