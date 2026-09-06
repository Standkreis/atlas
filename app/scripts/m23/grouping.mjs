// Handoff 0023, C1–C8 on the production build, headless Chrome over CDP (as scripts/m18/regions.mjs).
// Two identities in Mainz-Bingen: A has 2 wild sightings (Amsel, Grasfrosch) and 2 studies (Rotkehlchen and Amsel, so
// "seen wins" is exercised), B is fresh. Then the sections, the order inside them, the sticky header, the narrowed
// grids, the back button and reset, and the perf numbers for none · exploration · tile on one build.
// usage: LOCALE=de node scripts/m23/grouping.mjs [outDir] [baseUrl]
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [outDir = '.', base = 'http://localhost:3002'] = process.argv.slice(2)
const locale = process.env.LOCALE ?? 'de'
const MB = '59037062-15d5-452e-99dc-785cbc408874' // Mainz-Bingen in the dev DB
const tiles = ['bird', 'mammal', 'amphibian', 'reptile', 'fish', 'insect', 'plant', 'fungus']
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const out = { base, locale }
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
for (const who of ['A', 'B']) { await trpc(who, 'identity.me', undefined, 'GET'); await trpc(who, 'identity.setFilter', { regionId: MB, regionIds: [MB], tiles, nowOnly: false }) }
const set = await trpc('A', 'dex.set', { regionId: MB, tiles, nowOnly: false }, 'GET')
const byDe = (n) => set.species.find((s) => s.names.de === n)
const amsel = byDe('Amsel'), frosch = byDe('Grasfrosch'), rotkehlchen = byDe('Rotkehlchen')
for (const s of [amsel, frosch]) await trpc('A', 'sighting.create', { taxonId: s.taxonId, at: new Date().toISOString(), wildness: 'wild' })
for (const s of [rotkehlchen, amsel]) await trpc('A', 'study.mark', { taxonId: s.taxonId })
const progress = await trpc('A', 'identity.progress', undefined, 'GET')
out.seed = { setSize: set.setSize, tiles: set.tiles, seen: progress.seen.length, studied: progress.studied.length, overlap: progress.studied.filter((id) => progress.seen.includes(id)).length }

