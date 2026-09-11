// Production-browser coverage for issue #38. The four gallery shapes are inserted only into the guarded disposable
// dex_check_* database, and synthetic image responses keep the check independent of upstream hosts and API budgets.
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { ownedDebugPort, stopOwnedProcess } from './owned-process.mjs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import pg from 'pg'

const [base = 'http://localhost:3002'] = process.argv.slice(2)
const database = new URL(process.env.DATABASE_URL ?? '')
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname) || !['localhost', '127.0.0.1'].includes(database.hostname) || !/^\/dex_check_[a-z0-9_]+$/.test(database.pathname)) {
  throw new Error('Gallery checks require localhost and a local dex_check_* disposable database')
}

// Stay outside every integration-test range, so developers can run the suites repeatedly against one disposable DB.
const keys = { zero: 1900038000, one: 1900038001, two: 1900038002, twelve: 1900038012 }
const taxonId = (count) => `00000000-0038-4000-8000-${String(count).padStart(12, '0')}`
const assetId = (count, position) => `00000000-0038-4001-${String(count).padStart(4, '0')}-${String(position).padStart(12, '0')}`
const client = new pg.Client({ connectionString: database.toString() })
await client.connect()
try {
  await client.query('BEGIN')
  for (const [shape, key] of Object.entries(keys)) {
    const count = shape === 'zero' ? 0 : shape === 'one' ? 1 : shape === 'two' ? 2 : 12
    const { rows } = await client.query('SELECT id FROM "Taxon" WHERE "id" = $1 OR "gbifKey" = $2', [taxonId(count), key])
    assert.equal(rows.length, 0, 'reserved gallery identity must be absent; never overwrite existing rows')
    await client.query(`INSERT INTO "Taxon" ("id", "gbifKey", "sciName", "commonNames", "rank", "tile", "updatedAt")
      VALUES ($1, $2, $3, $4::jsonb, 'species', 'bird', now())
      ON CONFLICT ("gbifKey") DO UPDATE SET "sciName" = excluded."sciName", "commonNames" = excluded."commonNames"`,
    [taxonId(count), key, `Gallery fixture ${count}`, JSON.stringify({ en: `Gallery fixture ${count}`, de: `Galerie-Test ${count}` })])
    await client.query('DELETE FROM "Asset" WHERE "taxonId" = $1', [taxonId(count)])
    for (let position = 0; position < count; position++) {
      const broken = count === 12 && position === 4
      await client.query(`INSERT INTO "Asset" ("id", "kind", "position", "url", "author", "licence", "licenceUrl", "sourceUrl", "origin", "caption", "taxonId")
        VALUES ($1, 'image', $2, $3, $4, 'CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/', $5, 'commons', $6, $7)`,
      [assetId(count, position), position, `https://gallery.test/${broken ? 'broken' : `${count}-${position + 1}`}.svg`, `Gallery author ${count}-${position + 1}`, `https://gallery.test/source/${count}-${position + 1}`, `Gallery image ${position + 1}`, taxonId(count)])
    }
  }
  await client.query('COMMIT')
} catch (error) { await client.query('ROLLBACK'); throw error }
finally { await client.end() }

