// Handoff 0025 Track B: the checks of B1–B12 and 0012 T4 on the production build, headless Chrome over CDP (as
// scripts/m23/grouping.mjs; the worker sessions are attached and switched offline together with the page, as m8a does).
// Identity A: Mainz-Bingen active, Schagen and Südwestpfalz in the list, Amsel and Grasfrosch wild, Rotkehlchen and
// Amsel studied, an avatar. Identity B: fresh, no region (the onboarding's search error, B7).
// usage: LOCALE=de node scripts/m25b/sweep.mjs [outDir] [baseUrl]     (baseUrl default http://localhost:3011)
import { execSync, spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [outDir = '.', base = 'http://localhost:3011'] = process.argv.slice(2)
const locale = process.env.LOCALE ?? 'de'
const MB = '59037062-15d5-452e-99dc-785cbc408874', SCHAGEN = '67303e90-4569-4019-a36d-6c99b09b1de8', SWP = '9783b838-3dce-45b0-846e-fe92d58991ee'
const tiles = ['bird', 'mammal', 'amphibian', 'reptile', 'fish', 'insect', 'plant', 'fungus']
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const messages = JSON.parse(readFileSync(new URL(`../../src/i18n/${locale}.json`, import.meta.url), 'utf8'))
const out = { base, locale, build: (await fetch(`${base}/api/health`).then((r) => r.json())).buildId }
mkdirSync(outDir, { recursive: true })

// ── tRPC with one cookie jar per identity ─────────────────────────────────────────────────────────────────────────
const jar = { A: '', B: '' }
const trpc = async (who, path, input, method = 'POST') => {
  const r = method === 'GET'
    ? await fetch(`${base}/api/trpc/${path}?batch=1&input=${encodeURIComponent(JSON.stringify({ 0: { json: input ?? null } }))}`, { headers: { cookie: jar[who] } })
    : await fetch(`${base}/api/trpc/${path}?batch=1`, { method, headers: { 'content-type': 'application/json', cookie: jar[who] }, body: JSON.stringify({ 0: { json: input } }) })
  const set = r.headers.get('set-cookie'); if (set && !jar[who]) jar[who] = set.split(';')[0]
  const j = await r.json()
  return j[0].result?.data?.json ?? { error: j[0].error?.json?.message }
}
const idOf = (who) => jar[who].split('=')[1]
await trpc('A', 'identity.me', undefined, 'GET')
await trpc('B', 'identity.me', undefined, 'GET')
await trpc('A', 'identity.setFilter', { regionId: MB, regionIds: [MB, SCHAGEN, SWP], tiles, nowOnly: false })
const set = await trpc('A', 'dex.set', { regionId: MB, tiles, nowOnly: false }, 'GET')
const byDe = (n) => set.species.find((s) => s.names.de === n)
const amsel = byDe('Amsel'), frosch = byDe('Grasfrosch'), rotkehlchen = byDe('Rotkehlchen')
const sightings = []
for (const s of [amsel, frosch]) sightings.push(await trpc('A', 'sighting.create', { taxonId: s.taxonId, at: new Date().toISOString(), wildness: 'wild' }))
for (const s of [rotkehlchen, amsel]) await trpc('A', 'study.mark', { taxonId: s.taxonId })
// The avatar: the splash as a JPEG through /api/photo, then bound with identity.setAvatar (handoff 0014 P2).
const form = new FormData(); form.append('file', new Blob([readFileSync(new URL('../../public/splash-720.jpg', import.meta.url))], { type: 'image/jpeg' }), 'photo.jpg')
const asset = await fetch(`${base}/api/photo`, { method: 'POST', body: form, headers: { cookie: jar.A } }).then((r) => r.json())
const avatar = await trpc('A', 'identity.setAvatar', { assetId: asset.id })
const progress = await trpc('A', 'identity.progress', undefined, 'GET')
out.seed = { A: idOf('A'), B: idOf('B'), setSize: set.setSize, seen: progress.seen.length, studied: progress.studied.length, avatar: avatar?.avatarUrl ?? avatar, sighting: sightings[0]?.id }

// SQL truth for B5 (the dev DB in Docker): per region, set ∩ wild sightings and set ∩ studies of identity A.
const sql = (q) => execSync(`docker exec standkreis-dex-db-1 psql -U dex -d dex -tAc ${JSON.stringify(q)}`).toString().trim()
const truth = (regionId) => {
  const [seen, studied, possible] = sql([`select (select count(distinct s."taxonId") from "Sighting" s join "Plausibility" p on p."taxonId" = s."taxonId" and p."regionId" = '${regionId}' where s."identityId" = '${idOf('A')}' and s.wildness = 'wild'),`,
    `(select count(*) from "Study" st join "Plausibility" p on p."taxonId" = st."taxonId" and p."regionId" = '${regionId}' where st."identityId" = '${idOf('A')}'),`,
    `(select count(*) from "Plausibility" where "regionId" = '${regionId}')`].join(' ')).split('|').map(Number)
  return { seen, studied, possible }
}
out.truth = { [MB]: truth(MB), [SCHAGEN]: truth(SCHAGEN), [SWP]: truth(SWP) }

// ── Chrome over CDP ───────────────────────────────────────────────────────────────────────────────────────────────
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9222 + Math.floor(Math.random() * 500)
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/dex-m25b-${port}`, 'about:blank'], { stdio: 'ignore' })
let version
for (let i = 0; i < 50 && !version; i++) { await sleep(200); version = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json()).catch(() => undefined) }
const ws = new WebSocket(version.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
const workers = new Set()
let offline = false
const responses = [] // { url, bytes, encoded } of the page session
const sizes = new Map()
let paused = null // Fetch.requestPaused handler (B7)
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? { error: m.error }); pending.delete(m.id); return }
  if (m.method === 'Target.attachedToTarget' && m.params.targetInfo.type === 'service_worker') { workers.add(m.params.sessionId); raw('Network.enable', {}, m.params.sessionId).then(() => (offline ? setOffline(m.params.sessionId, true) : null)) }
  if (m.method === 'Target.detachedFromTarget') workers.delete(m.params.sessionId)
  if (m.method === 'Network.responseReceived') sizes.set(m.params.requestId, { url: m.params.response.url, headers: m.params.response.headers })
  if (m.method === 'Network.loadingFinished' && sizes.has(m.params.requestId)) responses.push({ ...sizes.get(m.params.requestId), encoded: m.params.encodedDataLength, requestId: m.params.requestId })
  if (m.method === 'Fetch.requestPaused' && paused) paused(m.params)
}
const raw = (method, params = {}, sessionId) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params, sessionId })) })
const setOffline = (sessionId, on) => raw('Network.emulateNetworkConditions', { offline: on, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }, sessionId)
const { targetInfos } = await raw('Target.getTargets')
let sessionId = (await raw('Target.attachToTarget', { targetId: targetInfos.find((t) => t.type === 'page').targetId, flatten: true })).sessionId
await raw('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true })
const send = (method, params = {}) => raw(method, params, sessionId)
let scheme = 'light'
const enable = async () => { await send('Network.enable'); await send('Runtime.enable'); await send('Page.enable'); await send('DOM.enable'); await send('Accessibility.enable'); await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }] }) }
await enable()
const setScheme = async (s) => { scheme = s; await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: s }] }) }
const freshContext = async () => { const { browserContextId } = await raw('Target.createBrowserContext'); const { targetId } = await raw('Target.createTarget', { url: 'about:blank', browserContextId }); sessionId = (await raw('Target.attachToTarget', { targetId, flatten: true })).sessionId; await enable() }
const asIdentity = async (who) => { const [name, value] = jar[who].split('='); await send('Network.setCookie', { name, value, url: base }) }
const evaluate = (expression) => send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }).then((r) => r?.result?.value)
const waitFor = async (selector, t = 30_000) => { const s = Date.now(); while (Date.now() - s < t) { if (await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`)) return Date.now() - s; await sleep(25) }; return null }
const click = (selector) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true })()`)
const text = (sel) => evaluate(`document.querySelector(${JSON.stringify(sel)})?.textContent?.trim() ?? null`)
const shot = async (n) => { const { data } = await send('Page.captureScreenshot', { format: 'png' }); const f = join(outDir, `b-${n}-${locale}.png`); writeFileSync(f, Buffer.from(data, 'base64')); console.error(f) }
const goto = async (path, sel = 'main') => { await send('Page.navigate', { url: `${base}/${locale}${path}` }); const ms = await waitFor(sel); await sleep(800); return ms }
const goOffline = async (on) => { offline = on; await setOffline(sessionId, on); for (const w of workers) await setOffline(w, on) }
// The accessibility tree under one DOM node: the non-ignored nodes of a role (Accessibility.queryAXTree).
const axCount = async (selector, role) => {
  const { root } = await send('DOM.getDocument', { depth: 0 })
  const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector })
  if (!nodeId) return null
  const { nodes } = await send('Accessibility.queryAXTree', { nodeId, role })
  return (nodes ?? []).filter((n) => !n.ignored).length
}
const axNames = async (selector, role) => {
  const { root } = await send('DOM.getDocument', { depth: 0 })
  const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector })
  const { nodes } = await send('Accessibility.queryAXTree', { nodeId, role })
  return (nodes ?? []).filter((n) => !n.ignored).map((n) => n.name?.value ?? '')
}
const waitWorker = async () => { const s = Date.now(); while (Date.now() - s < 60_000) { if (await evaluate('!!navigator.serviceWorker.controller')) return true; await sleep(300) }; return false }

await asIdentity('A')

// ── B1 · the atlas `main` takes the safe-area inset; the sticky header keeps its top ──────────────────────────────
await goto('/', '[data-testid=grid]')
await waitWorker()
out.b1 = await evaluate(`(() => { const m = document.querySelector('main'); const g = document.querySelector('li.atlas-group'); const cs = getComputedStyle(m); return { classes: m.className.split(' ').filter((c) => c === 'safe-top' || c === 'pt-3'), paddingTop: cs.paddingTop, groupTop: getComputedStyle(g).top, groupPosition: getComputedStyle(g).position } })()`)

// ── B2 · headers are presentation, the list is labelled with the species count ─────────────────────────────────
const b2 = async (path) => {
  await goto(path, '[data-testid=grid]')
  return {
    liDom: await evaluate(`document.querySelectorAll('[data-testid=grid] > li').length`),
    presentation: await evaluate(`document.querySelectorAll('[data-testid=grid] > li[role=presentation]').length`),
    label: await evaluate(`document.querySelector('[data-testid=grid]').getAttribute('aria-label')`),
    axListItems: await axCount('[data-testid=grid]', 'listitem'),
    axHeadings: await axCount('[data-testid=grid]', 'heading'),
    axList: (await axNames('main', 'list')),
  }
}
out.b2 = { exploration: await b2('/'), tile: await b2('/?group=tile'), none: await b2('/?group=none') }
await goto('/?group=tile', '[data-testid=grid]')
await evaluate('window.scrollTo(0, 1200)'); await sleep(400)
await shot('b2-sticky-header')

// ── 0023 2 · the drawer: Arten · Zeigen · Gruppieren (Fortschritt · Art · Keine) · Sortierung ───────────────────
await goto('/', '[data-testid=grid]')
await click('[data-testid=filter-button]'); await waitFor('[data-testid=drawer]'); await sleep(500)
out.drawer = { sections: await evaluate(`[...document.querySelectorAll('[data-testid=drawer] h3')].map((h) => h.textContent)`), groupChips: await evaluate(`[...document.querySelectorAll('[data-testid^=group-][role=radio]')].map((b) => b.textContent)`) }
await shot('drawer')
await click('[data-testid=apply]'); await sleep(400)

// ── B6 · the amber text colour, light and dark ──────────────────────────────────────────────────────────────────
const amberOf = () => evaluate(`(() => { const el = document.querySelector('[data-testid=counters] .text-amber-deep'); const body = getComputedStyle(document.body).backgroundColor; return { text: getComputedStyle(el).color, paper: body, card: getComputedStyle(document.querySelector('[data-testid=bar]')).backgroundColor } })()`)
out.b6 = { light: await amberOf() }
await setScheme('dark'); await goto('/', '[data-testid=grid]')
out.b6.dark = await amberOf()
await shot('b6-atlas-dark')
await setScheme('light')

// ── B3 · B4 · B5 · the profile ──────────────────────────────────────────────────────────────────────────────────
responses.length = 0
await goto('/you', '[data-testid=region-card]')
await sleep(1500)
const cards = () => evaluate(`[...document.querySelectorAll('[data-testid=region-card]')].map((c) => ({ region: c.dataset.region, title: c.querySelector('[data-testid=region-title]').textContent, open: c.dataset.open, seen: +c.dataset.seen, studied: +c.dataset.studied, possible: +c.dataset.possible, inert: c.querySelector('[data-testid=region-body]')?.hasAttribute('inert') ?? null, line: c.querySelector('[data-testid=region-counts]').textContent }))`)
out.b5 = { cards: await cards(), truth: out.truth }
const countsResponses = responses.filter((r) => r.url.includes('dex.setCounts'))
out.b5.requests = []
for (const r of countsResponses) {
  const body = await send('Network.getResponseBody', { requestId: r.requestId })
  const json = JSON.parse(body.body)
  out.b5.requests.push({ url: r.url.slice(0, 80), encodedBytes: r.encoded, bodyBytes: body.body.length, batch: json.length, keys: Object.keys(json[0]?.result?.data?.json ?? {}), hasIds: JSON.stringify(json).includes('"ids"'), encoding: r.headers['content-encoding'] ?? null })
}
out.b5.match = out.b5.cards.every((c) => { const t = out.truth[c.region]; return t && t.seen === c.seen && t.studied === c.studied && t.possible === c.possible })
// B3: the folded cards' rows are out of the tree (inert), the open card's are in
const cardSel = (rid) => `[data-testid=region-card][data-region="${rid}"]`
out.b3 = { schagenFolded: { inert: await evaluate(`document.querySelector('${cardSel(SCHAGEN)} [data-testid=region-body]').hasAttribute('inert')`), axListItems: await axCount(cardSel(SCHAGEN), 'listitem'), axButtons: await axCount(cardSel(SCHAGEN), 'button') } }
out.b3.mbOpen = { inert: await evaluate(`document.querySelector('${cardSel(MB)} [data-testid=region-body]').hasAttribute('inert')`), axListItems: await axCount(cardSel(MB), 'listitem'), foldedListInert: await evaluate(`document.querySelector('${cardSel(MB)} [data-testid=rows-folded]').closest('.fold').hasAttribute('inert')`) }
await click(`${cardSel(SCHAGEN)} [data-testid=region-toggle]`); await sleep(500)
out.b3.schagenOpened = { inert: await evaluate(`document.querySelector('${cardSel(SCHAGEN)} [data-testid=region-body]').hasAttribute('inert')`), axListItems: await axCount(cardSel(SCHAGEN), 'listitem') }
await click(`${cardSel(SCHAGEN)} [data-testid=region-toggle]`); await sleep(500)
// B4: the more-groups row
const more = `${cardSel(MB)} [data-testid=more-groups]`
out.b4 = { closed: { text: await text(more), expanded: await evaluate(`document.querySelector('${more}').getAttribute('aria-expanded')`), chevrons: await evaluate(`document.querySelectorAll('${cardSel(MB)} .fold-chevron').length`) } }
await shot('b4-profile-more-closed')
await click(more); await sleep(500)
out.b4.open = { text: await text(more), expanded: await evaluate(`document.querySelector('${more}').getAttribute('aria-expanded')`), axListItems: await axCount(cardSel(MB), 'listitem') }
await shot('b4-profile-more-open')
await click(more); await sleep(400)
// B6 on the profile: Studiert, light and dark
await click('[data-testid=axis-studied]'); await sleep(400)
out.b6.profile = await evaluate(`(() => { const b = document.querySelector('[data-testid=region-counts] b'); const r = document.querySelector('[data-testid=axis-studied]'); return { number: getComputedStyle(b).color, radioFill: getComputedStyle(r).backgroundColor, radioText: getComputedStyle(r).color } })()`)
await shot('b6-profile-studiert-light')
await setScheme('dark'); await sleep(300)
out.b6.profileDark = await evaluate(`(() => { const b = document.querySelector('[data-testid=region-counts] b'); const r = document.querySelector('[data-testid=axis-studied]'); return { number: getComputedStyle(b).color, radioFill: getComputedStyle(r).backgroundColor } })()`)
await shot('b6-profile-studiert-dark')
await setScheme('light'); await click('[data-testid=axis-seen]'); await sleep(300)

// ── B10 · the splash in the image cache, the avatar after one online view ───────────────────────────────────────
out.b10 = { avatarOnline: await evaluate(`(() => { const i = document.querySelector('[data-testid=avatar-image]'); return i ? { src: i.getAttribute('src'), decoded: i.complete && i.naturalWidth > 0, w: i.naturalWidth } : null })()`) }
out.b10.caches = await evaluate(`(async () => { const c = await caches.open('dex-images'); const keys = (await c.keys()).map((k) => new URL(k.url).pathname); return { splash: keys.filter((k) => k.startsWith('/splash')), avatar: keys.filter((k) => k.startsWith('/api/photo/')), total: keys.length } })()`)

// ── B8 · the banner without network: atlas, profile, a sighting page ────────────────────────────────────────────
const bannerMs = async () => { const s = Date.now(); while (Date.now() - s < 5_000) { if (await evaluate(`!!document.querySelector('[data-testid=offline-banner]')`)) return Date.now() - s; await sleep(20) }; return null }
out.b8 = {}
for (const [name, path, sel] of [['atlas', '/', '[data-testid=grid]'], ['profile', '/you', '[data-testid=region-card]'], ['sighting', `/sighting/${sightings[0].id}`, 'main']]) {
  await goto(path, sel); await sleep(800)
  await goOffline(true)
  const t0 = Date.now()
  const ms = await bannerMs()
  out.b8[name] = { bannerMs: ms, onLineAfter: await evaluate('navigator.onLine'), fetchFails: await evaluate(`fetch('/api/health', { cache: 'no-store' }).then(() => false).catch(() => true)`), wall: Date.now() - t0 }
  if (name === 'atlas') await shot('b8-offline-atlas')
  // A reload while offline: the page comes from the worker; the banner keys on onLine at mount.
  await send('Page.reload'); await waitFor(sel)
  // CDP's emulation survives the reload for the network but not for `navigator.onLine` (0009 A7's artefact). The worker
  // served the navigation from its cache and says so (`dex:offline`, ~1.5 s after the commit); a failed query is faster.
  out.b8[name].afterReload = { onLine: await evaluate('navigator.onLine'), fetchFails: await evaluate(`fetch('/api/health', { cache: 'no-store' }).then(() => false).catch(() => true)`), bannerMs: await bannerMs() }
  if (name === 'profile') { out.b10.avatarOffline = await evaluate(`(() => { const i = document.querySelector('[data-testid=avatar-image]'); return i ? { decoded: i.complete && i.naturalWidth > 0, w: i.naturalWidth } : null })()`); await shot('b10-profile-offline') }
  await goOffline(false); await sleep(300)
}

// ── B11 · offline region sheet: one "erst online laden" per waiting row, a tap adds nothing ─────────────────────
await goto('/you', '[data-testid=region-card]'); await sleep(500)
// The sheet lists what `dex.regions` last answered; the profile never asks for it, so open the sheet once online.
await click('[data-testid=change-region]'); await waitFor('[data-testid=region-row]'); await sleep(300)
await goto('/you', '[data-testid=region-card]'); await sleep(500)
await goOffline(true); await sleep(300)
await click('[data-testid=change-region]'); await waitFor('[data-testid=region-sheet]'); await sleep(500)
const marker = messages.regions.onlineFirst
const occurrences = () => evaluate(`(document.querySelector('[data-testid=region-sheet]').innerText.match(new RegExp(${JSON.stringify(marker)}, 'g')) ?? []).length`)
const pick = `[data-testid=region-row][data-region="${SCHAGEN}"] [data-testid=region-pick]`
out.b11 = { banner: await evaluate(`!!document.querySelector('[data-testid=offline-banner]')`), rows: await evaluate(`[...document.querySelectorAll('[data-testid=region-row]')].map((r) => ({ name: r.querySelector('[data-testid=region-row-name]').textContent, inList: !!r.dataset.inList, active: !!r.dataset.active, waits: !!r.querySelector('[data-testid=region-waits]') }))`), setsCached: await evaluate(`JSON.parse(localStorage.getItem('dex.queries')).json.clientState.queries.filter((q) => q.queryKey[0][1] === 'set').map((q) => q.queryKey[1].input.regionId)`), waitsRows: await evaluate(`document.querySelectorAll('[data-testid=region-waits]').length`), before: await occurrences() }
await click(pick); await sleep(400)
out.b11.afterTap1 = { occurrences: await occurrences(), line: await text('[data-testid=region-line]'), sheetOpen: await evaluate(`!!document.querySelector('[data-testid=region-sheet]')`) }
await click(pick); await sleep(400)
out.b11.afterTap2 = { occurrences: await occurrences(), line: await text('[data-testid=region-line]') }
await shot('b11-region-sheet-offline')
await goOffline(false); await sleep(300)

// ── B7 · a forced error on the onboarding's place search: the tail is the tRPC code ─────────────────────────────
await freshContext(); await asIdentity('B')
await send('Fetch.enable', { patterns: [{ urlPattern: '*dex.lookupRegion*', requestStage: 'Request' }] })
const errorBody = JSON.stringify([{ error: { json: { message: '\nInvalid `prisma.identity.create()` invocation:\n\n\n', code: -32603, data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 500, path: 'dex.lookupRegion' } } } }])
paused = ({ requestId }) => send('Fetch.fulfillRequest', { requestId, responseCode: 500, responseHeaders: [{ name: 'content-type', value: 'application/json' }], body: Buffer.from(errorBody).toString('base64') })
await goto('/onboarding', '[data-testid=regions], [data-testid=place]')
await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === ${JSON.stringify(messages.onboarding.typePlace)}); b?.click(); return !!b })()`)
await waitFor('[data-testid=place]')
await send('Input.insertText', { text: 'Bingen' })
await waitFor('[data-testid=place-error]', 5000); await sleep(300)
out.b7 = { line: await text('[data-testid=place-error]') }
await shot('b7-search-error')
await send('Fetch.disable'); paused = null

