// Handoff 0022, C1–C6 on the production build, headless Chrome over CDP (as scripts/m18/regions.mjs).
// Identity A: three regions (Schagen, Mainz-Bingen, Südwestpfalz in the list, Mainz-Bingen active), two sightings and
// one study → the cards' order and counts against SQL (C1), the axis switch and its reload (C2), the folds and the
// request count (C4), the section without network (C5). Identity B, fresh: the empty section (C6), then 7 of 69 birds
// and 4 of 388 plants seen → a bar on Vögel, none on Pflanzen (C3).
// usage: node scripts/m22/progress.mjs [outDir] [baseUrl]   (LOCALE=en for the English shots)
import { execFileSync, spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [outDir = '.', base = 'http://localhost:3002'] = process.argv.slice(2)
const locale = process.env.LOCALE ?? 'de'
const MB = '59037062-15d5-452e-99dc-785cbc408874' // Mainz-Bingen in the dev DB
const SCHAGEN = '67303e90-4569-4019-a36d-6c99b09b1de8'
const SWP = '9783b838-3dce-45b0-846e-fe92d58991ee' // Südwestpfalz
const tiles = ['bird', 'insect', 'plant', 'fungus', 'mammal', 'amphibian', 'reptile', 'fish']
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const out = { base, locale }
mkdirSync(outDir, { recursive: true })

// ── tRPC over fetch, one cookie per identity ──────────────────────────────────────────────────────────────────────
let cookie = ''
const trpc = async (path, input, method = 'POST') => {
  const r = method === 'GET'
    ? await fetch(`${base}/api/trpc/${path}?batch=1&input=${encodeURIComponent(JSON.stringify({ 0: { json: input ?? null } }))}`, { headers: { cookie } })
    : await fetch(`${base}/api/trpc/${path}?batch=1`, { method, headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ 0: { json: input } }) })
  const set = r.headers.get('set-cookie'); if (set && !cookie) cookie = set.split(';')[0]
  const j = await r.json()
  return { status: r.status, ...(j[0].result?.data?.json !== undefined ? { data: j[0].result.data.json } : { error: j[0].error?.json?.message }) }
}
const newIdentity = async () => { cookie = ''; const me = await trpc('identity.me', undefined, 'GET'); return me.data.id }
const setOf = async (regionId) => (await trpc('dex.set', { regionId, tiles, nowOnly: false }, 'GET')).data
const sql = (q) => execFileSync('docker', ['exec', 'standkreis-dex-db-1', 'psql', '-U', 'dex', '-d', 'dex', '-At', '-c', q]).toString().trim()
// C1's oracle: distinct wild-seen and studied taxa of the identity inside the region's set.
const sqlCounts = (identityId, regionId) => ({
  seen: +sql(`select count(distinct s."taxonId") from "Sighting" s join "Plausibility" p on p."taxonId" = s."taxonId" and p."regionId" = '${regionId}' where s."identityId" = '${identityId}' and s.wildness = 'wild'`),
  studied: +sql(`select count(*) from "Study" st join "Plausibility" p on p."taxonId" = st."taxonId" and p."regionId" = '${regionId}' where st."identityId" = '${identityId}'`),
  possible: +sql(`select count(*) from "Plausibility" where "regionId" = '${regionId}'`),
})

// ── identity A: three regions, two sightings, one study ──────────────────────────────────────────────────────────
const idA = await newIdentity()
out.seed = { setFilter: (await trpc('identity.setFilter', { regionId: MB, regionIds: [SCHAGEN, MB, SWP], tiles, nowOnly: false })).status }
const [mb, sch, swp] = await Promise.all([setOf(MB), setOf(SCHAGEN), setOf(SWP)])
const inSet = (set, id) => set.species.some((s) => s.taxonId === id)
const bird = mb.species.find((s) => s.tile === 'bird' && inSet(swp, s.taxonId) && !inSet(sch, s.taxonId)) // seen: Mainz-Bingen and Südwestpfalz
const plant = mb.species.find((s) => s.tile === 'plant' && !inSet(swp, s.taxonId) && !inSet(sch, s.taxonId)) // seen: Mainz-Bingen only
const insect = mb.species.find((s) => s.tile === 'insect' && !inSet(swp, s.taxonId) && !inSet(sch, s.taxonId)) // studied: Mainz-Bingen only
out.seed.taxa = { bird: bird.sciName, plant: plant.sciName, insect: insect.sciName }
for (const s of [bird, plant]) await trpc('sighting.create', { taxonId: s.taxonId, at: new Date().toISOString(), wildness: 'wild' })
await trpc('study.mark', { taxonId: insect.taxonId })
out.seed.sql = { mainzBingen: sqlCounts(idA, MB), schagen: sqlCounts(idA, SCHAGEN), suedwestpfalz: sqlCounts(idA, SWP) }

