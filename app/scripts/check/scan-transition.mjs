// Production-browser regression for queued scan recovery. It uses a synthetic IndexedDB photo,
// intercepts every upload/identify attempt locally, and never reaches a model or media provider.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [base = 'http://localhost:3002', locale = 'en', identityId = '00000000-0000-4000-8000-000000000001'] = process.argv.slice(2)
if (!['en', 'de'].includes(locale) || !['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Queued-scan checks require en/de and a localhost server')
const expected = locale === 'de'
  ? { region: 'Dieses Foto wartet für eine nicht mehr verfügbare Region.', maintenance: 'Der Atlas wird gerade aktualisiert · die Bestimmung wird wiederholt' }
  : { region: 'This photo was queued for a retired region.', maintenance: 'The atlas is being updated · identification will retry' }
const evidenceDir = process.env.BROWSER_EVIDENCE_DIR
if (evidenceDir) mkdirSync(evidenceDir, { recursive: true })
const profile = mkdtempSync(join(tmpdir(), 'dex-scan-transition-'))
const port = 9700 + Math.floor(Math.random() * 180)
const executable = process.env.CHROME ?? (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome')
const chrome = spawn(executable, ['--headless=new', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
const photoId = '00000000-0062-4000-8000-000000000001'
const scanId = '00000000-0062-4000-8000-000000000002'
const retiredRegionId = '00000000-0062-4000-8000-000000000003'
const photoBytes = readFileSync(new URL('../../public/onboarding/bird.webp', import.meta.url)).toString('base64')
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
let ws
let uploadMaintenance = 0
let identifyRequests = 0
try {
  let target
  for (let i = 0; i < 200 && !target; i++) {
    target = await fetch(`http://127.0.0.1:${port}/json`).then(response => response.json()).then(rows => rows.find(row => row.type === 'page')).catch(() => null)
    if (!target) await sleep(100)
  }
  assert.ok(target, 'Chrome starts within 20 seconds')
  ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let next = 0
  const pending = new Map()
  const call = (method, params = {}) => new Promise((resolve, reject) => { const id = ++next; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })) })
  ws.onmessage = event => {
    const message = JSON.parse(event.data)
    if (message.id) {
      const task = pending.get(message.id)
      if (!task) return
      pending.delete(message.id)
      if (message.error) task.reject(new Error(JSON.stringify(message.error)))
      else task.resolve(message.result)
      return
    }
    if (message.method !== 'Fetch.requestPaused') return
    const { requestId, request } = message.params
    if (/\/api\/photo(?:\?|$)/.test(request.url) && request.method === 'POST') {
      uploadMaintenance++
      const body = Buffer.from(JSON.stringify({ error: 'catalogue maintenance' })).toString('base64')
      void call('Fetch.fulfillRequest', { requestId, responseCode: 503, responseHeaders: [{ name: 'content-type', value: 'application/json' }], body })
      return
    }
    if (/sighting\.identify/.test(request.url)) {
      identifyRequests++
      void call('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' })
      return
    }
    void call('Fetch.continueRequest', { requestId })
  }
  const evaluate = async expression => {
    const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
    return result.result?.value
  }
  const wait = async (expression, label) => {
    const deadline = Date.now() + 30_000
    while (Date.now() < deadline) { if (await evaluate(`!!(${expression})`)) return; await sleep(100) }
    throw new Error(`Timed out: ${label}`)
  }
  const screenshot = async (state, width, height, mobile) => {
    await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })
    assert.equal(await evaluate(`(() => { const sheet = document.querySelector('[data-testid=ladder-sheet] .sheet-panel'); return !!sheet && document.documentElement.scrollWidth <= innerWidth && sheet.getBoundingClientRect().width <= Math.min(innerWidth, 520) })()`), true, `${state} sheet fits ${width}x${height}`)
    if (evidenceDir) {
      const { data } = await call('Page.captureScreenshot', { format: 'png' })
      writeFileSync(join(evidenceDir, `${locale}-scan-${state}-${width}.png`), Buffer.from(data, 'base64'))
    }
  }

  await call('Page.enable')
  await call('Network.enable')
  await call('Network.setCookie', { name: 'dex_id', value: identityId, url: base, httpOnly: true, sameSite: 'Lax' })
  await call('Page.navigate', { url: `${base}/${locale}` })
  await wait(`localStorage.getItem('dex.persist.identity') === ${JSON.stringify(identityId)}`, 'identity bootstrap')
  const region = await evaluate(`fetch('/api/trpc/identity.me').then(response => response.json()).then(value => value.result.data.json.region)`)
  assert.ok(region?.id && region?.name, 'fixture identity has an active region')
  const seeded = await evaluate(`(async () => {
    const opened = await new Promise((resolve, reject) => { const request = indexedDB.open('dex-outbox'); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result) });
    const bytes = Uint8Array.from(atob(${JSON.stringify(photoBytes)}), value => value.charCodeAt(0));
    const now = Date.now();
    const photo = { id: ${JSON.stringify(photoId)}, identityId: ${JSON.stringify(identityId)}, createdAt: now, attempts: 0, lastError: null, kind: 'photo', payload: {}, blob: new Blob([bytes], { type: 'image/webp' }) };
    const scan = { id: ${JSON.stringify(scanId)}, identityId: ${JSON.stringify(identityId)}, createdAt: now + 1, attempts: 0, lastError: 'region-retired', dead: false, kind: 'scan', payload: { at: new Date().toISOString(), place: 'Retired fixture', regionId: ${JSON.stringify(retiredRegionId)}, photoRow: ${JSON.stringify(photoId)}, idPending: true, requiresRegion: true, waitingReason: 'offline' } };
    await new Promise((resolve, reject) => { const tx = opened.transaction('outbox', 'readwrite'); const store = tx.objectStore('outbox'); store.clear(); store.put(photo, photo.id); store.put(scan, scan.id); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error) });
    opened.close();
    return { photoBytes: photo.blob.size, rows: 2 };
  })()`)
  assert.ok(seeded.photoBytes > 0, 'synthetic photo bytes stored')

  await call('Fetch.enable', { patterns: [{ urlPattern: '*api/photo*', requestStage: 'Request' }, { urlPattern: '*sighting.identify*', requestStage: 'Request' }] })
  await call('Page.navigate', { url: `${base}/${locale}/log?photo=${photoId}&scan=1` })
  await wait(`document.querySelector('[data-testid=ladder-body]')?.dataset.state === 'region'`, 'retired-region ladder')
  assert.match(await evaluate(`document.querySelector('[data-testid=ladder-sentence]').textContent`), new RegExp(expected.region.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'retired-region copy is localized')
  assert.match(await evaluate(`document.querySelector('[data-testid=ladder-region-retry]').textContent`), new RegExp(region.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'explicit rebind names the current region')
  await screenshot('retired', 390, 844, true)
  await screenshot('retired', 1440, 900, false)
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await evaluate(`document.querySelector('[data-testid=ladder-region-retry]').scrollIntoView({ block: 'center' })`)
  await evaluate(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`)
  assert.equal(await evaluate(`(() => { const button = document.querySelector('[data-testid=ladder-region-retry]').getBoundingClientRect(); const body = document.querySelector('[data-testid=ladder-body]').getBoundingClientRect(); return button.top >= Math.max(0, body.top) && button.bottom <= Math.min(innerHeight, body.bottom) })()`), true, 'retired-region recovery action is reachable in the phone sheet')
  await screenshot('retired-action', 390, 844, true)
  await evaluate(`document.querySelector('[data-testid=ladder-region-retry]').click()`)
  await wait(`document.querySelector('[data-testid=ladder-body]')?.dataset.state === 'maintenance'`, 'retryable maintenance ladder')
  assert.match(await evaluate(`document.querySelector('[data-testid=ladder-sentence]').textContent`), new RegExp(expected.maintenance.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'maintenance copy is localized')
  await screenshot('maintenance', 390, 844, true)
  await screenshot('maintenance', 1440, 900, false)
  const persisted = await evaluate(`(async () => {
    const opened = await new Promise((resolve, reject) => { const request = indexedDB.open('dex-outbox'); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result) });
    const rows = await new Promise((resolve, reject) => { const request = opened.transaction('outbox').objectStore('outbox').getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) });
    opened.close();
    const photo = rows.find(row => row.id === ${JSON.stringify(photoId)}), scan = rows.find(row => row.id === ${JSON.stringify(scanId)});
    return { rows: rows.length, photoBytes: photo?.blob?.size ?? 0, scan: scan && { regionId: scan.payload.regionId, photoRow: scan.payload.photoRow, idPending: scan.payload.idPending, requiresRegion: scan.payload.requiresRegion, waitingReason: scan.payload.waitingReason, dead: !!scan.dead, attempts: scan.attempts } };
  })()`)
  assert.equal(persisted.rows, 2, 'scan and photo both remain in the outbox')
  assert.equal(persisted.photoBytes, seeded.photoBytes, 'photo bytes survive rebind and maintenance')
  assert.deepEqual(persisted.scan, { regionId: region.id, photoRow: photoId, idPending: true, requiresRegion: false, waitingReason: 'maintenance', dead: false, attempts: 1 }, 'scan rebind is durable and 503 remains retryable')
  assert.ok(uploadMaintenance >= 1, 'photo upload receives an intercepted 503')
  assert.equal(identifyRequests, 0, 'identification/model endpoint is never reached')
  const result = { locale, states: ['region', 'maintenance'], viewports: ['390x844', '1440x900'], rebindRegion: region.name, outboxRows: persisted.rows, photoBytes: persisted.photoBytes, upload503: uploadMaintenance, identifyRequests }
  if (evidenceDir) writeFileSync(join(evidenceDir, `${locale}-scan-transition.json`), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result))
} finally {
  ws?.close()
  chrome.kill('SIGTERM')
  await sleep(500)
  rmSync(profile, { recursive: true, force: true })
}
