import { createTranslator } from 'next-intl'
import { describe, expect, it } from 'vitest'
import de from './de.json'
import en from './en.json'

// Handoff 0025 A7 (findings 0020 10): the adoption notice names the studied species when any came along. The pick is
// `IdentitySettings.tsx`'s `adoptedNotice`: `identity.adoptedStudies` when `studiesMerged > 0`, else `identity.adopted`.
const notice = (locale: 'de' | 'en', m: { sightingsMerged: number; studiesMerged: number }) => {
  const t = createTranslator({ locale, messages: locale === 'de' ? de : en, namespace: 'settings' })
  return m.studiesMerged > 0 ? t('identity.adoptedStudies', { sightings: m.sightingsMerged, studies: m.studiesMerged }) : t('identity.adopted', { sightings: m.sightingsMerged })
}

describe('identity.adopted notice (handoff 0025 A7)', () => {
  it('names sightings only when no study came along', () => {
    expect(notice('de', { sightingsMerged: 3, studiesMerged: 0 })).toBe('Verknüpft. 3 Sichtungen von hier übernommen.')
    expect(notice('en', { sightingsMerged: 1, studiesMerged: 0 })).toBe('Linked. One sighting from here carried over.')
  })
  it('names sightings and studied species when studies merged', () => {
    expect(notice('de', { sightingsMerged: 3, studiesMerged: 2 })).toBe('Verknüpft. 3 Sichtungen und 2 studierte Arten von hier übernommen.')
    expect(notice('de', { sightingsMerged: 0, studiesMerged: 1 })).toBe('Verknüpft. Keine Sichtung und eine studierte Art von hier übernommen.')
    expect(notice('en', { sightingsMerged: 2, studiesMerged: 1 })).toBe('Linked. 2 sightings and one studied species from here carried over.')
    expect(notice('en', { sightingsMerged: 0, studiesMerged: 4 })).toBe('Linked. No sightings and 4 studied species from here carried over.')
  })
})