// ── Chrome over CDP, service workers attached ─────────────────────────────────────────────────────────────────────
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9222 + Math.floor(Math.random() * 500)
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/dex-m22-${port}`, 'about:blank'], { stdio: 'ignore' })
let version
for (let i = 0; i < 50 && !version; i++) { await sleep(200); version = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json()).catch(() => undefined) }
const ws = new WebSocket(version.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
const workers = new Set()
let offline = false
const requests = [] // every tRPC procedure the page asked for, batch URLs split
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? { error: m.error }); pending.delete(m.id); return }
  if (m.method === 'Target.attachedToTarget' && m.params.targetInfo.type === 'service_worker') {
    workers.add(m.params.sessionId)
    raw('Network.enable', {}, m.params.sessionId).then(() => (offline ? setOffline(m.params.sessionId, true) : null))
  }
  if (m.method === 'Target.detachedFromTarget') workers.delete(m.params.sessionId)
  if (m.method === 'Network.requestWillBeSent' && m.sessionId === sessionId) {
    const u = m.params.request.url
    const p = u.match(/\/api\/trpc\/([^?]+)/)
    if (p) for (const proc of p[1].split(',')) requests.push(proc)
  }
}
const raw = (method, params = {}, sessionId) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params, sessionId })) })
const setOffline = (sessionId, on) => raw('Network.emulateNetworkConditions', { offline: on, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }, sessionId)
const { targetInfos } = await raw('Target.getTargets')
const page = targetInfos.find((t) => t.type === 'page')
const { sessionId } = await raw('Target.attachToTarget', { targetId: page.targetId, flatten: true })
await raw('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true })
const send = (method, params = {}) => raw(method, params, sessionId)
await send('Network.enable'); await send('Runtime.enable'); await send('Page.enable')
const setCookie = async () => { const [name, value] = cookie.split('='); await send('Network.setCookie', { name, value, url: base }) }
await setCookie()
const evaluate = (expression) => send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }).then((r) => r?.result?.value)
const waitFor = async (selector, t = 30_000) => { const s = Date.now(); while (Date.now() - s < t) { if (await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`)) return Date.now() - s; await sleep(50) }; return null }
const click = (selector) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true })()`)
const text = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)})?.innerText ?? null`)
const shot = async (n) => { const { data } = await send('Page.captureScreenshot', { format: 'png' }); const f = join(outDir, `${n}-${locale}.png`); writeFileSync(f, Buffer.from(data, 'base64')); console.error(f) }
const goto = async (path, sel) => { await send('Page.navigate', { url: `${base}/${locale}${path}` }); return waitFor(sel) }
const goOffline = async (on) => { offline = on; await setOffline(sessionId, on); for (const w of workers) await setOffline(w, on) }
const card = (regionId) => `[data-testid=region-card][data-region="${regionId}"]`
// Every card as the DOM has it: order, counts, open state, the rows with their bars and colours.
const cards = () => evaluate(`[...document.querySelectorAll('[data-testid=region-card]')].map((c) => ({
  id: c.dataset.region.slice(0, 8), title: c.querySelector('[data-testid=region-title]').innerText, active: c.dataset.active === 'true', open: c.dataset.open === 'true',
  expanded: c.querySelector('[data-testid=region-toggle]').getAttribute('aria-expanded'), counts: c.querySelector('[data-testid=region-counts]').innerText,
  seen: +c.dataset.seen, studied: +c.dataset.studied, possible: +c.dataset.possible,
  bold: (() => { const b = c.querySelector('[data-testid=region-counts] b'); return b ? b.innerText + ' ' + getComputedStyle(b).color : null })(),
  bodyHeight: c.querySelector('[data-testid=region-body]')?.getBoundingClientRect().height ?? null,
  rows: [...c.querySelectorAll('[data-testid^=group-]')].map((li) => ({ tile: li.dataset.testid.slice(6), text: li.innerText.replace(/\\n/g, ' '), bar: li.dataset.bar, barColor: (() => { const b = li.querySelector('[data-testid=bar]'); return b ? getComputedStyle(b).backgroundColor : null })() })),
  more: c.querySelector('[data-testid=more-groups]')?.innerText ?? null, moreExpanded: c.querySelector('[data-testid=more-groups]')?.getAttribute('aria-expanded') ?? null,
  hint: c.querySelector('[data-testid=empty-hint]')?.innerText ?? null,
}))`)
const readyCards = async () => { await waitFor(`${card(MB)}[data-possible]`); for (let i = 0; i < 100 && (await evaluate(`[...document.querySelectorAll('[data-testid=region-card]')].some((c) => !c.dataset.possible)`)); i++) await sleep(100); await sleep(300); return cards() }
const axis = () => evaluate(`({ axis: document.querySelector('[data-testid=progress]').dataset.axis, radios: [...document.querySelectorAll('[data-testid=axis] [role=radio]')].map((b) => b.getAttribute('aria-checked')), role: document.querySelector('[data-testid=axis]').getAttribute('role'), stored: localStorage.getItem('dex.progress.axis') })`)

