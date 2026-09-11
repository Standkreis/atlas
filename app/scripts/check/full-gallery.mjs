// Real target galleries: select from reviewed visibility, then require the public DTO to agree.
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'
import { browserJourney, q, sleep } from './journey.mjs'

const [base = 'http://localhost:3002'] = process.argv.slice(2)
const evidence = process.env.BROWSER_EVIDENCE_DIR
if (evidence) mkdirSync(evidence, { recursive: true })
const database = new URL(process.env.DATABASE_URL ?? '')
assert.ok(['localhost', '127.0.0.1'].includes(database.hostname) && /^\/dex_check_[a-z0-9_]+$/.test(database.pathname))
const db = new pg.Client({ connectionString: database.href })
const shapes = []
await db.connect()
try {
  for (const count of [0, 1, 2, 12]) {
    const { rows } = await db.query(`SELECT t."gbifKey", t.id FROM "Taxon" t
      JOIN "ReferenceGalleryReceipt" r ON r."taxonId" = t.id
      JOIN "CatalogueVersion" c ON c.id = r."catalogueVersionId" AND c.status = 'active'
      WHERE jsonb_array_length(r."resultSnapshot"->'eligible') = $1
      ORDER BY t."gbifKey" LIMIT 20`, [count])
    let selected
    for (const row of rows) {
      const response = await fetch(`${base}/api/trpc/taxon.page?input=${encodeURIComponent(JSON.stringify({ json: { gbifKey: row.gbifKey } }))}`, { headers: process.env.BROWSER_JOURNEY_ID ? { cookie: `dex_id=${process.env.BROWSER_JOURNEY_ID}` } : {} }).then(r => r.json())
      const assets = response.result?.data?.json?.assets?.filter(a => a.kind === 'image')
      if (assets?.length === count) { selected = { ...row, count, assets }; break }
    }
    assert.ok(selected, `real reviewed ${count}-image gallery is available`)
    const { rows: hidden } = await db.query(`SELECT a.url FROM "Asset" a JOIN "ReferenceAssetVisibility" v ON v."assetId" = a.id WHERE v."taxonId" = $1 AND NOT v.eligible`, [selected.id])
    shapes.push({ ...selected, hidden: hidden.map(row => row.url) })
  }
} finally { await db.end() }

