// Browser contract for the production-only analytics boundary. The Vercel script and intake are
// fulfilled by CDP, so this test observes outbound payloads without contacting Vercel.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { stopOwnedProcess } from './owned-process.mjs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [base = 'http://localhost:3002'] = process.argv.slice(2)
const target = new URL(base)
if (!['localhost', '127.0.0.1'].includes(target.hostname)) throw new Error('Analytics checks require a local disposable server')
const expectDisabled = process.env.ANALYTICS_EXPECT_DISABLED === '1'

const sightingId = '00000000-0000-4000-8200-000000000000'
const encodedSightingId = '%300000000-0000-4000-8200-000000000000'
const secondSightingId = '10000000-0000-4000-8200-000000000000'
const identityId = process.env.BROWSER_IDENTITY_ID
if (!identityId) throw new Error('Run through browser.mjs to create an owned analytics identity')
const forbidden = [sightingId, encodedSightingId, secondSightingId, '%65n', identityId, 'secret-query', 'private-fragment', 'Private fixture note', '49.992', '8.247']
const profile = mkdtempSync(join(tmpdir(), 'dex-analytics-'))
const port = 9800 + Math.floor(Math.random() * 500)
const executable = process.env.CHROME ?? (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome')
const chrome = spawn(executable, ['--headless=new', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const mockScript = `(() => {
  let beforeSend = event => event
  const dispatch = (type, properties) => {
    const event = beforeSend({ type, url: properties?.path ? new URL(properties.path, location.origin).href : location.href })
    if (!event) return
    const body = { type: event.type, url: event.url, referrer: document.referrer }
    if (properties?.route) body.dp = properties.route
    fetch('/_vercel/insights/view', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  }
  const queue = window.vaq ?? []
  window.va = (command, properties) => {
    if (command === 'beforeSend') beforeSend = properties
    else if (command === 'pageview') dispatch('pageview', properties)
    else if (command === 'event') dispatch('event', properties)
  }
  for (const args of queue) window.va(...args)
  window.vaq = []
})()`

let websocket
try {
  let page
  for (let i = 0; i < 200 && !page; i++) {
    page = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json()).then((rows) => rows.find((row) => row.type === 'page')).catch(() => null)
    if (!page) await sleep(100)
  }
  assert.ok(page, 'Chrome starts within 20 seconds')

  websocket = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { websocket.onopen = resolve; websocket.onerror = reject })
  let id = 0
  let scriptLoads = 0
  const pending = new Map()
  const payloads = []
  const requests = []
  const blockedThirdParty = new Set()
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const key = ++id
    pending.set(key, { resolve, reject })
    websocket.send(JSON.stringify({ id: key, method, params }))
  })
  websocket.onmessage = (message) => {
    const data = JSON.parse(message.data)
    const task = pending.get(data.id)
    if (task) {
      pending.delete(data.id)
      if (data.error) task.reject(new Error(JSON.stringify(data.error)))
      else task.resolve(data.result)
    }
    if (data.method === 'Network.requestWillBeSent') requests.push(data.params.request.url)
    if (data.method !== 'Fetch.requestPaused') return
    const { requestId, request } = data.params
    void (async () => {
      const url = new URL(request.url)
      if (url.pathname === '/_vercel/insights/script.js') {
        scriptLoads++
        await send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }], body: Buffer.from(mockScript).toString('base64') })
      } else if (url.pathname === '/_vercel/insights/view') {
        payloads.push(JSON.parse(request.postData ?? 'null'))
        await send('Fetch.fulfillRequest', { requestId, responseCode: 204 })
      } else if (url.hostname === 'atlas-fixture.invalid') {
        const body = readFileSync(new URL('../../public/onboarding/bird.webp', import.meta.url)).toString('base64')
        await send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'image/webp' }], body })
      } else if (url.origin !== target.origin) {
        blockedThirdParty.add(url.origin)
        await send('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' })
      } else {
        await send('Fetch.continueRequest', { requestId })
      }
    })().catch((error) => {
      console.error(error)
      chrome.kill('SIGTERM')
    })
  }

  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result?.value
  }
  const wait = async (predicate, label) => {
    const deadline = Date.now() + 30_000
    while (Date.now() < deadline) {
      if (await predicate()) return
      await sleep(100)
    }
    throw new Error(`Timed out: ${label}`)
  }

  await send('Page.enable')
  await send('Network.enable')
  await send('Fetch.enable', { patterns: [
    { urlPattern: 'http://*/*' },
    { urlPattern: 'https://*/*' },
  ] })
  await send('Network.setCookie', { name: 'dex_id', value: identityId, url: base, httpOnly: true, sameSite: 'Lax' })

  if (expectDisabled) {
    await send('Page.navigate', { url: `${base}/` })
    await wait(() => evaluate(`document.readyState === 'complete'`), 'disabled analytics document')
    await send('Page.navigate', { url: `${base}/en` })
    await wait(() => evaluate(`document.readyState === 'complete'`), 'disabled locale analytics document')
    await sleep(500)
    assert.equal(scriptLoads, 0, 'Preview does not inject the analytics script')
    assert.deepEqual(payloads, [], 'Preview emits no analytics payload')
    assert.equal(await evaluate('typeof window.va'), 'undefined')
    console.log('analytics browser check: Preview disabled')
  } else {
    await send('Page.navigate', { url: `${base}/` })
    await wait(() => evaluate(`location.pathname === '/en'`), 'root-layout locale redirect')
    await wait(() => Promise.resolve(payloads.some(({ url }) => url === `${base}/en`)), 'redirected root page view')
    await sleep(300)
    assert.ok(payloads.every(({ url }) => url === `${base}/` || url === `${base}/en`), 'root redirect emits only public root/locale paths')
    assert.equal(payloads.filter(({ url }) => url === `${base}/en`).length, 1, 'settled locale page view is emitted once')
    const transientRootViews = payloads.filter(({ url }) => url === `${base}/`).length
    assert.ok(transientRootViews <= 1, 'transient root page view is emitted at most once')
    assert.equal(scriptLoads, transientRootViews + 1, 'each disjoint layout document loads its shared boundary once')
    payloads.length = 0
    scriptLoads = 0

    await send('Page.navigate', { url: `${base}/%65n/sighting/${encodedSightingId}?secret-query=1#private-fragment` })
    await wait(() => evaluate(`!!document.querySelector('[data-testid=sighting]')`), 'real local sighting')
    await wait(() => Promise.resolve(payloads.length === 1), 'redacted sighting page view')
    assert.equal(scriptLoads, 1, 'one analytics boundary injects one script')
    assert.deepEqual(Object.keys(payloads[0]).sort(), ['dp', 'referrer', 'type', 'url'])
    assert.equal(payloads[0].type, 'pageview')
    assert.equal(payloads[0].url, `${base}/en/sighting/[id]`)
    assert.equal(payloads[0].dp, '/en/sighting/[id]', 'dynamic-path channel carries only the canonical placeholder')
    assert.ok(payloads[0].referrer === '' || payloads[0].referrer === `${base}/`)

    await evaluate(`document.querySelector('[data-testid=to-species]').click()`)
    await wait(() => evaluate(`!!document.querySelector('[data-testid=species]')`), 'real client-side species page')
    await wait(() => Promise.resolve(payloads.length === 2), 'client-side species page view')
    assert.match(payloads[1].url, new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/en/species/\\d+$`))
    assert.match(payloads[1].dp, /^\/en\/species\/\d+$/)

    await evaluate(`history.pushState(null, '', '/en/sighting/${sightingId}')`)
    await wait(() => Promise.resolve(payloads.length === 3), 'first manually observed private route')
    await evaluate(`history.pushState(null, '', '/en/sighting/${secondSightingId}')`)
    await wait(() => Promise.resolve(payloads.length === 4), 'second private page view with the same canonical route')
    for (const payload of payloads.slice(2)) {
      assert.equal(payload.url, `${base}/en/sighting/[id]`)
      assert.equal(payload.dp, '/en/sighting/[id]')
    }
    assert.equal(scriptLoads, 1, 'client-side navigation does not inject a duplicate script')

    await evaluate(`window.va('event', { name: 'forbidden', identityId: ${JSON.stringify(identityId)} })`)
    await sleep(200)
    assert.equal(payloads.length, 4, 'custom events fail closed')
    const outbound = JSON.stringify(payloads)
    for (const value of forbidden) assert.equal(outbound.includes(value), false, `analytics payload excludes ${value}`)
    const unexpectedOrigins = [...new Set(requests
      .filter((url) => /^https?:/.test(url) && !url.startsWith(base) && !url.startsWith('https://atlas-fixture.invalid/'))
      .map((url) => new URL(url).origin))]
    assert.ok(unexpectedOrigins.every((origin) => blockedThirdParty.has(origin)), 'every incidental third-party asset request is blocked before network access')

    const emittedBeforeUnsafeReferrer = payloads.length
    await send('Page.navigate', {
      url: `${base}/en`,
      referrer: `${base}/%65n/sighting/${encodedSightingId}?secret-query=1#private-fragment`,
      referrerPolicy: 'unsafeUrl',
    })
    await wait(() => evaluate(`document.readyState === 'complete'`), 'unsafe-referrer document')
    await sleep(500)
    assert.equal(await evaluate('document.referrer.includes("secret-query")'), true, 'fixture presents an unsafe initial referrer')
    assert.equal(await evaluate('typeof window.va'), 'undefined', 'unsafe initial referrer suppresses analytics entirely')
    assert.equal(payloads.length, emittedBeforeUnsafeReferrer)

    console.log(`analytics browser check: root + ${payloads.length} locale page views, encoded/private routes redacted, custom/referrer drops passed`)
  }
} finally {
  if (websocket?.readyState === WebSocket.OPEN) websocket.close()
  await stopOwnedProcess(chrome, profile)
}