await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })

// ── C1 · the three cards, the active one first and open, counts against SQL ──────────────────────────────────────
await goto('/', '[data-testid=grid]'); await sleep(1500) // the grid first, as on the phone: `dex.set` for the active region is in the cache
const count = (p, from = 0) => requests.slice(from).filter((r) => r === p).length
const beforeProfile = requests.length
await goto('/you', '[data-testid=progress]')
out.c1 = { cards: await readyCards(), oldCards: await evaluate(`!!document.querySelector('[data-testid=groups], [data-testid=counters]')`) }
// The profile's own requests: `dex.setCounts` once per region that is not the active one, `dex.set` not again (the grid's entry, fresh).
out.c1.requests = { setCounts: count('dex.setCounts', beforeProfile), set: count('dex.set', beforeProfile), progress: count('identity.progress', beforeProfile) }
await shot('c1-profile')

// ── C2 · Studiert: every bar and bold number flips, amber, survives the reload ───────────────────────────────────
out.c2 = { before: await axis() }
await click('[data-testid=axis-studied]'); await sleep(400)
out.c2.after = { ...(await axis()), cards: await cards() }
await shot('c2-studiert')
await send('Page.reload'); await goto('/you', '[data-testid=progress]')
out.c2.reload = { ...(await axis()), bold: (await readyCards())[0].bold }
await click('[data-testid=axis-seen]'); await sleep(400)
out.c2.back = await axis()

// ── C4 · folds: the region cards and "weitere Gruppen", aria-expanded; `dex.setCounts` only once per region ─────
// Every query is fresh (staleTime 60 s) and persisted, so this navigation asks the server for nothing; the toggles must not either.
await goto('/you', '[data-testid=progress]'); await readyCards()
requests.length = 0
out.c4 = {}
const c4 = async (step) => { await sleep(400); const cs = await cards(); return { step, schagen: (({ open, expanded, bodyHeight }) => ({ open, expanded, bodyHeight }))(cs.find((c) => c.title.match(/Schagen/i))), mb: (({ open, expanded, moreExpanded, rows }) => ({ open, expanded, moreExpanded, rows: rows.length }))(cs[0]), setCounts: count('dex.setCounts') } }
out.c4.steps = [await c4('load')]
await click(`${card(SCHAGEN)} [data-testid=region-toggle]`); out.c4.steps.push(await c4('open Schagen'))
await click(`${card(SCHAGEN)} [data-testid=region-toggle]`); out.c4.steps.push(await c4('close Schagen'))
await click(`${card(SCHAGEN)} [data-testid=region-toggle]`); out.c4.steps.push(await c4('open Schagen again'))
await click(`${card(MB)} [data-testid=more-groups]`); out.c4.steps.push(await c4('more groups open'))
await shot('c4-folds-open')
await click(`${card(MB)} [data-testid=more-groups]`); out.c4.steps.push(await c4('more groups closed'))
await click(`${card(MB)} [data-testid=region-toggle]`); out.c4.steps.push(await c4('close Mainz-Bingen'))
out.c4.foldTransition = await evaluate(`getComputedStyle(document.querySelector('[data-testid=region-body]')).transitionDuration + ' ' + getComputedStyle(document.querySelector('[data-testid=region-body]')).transitionProperty`)

