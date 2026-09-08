// Production-worker regression smoke. Uses only synthetic cache entries and the
// supplied local test identity. Usage: node scripts/check/offline.mjs <base> <dex_id>
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [base = 'http://localhost:3002', identityId] = process.argv.slice(2)
if (!identityId || !['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('A local test identity and localhost server are required')
const profile = mkdtempSync(join(tmpdir(), 'dex-offline-review-'))
const port = 9600 + Math.floor(Math.random() * 300)
const executable = process.env.CHROME ?? (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome')
const chrome = spawn(executable, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
let ws
try {
  let info
  for (let i = 0; i < 50 && !info; i++) { await sleep(200); info = await fetch(`http://127.0.0.1:${port}/json/version`).then(r => r.json()).catch(() => null) }
  if (!info) throw new Error('Chrome did not start')
  ws = new WebSocket(info.webSocketDebuggerUrl)
  await new Promise(resolve => { ws.onopen = resolve })
  let next = 0
  const pending = new Map()
  ws.onmessage = event => {
    const message = JSON.parse(event.data)
    const promise = pending.get(message.id)
    if (!promise) return
    pending.delete(message.id)
    if (message.error) promise.reject(new Error(JSON.stringify(message.error)))
    else promise.resolve(message.result)
  }
  const call = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++next; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, sessionId }))
  })
  const { targetInfos } = await call('Target.getTargets')
  const page = targetInfos.find(target => target.type === 'page')
  const { sessionId } = await call('Target.attachToTarget', { targetId: page.targetId, flatten: true })
  const send = (method, params = {}) => call(method, params, sessionId)
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
    return result.result?.value
  }
  await send('Network.enable')
  await send('Network.setCookie', { name: 'dex_id', value: identityId, url: base, httpOnly: true, sameSite: 'Lax' })
  await send('Page.navigate', { url: `${base}/en` })
  let controlled = false
  for (let i = 0; i < 120 && !controlled; i++) {
    await sleep(500)
    controlled = await evaluate('!!navigator.serviceWorker?.controller')
  }
  if (!controlled) throw new Error('Production worker did not take control')
  const result = await evaluate(`(async () => {
    const privateUrl = location.origin + '/api/photo/00000000-0000-4000-8000-000000000001';
    const publicUrl = 'https://upload.wikimedia.org/__standkreis_review_reference.jpg';
    const imageCache = await caches.open('dex-images');
    await imageCache.put(privateUrl, new Response('stale private bytes'));
    const pack = await caches.open('dex-pack-review');
    await pack.put(publicUrl, new Response('public reference'));
    const privateResponse = await fetch(privateUrl);
    if (privateResponse.status !== 404) throw new Error('Private cache bypass failed: ' + privateResponse.status);
    const reference = await fetch(publicUrl).then(r => r.text());
    if (reference !== 'public reference') throw new Error('Offline public pack was not used');
    localStorage.setItem('dex.scan.review', 'private metadata');
    window.dispatchEvent(new StorageEvent('storage', { key: 'dex.private.reset', newValue: JSON.stringify({ identityId: ${JSON.stringify(identityId)}, nonce: 'review' }) }));
    for (let i = 0; i < 100 && await imageCache.match(privateUrl); i++) await new Promise(resolve => setTimeout(resolve, 100));
    if (await imageCache.match(privateUrl)) throw new Error('Cross-tab reset did not purge private photo');
    if (localStorage.getItem('dex.scan.review')) throw new Error('Cross-tab reset left scan metadata');
    if (!(await pack.match(publicUrl))) throw new Error('Reset removed public references');
    return { privateResponse: privateResponse.status, privateCachePurged: true, scanMetadataPurged: true, publicPackPreserved: true, worker: navigator.serviceWorker.controller.scriptURL };
  })()`)
  console.log(JSON.stringify(result, null, 2))
} finally {
  ws?.close()
  chrome.kill('SIGTERM')
  await sleep(500)
  rmSync(profile, { recursive: true, force: true })
}
