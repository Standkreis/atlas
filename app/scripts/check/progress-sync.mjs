// Keep Profile mounted while controlled outbox requests settle after the national query.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'
import { browserJourney, q, sleep } from './journey.mjs'
const [base, locale = 'en'] = process.argv.slice(2)
const owner = process.env.BROWSER_JOURNEY_ID
const url = new URL(process.env.DATABASE_URL ?? '')
assert.ok(owner && ['localhost', '127.0.0.1'].includes(url.hostname) && /^\/dex_check_/.test(url.pathname))
const db = new pg.Client({ connectionString: url.href }); await db.connect()
try {
  const { rows: [region] } = await db.query(`SELECT id,name FROM "Region" WHERE name='Mainz-Bingen'`)
  const { rows: taxa } = await db.query(`SELECT t.id,t."gbifKey",t."sciName",t.tile FROM "Taxon" t JOIN "Plausibility" p ON p."taxonId"=t.id WHERE p."regionId"=$1 ORDER BY t.id LIMIT 2`, [region.id])
  await db.query(`INSERT INTO "Filter" (id,"identityId","regionId","regionIds",tiles,"nowOnly","updatedAt") VALUES ($1,$2,$3,ARRAY[$3]::text[],ARRAY['bird']::"Tile"[],false,NOW())`, [randomUUID(), owner, region.id])
  const rows = taxa.map((taxon, i) => ({ id: randomUUID(), identityId: owner, createdAt: Date.now() + i, attempts: 0, lastError: null, kind: i ? 'study' : 'sighting', payload: { taxonId: taxon.id, taxon: { ...taxon, names: {}, lead: null }, at: new Date().toISOString(), wildness: 'wild', place: region.name, first: true } }))
  await browserJourney(base, async ({ send, evaluate, wait, listeners, requests }) => {
    await send('Page.navigate', { url: `${base}/${locale}/you` })
    await wait(`${q('[data-testid=germany-progress]')}?.dataset.state === 'ready'`, 'initial national snapshot')
    const seed = async () => evaluate(`(async()=>{const db=await new Promise(resolve=>{const r=indexedDB.open('dex-outbox');r.onsuccess=()=>resolve(r.result)});await new Promise(resolve=>{const tx=db.transaction('outbox','readwrite');for(const row of ${JSON.stringify(rows)})tx.objectStore('outbox').put(row,row.id);tx.oncomplete=resolve});db.close()})()`)
    await seed()
    const held = [], timing = []
    listeners.add(message => { if (message.method === 'Fetch.requestPaused') { held.push(message.params); timing.push({ event: 'held', url: new URL(message.params.request.url).pathname, at: new Date().toISOString() }) } })
    await send('Fetch.enable', { patterns: [{ urlPattern: '*sighting.create*', requestStage: 'Request' }, { urlPattern: '*study.mark*', requestStage: 'Request' }] })
    requests.clear()
    await send('Page.navigate', { url: `${base}/${locale}/you` })
    for (let i = 0; i < 100 && ![...requests.values()].some(r => r.url.includes('identity.germanyProgress') && r.completed); i++) await sleep(100)
    assert.ok([...requests.values()].some(r => r.url.includes('identity.germanyProgress') && r.completed), 'national HTTP query finished before releasing outbox')
    await wait(`${q('[data-testid=germany-progress]')}?.dataset.state === 'ready'`, 'national query finishes with queue held')
    const count = name => evaluate(`${q(`[data-testid=germany-${name}] dd`)}?.textContent`)
    assert.equal(await count('discovered'), '0'); assert.equal(await count('studied'), '0')
    const territory = await count('sightings')
    const denominator = await evaluate(`${q('[data-testid=germany-denominator]')}.textContent`)
    timing.push({ event: 'national-query-finished', at: new Date().toISOString() })
    await evaluate('void (window.__profileSentinel = document.querySelector("[data-testid=germany-progress]"))')
    const take = async () => { for (let i=0;i<100 && !held.length;i++) await sleep(100); assert.ok(held.length, 'deferred request reached'); return held.shift() }
    const first = await take()
    await send('Fetch.failRequest', { requestId: first.requestId, errorReason: 'ConnectionFailed' })
    await sleep(500)
    assert.equal(await count('discovered'), '0', 'failed save cannot confirm discovery')
    await evaluate('window.dispatchEvent(new Event("online"))')
    const retry = await take()
    await send('Fetch.continueRequest', { requestId: retry.requestId })
    timing.push({ event: 'sighting-released', at: new Date().toISOString() })
    for (let i = 0; i < 100; i++) { if ((await db.query('SELECT count(*)::int n FROM \"Sighting\" WHERE \"identityId\"=$1', [owner])).rows[0].n === 1) break; await sleep(50) }
    assert.equal((await db.query('SELECT count(*)::int n FROM \"Sighting\" WHERE \"identityId\"=$1', [owner])).rows[0].n, 1, 'sighting is server-confirmed before UI refresh assertion')
    console.log(JSON.stringify({ locale, timing, beforeSync: { discovered: 0, studied: 0 }, serverSightings: 1 }))
    await wait(`${q('[data-testid=germany-discovered] dd')}?.textContent === '1'`, 'discovery refreshes without navigation', 8000)
    assert.equal(await count('studied'), '0', 'pending study remains unconfirmed')
    const study = await take(); await send('Fetch.continueRequest', { requestId: study.requestId })
    timing.push({ event: 'study-released', at: new Date().toISOString() })
    await wait(`${q('[data-testid=germany-studied] dd')}?.textContent === '1'`, 'study refreshes without navigation', 8000)
    assert.equal(await evaluate('window.__profileSentinel === document.querySelector("[data-testid=germany-progress]")'), true, 'same Profile card remains mounted')
    assert.equal(await evaluate(`${q('[data-testid=germany-denominator]')}.textContent`), denominator)
    assert.equal(await count('sightings'), territory, 'place alone manufactures no territory evidence')
    // Retry both acknowledged rows; server uniqueness and national counts stay stable.
    await seed(); await send('Fetch.disable'); await send('Page.reload')
    await wait(`(async()=>{const db=await new Promise(resolve=>{const r=indexedDB.open('dex-outbox');r.onsuccess=()=>resolve(r.result)});const rows=await new Promise(resolve=>{const r=db.transaction('outbox').objectStore('outbox').getAll();r.onsuccess=()=>resolve(r.result)});db.close();return !rows.some(row=>${JSON.stringify(rows.map(row=>row.id))}.includes(row.id))})()`, 'duplicate replay rows acknowledged and removed from durable outbox')
    await wait(`${q('[data-testid=germany-discovered] dd')}?.textContent === '1' && ${q('[data-testid=germany-studied] dd')}?.textContent === '1'`, 'duplicate retries retain counts')
    await sleep(500)
    assert.equal((await db.query(`SELECT count(*)::int n FROM "Sighting" WHERE "identityId"=$1`, [owner])).rows[0].n, 1)
    assert.equal((await db.query(`SELECT count(*)::int n FROM "Study" WHERE "identityId"=$1`, [owner])).rows[0].n, 1)
    await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
    await wait(q('[data-testid=germany-offline]'), 'offline saved-state message')
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
    await evaluate('document.querySelector("[data-testid=germany-progress]").scrollIntoView({block: "center"})')
    await sleep(200)
    if(process.env.BROWSER_EVIDENCE_DIR){mkdirSync(process.env.BROWSER_EVIDENCE_DIR,{recursive:true});const {data}=await send('Page.captureScreenshot',{format:'png'});writeFileSync(join(process.env.BROWSER_EVIDENCE_DIR,`${locale}-progress-sync.png`),Buffer.from(data,'base64'))}
    console.log(JSON.stringify({ locale, progressSync: 'pass', timing, pendingAndFailure: 'unconfirmed', retry: 'unique counts', denominator: 'stable', mounted: true }))
  })
} finally { await db.end() }