// ── C5 · without network: the section from the persisted cache, the switch works ─────────────────────────────────
await goto('/you', '[data-testid=progress]'); const online = await readyCards()
for (let i = 0; i < 50 && !(await evaluate('!!navigator.serviceWorker.controller')); i++) await sleep(200)
out.c5 = { controller: await evaluate('!!navigator.serviceWorker.controller'), workers: workers.size, persisted: await evaluate(`(() => { const q = JSON.parse(localStorage.getItem('dex.queries')).json.clientState.queries; return q.map((x) => x.queryKey[0].join('.') + (x.queryKey[1]?.input?.regionId ? ':' + x.queryKey[1].input.regionId.slice(0, 8) : '')).filter((k) => /dex|progress|identity.me/.test(k)).sort() })()`) }
await goOffline(true)
out.c5.pageFetch = await evaluate(`fetch('/api/trpc/identity.me?batch=1&input=%7B%7D').then((r) => 'ok ' + r.status, (e) => 'failed: ' + e.message)`)
await send('Page.reload')
out.c5.profileOfflineMs = await waitFor('[data-testid=progress]', 20_000)
const offlineCards = await readyCards()
out.c5.identical = JSON.stringify(online.map((c) => [c.title, c.counts, c.rows.map((r) => r.text)])) === JSON.stringify(offlineCards.map((c) => [c.title, c.counts, c.rows.map((r) => r.text)]))
out.c5.banner = await text('[data-testid=offline-banner]')
await click('[data-testid=axis-studied]'); await sleep(400)
out.c5.switched = { ...(await axis()), bold: (await cards()).map((c) => c.bold) }
await shot('c5-offline-studiert')
await click('[data-testid=axis-seen]')
await goOffline(false)

// ── identity B, fresh: C6 the empty section, then C3 the bar rule ────────────────────────────────────────────────
const idB = await newIdentity()
await trpc('identity.setFilter', { regionId: MB, regionIds: [MB], tiles, nowOnly: false })
await setCookie()
await evaluate('localStorage.clear()') // a fresh device: the persisted store of identity A must not answer for B
await goto('/you', '[data-testid=progress]')
const empty = await readyCards()
out.c6 = { cards: empty, hint: empty[0].hint }
await click(`${card(MB)} [data-testid=more-groups]`); await sleep(400)
out.c6.opened = (await cards())[0].rows.map((r) => r.text)
await shot('c6-empty')
// 7 of 69 birds (10.1 %) and 4 of 388 plants (1.0 %), wild.
const birds = mb.species.filter((s) => s.tile === 'bird').slice(0, 7), plants = mb.species.filter((s) => s.tile === 'plant').slice(0, 4)
for (const s of [...birds, ...plants]) await trpc('sighting.create', { taxonId: s.taxonId, at: new Date().toISOString(), wildness: 'wild' })
await evaluate('localStorage.clear()') // the sightings went in past the page: a fresh load, as the app's own invalidation would give
await goto('/you', '[data-testid=progress]')
const c3 = await readyCards()
out.c3 = { sql: sqlCounts(idB, MB), counts: c3[0].counts, rows: c3[0].rows, bars: await evaluate(`[...document.querySelectorAll('[data-testid=bar]')].map((b) => b.closest('li').dataset.testid + ' ' + b.style.width)`) }
await shot('c3-bars')
await click('[data-testid=axis-studied]'); await sleep(400)
out.c3.studiert = { rows: (await cards())[0].rows.map((r) => r.tile + ' ' + r.bar), more: (await cards())[0].more }
await click('[data-testid=axis-seen]')

console.log(JSON.stringify(out, null, 2))
ws.close(); proc.kill()
process.exit(0)
