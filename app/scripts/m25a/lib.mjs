// Shared bits of the 0025 Track A drivers: a tRPC caller that keeps the identity cookie, and a photo upload.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

export const base = process.env.BASE ?? 'http://localhost:3010'
export const jpegPath = process.env.JPEG ?? '/tmp/dex-0011a/test.jpg'

/** One identity: `me()` mints the cookie, `call()` sends tRPC procedures with it. */
export function identity() {
  const self = { cookie: '' }
  self.call = async (path, input, method = 'POST') => {
    const r = method === 'GET'
      ? await fetch(`${base}/api/trpc/${path}?batch=1&input=${encodeURIComponent(JSON.stringify({ 0: { json: input ?? null } }))}`, { headers: { cookie: self.cookie } })
      : await fetch(`${base}/api/trpc/${path}?batch=1`, { method, headers: { 'content-type': 'application/json', cookie: self.cookie }, body: JSON.stringify({ 0: { json: input } }) })
    const set = r.headers.get('set-cookie'); if (set && set.startsWith('dex_id=')) self.cookie = set.split(';')[0]
    const j = await r.json()
    return { status: r.status, ...(j[0].result?.data?.json !== undefined ? { data: j[0].result.data.json } : { error: j[0].error?.json?.message, code: j[0].error?.json?.data?.code }) }
  }
  self.me = async () => { const r = await self.call('identity.me', undefined, 'GET'); return r.data }
  self.upload = async () => {
    const form = new FormData()
    form.set('file', new Blob([readFileSync(jpegPath)], { type: 'image/jpeg' }), 'test.jpg')
    const r = await fetch(`${base}/api/photo`, { method: 'POST', headers: { cookie: self.cookie }, body: form })
    return { status: r.status, ...(await r.json()) }
  }
  self.short = () => self.cookie.split('=')[1]?.slice(0, 8) + '…'
  return self
}

export const sql = (q) => {
  return execFileSync('docker', ['exec', 'standkreis-dex-db-1', 'psql', '-U', 'dex', '-d', 'dex', '-tAc', q], { encoding: 'utf8' }).trim()
}
