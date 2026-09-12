// Saved-sighting wildness regression against the production server and owned local fixtures.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import pg from 'pg'
import { ownedDebugPort, stopOwnedProcess } from './owned-process.mjs'

const [base, locale = 'en'] = process.argv.slice(2)
const identityId = process.env.BROWSER_JOURNEY_ID
const database = new URL(process.env.DATABASE_URL ?? '')
if (!identityId || !['localhost', '127.0.0.1'].includes(database.hostname) || !/^\/dex_check_[a-z0-9_]+$/.test(database.pathname) || !['localhost', '127.0.0.1'].includes(new URL(base).hostname) || !['en', 'de'].includes(locale)) throw new Error('Run wildness through the guarded local browser harness')
const messages = JSON.parse(readFileSync(new URL(`../../src/i18n/${locale}.json`, import.meta.url), 'utf8'))
const evidenceDir = process.env.BROWSER_EVIDENCE_DIR
if (evidenceDir) mkdirSync(evidenceDir, { recursive: true })
const db = new pg.Client({ connectionString: database.href })
await db.connect()
const fixtures = []
const profile = mkdtempSync(join(tmpdir(), 'dex-wildness-'))
let chrome, ws
try {
  await db.query(`INSERT INTO "Filter" (id, "identityId", "regionId", "regionIds", tiles, "nowOnly", "updatedAt") SELECT $1, $2, "regionId", "regionIds", ARRAY['plant']::"Tile"[], false, NOW() FROM "Filter" WHERE "identityId" = $3`, [randomUUID(), identityId, process.env.BROWSER_IDENTITY_ID])
  for (const [tile, wildness] of [['plant', 'wild'], ['plant', 'captive'], ['bird', 'cultivated'], ['fungus', 'cultivated']]) {
    const { rows: [taxon] } = await db.query(`SELECT t.id FROM "Taxon" t JOIN "CatalogueTaxon" c ON c."taxonId" = t.id JOIN "CatalogueVersion" v ON v.id = c."catalogueVersionId" AND v.status = 'active' WHERE t.tile = $1::"Tile" ORDER BY t.id LIMIT 1`, [tile])
    assert.ok(taxon, `${tile} fixture exists in active catalogue`)
    const id = randomUUID()
    await db.query(`INSERT INTO "Sighting" (id, "identityId", "taxonId", at, note, evidence, wildness, "createdAt") VALUES ($1, $2, $3, NOW(), 'Wildness browser fixture', 'claimed', $4::"Wildness", NOW())`, [id, identityId, taxon.id, wildness])
    fixtures.push({ id, tile, wildness })
  }
  chrome = spawn(process.env.CHROME ?? (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome'), ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
  const port = await ownedDebugPort(chrome, profile)
  const target = await fetch(`http://127.0.0.1:${port}/json`).then(r => r.json()).then(rows => rows.find(row => row.type === 'page'))
  ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let next = 0, failSave = false, failedSaves = 0
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
    } else if (message.method === 'Fetch.requestPaused') {
      const { requestId, request } = message.params
      if (failSave && request.url.includes('journal.update')) {
        failedSaves++
        void call('Fetch.failRequest', { requestId, errorReason: 'Failed' })
      } else void call('Fetch.continueRequest', { requestId })
    }
  }
  const evaluate = async expression => {
    const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
    return result.result?.value
  }
  const wait = async (expression, label) => {
    const deadline = Date.now() + 20_000
    while (Date.now() < deadline) {
      if (await evaluate(`!!(${expression})`)) return
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    throw new Error(`Timed out: ${label}`)
  }
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
  const selected = value => `document.querySelector('[data-testid=wildness-${value}]')?.getAttribute('aria-checked') === 'true'`
  const stored = async id => (await db.query('SELECT wildness FROM "Sighting" WHERE id = $1', [id])).rows[0].wildness
  const progress = () => evaluate(`fetch('/api/trpc/identity.germanyProgress').then(r => r.json()).then(r => r.result.data.json.catalogue.discovered)`)
  const screenshot = async name => {
    await evaluate(`document.querySelector('[role=radiogroup]').scrollIntoView({block: 'center', behavior: 'instant'})`)
    await new Promise(resolve => setTimeout(resolve, 150))
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true, 'editor fits phone width')
    if (evidenceDir) {
      const { data } = await call('Page.captureScreenshot', { format: 'png' })
      writeFileSync(join(evidenceDir, `${locale}-wildness-${name}.png`), Buffer.from(data, 'base64'))
    }
  }
  const open = async (id, mode) => {
    await call('Page.navigate', { url: `${base}/${locale}/${mode === 'page' ? `sighting/${id}` : 'journal'}` })
    if (mode === 'drawer') {
      await wait(`document.querySelector('a[href="/${locale}/sighting/${id}"]')`, 'journal sighting link')
      await click(`a[href="/${locale}/sighting/${id}"]`)
      await wait(`document.querySelector('[data-testid=sighting-drawer]')`, 'drawer opens')
    }
    await wait(`document.querySelector('[role=radiogroup]')`, 'editor wildness choices')
  }
  await call('Page.enable')
  await call('Network.enable')
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await call('Network.setCookie', { name: 'dex_id', value: identityId, url: base, httpOnly: true, sameSite: 'Lax' })
  await call('Fetch.enable', { patterns: [{ urlPattern: '*journal.update*', requestStage: 'Request' }] })
  const plant = fixtures[0]
  for (const mode of ['page', 'drawer']) {
    await open(plant.id, mode)
    await screenshot(`${mode}-initial`)
    assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('[role=radio]')).map(el => el.dataset.testid)`), ['wildness-wild', 'wildness-cultivated'], 'plants always offer wild and cultivated')
    for (const value of ['wild', 'cultivated']) assert.equal(await evaluate(`document.querySelector('[data-testid=wildness-${value}]').textContent`), messages.sighting[value], `${value} label is localized`)
    const initial = await stored(plant.id)
    const opposite = initial === 'wild' ? 'cultivated' : 'wild'
    await click(`[data-testid=wildness-${opposite}]`)
    await wait(`document.querySelector('[data-testid=save-bar]')`, 'unsaved change')
    await evaluate(`Array.from(document.querySelectorAll('[data-testid=save-bar] button')).find(el => el.textContent === ${JSON.stringify(messages.sighting.discard)}).click()`)
    assert.equal(await evaluate(selected(initial)), true, 'discard restores saved choice')
    assert.equal(await stored(plant.id), initial, 'discard does not write')
    // Real CDP keyboard events exercise roving tabindex and selection together.
    await evaluate(`document.querySelector('[data-testid=wildness-${initial}]').focus()`)
    for (const [key, value] of [['End', 'cultivated'], ['Home', 'wild'], ['ArrowRight', 'cultivated'], ['ArrowRight', 'wild'], ['ArrowLeft', 'cultivated']]) {
      await call('Input.dispatchKeyEvent', { type: 'keyDown', key })
      await call('Input.dispatchKeyEvent', { type: 'keyUp', key })
      assert.equal(await evaluate(`${selected(value)} && document.activeElement.dataset.testid === 'wildness-${value}' && document.activeElement.tabIndex === 0`), true, `${key} selects and focuses ${value}`)
    }
    // Start each round at wild, then make the same persisted round trip in each presentation.
    if (initial !== 'wild') {
      await click('[data-testid=wildness-wild]')
      await click('[data-testid=save]')
      await wait(`document.querySelector('[data-testid=saved]') && !document.querySelector('[data-testid=save-bar]')`, 'starting wild save')
    }
    await click('[data-testid=wildness-cultivated]')
    failSave = true
    await click('[data-testid=save]')
    await wait(`document.querySelector('[data-testid=sighting]').textContent.includes(${JSON.stringify(messages.common.error)})`, 'localized save failure')
    assert.equal(await stored(plant.id), 'wild', 'failed save preserves database value')
    assert.equal(await evaluate(selected('cultivated')), true, 'failed save preserves pending choice')
    failSave = false
    for (const [value, count] of [['cultivated', 0], ['wild', 1], ['cultivated', 0]]) {
      await click(`[data-testid=wildness-${value}]`)
      await click('[data-testid=save]')
      await wait(`document.querySelector('[data-testid=saved]') && !document.querySelector('[data-testid=save-bar]')`, `saved ${value}`)
      assert.equal(await stored(plant.id), value, `${mode} persisted ${value}`)
      assert.equal(await progress(), count, `${mode} national discovery follows saved ${value}`)
      assert.equal(await evaluate(`document.querySelector('[data-testid=saved]').textContent`), messages.sighting.saved, 'saved label is localized')
    }
    await screenshot(`${mode}-saved`)
  }
  for (const fixture of fixtures.slice(1)) {
    await open(fixture.id, 'page')
    const canonical = fixture.tile === 'plant' ? 'cultivated' : 'captive'
    assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('[role=radio]')).map(el => el.dataset.testid)`), ['wildness-wild', `wildness-${canonical}`, `wildness-${fixture.wildness}`], `${fixture.tile} retains selected legacy value beside canonical choices`)
    assert.equal(await evaluate(selected(fixture.wildness)), true, 'legacy stored choice remains selected')
    assert.equal(await stored(fixture.id), fixture.wildness, 'opening legacy row never rewrites it')
    await screenshot(`${fixture.tile}-legacy`)
    await click(`[data-testid=wildness-${canonical}]`)
    await click('[data-testid=save]')
    await wait(`document.querySelector('[data-testid=saved]') && !document.querySelector('[data-testid=save-bar]')`, 'legacy correction saved')
    assert.equal(await stored(fixture.id), canonical, 'legacy value can be corrected')
    assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('[role=radio]')).map(el => el.dataset.testid)`), ['wildness-wild', `wildness-${canonical}`], 'corrected legacy value no longer offered')
  }
  assert.equal(await progress(), 0, 'kept animals, fungi and cultivated plants do not count')
  assert.equal(failedSaves, 2, 'one rejected save and successful retry per presentation')
  const result = { locale, modes: ['page', 'drawer'], transitions: ['wild → cultivated', 'cultivated → wild → save → cultivated'], legacy: ['plant captive', 'bird cultivated', 'fungus cultivated'], keyboard: ['Home', 'End', 'ArrowRight', 'ArrowLeft'], failedSaves, progressVerified: true }
  if (evidenceDir) writeFileSync(join(evidenceDir, `${locale}-wildness.json`), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result))
} finally {
  ws?.close()
  if (chrome) await stopOwnedProcess(chrome, profile)
  await db.query('DELETE FROM "Sighting" WHERE id = ANY($1::text[]) AND "identityId" = $2', [fixtures.map(row => row.id), identityId])
  await db.end()
}