// ── Chrome over CDP ───────────────────────────────────────────────────────────────────────────────────────────────
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9222 + Math.floor(Math.random() * 500)
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/dex-m23-${port}`, 'about:blank'], { stdio: 'ignore' })
let version
for (let i = 0; i < 50 && !version; i++) { await sleep(200); version = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json()).catch(() => undefined) }
const ws = new WebSocket(version.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? { error: m.error }); pending.delete(m.id) } }
const raw = (method, params = {}, sessionId) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params, sessionId })) })
const { targetInfos } = await raw('Target.getTargets')
let { sessionId } = await raw('Target.attachToTarget', { targetId: targetInfos.find((t) => t.type === 'page').targetId, flatten: true })
const send = (method, params = {}) => raw(method, params, sessionId)
const enable = async () => { await send('Network.enable'); await send('Runtime.enable'); await send('Page.enable'); await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] }) }
await enable()
// A second browser context for identity B (C2): its own cookies and its own localStorage, so nothing of A's persisted store leaks.
const freshContext = async () => { const { browserContextId } = await raw('Target.createBrowserContext'); const { targetId } = await raw('Target.createTarget', { url: 'about:blank', browserContextId }); sessionId = (await raw('Target.attachToTarget', { targetId, flatten: true })).sessionId; await enable() }
// The queries persist in localStorage with staleTime 60 s (trpc/client.tsx): a filter written outside the page is only seen after the store is dropped.
const dropStore = () => evaluate('localStorage.clear()')
const asIdentity = async (who) => { const [name, value] = jar[who].split('='); await send('Network.setCookie', { name, value, url: base }) }
const evaluate = (expression) => send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }).then((r) => r?.result?.value)
const waitFor = async (selector, t = 30_000) => { const s = Date.now(); while (Date.now() - s < t) { if (await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`)) return Date.now() - s; await sleep(25) }; return null }
const waitGone = async (selector, t = 5_000) => { const s = Date.now(); while (Date.now() - s < t) { if (!(await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`))) return Date.now() - s; await sleep(50) }; return null }
const click = (selector) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true })()`)
const shot = async (n) => { const { data } = await send('Page.captureScreenshot', { format: 'png' }); const f = join(outDir, `${n}-${locale}.png`); writeFileSync(f, Buffer.from(data, 'base64')); console.error(f) }
// A navigation: the ms until the grid's `ul` is in the DOM and, once settled, the paint entries of the document.
const goto = async (path) => { await send('Page.navigate', { url: `${base}/${locale}${path}` }); const ms = await waitFor('[data-testid=grid], [data-testid=empty]'); await sleep(1200); return ms }
const url = () => evaluate('location.pathname + location.search')
// The sections as the DOM shows them: header text, `data-count`, and the taxon ids that follow until the next header.
const sections = () => evaluate(`(() => { const r = []; let cur = { key: null, rows: [] }; for (const li of document.querySelectorAll('[data-testid=grid] > li')) { const k = li.dataset.testid?.startsWith('group-') ? li.dataset.testid.slice(6) : null; if (k) { if (cur.key || cur.rows.length) r.push(cur); cur = { key: k, text: li.innerText, count: +li.dataset.count, rows: [] } } else cur.rows.push({ id: li.dataset.taxon, outside: !!li.dataset.outside }) } r.push(cur); return r.map((s) => ({ ...s, n: s.rows.length, ids: s.rows.map((x) => x.id), outside: s.rows.filter((x) => x.outside).length })) })()`)
const headers = (secs) => secs.filter((s) => s.key).map((s) => `${s.key} · ${s.count}`)
const nameOf = new Map(set.species.map((s) => [s.taxonId, s.names[locale] ?? s.names.de ?? s.names.en ?? s.sciName]))

await asIdentity('A')

// ── C1 · the default grid: three exploration sections, the sum is the set ────────────────────────────────────────
await goto('/')
let secs = await sections()
out.c1 = { headers: headers(secs), sum: secs.reduce((n, s) => n + s.n, 0), setSize: set.setSize, urlHasGroup: (await url()).includes('group='), badge: await evaluate(`document.querySelector('[data-testid=badge]')?.innerText ?? null`), seenSection: secs.find((s) => s.key === 'seen')?.ids.map((i) => nameOf.get(i)), studiedSection: secs.find((s) => s.key === 'studied')?.ids.map((i) => nameOf.get(i)) }
await shot('c1-exploration')

// ── C8 · perf on one build: none (the pre-0023 DOM), exploration, tile; grid-up ms, FCP, a 3 000 px scroll in rAF steps ──
const scrollRun = () => evaluate(`new Promise((res) => { window.scrollTo(0, 0); let frames = 0, longest = 0, last = performance.now(); const start = last; const step = () => { const now = performance.now(); longest = Math.max(longest, now - last); last = now; frames++; window.scrollBy(0, 100); if (frames < 30) requestAnimationFrame(step); else res({ ms: Math.round(now - start), frames, longestFrameMs: Math.round(longest), scrollY: Math.round(window.scrollY) }) }; requestAnimationFrame(step) })`)
out.c8 = {}
const idsBy = {}
for (const g of ['none', 'exploration', 'tile']) {
  const runs = []
  for (let i = 0; i < 3; i++) {
    const gridMs = await goto(`/?group=${g}`)
    const paint = await evaluate(`Object.fromEntries(performance.getEntriesByType('paint').map((p) => [p.name, Math.round(p.startTime)]))`)
    const li = await evaluate(`document.querySelectorAll('[data-testid=grid] > li').length`)
    const scroll = await scrollRun()
    runs.push({ gridMs, fcp: paint['first-contentful-paint'] ?? null, li, ...scroll })
  }
  idsBy[g] = await sections()
  const med = (k) => runs.map((r) => r[k]).sort((a, b) => a - b)[1]
  out.c8[g] = { runs, median: { gridMs: med('gridMs'), fcp: med('fcp'), scrollMs: med('ms'), longestFrameMs: med('longestFrameMs') }, li: runs[0].li, headers: headers(idsBy[g]).length }
}

// ── C4 · the order inside a section is the chosen order; name alphabetises inside each ───────────────────────────
const flat = idsBy.none[0].ids
const notYet = flat.filter((i) => !progress.seen.includes(i) && !progress.studied.includes(i))
const newSec = idsBy.exploration.find((s) => s.key === 'new')
const birdSec = idsBy.tile.find((s) => s.key === 'bird')
out.c4 = {
  none: { first10: flat.slice(0, 10).map((i) => nameOf.get(i)) },
  exploration: { new10: newSec.ids.slice(0, 10).map((i) => nameOf.get(i)), equalsNoneMinusSeenStudied: JSON.stringify(newSec.ids.slice(0, 10)) === JSON.stringify(notYet.slice(0, 10)), wholeSectionKeepsOrder: JSON.stringify(newSec.ids) === JSON.stringify(notYet) },
  tile: { bird10: birdSec.ids.slice(0, 10).map((i) => nameOf.get(i)), equalsNoneBirds: JSON.stringify(birdSec.ids) === JSON.stringify(flat.filter((i) => set.species.find((s) => s.taxonId === i)?.tile === 'bird')) },
}
await goto('/?sort=name'); secs = await sections()
const sorted = (ids) => ids.every((id, i) => i === 0 || nameOf.get(ids[i - 1]).localeCompare(nameOf.get(id), locale) <= 0)
out.c4.name = { headers: headers(secs), eachSectionAlphabetical: secs.filter((s) => s.key).map((s) => ({ key: s.key, alphabetical: sorted(s.ids), first3: s.ids.slice(0, 3).map((i) => nameOf.get(i)) })) }
await goto('/?sort=name&group=tile'); secs = await sections()
out.c4.name.tile = secs.filter((s) => s.key).map((s) => ({ key: s.key, alphabetical: sorted(s.ids), first2: s.ids.slice(0, 2).map((i) => nameOf.get(i)) }))

// ── C5 · the sticky header under the top edge while 300 tiles scroll by ──────────────────────────────────────────
await goto('/')
const rect = (sel) => evaluate(`(() => { const r = document.querySelector(${JSON.stringify(sel)})?.getBoundingClientRect(); return r ? { top: Math.round(r.top), height: Math.round(r.height), width: Math.round(r.width) } : null })()`)
const rowH = await evaluate(`(() => { const a = [...document.querySelectorAll('[data-testid=grid] > li[data-taxon]')]; return Math.round(a[6].getBoundingClientRect().top - a[3].getBoundingClientRect().top) })()`) // two rows inside "Noch nicht" (3 and 6 sit after the two small sections)
out.c5 = { rowHeightPx: rowH, tiles300Px: rowH * 100, at: {} }
for (const y of [0, 300, 3000, rowH * 100]) {
  await evaluate(`window.scrollTo(0, ${y})`); await sleep(150)
  out.c5.at[y] = { scrollY: await evaluate('Math.round(window.scrollY)'), header: await rect('[data-testid=group-new]'), gridTop: (await rect('[data-testid=grid]'))?.top, headerText: await evaluate(`document.querySelector('[data-testid=group-new]')?.innerText`), stickyTop: await evaluate(`getComputedStyle(document.querySelector('[data-testid=group-new]')).top`), position: await evaluate(`getComputedStyle(document.querySelector('[data-testid=group-new]')).position`) }
  if (y === 3000) await shot('c5-scrolled')
}
out.c5.gridStyle = await evaluate(`(() => { const h = document.querySelector('[data-testid=group-new]'); const cs = getComputedStyle(h); return { gridColumn: cs.gridColumnStart + ' / ' + cs.gridColumnEnd, zIndex: cs.zIndex, width: Math.round(h.getBoundingClientRect().width), ulWidth: Math.round(document.querySelector('[data-testid=grid]').getBoundingClientRect().width), transition: cs.transitionDuration, clippingAncestors: (() => { let n = h.parentElement, r = []; while (n) { const o = getComputedStyle(n).overflow; if (o !== 'visible') r.push(n.tagName + ':' + o); n = n.parentElement } return r })() } })()`)

// ── C3 · tile grouping in the fixed order; a switched-off tile and fish absent ───────────────────────────────────
out.c3 = { setFilter: (await trpc('A', 'identity.setFilter', { regionId: MB, tiles: tiles.filter((t) => t !== 'reptile'), nowOnly: false }))?.tiles }
await dropStore(); await goto('/?group=tile'); secs = await sections()
Object.assign(out.c3, { headers: headers(secs), order: secs.filter((s) => s.key).map((s) => s.key), fixedOrder: JSON.stringify(secs.filter((s) => s.key).map((s) => s.key)) === JSON.stringify(tiles.filter((t) => secs.some((s) => s.key === t))), reptile: secs.some((s) => s.key === 'reptile'), fish: secs.some((s) => s.key === 'fish'), sum: secs.reduce((n, s) => n + s.n, 0), badge: await evaluate(`document.querySelector('[data-testid=badge]')?.innerText ?? null`) })
await shot('c3-tile')
await trpc('A', 'identity.setFilter', { regionId: MB, tiles, nowOnly: false }); await dropStore()

// ── C6 · state filter and search narrow, the headers follow ─────────────────────────────────────────────────────
await goto('/?show=seen'); secs = await sections()
out.c6 = { showSeen: { headers: headers(secs), names: secs.flatMap((s) => s.ids).map((i) => nameOf.get(i)) } }
await shot('c6-show-seen')
await goto('/?q=amsel'); secs = await sections()
out.c6.qAmsel = { headers: headers(secs), names: secs.map((s) => ({ key: s.key, names: s.ids.map((i) => nameOf.get(i) ?? 'out-of-set') })) }
await shot('c6-q-amsel')
await goto('/?q=amsel&group=tile'); secs = await sections()
out.c6.qAmselTile = headers(secs)
await goto('/?show=studied&group=tile'); secs = await sections()
out.c6.showStudiedTile = { headers: headers(secs), names: secs.flatMap((s) => s.ids).map((i) => nameOf.get(i)) }

// ── C7 · the drawer's chips, the back button, reset ─────────────────────────────────────────────────────────────
await goto('/')
const trail = [await url()]
await click('[data-testid=filter-button]'); await waitFor('[data-testid=drawer]'); await sleep(400)
out.c7 = { chips: await evaluate(`[...document.querySelectorAll('[data-testid^=group-]')].filter((b) => b.closest('[data-testid=drawer]')).map((b) => ({ id: b.dataset.testid, role: b.getAttribute('role'), checked: b.getAttribute('aria-checked'), text: b.innerText, motion: getComputedStyle(b).transitionDuration }))`), sectionOrder: await evaluate(`[...document.querySelectorAll('[data-testid=drawer] h3')].map((h) => h.innerText)`) }
await shot('c7-drawer')
await click('[data-testid=group-tile]'); await sleep(300)
trail.push(await url())
out.c7.badgeAfterTile = await evaluate(`document.querySelector('[data-testid=badge]')?.innerText ?? null`)
out.c7.chipsAfterTile = await evaluate(`[...document.querySelectorAll('[data-testid=drawer] [data-testid^=group-]')].map((b) => b.dataset.testid + '=' + b.getAttribute('aria-checked'))`)
await click('[data-testid=apply]'); await waitGone('[data-testid=drawer]'); await sleep(300)
out.c7.headersAfterTile = headers(await sections())
await click('[data-testid=grid] li[data-taxon] a'); await waitFor('[data-testid=species]'); await sleep(500)
trail.push(await url())
await evaluate('history.back()'); await waitFor('[data-testid=grid]'); await sleep(1200)
trail.push(await url())
out.c7.headersAfterBack = headers(await sections())
await click('[data-testid=filter-button]'); await waitFor('[data-testid=drawer]'); await sleep(300)
await click('[data-testid=reset]'); await sleep(300)
trail.push(await url())
out.c7.chipsAfterReset = await evaluate(`[...document.querySelectorAll('[data-testid=drawer] [data-testid^=group-]')].map((b) => b.dataset.testid + '=' + b.getAttribute('aria-checked'))`)
await click('[data-testid=apply]'); await waitGone('[data-testid=drawer]'); await sleep(300)
out.c7.headersAfterReset = headers(await sections())
out.c7.trail = trail

// ── C2 · a fresh identity: only "Noch nicht · 929" ──────────────────────────────────────────────────────────────
await freshContext(); await asIdentity('B')
await goto('/'); secs = await sections()
out.c2 = { headers: headers(secs), sum: secs.reduce((n, s) => n + s.n, 0), headerText: secs.find((s) => s.key)?.text }
await shot('c2-fresh')

console.log(JSON.stringify(out, null, 2))
ws.close(); proc.kill()
process.exit(0)