const profile = mkdtempSync(join(tmpdir(), 'dex-gallery-'))
const evidence = process.env.GALLERY_EVIDENCE_DIR || ''
if (evidence) mkdirSync(evidence, { recursive: true })
const chrome = process.env.CHROME ?? (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome')
const proc = (await import('node:child_process')).spawn(chrome, ['--headless=new', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let ws
try {
  const port = await ownedDebugPort(proc, profile)
  let target
  for (let i = 0; i < 200 && !target; i++) {
    target = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json()).then((rows) => rows.find((row) => row.type === 'page')).catch(() => null)
    if (!target) await sleep(100)
  }
  assert.ok(target, 'Chrome starts within 20 seconds')
  ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let id = 0
  const pending = new Map()
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#59735d"/><circle cx="400" cy="265" r="125" fill="#dce7d6"/><path d="M290 370 Q400 210 510 370" fill="#b3cba9"/><text x="400" y="520" text-anchor="middle" font-size="42" fill="white">Standkreis gallery</text></svg>`).toString('base64')
  const call = (method, params = {}) => new Promise((resolve, reject) => { const key = ++id; pending.set(key, { resolve, reject }); ws.send(JSON.stringify({ id: key, method, params })) })
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data)
    if (message.id) {
      const task = pending.get(message.id)
      if (!task) return
      pending.delete(message.id)
      if (message.error) task.reject(new Error(JSON.stringify(message.error)))
      else task.resolve(message.result)
      return
    }
    if (message.method === 'Fetch.requestPaused') {
      const broken = message.params.request.url.endsWith('/broken.svg')
      void call('Fetch.fulfillRequest', { requestId: message.params.requestId, responseCode: broken ? 404 : 200,
        responseHeaders: [{ name: 'content-type', value: 'image/svg+xml' }, { name: 'access-control-allow-origin', value: '*' }], body: broken ? '' : svg })
    }
  }
  const evaluate = async (expression) => {
    const value = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (value.exceptionDetails) throw new Error(JSON.stringify(value.exceptionDetails))
    return value.result?.value
  }
  const selector = (value) => `document.querySelector(${JSON.stringify(value)})`
  const wait = async (expression, label = expression) => {
    const deadline = Date.now() + 30_000
    while (Date.now() < deadline) { if (await evaluate(`!!(${expression})`)) return; await sleep(100) }
    throw new Error(`Timed out: ${label}`)
  }
  const navigate = async (key, locale = 'en') => {
    await call('Page.navigate', { url: `${base}/${locale}/species/${key}` })
    await wait(`${selector('[data-testid=species]')} && Object.keys(${selector('[data-testid=species]')}).some(k => k.startsWith('__reactFiber'))`, `species ${key} hydrates`)
  }
  const key = async (name) => {
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code: name })
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: name })
  }
  const position = (value) => wait(`${selector('[data-testid=gallery-position]')}?.textContent === ${JSON.stringify(value)}`, value)
  const click = async (value) => { await evaluate(`${selector(value)}.click()`); await sleep(100) }
  const nativeScrollForward = async () => {
    const box = await evaluate(`(() => { const r = ${selector('[data-testid=slider]')}.getBoundingClientRect(); return { y: r.top + r.height / 2, left: r.left, right: r.right } })()`)
    await call('Input.dispatchMouseEvent', { type: 'mouseWheel', x: (box.left + box.right) / 2, y: box.y, deltaX: box.right - box.left, deltaY: 0 })
  }
  const shot = async (name) => {
    if (!evidence) return
    const capture = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    writeFileSync(join(evidence, `${name}.png`), Buffer.from(capture.data, 'base64'))
  }

  await call('Page.enable')
  if (process.env.BROWSER_JOURNEY_ID) await call('Network.setCookie', { name: 'dex_id', value: process.env.BROWSER_JOURNEY_ID, url: base, httpOnly: true, sameSite: 'Lax' })
  await call('Fetch.enable', { patterns: [{ urlPattern: 'https://gallery.test/*', requestStage: 'Request' }] })
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await call('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 1, mobile: true })

  await navigate(keys.zero)
  assert.equal(await evaluate(`document.querySelectorAll('[data-testid^=gallery-], [data-testid=slider-info]').length`), 0, 'zero images omit gallery controls, counter and attribution')
  assert.match(await evaluate('document.body.innerText'), /No image yet/, 'zero-image fallback is explicit')

  await navigate(keys.one)
  assert.equal(await evaluate(`document.querySelectorAll('[data-testid=gallery-previous], [data-testid=gallery-next], [data-testid=gallery-position]').length`), 0, 'one image omits navigation and counter')
  assert.equal(await evaluate(`${selector('[data-testid=slider] img')}.getAttribute('loading')`), 'eager', 'single lead is eager')
  assert.equal(await evaluate(`!!${selector('[data-testid=slider-info]')}`), true, 'single image keeps attribution')

  await navigate(keys.two)
  assert.equal(await evaluate(`document.querySelectorAll('[data-testid=gallery-slide]').length`), 2, 'two-image gallery preserves both slides')
  assert.equal(await evaluate(`Math.round(${selector('[data-testid=gallery-next]')}.getBoundingClientRect().width)`), 44, 'phone next target is 44px')
  assert.equal(await evaluate(`${selector('[data-testid=gallery-position]')}.getAttribute('aria-live')`), 'polite', 'position is a polite live announcement')
  assert.match(await evaluate(`getComputedStyle(${selector('[data-testid=slider]')}).scrollSnapType`), /^x/, 'native horizontal scroll snap is active')
  await nativeScrollForward(); await position('Image 2 of 2')
  await evaluate(`${selector('[data-testid=slider]')}.focus()`)
  await key('End'); await position('Image 2 of 2')
  assert.equal(await evaluate(`${selector('[data-testid=gallery-next]')}.disabled`), true, 'last control clamps at the end')
  await key('Home'); await position('Image 1 of 2')
  await navigate(keys.two, 'de')
  await position('Bild 1 von 2')

  await navigate(keys.twelve)
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('[data-testid=slider] img')].map(i => i.getAttribute('loading'))`), ['eager', ...Array(11).fill('lazy')], 'only the lead is eager')
  assert.equal(await evaluate(`document.querySelectorAll('[data-testid=gallery-slide]').length`), 12, '12-image cap remains navigable')
  await evaluate(`${selector('[data-testid=slider]')}.focus()`)
  await key('End'); await position('Image 12 of 12')
  assert.ok(await evaluate(`${selector('[data-testid=slider]')}.scrollLeft >= ${selector('[data-testid=slider]')}.clientWidth * 10.9`), 'End reaches the last native snap position')
  await key('Home'); await position('Image 1 of 12')
  for (let i = 0; i < 4; i++) { await key('ArrowRight'); await position(`Image ${i + 2} of 12`) }
  await wait(`${selector('[data-testid=gallery-slide]:nth-child(5)')}?.dataset.broken === 'true'`, 'broken fifth slide renders its own fallback')
  assert.equal(await evaluate(`document.querySelectorAll('[data-testid=gallery-slide]').length`), 12, 'broken non-lead does not remove or promote a slide')
  await key('ArrowRight'); await position('Image 6 of 12')
  await click('[data-testid=slider-info]')
  await wait(`${selector('[data-testid=source-row]')}?.textContent.includes('Gallery author 12-6')`, 'attribution follows the active image')
  await click('[data-testid=source-sheet] button')
  await evaluate(`${selector('[data-testid=slider]')}.scrollTo({ left: 999999, behavior: 'auto' })`)
  await position('Image 12 of 12')
  await shot('gallery-phone-360')

  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await navigate(keys.twelve)
  assert.ok(await evaluate(`${selector('[data-testid=species]')}.getBoundingClientRect().width <= 520`), 'desktop gallery keeps the readable page width')
  assert.equal(await evaluate(`Math.round(${selector('[data-testid=gallery-previous]')}.getBoundingClientRect().height)`), 44, 'desktop gallery control is 44px')
  await shot('gallery-desktop-1440')
  console.log(JSON.stringify({ gallery: 'pass', states: [0, 1, 2, 12], phone: '360x800', desktop: '1440x900', keyboard: ['ArrowLeft', 'ArrowRight', 'Home', 'End'], brokenNonLead: 'isolated', activeAttribution: 'pass', eagerLeadLazyRest: 'pass' }))
} finally {
  ws?.close()
  await stopOwnedProcess(proc, profile)
  const cleanup = new pg.Client({ connectionString: database.href })
  try {
    await cleanup.connect()
    await cleanup.query('DELETE FROM "Taxon" WHERE id = ANY($1::text[])', [[0, 1, 2, 12].map(taxonId)])
  } catch (error) { console.error('Gallery fixture cleanup failed:', error); process.exitCode = 1 }
  finally { await cleanup.end() }
}
