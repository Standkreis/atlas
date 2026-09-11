// Browser contract for the production-only analytics boundary. The Vercel script and intake are
// fulfilled by CDP, so this test observes outbound payloads without contacting Vercel.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [base = 'http://localhost:3002'] = process.argv.slice(2)
const target = new URL(base)
if (!['localhost', '127.0.0.1'].includes(target.hostname)) throw new Error('Analytics checks require a local disposable server')
const expectDisabled = process.env.ANALYTICS_EXPECT_DISABLED === '1'

const sightingId = '00000000-0000-4000-8200-000000000000'
const identityId = '00000000-0000-4000-8000-000000000001'
const forbidden = [sightingId, identityId, 'secret-query', 'private-fragment', 'Private fixture note', '49.992', '8.247']
const profile = mkdtempSync(join(tmpdir(), 'dex-analytics-'))
const port = 9800 + Math.floor(Math.random() * 500)
const executable = process.env.CHROME ?? (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome')
const chrome = spawn(executable, ['--headless=new', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const mockScript = `(() => {
  let beforeSend = event => event
  const dispatch = (type, properties) => {
    const event = beforeSend({ type, url: location.href })
    if (!event) return
    fetch('/_vercel/insights/view', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: event.type, url: event.url, route: properties?.route ?? null, referrer: document.referrer }),
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
      } else {
        await send('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' })
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
    { urlPattern: '*://*/_vercel/insights/script.js*' },
    { urlPattern: '*://*/_vercel/insights/view*' },
    { urlPattern: 'https://atlas-fixture.invalid/*' },
  ] })
  await send('Network.setCookie', { name: 'dex_id', value: identityId, url: base, httpOnly: true, sameSite: 'Lax' })

  if (expectDisabled) {
    await send('Page.navigate', { url: `${base}/en` })
    await wait(() => evaluate(`document.readyState === 'complete'`), 'disabled analytics document')
    await sleep(500)
    assert.equal(scriptLoads, 0, 'Preview does not inject the analytics script')
    assert.deepEqual(payloads, [], 'Preview emits no analytics payload')
    assert.equal(await evaluate('typeof window.va'), 'undefined')
    console.log('analytics browser check: Preview disabled')
  } else {
    await send('Page.navigate', { url: `${base}/en/sighting/${sightingId}?secret-query=1#private-fragment` })
    await wait(() => evaluate(`!!document.querySelector('[data-testid=sighting]')`), 'real local sighting')
    await wait(() => Promise.resolve(payloads.length === 1), 'redacted sighting page view')
    assert.equal(scriptLoads, 1, 'one analytics boundary injects one script')
    assert.deepEqual(Object.keys(payloads[0]).sort(), ['referrer', 'route', 'type', 'url'])
    assert.equal(payloads[0].type, 'pageview')
    assert.equal(payloads[0].url, `${base}/en/sighting/[id]`)
    assert.equal(payloads[0].referrer, '')

    await evaluate(`document.querySelector('[data-testid=to-species]').click()`)
    await wait(() => Promise.resolve(payloads.length === 2), 'client-side species page view')
    assert.match(payloads[1].url, new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/en/species/\\d+$`))
    assert.equal(scriptLoads, 1, 'client-side navigation does not inject a duplicate script')

    await evaluate(`window.va('event', { name: 'forbidden', identityId: ${JSON.stringify(identityId)} })`)
    await sleep(200)
    assert.equal(payloads.length, 2, 'custom events fail closed')
    const outbound = JSON.stringify(payloads)
    for (const value of forbidden) assert.equal(outbound.includes(value), false, `analytics payload excludes ${value}`)
    const unexpectedOrigins = [...new Set(requests
      .filter((url) => /^https?:/.test(url) && !url.startsWith(base) && !url.startsWith('https://atlas-fixture.invalid/'))
      .map((url) => new URL(url).origin))]
    assert.deepEqual(unexpectedOrigins, [], 'no third-party request leaves the browser')

    const emittedBeforeUnsafeReferrer = payloads.length
    await send('Page.navigate', {
      url: `${base}/en`,
      referrer: `${base}/en/sighting/${sightingId}?secret-query=1#private-fragment`,
      referrerPolicy: 'unsafeUrl',
    })
    await wait(() => evaluate(`document.readyState === 'complete'`), 'unsafe-referrer document')
    await sleep(500)
    assert.equal(await evaluate('document.referrer.includes("secret-query")'), true, 'fixture presents an unsafe initial referrer')
    assert.equal(await evaluate('typeof window.va'), 'undefined', 'unsafe initial referrer suppresses analytics entirely')
    assert.equal(payloads.length, emittedBeforeUnsafeReferrer)

    console.log(`analytics browser check: ${payloads.length} page views, private route redacted, custom/referrer drops passed`)
  }
} finally {
  if (websocket?.readyState === WebSocket.OPEN) websocket.close()
  chrome.kill('SIGTERM')
  await new Promise((resolve) => { if (chrome.exitCode !== null) resolve(); else chrome.once('exit', resolve) })
  rmSync(profile, { recursive: true, force: true })
}
