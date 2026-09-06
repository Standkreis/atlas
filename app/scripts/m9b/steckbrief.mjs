// Handoff 0021, C2 C3 C5 on the production build, headless Chrome over CDP (as scripts/m18/regions.mjs; the offline half
// as scripts/m8a/offline.mjs). A fresh identity in Mainz-Bingen, then ten species pages (C2: the cells, their values,
// the ⓘ), an insect without facts and a bird with none (C3), the voice row: play → the <audio> reaches readyState ≥ 2,
// its ⓘ sheet, the row without network (C5).
// usage: node scripts/m9b/steckbrief.mjs [outDir] [baseUrl]   (LOCALE=en for the English shots)
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [outDir = '.', base = 'http://localhost:3002'] = process.argv.slice(2)
const locale = process.env.LOCALE ?? 'de'
const MB = '59037062-15d5-452e-99dc-785cbc408874' // Mainz-Bingen in the dev DB
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const out = { base, locale }
mkdirSync(outDir, { recursive: true })

// C2: the ten pages. C3: the two without a Steckbrief line of their own.
const PAGES = [
  { n: 'brennnessel', key: 7960979, expect: ['flowering', 'height', 'pollination', 'lifeform'] },
  { n: 'fliegenpilz', key: 8168319, expect: ['edibility', 'sporePrint'], box: true },
  { n: 'amsel', key: 2490719, expect: ['mass', 'wingspan', 'migration'], voice: true },
  { n: 'rotkehlchen', key: 2492462, expect: ['mass', 'diet', 'activity'], voice: true },
  { n: 'grasfrosch', key: 2426805, expect: ['length', 'habitat', 'diet'], voice: true },
  { n: 'eichhoernchen', key: 8211070, expect: ['mass', 'length', 'diet'] },
  { n: 'stieleiche', key: 2878688, expect: ['flowering', 'height'] },
  { n: 'sichelschrecke', key: 1686243, expect: [], voice: true, tile: 'insect' },
  { n: 'hauhechel-blaeuling', key: 5140214, expect: [], noFacts: true },
  { n: 'schwarzkehlchen', key: 4408759, expect: ['mass'], missing: true },
]

let cookie = ''
const trpc = async (path, input, method = 'POST') => {
  const r = method === 'GET'
    ? await fetch(`${base}/api/trpc/${path}?batch=1&input=${encodeURIComponent(JSON.stringify({ 0: { json: input ?? null } }))}`, { headers: { cookie } })
    : await fetch(`${base}/api/trpc/${path}?batch=1`, { method, headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ 0: { json: input } }) })
  const set = r.headers.get('set-cookie'); if (set && !cookie) cookie = set.split(';')[0]
  const j = await r.json()
  return { status: r.status, ...(j[0].result?.data?.json !== undefined ? { data: j[0].result.data.json } : { error: j[0].error?.json?.message }) }
}
const tiles = ['bird', 'insect', 'plant', 'fungus', 'mammal', 'amphibian', 'reptile', 'fish']
await trpc('identity.me', undefined, 'GET')
out.seed = await trpc('identity.setFilter', { regionId: MB, regionIds: [MB], tiles, nowOnly: false })

