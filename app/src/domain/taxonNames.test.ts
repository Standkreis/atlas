import { describe, expect, it } from 'vitest'
import { taxonDisplayName, taxonNameParts, taxonNames } from './taxonNames'

describe('one taxon-name fallback', () => {
  const sciName = 'Turdus merula'
  it('prefers requested locale, German, English, lexical labelled language, then scientific', () => {
    const name = (names: unknown, locale = 'ja') => taxonDisplayName({ names, sciName }, locale)
    expect(name({ ja: 'クロウタドリ', de: 'Amsel', en: 'Blackbird' })).toBe('クロウタドリ')
    expect(name({ de: 'Amsel', en: 'Blackbird' })).toBe('Amsel')
    expect(name({ en: 'Blackbird' })).toBe('Blackbird')
    expect(name({ sv: 'Koltrast', fr: 'Merle noir' })).toBe('Merle noir')
    expect(name({ de: ' ', en: 4, fr: null })).toBe(sciName)
    expect(name(null)).toBe(sciName)
  })
  it('keeps distinct scientific/alternative names and ignores malformed legacy JSON', () => {
    expect(taxonNames(['bad'])).toEqual({})
    expect(taxonNames({ de: ' Amsel ', en: [], fr: { label: 'x' }, '': 'unknown' })).toEqual({ de: 'Amsel' })
    expect(taxonNameParts({ de: 'Amsel', en: 'Blackbird', fr: 'Amsel', ja: 'Turdus merula' }, sciName, 'de')).toEqual({ primary: 'Amsel', scientific: sciName, alternatives: [{ language: 'en', name: 'Blackbird' }] })
    expect(taxonNameParts({ de: 'turdus MERULA' }, sciName, 'de')).toEqual({ primary: sciName, scientific: null, alternatives: [] })
  })
})
