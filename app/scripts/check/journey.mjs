import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { stopOwnedProcess } from './owned-process.mjs'

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
export const q = selector => `document.querySelector(${JSON.stringify(selector)})`
export async function browserJourney(base, run) {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'journeys run on localhost')
  const profile = mkdtempSync(join(tmpdir(), 'dex-journey-'))
  const port = 10000 + Math.floor(Math.random() * 2000)
  const chrome = process.env.CHROME ?? (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome')
  const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
  let ws, launchError
  proc.on('error', error => { launchError = error })
  try {
    let target
    for (let i = 0; i < 200 && !target && !launchError; i++) {
      target = await fetch(`http://127.0.0.1:${port}/json`).then(r => r.json()).then(rows => rows.find(row => row.type === 'page')).catch(() => null)
      if (!target) await sleep(100)
    }
    assert.ok(target, launchError?.message ?? 'owned Chrome starts')
    ws = new WebSocket(target.webSocketDebuggerUrl)
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
    let serial = 0
    const pending = new Map(), listeners = new Set(), requests = new Map()
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      const id = ++serial
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)) }, 45000)
      pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params, sessionId }))
    })
    ws.onmessage = event => {
      const message = JSON.parse(event.data)
      if (message.id) {
        const task = pending.get(message.id)
        if (!task) return
        pending.delete(message.id); clearTimeout(task.timer)
        return message.error ? task.reject(new Error(JSON.stringify(message.error))) : task.resolve(message.result)
      }
      const p = message.params, id = `${message.sessionId ?? 'page'}:${p?.requestId}`
      if (message.method === 'Network.requestWillBeSent') requests.set(id, { url: p.request.url, worker: !!message.sessionId, bytes: 0, completed: false })
      if (message.method === 'Network.responseReceived') Object.assign(requests.get(id) ?? {}, { status: p.response.status, cached: !!(p.response.fromDiskCache || p.response.fromServiceWorker) })
      if (message.method === 'Network.loadingFinished') Object.assign(requests.get(id) ?? {}, { bytes: p.encodedDataLength, completed: true })
      for (const listener of listeners) listener(message)
    }
    const evaluate = async expression => {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
      return result.result.value
    }
    const wait = async (expression, label = expression, timeout = 40000) => {
      const deadline = Date.now() + timeout
      while (Date.now() < deadline) { if (await evaluate(`(async () => !!(await (${expression})))()`)) return; await sleep(100) }
      throw new Error(`Timed out: ${label}`)
    }
    const click = async selector => { await wait(`${q(selector)} && !${q(selector)}.disabled`); await evaluate(`${q(selector)}.click()`); await sleep(100) }
    const key = async key => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key }) }
    const viewport = async width => {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: width === 390 })
      await send('Emulation.setTouchEmulationEnabled', { enabled: width === 390, maxTouchPoints: 1 })
    }
    const touchNext = async () => {
      const r = await evaluate(`(() => { const r = ${q('[data-testid=slider]')}.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height} })()`)
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x + r.w * .85, y: r.y + r.h * .4 }] })
      for (let i = 1; i <= 8; i++) {
        await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: r.x + r.w * (.85 - .7 * i / 8), y: r.y + r.h * .4 }] })
        await sleep(35)
      }
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    }
    await send('Page.enable'); await send('Network.enable')
    await send('Network.setBlockedURLs', { urls: ['*api.gbif.org/*', '*tile.openstreetmap.org/*', `${base}/api/tiles/*`] })
    await run({ send, evaluate, wait, click, key, viewport, touchNext, requests, listeners })
  } finally { ws?.close(); await stopOwnedProcess(proc, profile) }
}
