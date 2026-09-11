// Production browser regression checks. Use only a disposable fixture database: onboarding creates an identity.
// node scripts/check/ux.mjs http://localhost:3002 [de|en]
// CHROME=/path/to/chrome supports Linux CI. No paid API calls or external messages.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { ownedDebugPort, stopOwnedProcess } from './owned-process.mjs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkGermanyContrast } from './germany-contrast.mjs'

const [base = 'http://localhost:3002', locale = 'en'] = process.argv.slice(2)
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Run UX checks against a local disposable server only')
const fullCatalogue = process.env.UX_FULL_CATALOGUE === '1'
const profile = mkdtempSync(join(tmpdir(), 'dex-ux-'))
const evidenceDir = process.env.BROWSER_EVIDENCE_DIR
if (evidenceDir) mkdirSync(evidenceDir, { recursive: true })
const chrome = process.env.CHROME ?? (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome')
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let chromeFailure
proc.on('error', (error) => { chromeFailure = error })
proc.on('exit', (code, signal) => { if (!chromeFailure) chromeFailure = new Error(`Chrome exited before connecting (${signal ?? code})`) })
let ws
let offlineSwitchRegionId = null
let offlineUnavailableRegionId = null
let territoryFixture = null
try {
  const port = await ownedDebugPort(proc, profile)
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
    if (data.method === 'Fetch.requestPaused' && data.params.request.url.includes('identity.germanyProgress')) {
      // Exercise zero and null-data rendering without editing the disposable catalogue or
      // changing text in the DOM. All other responses remain the real local server response.
      void (async () => {
        if (territoryFixture === null) return send('Fetch.continueResponse', { requestId: data.params.requestId })
        const response = await send('Fetch.getResponseBody', { requestId: data.params.requestId })
        const body = JSON.parse(response.base64Encoded ? Buffer.from(response.body, 'base64').toString() : response.body)
        for (const entry of Array.isArray(body) ? body : [body]) {
          const progress = entry.result?.data?.json
          if (progress?.countryCode === 'DE' && progress.catalogue) progress.territory = territoryFixture === 'unavailable' ? null : { regions: 362, germanSightings: 0, visitedRegions: 0 }
        }
        await send('Fetch.fulfillRequest', { requestId: data.params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(body)).toString('base64') })
      })().catch(error => { console.error(error); proc.kill('SIGTERM') })
    } else if (data.method === 'Fetch.requestPaused') {
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
  const externalMediaRequestCount = () => requests.filter(({ url, type }) => ['Fetch', 'Image'].includes(type) && !url.startsWith(base)).length
  const key = async (name, modifiers = 0) => {
    const native = name === 'Enter' ? { windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: '\r' } : {}
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code: name, modifiers, ...native })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: name, modifiers, ...native, text: undefined })
  }
  const regionalProgress = async () => {
    const expected = await evaluate(`(async () => {
      const api=async(path,input)=>{const r=await fetch('/api/trpc/'+path+(input?'?input='+encodeURIComponent(JSON.stringify({json:input})):''));if(!r.ok)throw new Error(path+' '+r.status);return(await r.json()).result.data.json};
      const me=await api('identity.me'),progress=await api('identity.progress');
      const set=await api('dex.set',{regionId:me.region.id,tiles:['bird','mammal','amphibian','reptile','fish','insect','plant','fungus'],nowOnly:false});
      const species=set.species.filter(t=>!progress.tiles.length||progress.tiles.includes(t.tile));
      return {region:me.region.id,possible:species.length,seen:species.filter(t=>progress.seen.includes(t.taxonId)).length,studied:species.filter(t=>progress.studied.includes(t.taxonId)).length};
    })()`)
    await wait(`${selector('[data-testid=region-card][data-active]')}?.dataset.possible===${JSON.stringify(String(expected.possible))}`, 'local denominator follows selected region and groups')
    const actual = await evaluate(`(() => {const d=${selector('[data-testid=region-card][data-active]')}.dataset;return {region:d.region,possible:+d.possible,seen:+d.seen,studied:+d.studied}})()`)
    assert.deepEqual(actual, expected, 'local progress intersects the selected region; national membership is independent')
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
  if (process.env.BROWSER_JOURNEY_ID) await send('Network.setCookie', { name: 'dex_id', value: process.env.BROWSER_JOURNEY_ID, url: base, httpOnly: true, sameSite: 'Lax' })
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
  assert.equal(await evaluate(`${selector('[data-testid=region-picker]')}.textContent.includes('⌕')`), false, 'onboarding region search has no leading search glyph')
  assert.equal(await evaluate(`getComputedStyle(${selector('[data-testid=region-search]')}).paddingLeft`), '16px', 'onboarding search uses normal input padding')
  assert.equal(await evaluate(`getComputedStyle(${selector('[data-testid=region-search]')}.parentElement.parentElement).backgroundColor`), 'rgba(0, 0, 0, 0)', 'onboarding search has no opaque header panel')
  await click('[data-testid=onboarding-back]')
  await wait(selector('[data-testid=onboarding-welcome]'))
  await click('[data-testid=welcome-next]')
  assert.equal(await evaluate(`document.querySelectorAll('[data-testid=region-result]').length`), 0, 'picker does not render the regional catalogue by default')
  assert.equal(await evaluate(`${selector('[data-testid=region-next]')}.disabled`), true, 'region selection is intentional')
  await actionFits('region-next')
  assert.ok(await evaluate(`${selector('[data-testid=region-location]')}.previousElementSibling.textContent.length > 20`), 'location explanation precedes its action')
  await click('[data-testid=region-location]')
  await wait(`/location|standort/i.test(${selector('[role=alert]')}?.textContent ?? '')`, 'denied location is explained')
  await evaluate(`(() => { const input = ${selector('[data-testid=region-search]')}; const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(input, 'Mainz-Bingen'); input.dispatchEvent(new Event('input', { bubbles: true })) })()`)
  await wait(`${selector('[data-testid=region-result]')}?.textContent?.includes('Mainz-Bingen') && Object.keys(${selector('[data-testid=region-result]')}).some(k => k.startsWith('__reactProps'))`, 'exact bounded region search result')
  assert.equal(await evaluate(`(() => { const button = ${selector('[data-testid=region-search-clear]')}; return !!button && !!button.getAttribute('aria-label') && button.classList.contains('text-ink-soft') && !button.classList.contains('text-white/75') })()`), true, 'typed search exposes an accessible ink-coloured clear control')
  for (const [width, height, mobile] of [[390, 844, true], [1440, 900, false]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth && ${selector('[data-testid=region-picker]')}.getBoundingClientRect().width <= innerWidth`), true, `onboarding region search stays bounded at ${width}x${height}`)
    if (evidenceDir) {
      const { data } = await send('Page.captureScreenshot', { format: 'png' })
      writeFileSync(join(evidenceDir, `${locale}-onboarding-region-search-${width}.png`), Buffer.from(data, 'base64'))
    }
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await click('[data-testid=region-search-clear]')
  assert.equal(await evaluate(`${selector('[data-testid=region-search]')}.value`), '', 'clear control empties the typed query')
  assert.equal(await evaluate(`document.querySelectorAll('[data-testid=region-result]').length`), 0, 'clear control resets search results')
  await evaluate(`(() => { const input = ${selector('[data-testid=region-search]')}; const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(input, 'Mainz-Bingen'); input.dispatchEvent(new Event('input', { bubbles: true })) })()`)
  await wait(`${selector('[data-testid=region-result]')}?.textContent?.includes('Mainz-Bingen')`, 'search works after clearing the query')
  await evaluate(`${selector('[data-testid=region-search]')}.focus()`)
  await key('Tab')
  assert.equal(await evaluate(`document.activeElement?.getAttribute('data-testid')`), 'region-search-clear', 'clear control is keyboard reachable')
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
  await wait(`(() => { const version = localStorage.getItem('dex.catalogue.version'); return !!version && JSON.parse(localStorage.getItem('dex.queries') || 'null')?.json?.clientState?.queries?.some(q => q.queryKey[0].join('.') === 'regions.personal' && q.state.data?.catalogueVersion === version && q.state.data?.recent?.length) })()`, 'versioned personal regions persisted')
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('dex.queries') || 'null')?.json?.clientState?.queries?.some(q => q.queryKey[0].join('.') === 'dex.regions') ?? false`), false, 'unversioned legacy region catalogue is not persisted after activation')
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
  requests.length = 0
  await click('[data-testid=tab-you]')
  await wait(`${selector('[data-testid=germany-progress]')}?.dataset.state === 'ready'`, 'ready Germany progress')
  assert.equal(await evaluate(`${selector('[data-testid=germany-discovered] dd')}.textContent.trim()`), '0', 'empty national discovery is a real zero')
  assert.equal(await evaluate(`${selector('[data-testid=germany-studied] dd')}.textContent.trim()`), '0', 'studied is separately labelled')
  assert.match(await evaluate(`${selector('[data-testid=germany-denominator]')}.textContent`), locale === 'de' ? /Arten in deutschen Regionalatlanten/ : /species in German regional atlases/, 'denominator is qualified')
  assert.equal(requests.some(({ url }) => /taxon\.page|sighting\.photos|gallery|asset/i.test(url)), false, 'summary requests no gallery or image payload')
  await checkGermanyContrast({ send, evaluate, wait, evidenceDir, locale, setTerritoryFixture: async (value) => {
    territoryFixture = value
    await send('Fetch.enable', { patterns: [{ urlPattern: 'https://atlas-fixture.invalid/*' }, { urlPattern: '*identity.germanyProgress*', requestStage: 'Response' }] })
  } })
  for (const [width, height, mobile] of [[320, 568, true], [390, 844, true], [1280, 900, false]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth && ${selector('[data-testid=germany-progress]')}.getBoundingClientRect().width <= Math.min(innerWidth, 520)`), true, `Profile stays bounded at ${width}x${height}`)
    if (evidenceDir) {
      const { data } = await send('Page.captureScreenshot', { format: 'png' })
      writeFileSync(join(evidenceDir, `${locale}-germany-progress-${width}.png`), Buffer.from(data, 'base64'))
    }
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await click('[data-testid=tab-dex]')
  await wait(selector('[data-testid=grid]'))
  console.log('UX: Germany progress passed empty, locale, payload, phone and desktop checks')
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
  await click('[data-testid=tab-you]')
  await wait(selector('[data-testid=display-name]'), 'profile opens')
  await click('[data-testid=change-region]')
  await wait(selector('[data-testid=region-sheet]'))
  await wait(`document.querySelectorAll('[data-testid=region-row]').length === 1`, 'region management renders only the saved region')
  for (const [width, height, mobile] of [[390, 844, true], [1440, 900, false]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth && ${selector('[data-testid=region-sheet] .sheet-panel')}.getBoundingClientRect().width <= Math.min(innerWidth, 520)`), true, `region management stays bounded at ${width}x${height}`)
    if (evidenceDir) {
      const { data } = await send('Page.captureScreenshot', { format: 'png' })
      writeFileSync(join(evidenceDir, `${locale}-profile-regions-${width}.png`), Buffer.from(data, 'base64'))
    }
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  const initialRegionId = await evaluate(`${selector('[data-testid=region-row]')}.dataset.region`)
  assert.equal(await evaluate(`${selector('[data-testid=region-remove]')}.disabled`), true, 'active final region cannot be removed')
  await click('[data-testid=region-add]')
  await wait(selector('[data-testid=region-picker-panel]'))
  assert.equal(await evaluate(`${selector('[data-testid=region-picker-panel]')}.textContent.includes('⌕')`), false, 'profile region search has no leading search glyph')
  assert.equal(await evaluate(`getComputedStyle(${selector('[data-testid=region-search]')}).paddingLeft`), '16px', 'profile region search uses normal input padding')
  assert.notEqual(await evaluate(`getComputedStyle(${selector('[data-testid=region-search]')}.parentElement.parentElement).backgroundColor`), 'rgba(0, 0, 0, 0)', 'profile search retains its sticky paper header')
  assert.equal(await evaluate(`document.querySelectorAll('[data-testid=region-result]').length`), 1, 'add-region picker shows only the saved region until search')
  if (fullCatalogue) {
    const searchFor = async (name) => {
      await evaluate(`(() => { const input = ${selector('[data-testid=region-search]')}; const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(input, ${JSON.stringify(name)}); input.dispatchEvent(new Event('input', { bubbles: true })) })()`)
      await wait(`document.querySelector('[data-testid=region-result]')?.textContent.includes(${JSON.stringify(name)})`, `${name} appears in national region search`)
      return evaluate(`document.querySelector('[data-testid=region-result]').dataset.region`)
    }
    offlineSwitchRegionId = await searchFor('Südwestpfalz')
    const imagesBeforeSouthWest = externalMediaRequestCount()
    await click('[data-testid=region-result]')
    await wait(`document.querySelectorAll('[data-testid=region-row]').length === 2`, 'Südwestpfalz is added without replacing Mainz-Bingen')
    await wait(`!${selector('[data-testid=region-add]')}.disabled`, 'Südwestpfalz add settles')
    await sleep(300)
    assert.equal(externalMediaRequestCount(), imagesBeforeSouthWest, 'adding a saved region starts no image fetch or render')
    assert.equal(await evaluate(`(async () => !(await caches.keys()).some(name => name.startsWith('dex-pack-')) && !Object.keys(localStorage).some(name => name.startsWith('dex.offline.ready.')))()`), true, 'adding a saved region creates no legacy or versioned offline pack')
    await click(`[data-testid=region-row][data-region="${offlineSwitchRegionId}"] [data-testid=region-pick]`)
    await wait(`!${selector('[data-testid=region-sheet]')}`, 'switch closes region management')
    await click('[data-testid=tab-dex]')
    await wait(selector('[data-testid=grid] [data-taxon]'), 'Südwestpfalz dex set is loaded and persisted')
    await click('[data-testid=tab-you]')
    await click('[data-testid=change-region]')
    await click('[data-testid=region-add]')
    await send('Browser.setPermission', { permission: { name: 'geolocation' }, setting: 'granted', origin: base })
    await send('Emulation.setGeolocationOverride', { latitude: 52.52, longitude: 13.405, accuracy: 25 })
    await click('[data-testid=region-location]')
    await wait(`Array.from(document.querySelectorAll('[data-testid=region-result]')).some(row => row.textContent.includes('Berlin'))`, 'Berlin resolves from the current location')
    const berlinId = await evaluate(`Array.from(document.querySelectorAll('[data-testid=region-result]')).find(row => row.textContent.includes('Berlin')).dataset.region`)
    await evaluate(`Array.from(document.querySelectorAll('[data-testid=region-result]')).find(row => row.dataset.region === ${JSON.stringify(berlinId)})?.click()`)
    await wait(`document.querySelectorAll('[data-testid=region-row]').length === 3`, 'Berlin is added from location')
    await wait(`!${selector('[data-testid=region-add]')}.disabled`, 'Berlin location add settles')
    await send('Emulation.clearGeolocationOverride')
    await send('Browser.setPermission', { permission: { name: 'geolocation' }, setting: 'denied', origin: base })
    await click(`[data-testid=region-row][data-region="${berlinId}"] [data-testid=region-pick]`)
    await wait(`!${selector('[data-testid=region-sheet]')}`, 'Berlin switch closes region management')
    await click('[data-testid=tab-dex]')
    await wait(selector('[data-testid=grid] [data-taxon]'), 'Berlin dex set is loaded and persisted')
    await click('[data-testid=tab-you]')
    await click('[data-testid=change-region]')
    await wait(`document.querySelectorAll('[data-testid=region-row]').length === 3`, 'all saved regions survive switches')
    await click('[data-testid=region-add]')
    offlineUnavailableRegionId = await searchFor('Hamburg')
    await send('Network.setBlockedURLs', { urls: ['*identity.setFilter*'] })
    await click('[data-testid=region-result]')
    await wait(`document.querySelectorAll('[data-testid=region-row]').length === 3 && !!document.querySelector('[data-testid=region-line]')`, 'failed add rolls optimistic saved state back')
    await send('Network.setBlockedURLs', { urls: [] })
    await click('[data-testid=region-add]')
    await searchFor('Hamburg')
    const imagesBeforeHamburg = externalMediaRequestCount()
    await click('[data-testid=region-result]')
    await wait(`document.querySelectorAll('[data-testid=region-row]').length === 4`, 'Hamburg adds after transport recovers')
    await wait(`!${selector('[data-testid=region-add]')}.disabled`, 'Hamburg retry settles')
    await sleep(300)
    assert.equal(externalMediaRequestCount(), imagesBeforeHamburg, 'adding an uncached region starts no image fetch or render')
    assert.equal(await evaluate(`(async () => !(await caches.keys()).some(name => name.startsWith('dex-pack-')) && !Object.keys(localStorage).some(name => name.startsWith('dex.offline.ready.')))()`), true, 'adding an uncached region creates no legacy or versioned offline pack')
    await click(`[data-testid=region-row][data-region="${initialRegionId}"] [data-testid=region-remove]`)
    await wait(`document.querySelectorAll('[data-testid=region-row]').length === 3`, 'inactive Mainz-Bingen is removed')
    assert.equal(await evaluate(`${selector('[data-testid=region-row][data-active] [data-testid=region-remove]')}.disabled`), true, 'active region remains protected with multiple saved regions')
  } else {
    await click('[data-testid=region-add]')
  }
  await key('Escape')
  await wait(`!${selector('[data-testid=region-sheet]')}`)
  await click('[data-testid=tab-dex]')
  await wait(selector('[data-testid=grid]'))
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
  const progressSpeciesUrl = await evaluate(`(() => {
    const queries=JSON.parse(localStorage.getItem('dex.queries')).json.clientState.queries;
    for(const row of queries.flatMap(q=>q.state.data?.species??[])) {
      const link=document.querySelector('[data-testid=grid] [data-taxon="'+row.taxonId+'"] a');
      if(row.tile==='bird'&&link)return link.href;
    }
    return null;
  })()`)
  assert.ok(progressSpeciesUrl, 'a visible catalogue bird supports a genuine captive-exclusion sample')
  await evaluate(`[...document.querySelectorAll('[data-testid=grid] a')].find(a=>a.href===${JSON.stringify(progressSpeciesUrl)}).click()`)
  await click('[data-testid=study]')
  await wait(`${selector('[data-testid=study]')}.getAttribute('aria-pressed') === 'true'`, 'study is saved without location')
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
  await click('[data-testid=tab-you]')
  await wait(`${selector('[data-testid=germany-discovered] dd')}?.textContent.trim() === '1'`, 'national discovery refreshes on Profile mount')
  await wait(`${selector('[data-testid=germany-studied] dd')}?.textContent.trim() === '1'`, 'location-independent study contributes nationally')
  const nationalDenominator = await evaluate(`${selector('[data-testid=germany-denominator]')}.textContent`)
  await regionalProgress()
  assert.notEqual(await evaluate(`${selector('[data-testid=germany-sightings] dd')}.textContent.trim()`), '1', 'observation without confirmed German land containment is not a German sighting')
  await click('[data-testid=tab-journal]')
  await wait(selector('[data-testid=row][data-kind=sighting]'))
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
  await click('[data-testid=tab-you]')
  await wait(`${selector('[data-testid=germany-progress]')}?.dataset.state === 'ready'`, 'Germany progress opens from persisted data offline')
  await wait(`!!${selector('[data-testid=germany-offline]')}`, 'cached national result is qualified as offline')
  assert.equal(await evaluate(`${selector('[data-testid=germany-discovered] dd')}.textContent.trim()`), '1', 'location-independent discovery refreshes and persists')
  assert.equal(await evaluate(`${selector('[data-testid=germany-studied] dd')}.textContent.trim()`), '1', 'study survives offline reload')
  assert.notEqual(await evaluate(`${selector('[data-testid=germany-sightings] dd')}.textContent.trim()`), '1', 'unconfirmed German land containment does not become a German sighting')
  await wait(selector('[data-testid=display-name]'), 'profile opens from the shell offline')
  await click('[data-testid=change-region]')
  await wait(selector('[data-testid=region-offline-management]'), 'offline region-management boundary is explicit')
  if (fullCatalogue) {
    assert.ok(offlineSwitchRegionId, 'a second cached region was prepared')
    assert.ok(offlineUnavailableRegionId, 'an uncached saved region was prepared')
    const activeBeforeUnavailableTap = await evaluate(`${selector('[data-testid=region-row][data-active]')}.dataset.region`)
    await click(`[data-testid=region-row][data-region="${offlineUnavailableRegionId}"] [data-testid=region-pick]`)
    await wait(`${selector('[data-testid=region-line]')}?.textContent.includes('Hamburg')`, 'an uncached saved region is named in its explanation')
    assert.equal(await evaluate(`${selector('[data-testid=region-row][data-active]')}.dataset.region`), activeBeforeUnavailableTap, 'an unavailable offline tap does not change the active region')
    assert.equal(await evaluate(`document.querySelectorAll('[data-testid=region-line]').length`), 1, 'an unavailable offline tap renders one explanation')
    await click('[data-testid=region-add]')
    await wait(selector('[data-testid=region-picker-panel]'))
    assert.match(await evaluate(`${selector('[data-testid=region-picker-panel]')}.textContent`), /offline|verbindung/i, 'offline picker explains why catalogue search is unavailable')
    await click('[data-testid=region-add]')
    await click(`[data-testid=region-row][data-region="${offlineSwitchRegionId}"] [data-testid=region-pick]`)
    await wait(`localStorage.getItem('dex.region.pending') === ${JSON.stringify(offlineSwitchRegionId)}`, 'offline region intent is persisted before transport')
    await send('Page.reload')
    await wait(selector('[data-testid=display-name]'), 'Profile reloads offline after a cached region switch')
    await click('[data-testid=change-region]')
    await wait(`${selector(`[data-testid=region-row][data-region="${offlineSwitchRegionId}"]`)}?.hasAttribute('data-active')`, 'offline reload keeps the selected cached region active')
    await key('Escape')
    const online = { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }
    await send('Network.emulateNetworkConditions', online)
    for (const worker of workers) await send('Network.emulateNetworkConditions', online, worker)
    await wait(`navigator.onLine && fetch('/api/health').then(response => response.ok, () => false)`, 'page and service-worker transport return online')
    // CDP network emulation restores transport without consistently emitting the browser's native online event.
    // Dispatch the event explicitly so this deterministic check exercises RegionReplay's real reconnect path.
    await evaluate(`window.dispatchEvent(new Event('online'))`)
    await wait(`localStorage.getItem('dex.region.pending') === null`, 'online replay acknowledges and clears the pending region intent')
    await send('Network.setBlockedURLs', { urls: ['*sighting.place*', '*api.gbif.org/*', `${base}/api/tiles/*`] })
    await send('Browser.setPermission', { permission: { name: 'geolocation' }, setting: 'granted', origin: base })
    // Keep the same catalogue taxon: territorial counts depend on coordinates/wildness,
    // while the discovered/studied membership stays one across regional switches.
    for (const sample of [
      { latitude: 49.992, longitude: 8.247, wildness: 'wild', german: '1' },
      { latitude: 48.8566, longitude: 2.3522, wildness: 'wild', german: '1' },
      { latitude: 49.992, longitude: 8.247, wildness: 'kept', german: '1' },
    ]) {
      await send('Emulation.setGeolocationOverride', { latitude: sample.latitude, longitude: sample.longitude, accuracy: 10 })
      await send('Page.navigate', { url: progressSpeciesUrl })
      await click('[data-testid=log]')
      await wait(`${selector('[data-testid=save-where]')} && !${selector('[data-testid=save-locate]')} && !${selector('[data-testid=save-denied]')}`, 'deterministic location granted')
      await click(`[data-testid=wildness-${sample.wildness}]`)
      await click('[data-testid=save-submit]')
      await wait(`!${selector('[data-testid=log-save]')}`, 'repeat sighting accepted')
      const acknowledgedId = await evaluate(`new URL(location.href).searchParams.get('again')`)
      assert.ok(acknowledgedId, 'repeat sighting has a stable result ID')
      const readSighting = `fetch('/api/trpc/journal.get?input='+encodeURIComponent(JSON.stringify({json:{id:${JSON.stringify(acknowledgedId)}}}))).then(r=>r.json()).then(r=>r.result?.data?.json)`
      await wait(readSighting, 'server acknowledges this exact sighting')
      const actualSighting = await evaluate(`(${readSighting}).then(s=>({lat:s.lat,lng:s.lng,wildness:s.wildness}))`)
      assert.deepEqual(actualSighting, { lat: sample.latitude, lng: sample.longitude, wildness: sample.wildness === 'kept' ? 'captive' : 'wild' }, 'acknowledged point and wildness match the intended sample')
      await send('Page.navigate', { url: `${base}/${locale}/you` })
      await wait(`${selector('[data-testid=germany-sightings] dd')}?.textContent.trim() === ${JSON.stringify(sample.german)}`, 'only German wild land observations count territorially')
      assert.equal(await evaluate(`${selector('[data-testid=germany-discovered] dd')}.textContent.trim()`), '1')
      assert.equal(await evaluate(`${selector('[data-testid=germany-studied] dd')}.textContent.trim()`), '1')
      assert.equal(await evaluate(`${selector('[data-testid=germany-denominator]')}.textContent`), nationalDenominator)
      assert.equal(await evaluate(`${selector('[data-testid=germany-regions] dd')}.textContent.trim()`), '1', 'only one German land region was visited')
      await regionalProgress()
    }
    await send('Emulation.clearGeolocationOverride')
    console.log('UX: positive study/discovery, Germany land, outside-Germany and captive exclusion passed after region switch')
  } else {
    await click('[data-testid=region-add]')
    await wait(selector('[data-testid=region-picker-panel]'))
    assert.match(await evaluate(`${selector('[data-testid=region-picker-panel]')}.textContent`), /offline|verbindung/i, 'offline picker explains why catalogue search is unavailable')
  }
  console.log(JSON.stringify({ locale, viewport: '390x844 + 1280x900', onboarding: 'pass', dialogs: 'pass', regionManagement: 'pass', radioKeyboard: 'pass', navigation: 'pass', germanyProgress: 'pass', journalError: 'pass', manualSave: 'pass', offlineReload: 'pass', species: cellCount, workerSessions: workers.length }))
} finally {
  ws?.close()
  await stopOwnedProcess(proc, profile)
}