await browserJourney(base, async ({ send, evaluate, wait, click, key, viewport, touchNext, requests }) => {
  await send('Network.setCacheDisabled', { cacheDisabled: true })
  await send('Network.setBypassServiceWorker', { bypass: true })
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  const matrix = []
  for (const locale of ['en', 'de']) for (const width of [390, 1280]) for (const shape of shapes) {
    const { count, assets, gbifKey, hidden } = shape
    await viewport(width)
    requests.clear()
    await send('Page.navigate', { url: `${base}/${locale}/species/${gbifKey}` })
    await wait(`${q('[data-testid=species]')} && Object.keys(${q('[data-testid=species]')}).some(k => k.startsWith('__reactFiber'))`)
    assert.equal(await evaluate(`document.querySelectorAll('[data-testid=gallery-slide]').length`), count)
    const urls = await evaluate(`[...document.querySelectorAll('[data-testid=slider] img')].map(i => i.src)`)
    assert.deepEqual(urls, assets.map(a => a.url), 'DOM retains the ordered visible reference projection')
    if (!count) {
      assert.equal(await evaluate(`document.querySelectorAll('[data-testid^=gallery-], [data-testid=slider-info]').length`), 0)
      assert.match(await evaluate('document.body.innerText'), locale === 'en' ? /No image yet/ : /Noch kein Bild/)
    } else {
      await wait(`${q('[data-testid=slider] img')}.naturalWidth > 0`, 'actual lead decodes')
      if (count === 12) {
        await sleep(4000)
        const all = [...requests.values()], gallery = all.filter(r => urls.includes(r.url))
        const network = gallery.filter(r => !r.cached)
        assert.ok(new Set(network.map(r => r.url)).size < 12, 'cold initial view does not transfer all references')
        assert.ok(network.some(r => r.completed && r.bytes > 0), 'cold gallery measurement observes actual bytes')
        console.log(JSON.stringify({ galleryTraffic: { locale, width, gbifKey, window: 'lead decoded + 4 seconds, HTTP cache disabled, worker bypassed', galleryRequests: gallery.length, cachedResponses: gallery.filter(r => r.cached).length, galleryEncodedBytes: network.reduce((n, r) => n + r.bytes, 0), wholePageEncodedBytes: all.filter(r => !r.cached).reduce((n, r) => n + r.bytes, 0) } }))
      }
      assert.deepEqual(await evaluate(`[...document.querySelectorAll('[data-testid=slider] img')].map(i => i.loading)`), ['eager', ...Array(count - 1).fill('lazy')])
      const credit = async index => {
        await click('[data-testid=slider-info]'); await wait(q('[data-testid=source-row]'))
        const rendered = await evaluate(`({text:${q('[data-testid=source-row]')}.textContent,links:[...document.querySelectorAll('[data-testid=source-row] a')].map(a=>a.href)})`)
        assert.ok(rendered.text.includes(assets[index].author)); assert.ok(rendered.text.includes(assets[index].licence))
        assert.ok(rendered.text.includes(assets[index].origin === 'commons' ? 'Wikimedia Commons' : 'iNaturalist'))
        assert.ok(rendered.links.includes(assets[index].sourceUrl)); assert.ok(rendered.links.includes(assets[index].licenceUrl))
        await click('[data-testid=source-sheet] button')
      }
      await credit(0)
      if (count === 1) assert.equal(await evaluate(`document.querySelectorAll('[data-testid=gallery-next], [data-testid=gallery-position]').length`), 0)
      else {
        const position = n => wait(`${q('[data-testid=gallery-position]')}.textContent === ${JSON.stringify(locale === 'en' ? `Image ${n} of ${count}` : `Bild ${n} von ${count}`)} && Math.abs(${q('[data-testid=slider]')}.scrollLeft - ${n - 1} * ${q('[data-testid=slider]')}.clientWidth) < 1`, 'announced position and physical slide settle together')
        assert.equal(await evaluate(`${q('[data-testid=gallery-position]')}.getAttribute('aria-live')`), 'polite')
        assert.ok(await evaluate(`[...document.querySelectorAll('[data-testid=gallery-next], [data-testid=gallery-previous], [data-testid=slider-info]')].every(b=>b.getBoundingClientRect().width>=44&&b.getBoundingClientRect().height>=44)`))
        if (width === 390) { await touchNext(); await position(2) }
        await evaluate(`${q('[data-testid=slider]')}.focus()`)
        await key('End'); await position(count); await key('ArrowRight'); await position(count)
        assert.equal(await evaluate(`${q('[data-testid=gallery-next]')}.disabled`), true)
        await key('Home'); await position(1); await key('ArrowLeft'); await position(1)
        assert.equal(await evaluate(`${q('[data-testid=gallery-previous]')}.disabled`), true)
        await key('ArrowRight'); await position(2); await credit(1)
      }
    }
    assert.equal([...requests.values()].some(r => hidden.includes(r.url)), false, 'hidden target references are never requested')
    if (evidence) {
      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
      writeFileSync(join(evidence, `real-gallery-${locale}-${width}-${count}.png`), Buffer.from(shot.data, 'base64'))
    }
    matrix.push({ locale, width, gbifKey, images: count })
  }
  // A real non-lead fails in place, without promoting or reordering the gallery.
  const shape = shapes.find(s => s.count === 12)
  await send('Network.setBlockedURLs', { urls: [shape.assets[4].url, '*api.gbif.org/*', `${base}/api/tiles/*`] })
  await send('Page.navigate', { url: `${base}/en/species/${shape.gbifKey}` })
  await wait(q('[data-testid=slider]'))
  await evaluate(`${q('[data-testid=slider]')}.focus()`)
  for (let i = 0; i < 4; i++) { await key('ArrowRight'); await sleep(150) }
  await wait(`${q('[data-testid=gallery-slide]:nth-child(5)')}?.dataset.broken === 'true'`)
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('[data-testid=slider] img')].map(i=>i.src)`), shape.assets.map(a => a.url))
  await key('ArrowRight'); await wait(`${q('[data-testid=gallery-slide]:nth-child(6) img')}.naturalWidth > 0`)
  console.log(JSON.stringify({ realGalleryMatrix: matrix, brokenNonLead: 'isolated; next slide decoded' }))
})
