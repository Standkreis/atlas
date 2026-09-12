import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { THEME_KEY, themeScript } from './appearance'

describe('server-owned pre-paint theme bootstrap', () => {
  it.each(['light', 'dark'])('applies saved %s before client modules are available', (theme) => {
    const document = { documentElement: { dataset: {} as Record<string, string> } }
    runInNewContext(themeScript, { document, localStorage: { getItem: (key: string) => {
      expect(key).toBe(THEME_KEY)
      return theme
    } } })
    expect(document.documentElement.dataset.theme).toBe(theme)
  })

  it.each([null, 'system', 'invalid', '</script><script>alert(1)</script>'])('keeps the system default for %s', (value) => {
    const document = { documentElement: { dataset: {} } }
    runInNewContext(themeScript, { document, localStorage: { getItem: () => value } })
    expect(document.documentElement.dataset).toEqual({})
  })

  it('tolerates unavailable storage without blocking page parsing', () => {
    expect(() => runInNewContext(themeScript, {
      localStorage: { getItem: () => { throw new Error('Storage unavailable') } },
    })).not.toThrow()
  })

  it('keeps the head bootstrap server-owned rather than a suspending client reference', () => {
    const layout = readFileSync(new URL('../app/[locale]/layout.tsx', import.meta.url), 'utf8')
    const shared = readFileSync(new URL('./appearance.ts', import.meta.url), 'utf8')
    expect(layout).not.toContain("from 'next/script'")
    expect(layout).toContain("import { themeScript } from '@/domain/appearance'")
    expect(layout).toMatch(/<head>[\s\S]*<script\s+id="dex-theme"\s+dangerouslySetInnerHTML=\{\{\s*__html:\s*themeScript\s*\}\}\s*\/>[\s\S]*<\/head>/)
    expect(shared).not.toMatch(/^['"]use client['"]/m)
    expect(shared).not.toMatch(/^import /m)
  })
})
