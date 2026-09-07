import { describe, expect, it } from 'vitest'
import { codeMail, maskEmail } from './mail'

describe('mail (handoff 0020 E4, 0025 A6)', () => {
  it('masks the address to first letter and domain for the dev log', () => {
    expect(maskEmail('sven@example.org')).toBe('s…@example.org')
    expect(maskEmail('a@b.de')).toBe('a…@b.de')
    expect(maskEmail('odd')).toBe('o…')
  })
  it('puts the code in subject, text and html', () => {
    const m = codeMail('123456', 'de')
    expect(m.subject).toBe('123456 ist dein Code für den Atlas')
    expect(m.text).toContain('123456')
    expect(m.html).toContain('123456')
  })
})
