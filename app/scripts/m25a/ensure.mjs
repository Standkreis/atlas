// 0025 A8 A9: two `taxon.ensure` calls for one new GBIF key at the same instant: both answer, the same row, German name
// on it at once (GBIF vernaculars, A8), and the server log shows ONE content job for the key (A9). Pass a key that is
// not in the dev DB (default: the lion, 5219404) and the server's log file:
//   BASE=http://localhost:3010 LOG=/tmp/m25a-server.log KEY=5219404 node scripts/m25a/ensure.mjs
import { readFileSync } from 'node:fs'
import { identity, sql } from './lib.mjs'

const key = Number(process.env.KEY ?? 5219404)
if (sql(`select count(*) from "Taxon" where "gbifKey"=${key}`) !== '0') throw new Error(`taxon ${key} is already in the dev DB; pass another KEY`)
const a = identity(), b = identity()
await a.me(); await b.me()
const t0 = Date.now()
const [ra, rb] = await Promise.all([a.call('taxon.ensure', { gbifKey: key }), b.call('taxon.ensure', { gbifKey: key })])
console.log(`ensure ×2 in ${Date.now() - t0} ms: A ${ra.status} ${ra.error ?? ''} · B ${rb.status} ${rb.error ?? ''}`)
const rows = [ra, rb].map((r) => r.data)
console.log(`A: ${rows[0]?.sciName} · created ${rows[0]?.created} · names ${JSON.stringify(rows[0]?.commonNames)}\nB: ${rows[1]?.sciName} · created ${rows[1]?.created} · names ${JSON.stringify(rows[1]?.commonNames)}`)
const sameRow = rows[0]?.id && rows[0].id === rows[1]?.id
const nameNow = !!rows[0]?.commonNames?.de
console.log(`${ra.status === 200 && rb.status === 200 && sameRow ? '✅' : '❌'} both 200, one row · ${nameNow ? '✅' : '❌'} A8 German name on the answer before the kick`)
// A9: wait for the kick, then count its log lines.
let done = []
for (let i = 0; i < 90 && !done.length; i++) { await new Promise((r) => setTimeout(r, 1000)); done = readFileSync(process.env.LOG ?? '/tmp/m25a-server.log', 'utf8').split('\n').filter((l) => l.startsWith(`[content ${key}] done`)) }
const kicks = readFileSync(process.env.LOG ?? '/tmp/m25a-server.log', 'utf8').split('\n').filter((l) => l.startsWith(`[content ${key}] content:`))
console.log(`log: ${kicks.length} job start(s), ${done.length} done line(s) → ${done[0] ?? '(none within 90 s)'}`)
const after = sql(`select "commonNames"::text, ("contentAt" is not null) from "Taxon" where "gbifKey"=${key}`)
console.log(`row after the kick: ${after}`)
console.log(`${kicks.length === 1 && done.length === 1 ? '✅' : '❌'} A9 one content job for two parallel ensure calls`)
process.exitCode = kicks.length === 1 && done.length === 1 && sameRow && nameNow ? 0 : 1