// ── 0012 T4 · "Alles löschen" wipes dex.queries and the outbox ──────────────────────────────────────────────────
await freshContext(); await asIdentity('A')
await goto('/', '[data-testid=grid]'); await waitWorker(); await sleep(1500)
// A row in the outbox, written as Queue.ts does (IndexedDB `dex-outbox` / `outbox`), plus a stale fallback snapshot.
const idbRows = () => evaluate(`new Promise((res) => { const r = indexedDB.open('dex-outbox'); r.onerror = () => res('error'); r.onsuccess = () => { const db = r.result; if (!db.objectStoreNames.contains('outbox')) return res(0); const c = db.transaction('outbox').objectStore('outbox').count(); c.onsuccess = () => res(c.result) } })`)
await evaluate(`new Promise((res) => { const r = indexedDB.open('dex-outbox', 1); r.onupgradeneeded = () => r.result.createObjectStore('outbox'); r.onsuccess = () => { const tx = r.result.transaction('outbox', 'readwrite'); tx.objectStore('outbox').put({ id: 'm25b', kind: 'study', payload: { taxonId: 'x', taxon: {} }, createdAt: Date.now(), attempts: 0, lastError: null }, 'm25b'); tx.oncomplete = () => res(true) } })`)
await evaluate(`localStorage.setItem('dex.outbox.fallback', '[{"id":"m25b-snap"}]')`)
out.t4 = { before: { queries: await evaluate(`(localStorage.getItem('dex.queries') ?? '').length`), outbox: await idbRows(), snapshot: !!(await evaluate(`localStorage.getItem('dex.outbox.fallback')`)) } }
await goto('/settings', '[data-testid=delete]')
await click('[data-testid=delete]'); await waitFor('[data-testid=delete-confirm]:not([disabled])', 10_000); await sleep(200)
out.t4.summary = await text('[data-testid=delete-summary]')
await click('[data-testid=delete-confirm]'); await sleep(2500)
out.t4.after = { url: await evaluate('location.pathname'), queries: await evaluate(`(localStorage.getItem('dex.queries') ?? '').length`), queriesKeys: await evaluate(`(() => { const raw = localStorage.getItem('dex.queries'); if (!raw) return null; return JSON.parse(raw).json.clientState.queries.map((q) => q.queryKey[0].join('.')) })()`), outbox: await idbRows(), snapshot: !!(await evaluate(`localStorage.getItem('dex.outbox.fallback')`)), identity: await evaluate(`localStorage.getItem('dex.persist.identity')`) }
out.t4.identityChanged = out.t4.after.identity !== idOf('A')
out.t4.sqlIdentity = sql(`select count(*) from "Identity" where id = '${idOf('A')}'`)

writeFileSync(join(outDir, `b-sweep-${locale}.json`), JSON.stringify(out, null, 2))
console.log(JSON.stringify(out, null, 2))
ws.close(); proc.kill()
