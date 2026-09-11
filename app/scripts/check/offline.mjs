// Production-worker regression smoke. Uses only synthetic cache entries and the
// supplied local test identity. Usage: node scripts/check/offline.mjs <base> <dex_id>
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { stopOwnedProcess } from './owned-process.mjs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import pg from 'pg'

const [base = 'http://localhost:3002', identityId] = process.argv.slice(2)
const database = new URL(process.env.DATABASE_URL ?? '')
if (!identityId || !['localhost', '127.0.0.1'].includes(new URL(base).hostname) || !['localhost', '127.0.0.1'].includes(database.hostname) || !/^\/dex_check_[a-z0-9_]+$/.test(database.pathname)) throw new Error('A local test identity, localhost server and disposable dex_check_* database are required')
const profile = mkdtempSync(join(tmpdir(), 'dex-offline-review-'))
const evidenceDir = process.env.BROWSER_EVIDENCE_DIR
if (evidenceDir) mkdirSync(evidenceDir, { recursive: true })
const port = 9600 + Math.floor(Math.random() * 300)
const executable = process.env.CHROME ?? (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome')
const chrome = spawn(executable, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
let ws
let catalogueDb
let rolledBack = []
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
  const privateResult = await evaluate(`(async () => {
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
  const active = await evaluate(`(async () => {
    const data = async (path, input) => {
      const query = input ? '?input=' + encodeURIComponent(JSON.stringify({ json: input })) : '';
      const response = await fetch('/api/trpc/' + path + query);
      if (!response.ok) throw new Error(path + ' failed: ' + response.status);
      return (await response.json()).result.data.json;
    };
    const me = await data('identity.me');
    const search = await data('regions.search', { q: 'Mainz', limit: 1 });
    const regionId = search.results?.[0]?.id;
    if (!me.catalogueVersion || !regionId) throw new Error('active catalogue handshake or registry region missing');
    const legacy = await data('sighting.outside', { regionId });
    const versioned = await data('sighting.outsideVersioned', { regionId });
    if (!Array.isArray(legacy) || !Array.isArray(legacy.filter(() => true))) throw new Error('legacy outside wire is not array-compatible');
    if (versioned.catalogueVersion !== me.catalogueVersion || !Array.isArray(versioned.taxa)) throw new Error('versioned outside metadata missing');
    const segment = encodeURIComponent(me.catalogueVersion).replaceAll('%', '_');
    const cacheName = 'dex-pack-v2-' + segment + '-rollback-browser';
    await (await caches.open(cacheName)).put('/rollback-browser.jpg', new Response('reference'));
    localStorage.setItem('dex.offline.ready.v2.' + segment + '.rollback-browser', JSON.stringify({ version: 2 }));
    localStorage.setItem('dex.rollback.private-sentinel', 'preserve');
    return { catalogueVersion: me.catalogueVersion, regionId, legacyRows: legacy.length, versionedRows: versioned.taxa.length, cacheName };
  })()`)
  catalogueDb = new pg.Client({ connectionString: database.toString() })
  await catalogueDb.connect()
  const rollback = await catalogueDb.query(`UPDATE "CatalogueVersion" SET status = 'audited'::"CatalogueStatus" WHERE "countryCode" = 'DE' AND status = 'active'::"CatalogueStatus" RETURNING id, "updatedAt"`)
  rolledBack = rollback.rows
  assert.ok(rolledBack.length > 0, 'browser rollback changes an active local catalogue')
  await send('Page.reload')
  let legacyObserved = false
  for (let i = 0; i < 200 && !legacyObserved; i++) {
    await sleep(100)
    legacyObserved = await evaluate(`document.readyState === 'complete'
      && performance.getEntriesByType('navigation')[0]?.type === 'reload'
      && performance.getEntriesByType('resource').some(entry => entry.name.includes('/api/trpc/identity.me'))
      && localStorage.getItem('dex.catalogue.version') === '__dex_catalogue_legacy__'`)
  }
  assert.equal(legacyObserved, true, 'reloaded document completes its identity.me legacy handshake')
  const transitionResult = await evaluate(`(async () => {
    const data = async (path, input) => {
      const response = await fetch('/api/trpc/' + path + '?input=' + encodeURIComponent(JSON.stringify({ json: input })));
      if (!response.ok) throw new Error(path + ' failed: ' + response.status);
      return (await response.json()).result.data.json;
    };
    const regionId = ${JSON.stringify(active.regionId)};
    const legacy = await data('sighting.outside', { regionId });
    const versioned = await data('sighting.outsideVersioned', { regionId });
    if (!Array.isArray(legacy) || !Array.isArray(legacy.filter(() => true))) throw new Error('legacy outside wire broke after rollback');
    if (versioned.catalogueVersion !== null || !Array.isArray(versioned.taxa)) throw new Error('legacy version metadata missing after rollback');
    for (let i = 0; i < 100 && (await caches.keys()).some(name => name.startsWith('dex-pack-v2-')); i++) await new Promise(resolve => setTimeout(resolve, 50));
    const v2AfterIdentityRollback = (await caches.keys()).filter(name => name.startsWith('dex-pack-v2-'));
    if (v2AfterIdentityRollback.length) throw new Error('identity rollback left v2 packs: ' + v2AfterIdentityRollback.join(','));
    if ([...Array(localStorage.length)].map((_, i) => localStorage.key(i)).some(key => key?.startsWith('dex.offline.ready.v2.'))) throw new Error('identity rollback left v2 markers');
    if (localStorage.getItem('dex.rollback.private-sentinel') !== 'preserve') throw new Error('identity rollback removed private state');

    const crossTabCache = await caches.open('dex-pack-v2-cross-tab-rollback');
    await crossTabCache.put('/cross-tab-rollback.jpg', new Response('reference'));
    localStorage.setItem('dex.offline.ready.v2.cross-tab.rollback', JSON.stringify({ version: 2 }));
    localStorage.setItem('dex.catalogue.version', ${JSON.stringify(active.catalogueVersion)});
    localStorage.removeItem('dex.catalogue.version');
    window.dispatchEvent(new StorageEvent('storage', { key: 'dex.catalogue.version', oldValue: ${JSON.stringify(active.catalogueVersion)}, newValue: null }));
    for (let i = 0; i < 100 && (await caches.has('dex-pack-v2-cross-tab-rollback')); i++) await new Promise(resolve => setTimeout(resolve, 50));
    if (localStorage.getItem('dex.catalogue.version') !== '__dex_catalogue_legacy__') throw new Error('cross-tab null did not retain legacy authority');
    if (await caches.has('dex-pack-v2-cross-tab-rollback') || localStorage.getItem('dex.offline.ready.v2.cross-tab.rollback')) throw new Error('cross-tab rollback left v2 state');
    if (localStorage.getItem('dex.rollback.private-sentinel') !== 'preserve') throw new Error('cross-tab rollback removed private state');
    return { legacyWireArray: true, versionedMetadata: versioned.catalogueVersion, identityRollbackPurgedV2: true, crossTabNullPurgedV2: true, privateStatePreserved: true };
  })()`)
  const result = { ...privateResult, active, transition: transitionResult }
  if (evidenceDir) writeFileSync(join(evidenceDir, 'catalogue-transition.json'), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
} finally {
  if (catalogueDb) {
    try {
      for (const row of rolledBack) await catalogueDb.query(`UPDATE "CatalogueVersion" SET status = 'active'::"CatalogueStatus", "updatedAt" = $2 WHERE id = $1`, [row.id, row.updatedAt])
    } catch (error) { console.error('Catalogue restoration failed:', error); process.exitCode = 1 }
    finally { await catalogueDb.end() }
  }
  ws?.close()
  await stopOwnedProcess(chrome, profile)
}