// ── Chrome over CDP, service workers attached ─────────────────────────────────────────────────────────────────────
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9222 + Math.floor(Math.random() * 500)
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required', `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/dex-m9b-${port}`, 'about:blank'], { stdio: 'ignore' })
let version
for (let i = 0; i < 50 && !version; i++) { await sleep(200); version = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json()).catch(() => undefined) }
const ws = new WebSocket(version.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
const workers = new Set()
let offline = false
const responses = [] // every network response of the page session: the clip's status, content type and size (C5)
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? { error: m.error }); pending.delete(m.id); return }
  if (m.method === 'Target.attachedToTarget' && m.params.targetInfo.type === 'service_worker') {
    workers.add(m.params.sessionId)
    raw('Network.enable', {}, m.params.sessionId).then(() => (offline ? setOffline(m.params.sessionId, true) : null))
  }
  if (m.method === 'Target.detachedFromTarget') workers.delete(m.params.sessionId)
  if (m.method === 'Network.responseReceived' && !m.sessionId?.startsWith('w')) responses.push({ url: m.params.response.url, status: m.params.response.status, type: m.params.response.headers['content-type'] ?? m.params.response.headers['Content-Type'], range: m.params.response.headers['content-range'], fromSW: m.params.response.fromServiceWorker })
}
const raw = (method, params = {}, sessionId) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params, sessionId })) })
const setOffline = (sessionId, on) => raw('Network.emulateNetworkConditions', { offline: on, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }, sessionId)
const { targetInfos } = await raw('Target.getTargets')
const page = targetInfos.find((t) => t.type === 'page')
const { sessionId } = await raw('Target.attachToTarget', { targetId: page.targetId, flatten: true })
await raw('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true })
const send = (method, params = {}) => raw(method, params, sessionId)
await send('Network.enable'); await send('Runtime.enable'); await send('Page.enable')
const [name, value] = cookie.split('=')
await send('Network.setCookie', { name, value, url: base })
const evaluate = (expression) => send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }).then((r) => r?.result?.value)
const waitFor = async (selector, t = 30_000) => { const s = Date.now(); while (Date.now() - s < t) { if (await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`)) return Date.now() - s; await sleep(50) }; return null }
const click = (selector) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true })()`)
const text = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)})?.innerText ?? null`)
const shot = async (n) => { const { data } = await send('Page.captureScreenshot', { format: 'png' }); const f = join(outDir, `${n}-${locale}.png`); writeFileSync(f, Buffer.from(data, 'base64')); console.error(f) }
const goto = async (path, sel) => { await send('Page.navigate', { url: `${base}/${locale}${path}` }); return waitFor(sel) }
const goOffline = async (on) => { offline = on; out.emulate = await setOffline(sessionId, on); for (const w of workers) await setOffline(w, on) }
const scrollTo = (selector) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -8); return true })()`)
const cells = () => evaluate(`[...document.querySelectorAll('[data-testid^="fact-"]')].filter((d) => d.dataset.testid !== 'fact-info' && d.dataset.testid !== 'fact-voice').map((d) => ({ k: d.dataset.testid.slice(5), label: d.children[0]?.innerText.trim(), value: d.children[1]?.innerText.trim() }))`)
const closeSheet = async () => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await sleep(300) }

await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })

// ── C2 C3 · the ten pages ────────────────────────────────────────────────────────────────────────────────────────
out.pages = []
for (const p of PAGES) {
  await goto(`/species/${p.key}`, '[data-testid=species]')
  await waitFor('[data-testid=sources]'); await sleep(600)
  const hasFacts = !!(await evaluate(`!!document.querySelector('[data-testid=facts]')`))
  const row = { ...p, title: await text('h1'), facts: hasFacts, cells: hasFacts ? await cells() : [], missing: hasFacts ? await evaluate(`document.querySelector('[data-testid=facts] p.text-ink-faint')?.innerText ?? null`) : null, voice: await text('[data-testid=fact-voice]'), box: await evaluate(`(() => { const b = document.querySelector('[data-testid=fungus-notice]'), f = document.querySelector('[data-testid=facts]'); return b && f ? (b.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING) === 4 : null })()`), sources: await text('[data-testid=sources]') }
  row.ok = p.expect.every((k) => row.cells.some((c) => c.k === k)) && (p.noFacts ? !hasFacts : hasFacts) && (!p.voice || !!row.voice) && (!p.missing || !!row.missing) && (!p.box || row.box === true)
  out.pages.push(row)
  if (p.box) await scrollTo('[data-testid=fungus-notice]'); else if (hasFacts) await scrollTo('[data-testid=facts]'); else await scrollTo('[data-testid=sources]')
  await sleep(200)
  await shot(`c2-${p.n}`)
  if (p.n === 'amsel') { // a bulk fact's ⓘ: dataset, licence, DOI
    await click('[data-testid=fact-mass] [data-testid=fact-info]'); await waitFor('[data-testid=source-sheet]'); await sleep(400)
    row.factSheet = await text('[data-testid=source-sheet]'); row.factSheetLinks = await evaluate(`[...document.querySelectorAll('[data-testid=source-sheet] a')].map((a) => a.href)`); await shot('c2-amsel-info'); await closeSheet()
  }
  if (p.n === 'brennnessel') { // a fact's ⓘ: dataset, licence, link
    await click('[data-testid=fact-flowering] [data-testid=fact-info]'); await waitFor('[data-testid=source-sheet]'); await sleep(400)
    row.factSheet = await text('[data-testid=source-sheet]'); await shot('c2-brennnessel-info'); await closeSheet()
  }
}

