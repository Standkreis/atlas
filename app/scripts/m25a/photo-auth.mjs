// 0025 A1 A2: GET /api/photo/<id> answers 200 only to the owner's cookie, 404 to anyone else and to no cookie; a sound
// answers 200 without a cookie and carries a public cache header. Run against the production build on the dev DB:
//   BASE=http://localhost:3010 node scripts/m25a/photo-auth.mjs
import { base, identity, sql } from './lib.mjs'

const a = identity(), b = identity()
await a.me(); await b.me()
const up = await a.upload()
if (up.status !== 201) throw new Error(`upload failed: ${JSON.stringify(up)}`)
const get = async (path, cookie) => { const r = await fetch(`${base}${path}`, { headers: cookie ? { cookie } : {} }); return { status: r.status, cache: r.headers.get('cache-control'), type: r.headers.get('content-type'), length: r.headers.get('content-length') } }
const soundId = sql(`select a.id from "Asset" a where a.kind='sound' order by a."createdAt" limit 1`)

const rows = [
  ['own photo, owner cookie', await get(`/api/photo/${up.id}`, a.cookie), 200],
  ['own photo, other identity', await get(`/api/photo/${up.id}`, b.cookie), 404],
  ['own photo, no cookie', await get(`/api/photo/${up.id}`), 404],
  ['own photo, garbage cookie', await get(`/api/photo/${up.id}`, 'dex_id=not-a-uuid'), 404],
  ['unknown id, owner cookie', await get(`/api/photo/00000000-0000-4000-8000-000000000000`, a.cookie), 404],
  ['sound, no cookie', await get(`/api/photo/${soundId}.mp3`), 200],
  ['sound, other identity', await get(`/api/photo/${soundId}.mp3`, b.cookie), 200],
]
console.log(`identities A ${a.short()} B ${b.short()} · photo ${up.id} · sound ${soundId}`)
let bad = 0
for (const [name, r, want] of rows) { const ok = r.status === want; if (!ok) bad++; console.log(`${ok ? '✅' : '❌'} ${name}: ${r.status} (want ${want}) · cache-control: ${r.cache ?? '–'}${r.length ? ` · ${r.length} B` : ''}`) }
// A2: photos private, sounds public; the worker's image cache still skips `.mp3` (public/sw.js isImage).
const photoCache = rows[0][1].cache, soundCache = rows[5][1].cache
console.log(`${photoCache?.startsWith('private') ? '✅' : '❌'} photo cache-control private · ${soundCache?.startsWith('public') ? '✅' : '❌'} sound cache-control public`)
// Leave nothing behind: the upload is unattached and would otherwise wait for the sweep.
sql(`delete from "Asset" where id='${up.id}'`)
process.exitCode = bad ? 1 : 0
