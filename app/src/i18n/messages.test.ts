import { describe, expect, it } from 'vitest'
import de from './de.json'
import en from './en.json'

// S4: de and en carry the same keys. A string that exists in one language only is a bug.
const keysOf = (obj: unknown, prefix = ''): string[] =>
  Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null ? keysOf(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  )

describe('locales', () => {
  it('de and en have the same keys', () => {
    expect(keysOf(en).sort()).toEqual(keysOf(de).sort())
  })
  // Handoff 0028 Track B: the prose label, the ⓘ sheet and the judge line, with the same placeholders in both languages.
  it('carry the species.prose keys', () => {
    expect(de.species.prose).toEqual({ label: expect.any(String), sheetTitle: expect.any(String), sheetHint: expect.any(String), judged: '{n} von {m} Sätzen geprüft' })
    expect(en.species.prose).toEqual({ label: expect.any(String), sheetTitle: expect.any(String), sheetHint: expect.any(String), judged: '{n} of {m} sentences checked' })
  })
})