// ── C5 · the voice row plays, its ⓘ, the row without network ──────────────────────────────────────────────────────
await goto('/species/2490719', '[data-testid=fact-voice]'); await sleep(600)
await scrollTo('[data-testid=facts]'); await sleep(200)
out.c5 = { row: await text('[data-testid=fact-voice]'), src: await evaluate(`document.querySelector('[data-testid=voice-audio]')?.getAttribute('src')`), preload: await evaluate(`document.querySelector('[data-testid=voice-audio]')?.preload`) }
await click('[data-testid=voice-play]')
let state = null
for (let i = 0; i < 100; i++) { state = await evaluate(`(() => { const a = document.querySelector('[data-testid=voice-audio]'); return { readyState: a.readyState, paused: a.paused, currentTime: a.currentTime, duration: a.duration, error: a.error?.code ?? null } })()`); if (state.readyState >= 2 && state.currentTime > 0) break; await sleep(100) }
out.c5.afterPlay = state
out.c5.pressed = await evaluate(`document.querySelector('[data-testid=voice-play]')?.getAttribute('aria-pressed')`)
await shot('c5-playing')
await click('[data-testid=voice-play]'); await sleep(200)
out.c5.afterPause = await evaluate(`(() => { const a = document.querySelector('[data-testid=voice-audio]'); return { paused: a.paused, currentTime: a.currentTime } })()`)
out.c5.clipResponses = responses.filter((r) => r.url.endsWith('.mp3'))
await click('[data-testid=fact-voice] [data-testid=fact-info]'); await waitFor('[data-testid=source-sheet]'); await sleep(400)
out.c5.sheet = await text('[data-testid=source-sheet]')
out.c5.sheetLink = await evaluate(`[...document.querySelectorAll('[data-testid=source-sheet] a')].map((a) => a.href)`)
await shot('c5-voice-info'); await closeSheet()
// Offline: reload the page from the worker (it was visited online), the row says the clip waits.
await waitFor('[data-testid=species]'); await sleep(1500) // let the worker remember the page
await goOffline(true)
out.c5.probe = { onLine: await evaluate('navigator.onLine'), fetch: await evaluate(`fetch('/api/trpc/identity.me?batch=1&input=%7B%7D').then((r) => 'ok ' + r.status, (e) => 'failed: ' + e.message)`) }
const nav = await send('Page.navigate', { url: `${base}/${locale}/species/2490719` })
out.c5.offline = { nav: nav.errorText ?? 'ok', speciesMs: await waitFor('[data-testid=species]'), onLineAfterNav: await evaluate('navigator.onLine') }
// Headless Chrome drops the emulation on the cross-document navigation (navigator.onLine is true again): apply it once
// more, which fires the window's `offline` event, the path a phone takes when the radio goes off.
await goOffline(true)
Object.assign(out.c5.offline, { bannerMs: await waitFor('[data-testid=offline-banner]', 15_000), onLine: await evaluate('navigator.onLine'), url: await evaluate('location.href'), workers: workers.size })
await sleep(300)
out.c5.offline = { ...out.c5.offline, row: await text('[data-testid=fact-voice]'), playButton: await evaluate(`!!document.querySelector('[data-testid=voice-play]')`), banner: await text('[data-testid=offline-banner]') }
await scrollTo('[data-testid=facts]'); await sleep(200)
await shot('c5-offline')
await goOffline(false)

console.log(JSON.stringify(out, null, 2))
ws.close(); proc.kill()
process.exit(0)
