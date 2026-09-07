// 0025 A4 A5: an abandoned upload and an email code, both aged past a day, disappear when the sweep runs; a fresh pair
// stays. Uploads through the running server (so the file lands where the server put it: PHOTO_DIR or the Blob store),
// ages the rows in the dev DB, then runs `npm run etl -- sweep` in this process's environment (same DATABASE_URL and
// PHOTO_DIR / BLOB_READ_WRITE_TOKEN as the server) and reads its log.
//   BASE=http://localhost:3010 node scripts/m25a/sweep.mjs
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { identity, sql } from './lib.mjs'

const a = identity()
const me = await a.me()
const old = await a.upload(), fresh = await a.upload()
if (old.status !== 201 || fresh.status !== 201) throw new Error('upload failed')
sql(`update "Asset" set "createdAt" = now() - interval '2 days' where id='${old.id}'`)
sql(`insert into "EmailCode" (id, "identityId", email, "codeHash", "expiresAt", locale) values (gen_random_uuid(), '${me.id}', 'm25a@example.org', 'x', now() - interval '2 days', 'de'), (gen_random_uuid(), '${me.id}', 'm25a@example.org', 'y', now() + interval '10 minutes', 'de')`)
const before = { photos: sql(`select count(*) from "Asset" where id in ('${old.id}','${fresh.id}')`), codes: sql(`select count(*) from "EmailCode" where email='m25a@example.org'`) }
const photoDir = process.env.PHOTO_DIR ?? 'data/photos'
const onDisk = !process.env.BLOB_READ_WRITE_TOKEN
const fileBefore = onDisk ? existsSync(`${photoDir}/${old.id}.jpg`) : 'blob'

const log = execFileSync('npm', ['run', '-s', 'etl', '--', 'sweep'], { encoding: 'utf8', env: process.env, stdio: ['ignore', 'pipe', 'pipe'] })
const lines = log.split('\n').filter((l) => l.includes('[sweep]') || l.startsWith('sweep:'))
console.log(lines.join('\n'))

const after = { old: sql(`select count(*) from "Asset" where id='${old.id}'`), fresh: sql(`select count(*) from "Asset" where id='${fresh.id}'`), codes: sql(`select count(*) from "EmailCode" where email='m25a@example.org'`) }
const fileAfter = onDisk ? existsSync(`${photoDir}/${old.id}.jpg`) : 'blob'
console.log(`before: photos ${before.photos}, codes ${before.codes}, old file ${fileBefore} · after: old row ${after.old}, fresh row ${after.fresh}, codes ${after.codes}, old file ${fileAfter}`)
const okPhotos = after.old === '0' && after.fresh === '1' && (fileAfter === 'blob' || fileAfter === false)
const okCodes = after.codes === '1' && lines.some((l) => /\d+ email code\(s\) older than a day removed/.test(l))
console.log(`${okPhotos ? '✅' : '❌'} A5 abandoned photo (row and file) gone, fresh one kept · ${okCodes ? '✅' : '❌'} A4 expired code gone, live one kept, count logged`)
// Tidy: the fresh upload and the live code would wait for the next sweep.
sql(`delete from "Asset" where id='${fresh.id}'`)
sql(`delete from "EmailCode" where email='m25a@example.org'`)
process.exitCode = okPhotos && okCodes ? 0 : 1
