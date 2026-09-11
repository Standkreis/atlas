import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Measure the production-rendered values against their painted ancestor background. Checking
// classes alone missed text-night: a valid token that deliberately stays dark in both themes.
export async function checkGermanyContrast({ send, evaluate, wait, setTerritoryFixture, evidenceDir, locale }) {
  const initialTheme = await evaluate('document.documentElement.getAttribute("data-theme")')
  const results = []
  try {
    for (const unavailable of [false, true]) {
      await setTerritoryFixture(unavailable ? 'unavailable' : 'zero')
      await send('Page.reload')
      const expected = unavailable ? '—' : '0'
      await wait(`document.querySelector('[data-testid=germany-regions] dd')?.textContent.trim() === ${JSON.stringify(expected)}`, 'territory response rendered')
      for (const theme of ['light', 'dark']) {
        await evaluate(`document.documentElement.dataset.theme = ${JSON.stringify(theme)}`)
        for (const width of [390, 1280]) {
          await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width === 390 })
          const metrics = await evaluate(`(() => {
            const rgb = color => color.match(/[\\d.]+/g).map(Number)
            const luminance = color => rgb(color).slice(0, 3).map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
            return ['germany-regions', 'germany-sightings'].map(testId => {
              const value = document.querySelector('[data-testid=' + testId + '] dd')
              const foreground = getComputedStyle(value).color
              let ancestor = value, background
              do { background = getComputedStyle(ancestor).backgroundColor; ancestor = ancestor.parentElement } while (rgb(background)[3] === 0 && ancestor)
              const a = luminance(foreground), b = luminance(background)
              const rect = value.getBoundingClientRect()
              return { testId, text: value.textContent.trim(), foreground, background, contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), fits: rect.left >= 0 && rect.right <= innerWidth && document.documentElement.scrollWidth <= innerWidth }
            })
          })()`)
          for (const metric of metrics) {
            const label = `${locale} ${theme} ${width}px ${unavailable ? 'unavailable' : 'zero'} ${metric.testId}`
            assert.equal(metric.text, expected, `${label}: zero and unavailable remain distinct`)
            assert.ok(metric.contrast >= 4.5, `${label}: rendered contrast ${metric.contrast.toFixed(2)} is below 4.5:1 (${metric.foreground} on ${metric.background})`)
            assert.ok(metric.fits, `${label}: metric fits without horizontal overflow`)
            results.push({ locale, theme, width, unavailable, ...metric })
          }
          if (evidenceDir) {
            const { data } = await send('Page.captureScreenshot', { format: 'png' })
            writeFileSync(join(evidenceDir, `${locale}-germany-contrast-${theme}-${unavailable ? 'unavailable' : 'zero'}-${width}.png`), Buffer.from(data, 'base64'))
          }
        }
      }
    }
    if (evidenceDir) writeFileSync(join(evidenceDir, `${locale}-germany-contrast.json`), JSON.stringify(results, null, 2))
    console.log(`UX: ${locale} Germany neutral metrics passed ${results.length} rendered contrast checks (light/dark, zero/unavailable, phone/desktop)`)
  } finally {
    await setTerritoryFixture(null)
    await send('Page.reload')
    await wait(`document.querySelector('[data-testid=germany-progress]')?.dataset.state === 'ready'`, 'real progress query restored')
    await evaluate(initialTheme === null ? 'document.documentElement.removeAttribute("data-theme")' : `document.documentElement.dataset.theme = ${JSON.stringify(initialTheme)}`)
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  }
}
