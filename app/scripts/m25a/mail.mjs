// 0025 A6: the dev server's `[mail]` line masks the address. Needs a server WITHOUT RESEND_API_KEY (the masked line is
// the no-key path; production sends through Resend and logs nothing). `next dev` reads .env.local by itself, so the key
// must be emptied on the command line (an empty value counts as unset) and stdout goes to a file:
//   RESEND_API_KEY= BLOB_READ_WRITE_TOKEN= PHOTO_DIR=/tmp/m25a-devphotos npx next dev -p 3011 > /tmp/m25a-dev.log
//   BASE=http://localhost:3011 LOG=/tmp/m25a-dev.log node scripts/m25a/mail.mjs
import { readFileSync } from 'node:fs'
import { identity } from './lib.mjs'

const a = identity()
await a.me()
const email = `m25a-${Math.random().toString(36).slice(2, 8)}@example.org`
const r = await a.call('identity.emailStart', { email })
await new Promise((res) => setTimeout(res, 500))
const line = readFileSync(process.env.LOG ?? '/tmp/m25a-dev.log', 'utf8').split('\n').filter((l) => l.includes('[mail] code for')).at(-1) ?? ''
const masked = `m…@example.org`
const ok = r.status === 200 && line.includes(masked) && !line.includes(email)
console.log(`emailStart ${r.status} for ${email}\nlog: ${line}\n${ok ? '✅' : '❌'} the line carries "${masked}" and not the address`)
process.exitCode = ok ? 0 : 1
