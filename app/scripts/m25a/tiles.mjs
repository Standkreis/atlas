// 0025 A3: the tile proxy holds each address to 600 tiles a minute and refuses cross-site fetches. The burst uses an
// invalid tile (zoom 25 → 400) so OSM sees nothing; the cap counts before validation. One real tile at the end (one
// OSM request) shows a fresh address still gets a 200.
//   BASE=http://localhost:3010 node scripts/m25a/tiles.mjs
import { base } from './lib.mjs'

const ip = `203.0.113.${Math.floor(Math.random() * 250)}`
const hit = (path, headers = {}) => fetch(`${base}${path}`, { headers: { 'x-forwarded-for': ip, ...headers } })
const t0 = Date.now()
const burst = await Promise.all(Array.from({ length: 640 }, () => hit('/api/tiles/25/0/0')))
const ms = Date.now() - t0
const statuses = burst.map((r) => r.status)
const allowed = statuses.filter((s) => s === 400).length
const refused = burst.filter((r) => r.status === 429)
const retry = refused[0]?.headers.get('retry-after')
console.log(`address ${ip}: 640 requests in ${ms} ms → ${allowed}× 400 (allowed), ${refused.length}× 429; retry-after ${retry ?? '–'} s`)
// The bucket refills 10 tokens a second, so a burst that takes t ms lets 600 + ~t/100 through; the 601st in the same instant is refused.
const bound = 600 + Math.ceil(ms / 100) + 1
const ok1 = allowed >= 600 && allowed <= bound && retry !== null // the answers arrive in no fixed order, so the count is the measure, not the index
console.log(`${ok1 ? '✅' : '❌'} 600 ≤ allowed (${allowed}) ≤ ${bound} and retry-after set`)
// After the retry-after, one tile comes back.
await new Promise((r) => setTimeout(r, (Number(retry) || 1) * 1000 + 50))
const again = await hit('/api/tiles/25/0/0')
console.log(`${again.status === 400 ? '✅' : '❌'} after retry-after: ${again.status}`)
// Cross-site and foreign origins are 403 before the bucket is touched; own referer passes.
const cross = await hit('/api/tiles/8/1/1', { 'sec-fetch-site': 'cross-site', 'x-forwarded-for': '203.0.113.251' })
const foreign = await hit('/api/tiles/8/1/1', { referer: 'https://evil.example/map', 'x-forwarded-for': '203.0.113.252' })
console.log(`${cross.status === 403 ? '✅' : '❌'} sec-fetch-site cross-site: ${cross.status} · ${foreign.status === 403 ? '✅' : '❌'} foreign referer: ${foreign.status}`)
const real = await hit('/api/tiles/8/134/86', { referer: `${base}/de`, 'sec-fetch-site': 'same-origin', 'x-forwarded-for': '203.0.113.253' })
console.log(`${real.status === 200 ? '✅' : '❌'} real tile from a fresh address with the app's referer: ${real.status} · cache-control ${real.headers.get('cache-control')} · ${real.headers.get('content-length')} B`)
process.exitCode = ok1 && again.status === 400 && cross.status === 403 && foreign.status === 403 && real.status === 200 ? 0 : 1
