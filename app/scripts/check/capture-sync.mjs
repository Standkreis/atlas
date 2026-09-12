// A real offline save, followed by a server-side preference switch before deferred sync.
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
const db = new pg.Client({ connectionString: url.href })
await db.connect()
try {
  const { rows: [region] } = await db.query(`SELECT id, name FROM "Region" WHERE name = 'Mainz-Bingen'`)
  const { rows: [other] } = await db.query(`SELECT id, name FROM "Region" WHERE name <> 'Mainz-Bingen' LIMIT 1`)
  const { rows: [taxon] } = await db.query(`SELECT t.id, t."gbifKey" FROM "Taxon" t JOIN "Plausibility" p ON p."taxonId" = t.id WHERE p."regionId" = $1 AND t.tile = 'bird' LIMIT 1`, [region.id])
  await db.query(`INSERT INTO "Filter" (id,"identityId","regionId","regionIds",tiles,"nowOnly","updatedAt") VALUES ($1,$2,$3,ARRAY[$3]::text[],ARRAY['bird']::"Tile"[],false,NOW())`, [randomUUID(), owner, region.id])
  await browserJourney(base, async ({ send, evaluate, wait, click }) => {
    await send('Browser.setPermission', { permission: { name: 'geolocation' }, setting: 'denied', origin: base })
    await send('Page.navigate', { url: `${base}/${locale}/log?taxon=${taxon.gbifKey}` })
    await wait(`${q('[data-testid=save-where]')}?.textContent.includes(${JSON.stringify(region.name)})`, 'capture region A rendered')
    await click('[data-testid=wildness-wild] input')
    await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
    await wait('navigator.onLine === false', 'offline before save')
    await click('[data-testid=save-submit]')
    const rowsExpression = `(async () => { const db = await new Promise((resolve,reject) => { const r=indexedDB.open('dex-outbox'); r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error) }); const rows = await new Promise(resolve => { const r=db.transaction('outbox').objectStore('outbox').getAll(); r.onsuccess=()=>resolve(r.result) }); db.close(); return rows })()`
    await wait(`${rowsExpression}.then(rows => rows.some(r => r.kind === 'sighting'))`, 'offline sighting durably queued')
    const [queued] = (await evaluate(rowsExpression)).filter(r => r.kind === 'sighting')
    assert.equal(queued.payload.place, region.name)
    assert.equal(queued.payload.lat, undefined)
    const queuedAt = new Date().toISOString()
    await db.query(`UPDATE "Filter" SET "regionId"=$2, "regionIds"=ARRAY[$2]::text[] WHERE "identityId"=$1`, [owner, other.id])
    const switchedAt = new Date().toISOString()
    assert.equal((await db.query(`SELECT count(*)::int n FROM "Sighting" WHERE "identityId"=$1`, [owner])).rows[0].n, 0)
    await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
    await wait(`${rowsExpression}.then(rows => !rows.some(r => r.kind === 'sighting'))`, 'queue flush completes')
    const { rows: [saved] } = await db.query(`SELECT id,place,lat,lng FROM "Sighting" WHERE id=$1`, [queued.id])
    console.log(JSON.stringify({ locale, queuedAt, switchedAt, syncedAt: new Date().toISOString(), capturedPlace: region.name, activePlaceAtSync: other.name, persistedPlace: saved.place }))
    assert.equal(saved.place, region.name, 'sync preserves A after preferences switched to B')
    assert.equal(saved.lat, null); assert.equal(saved.lng, null)
    // Simulate a lost acknowledgement by restoring the identical durable row and reloading.
    await evaluate(`(async () => { const db=await new Promise(resolve=>{const r=indexedDB.open('dex-outbox');r.onsuccess=()=>resolve(r.result)}); await new Promise(resolve=>{const tx=db.transaction('outbox','readwrite');tx.objectStore('outbox').put(${JSON.stringify(queued)},${JSON.stringify(queued.id)});tx.oncomplete=resolve});db.close() })()`)
    await send('Page.navigate', { url: `${base}/${locale}/journal` })
    await wait(`${q('[data-testid=row][data-kind=sighting]')} && !${q('[data-testid=row][data-kind=sighting]')}.hasAttribute('data-queued')`, 'retried sighting shown from server diary')
    assert.ok(await evaluate(`document.body.textContent.includes(${JSON.stringify(region.name)})`), 'diary renders captured place')
    await click('[data-testid=row][data-kind=sighting] a')
    await wait(`${q('[data-testid=sighting]')}`, 'detail opens')
    assert.ok(await evaluate(`document.body.textContent.includes(${JSON.stringify(region.name)})`), 'detail renders captured place')
    const exported = await evaluate(`fetch('/api/trpc/data.export').then(r=>r.json()).then(r=>r.result.data.json)`)
    assert.equal(exported.sightings.length, 1)
    assert.equal(exported.sightings[0].place, region.name)
    assert.equal(exported.sightings[0].lat, null)
    await sleep(200)
    if (process.env.BROWSER_EVIDENCE_DIR) {
      mkdirSync(process.env.BROWSER_EVIDENCE_DIR, { recursive: true })
      const { data } = await send('Page.captureScreenshot', { format: 'png' })
      writeFileSync(join(process.env.BROWSER_EVIDENCE_DIR, `${locale}-capture-sync.png`), Buffer.from(data, 'base64'))
    }
    console.log(JSON.stringify({ locale, captureSync: 'pass', diaryDetailExport: 'pass', idempotentRetry: 'one sighting', exactCoordinates: null }))
  })
} finally { await db.end() }
