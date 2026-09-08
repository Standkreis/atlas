// Production browser regression checks. Use only a disposable fixture database: onboarding creates an identity.
// node scripts/check/ux.mjs http://localhost:3002 [de|en]
// CHROME=/path/to/chrome supports Linux CI. No paid API calls or external messages.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [base = 'http://localhost:3002', locale = 'en'] = process.argv.slice(2)
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Run UX checks against a local disposable server only')
const profile = mkdtempSync(join(tmpdir(), 'dex-ux-'))
const evidenceDir = process.env.BROWSER_EVIDENCE_DIR
if (evidenceDir) mkdirSync(evidenceDir, { recursive: true })
const port = 9300 + Math.floor(Math.random() * 500)
const chrome = process.env.CHROME ?? (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome')
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let chromeFailure
proc.on('error', (error) => { chromeFailure = error })
proc.on('exit', (code, signal) => { if (!chromeFailure) chromeFailure = new Error(`Chrome exited before connecting (${signal ?? code})`) })
let ws
try {
  let target
  for (let i = 0; i < 200 && !target && !chromeFailure; i++) {
    target = await fetch(`http://127.0.0.1:${port}/json`).then((r) => r.json()).then((rows) => rows.find((r) => r.type === 'page')).catch(() => null)
    if (!target) await sleep(100)
  }
  assert.ok(target, chromeFailure?.message ?? 'Chrome starts within 20 seconds')
  ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let id = 0
  const pending = new Map()
  const requests = []
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data), task = pending.get(data.id)
    if (data.method === 'Network.requestWillBeSent') requests.push({ url: data.params.request.url, type: data.params.type })
    if (data.method === 'Fetch.requestPaused') {
      // Validated reference metadata points at this reserved test host. Serve local fixture bytes;
      // the browser never contacts an upstream image API during the regression check.
      const body = readFileSync(new URL('../../public/onboarding/bird.webp', import.meta.url)).toString('base64')
      void send('Fetch.fulfillRequest', { requestId: data.params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'image/webp' }, { name: 'Access-Control-Allow-Origin', value: '*' }], body })
    }
    if (task) { pending.delete(data.id); if (data.error) task.reject(new Error(JSON.stringify(data.error))); else task.resolve(data.result) }
  }
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const key = ++id; pending.set(key, { resolve, reject }); ws.send(JSON.stringify({ id: key, method, params, sessionId })) })
  const evaluate = async (expression) => {
    const value = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (value.exceptionDetails) throw new Error(JSON.stringify(value.exceptionDetails))
    return value.result?.value
  }
  const wait = async (expression, label = expression) => {
    const deadline = Date.now() + 30_000
    while (Date.now() < deadline) { if (await evaluate(`(async () => !!(await (${expression})))()`)) return; await sleep(100) }
    throw new Error(`Timed out: ${label}`)
  }
  const selector = (s) => `document.querySelector(${JSON.stringify(s)})`
  const click = async (s) => { await wait(`${selector(s)} && !${selector(s)}.disabled`, s); await evaluate(`${selector(s)}.focus(); ${selector(s)}.click()`); await sleep(100) }
  const key = async (name, modifiers = 0) => {
    const native = name === 'Enter' ? { windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: '\r' } : {}
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code: name, modifiers, ...native })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: name, modifiers, ...native, text: undefined })
  }
  const actionFits = async (testId) => {
    for (const [width, height, mobile] of [[320, 568, true], [390, 844, true], [1440, 900, false]]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })
      assert.equal(await evaluate(`(() => { const r = ${selector(`[data-testid=${testId}]`)}.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && document.documentElement.scrollWidth <= innerWidth })()`), true, `${testId} reachable at ${width}x${height}`)
      if (evidenceDir) {
        await evaluate(`Promise.all([...document.images].map(image => image.decode().catch(() => {}))).then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))`)
        const { data } = await send('Page.captureScreenshot', { format: 'png' })
        writeFileSync(join(evidenceDir, `${locale}-${testId}-${width}.png`), Buffer.from(data, 'base64'))
      }
    }
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  }
  await send('Page.enable')
  await send('Network.enable')
  await send('Fetch.enable', { patterns: [{ urlPattern: 'https://atlas-fixture.invalid/*' }] })
  await send('Browser.setPermission', { permission: { name: 'geolocation' }, setting: 'denied', origin: base })
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__dexHydrationErrors = []
    const rememberHydrationError = (value) => {
      const text = typeof value === 'string' ? value : value?.message ?? String(value)
      if (/Hydration failed|server rendered HTML didn't match/i.test(text)) window.__dexHydrationErrors.push(text)
    }
    addEventListener('error', (event) => rememberHydrationError(event.error ?? event.message))
    addEventListener('unhandledrejection', (event) => rememberHydrationError(event.reason))
    const originalConsoleError = console.error
    console.error = (...args) => { args.forEach(rememberHydrationError); originalConsoleError.apply(console, args) }
  ` })
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  const firstPaint = await fetch(`${base}/${locale}/onboarding`).then((response) => response.text())
  assert.match(firstPaint, /data-testid="welcome-next"/, 'static HTML paints the welcome before hydration')
  assert.doesNotMatch(firstPaint, /data-testid="region-picker"/, 'static first paint has no region picker')
  await send('Page.navigate', { url: `${base}/${locale}/onboarding` })
  await wait(`${selector('[data-testid=welcome-next]')} && Object.keys(${selector('[data-testid=welcome-next]')}).some(k => k.startsWith('__reactProps'))`, 'hydrated branded welcome')
  assert.equal(await evaluate(`!!${selector('[data-testid=region-picker]')}`), false, 'first impression contains no region picker')
  await actionFits('welcome-next')
  await key('Tab')
  assert.equal(await evaluate('document.activeElement?.dataset.testid'), 'welcome-next', 'welcome primary action follows heading in keyboard order')
  await key('Enter')
  await wait(`${selector('[data-testid=region-search]')} && Object.keys(${selector('[data-testid=region-search]')}).some(k => k.startsWith('__reactProps'))`, 'hydrated region search')
  assert.equal(await evaluate('document.activeElement?.tagName'), 'H1', 'new screen heading receives focus')
  await click('[data-testid=onboarding-back]')
  await wait(selector('[data-testid=onboarding-welcome]'))
  await click('[data-testid=welcome-next]')
  assert.equal(await evaluate(`document.querySelectorAll('[data-testid=region-result]').length`), 0, 'picker does not render the regional catalogue by default')
  assert.equal(await evaluate(`${selector('[data-testid=region-next]')}.disabled`), true, 'region selection is intentional')
  await actionFits('region-next')
  assert.ok(await evaluate(`${selector('[data-testid=region-location]')}.previousElementSibling.textContent.length > 20`), 'location explanation precedes its action')
  await click('[data-testid=region-location]')
  await wait(`/location|standort/i.test(${selector('[role=alert]')}?.textContent ?? '')`, 'denied location is explained')
  await evaluate(`(() => { const input = ${selector('[data-testid=region-search]')}; const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(input, 'Mainz'); input.dispatchEvent(new Event('input', { bubbles: true })) })()`)
  await wait(`${selector('[data-testid=region-result]')} && Object.keys(${selector('[data-testid=region-result]')}).some(k => k.startsWith('__reactProps'))`, 'bounded region search result')
  await evaluate(`${selector('[data-testid=region-search]')}.focus()`)
  await key('Tab')
  await key('Tab')
  assert.equal(await evaluate(`document.activeElement?.getAttribute('data-testid')`), 'region-result', 'search result is keyboard reachable')
  await key('Enter')
  await send('Network.setBlockedURLs', { urls: ['*dex.set*'] })
  await click('[data-testid=region-next]')
  await wait(selector('[data-testid=onboarding-tiles]'))
  await wait(selector('[data-testid=onboarding-tiles] [role=alert] button'), 'failed group counts offer retry')
  assert.equal(await evaluate(`${selector('[data-testid=tiles-next]')}.disabled`), true, 'missing group counts cannot be saved')
  await send('Network.setBlockedURLs', { urls: [] })
  await click('[data-testid=onboarding-tiles] [role=alert] button')
  await wait(`!${selector('[data-testid=tiles-next]')}.disabled`, 'group count retry restores continuation')
  await actionFits('tiles-next')
  await click('[data-testid=onboarding-back]')
  await wait(selector('[data-testid=onboarding-region]'))
  await wait(`JSON.parse(localStorage.getItem('dex.queries') || 'null')?.json?.clientState?.queries?.some(q => q.queryKey[0].join('.') === 'dex.regions' && q.state.data?.length)`, 'regions persisted')
  await send('Page.reload')
  await wait(selector('[data-testid=onboarding-welcome]'))
  await click('[data-testid=welcome-next]')
  await wait(`${selector('[data-region]')} && Object.keys(${selector('[data-region]')}).some(k => k.startsWith('__reactProps'))`, 'recent region hydrates without the national list')
  assert.deepEqual(await evaluate('window.__dexHydrationErrors'), [], 'persisted regions hydrate without a server/client mismatch')
  await click('[data-region]')
  await click('[data-testid=region-next]')
  await wait(`${selector('[data-testid=tiles-next]')} && !${selector('[data-testid=tiles-next]')}.disabled`, 'region counts and identity available')
  assert.match(await evaluate(`${selector('[data-testid=chosen-region]')}.textContent`), /Mainz-Bingen/, 'selected region labels group counts')
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
  await wait(`${selector('[data-testid=tiles-next]')}.disabled`, 'offline save is unavailable')
  assert.match(await evaluate(`${selector('[data-testid=onboarding-tiles]')}.textContent`), /offline/i, 'onboarding explains offline limitation')
  await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
  await click('[data-testid=tiles-next]')
  await wait(`${selector('[data-testid=preview]')} && !${selector('[data-testid=ready-next]')}.disabled`, 'ready preview loads')
  await actionFits('ready-next')
  const previewSources = await evaluate(`Array.from(new Set([...document.querySelectorAll('[data-testid=preview] img')].map(image => image.currentSrc || image.src)))`)
  assert.equal(previewSources.length, 1, 'preview uses one shared lead image per demo taxon')
  assert.match(previewSources[0], /onboarding-lead-fixture/, 'preview uses the position-zero fixture lead')
  assert.equal(requests.some(({ url }) => /\/api\/trpc\/[^?]*taxon\./.test(url)), false, 'onboarding never requests full species or gallery data')
  assert.equal(requests.some(({ url }) => url.includes('onboarding-nonlead-sentinel')), false, 'onboarding does not fetch the non-lead fixture image')
  await click('[data-testid=onboarding-back]')
  await wait(selector('[data-testid=onboarding-tiles]'))
  await click('[data-testid=tiles-next]')
  await click('[data-testid=ready-next]')
  await actionFits('go')
  assert.equal(await evaluate(`/never leave|verlassen.*nie/.test(${selector('[data-testid=promises]')}.textContent)`), false, 'onboarding contains no false device-only location promise')
  await click('[data-testid=go]')
  await wait(selector('[data-testid=grid]'))
  await send('Page.navigate', { url: `${base}/${locale}/onboarding?change=1` })
  await wait(selector('[data-testid=onboarding-region]'), 'change mode skips the welcome')
  await click('[data-testid=cancel]')
  await wait(selector('[data-testid=grid]'), 'cancelling change mode returns to the atlas')
  await send('Page.navigate', { url: `${base}/${locale}/onboarding?change=1` })
  await wait(selector('[data-testid=onboarding-region]'))
  await click('[data-region]')
  await click('[data-testid=region-next]')
  await click('[data-tile=mammal]')
  assert.equal(await evaluate(`${selector('[data-tile=mammal]')}.checked`), false, 'groups remain intentional')
  await click('[data-testid=onboarding-back]')
  await click('[data-testid=region-next]')
  assert.equal(await evaluate(`${selector('[data-tile=mammal]')}.checked`), false, 'back navigation preserves unsaved group choice')
  await click('[data-testid=tiles-next]')
  await wait(selector('[data-testid=onboarding-ready]'))
  assert.equal(await evaluate(`!!${selector('[data-testid=ready-next]')}`), false, 'change mode skips commitments')
  await click('[data-testid=go]')
  await wait(selector('[data-testid=grid]'))
  assert.equal(await evaluate(`!!${selector('[data-testid=tab-quests]')}`), true, 'quests destination present')
  assert.ok(await evaluate(`${selector('[data-testid=tab-journal]')}.textContent.trim()`), 'navigation has visible labels')
  await click('[data-testid=tab-quests]')
  await wait(`/coming soon|kommt bald/i.test(${selector('main')}?.textContent ?? '')`, 'quests coming-soon state')
  await click('[data-testid=tab-dex]')
  await wait(selector('[data-testid=grid]'))
  await click('[data-testid=filter-button]')
  await wait(selector('[data-testid=drawer] [role=dialog]'))
  assert.equal(await evaluate(`${selector('[data-testid=drawer]')}.contains(document.activeElement)`), true, 'dialog takes focus')
  assert.equal(await evaluate(`!!${selector('main')}.closest('[inert]')`), true, 'background inert')
  assert.equal(await evaluate('document.body.style.overflow'), 'hidden', 'background scroll locked')
  for (let i = 0; i < 56; i++) {
    await key('Tab', i < 28 ? 0 : 1)
    assert.equal(await evaluate(`${selector('[data-testid=drawer]')}.contains(document.activeElement)`), true, 'Tab stays inside dialog')
  }
  await click('[data-testid=show-all]')
  await key('ArrowRight')
  assert.equal(await evaluate(`${selector('[data-testid=show-studied]')}.getAttribute('aria-checked')`), 'true', 'radio arrows update selection')
  await click('[data-testid=change-region]')
  await wait(selector('[data-testid=region-sheet]'))
  assert.equal(await evaluate(`${selector('[data-testid=drawer]')}.inert`), true, 'underlying dialog inert')
  await key('Escape')
  await wait(`!${selector('[data-testid=region-sheet]')}`)
  assert.equal(await evaluate(`document.activeElement === ${selector('[data-testid=change-region]')}`), true, 'nested close restores opener')
  assert.equal(await evaluate(`${selector('[data-testid=drawer]')}.inert`), false, 'parent dialog active again')
  await key('Escape')
  await wait(`!${selector('[data-testid=drawer]')}`)
  assert.equal(await evaluate(`document.activeElement === ${selector('[data-testid=filter-button]')}`), true, 'closing dialog restores trigger')
  assert.equal(await evaluate(`!!${selector('main')}.closest('[inert]')`), false, 'background interactive again')
  assert.equal(await evaluate('document.body.style.overflow'), '', 'scroll lock removed')
  console.log('UX: onboarding, navigation and keyboard dialogs passed')
  await send('Network.enable')
  await send('Network.setBlockedURLs', { urls: ['*journal.days*'] })
  await click('[data-testid=tab-journal]')
  await wait(selector('[role=alert]'), 'journal request failure is visible')
  assert.equal(await evaluate(`!!${selector('[data-testid=empty]')}`), false, 'failed journal does not claim to be empty')
  assert.equal(await evaluate(`!!${selector('[role=alert] button')}`), true, 'failed journal offers retry')
  console.log('UX: journal failure and retry state passed')
  await send('Network.setBlockedURLs', { urls: [] })
  await click('[role=alert] button')
  await wait(selector('[data-testid=empty]'), 'successful empty journal after retry')
  await click('[data-testid=tab-dex]')
  await wait(selector('[data-testid=grid] a'))
  await click('[data-testid=grid] a')
  await click('[data-testid=log]')
  await click('[data-testid=wildness-wild]')
  await click('[data-testid=save-submit]')
  await wait(selector('[data-testid=fill-sheet]'), 'manual save completion')
  await wait(`!${selector('[data-testid=fill-pending]')}`, 'server acknowledged sighting')
  await key('Escape')
  await wait(`!${selector('[data-testid=fill-sheet]')}`)
  await wait(`/^1\\s/.test(${selector('[data-testid=seen-count]')}?.textContent.trim() ?? '')`, 'one discovery counted')
  await click('[data-testid=tab-journal]')
  await wait(`${selector('[data-testid=row][data-kind=sighting]')} && !${selector('[data-testid=row][data-kind=sighting]')}.hasAttribute('data-queued')`, 'saved sighting appears in server journal')
  console.log('UX: manual save reached the server journal')
  const journalName = await evaluate(`${selector('[data-testid=row]')}.textContent.trim()`)
  await wait(`JSON.parse(localStorage.getItem('dex.queries') || 'null')?.json?.clientState?.queries?.some(q => q.queryKey[0].join('.') === 'journal.days' && q.state.data?.pages?.some(p => p.days?.some(d => d.rows?.length)))`, 'journal persisted')
  await click('[data-testid=tab-dex]')
  await wait(selector('[data-testid=grid] a'))
  await wait('!!navigator.serviceWorker.controller', 'service worker controls page')
  // Reload online once so all lazily requested route chunks pass through the active worker.
  await send('Page.reload')
  await wait(selector('[data-testid=grid] a'))
  await wait(`(async () => { const name = (await caches.keys()).find(n => n.startsWith('dex-shell-')); if (!name) return false; const keys = await (await caches.open(name)).keys(); return keys.some(k => new URL(k.url).pathname === '/${locale}/journal') })()`, 'journal route cached')
  const cellCount = await evaluate(`document.querySelectorAll('[data-testid=grid] [data-taxon]').length`)
  assert.ok(cellCount > 0, 'online atlas contains fixture species')
  const { targetInfos } = await send('Target.getTargets')
  const workers = []
  for (const target of targetInfos.filter((t) => t.type === 'service_worker' && t.url.startsWith(base))) {
    const { sessionId } = await send('Target.attachToTarget', { targetId: target.targetId, flatten: true })
    await send('Network.enable', {}, sessionId)
    workers.push(sessionId)
  }
  assert.ok(workers.length > 0, 'service worker sessions found for real offline emulation')
  const offline = { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }
  await send('Network.emulateNetworkConditions', offline)
  for (const worker of workers) await send('Network.emulateNetworkConditions', offline, worker)
  assert.equal(await evaluate(`fetch('/api/trpc/identity.me?batch=1&input=%7B%7D').then(() => false, () => true)`), true, 'API truly unreachable with worker network disabled')
  await send('Page.reload')
  await wait(selector('[data-testid=grid] a'), 'atlas reloads offline')
  assert.equal(await evaluate(`document.querySelectorAll('[data-testid=grid] [data-taxon]').length`), cellCount, 'offline atlas keeps every species')
  assert.match(await evaluate(`${selector('[data-testid=seen-count]')}.textContent.trim()`), /^1\s/, 'offline atlas retains discovery')
  await click('[data-testid=tab-journal]')
  await wait(selector('[data-testid=row][data-kind=sighting]'), 'journal opens offline')
  assert.equal(await evaluate(`${selector('[data-testid=row]')}.textContent.trim()`), journalName, 'offline journal retains saved sighting')
  console.log(JSON.stringify({ locale, viewport: '390x844', onboarding: 'pass', dialogs: 'pass', radioKeyboard: 'pass', navigation: 'pass', journalError: 'pass', manualSave: 'pass', offlineReload: 'pass', species: cellCount, workerSessions: workers.length }))
} finally {
  ws?.close()
  proc.kill()
  await new Promise((resolve) => { if (proc.exitCode !== null) resolve(); else { proc.once('exit', resolve); setTimeout(resolve, 2000) } })
  rmSync(profile, { recursive: true, force: true })
}
