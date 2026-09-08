// Reproduces the CI production-browser suite against a disposable database.
import { spawn } from 'node:child_process'
const database = new URL(process.env.DATABASE_URL ?? '')
if (!['localhost', '127.0.0.1'].includes(database.hostname) || !/^\/dex_check_[a-z0-9_]+$/.test(database.pathname)) throw new Error('Browser tests require a local dex_check_* database')
const base = 'http://localhost:3002'
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3002'], { stdio: 'inherit', env: { ...process.env, VERCEL: '1', BLOB_READ_WRITE_TOKEN: '', PHOTO_DIR: '/tmp/dex-check-photos', ANTHROPIC_API_KEY: 'check-only', ANTHROPIC_BASE_URL: 'http://127.0.0.1:9', RESEND_API_KEY: 'check-only', RESEND_BASE_URL: 'http://127.0.0.1:9', WEBAUTHN_RP_ID: 'localhost', WEBAUTHN_ORIGIN: base, WEBAUTHN_SECRET: 'check-only-secret-with-at-least-32-characters' } })
const run = (script, args) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [script, ...args], { stdio: 'inherit' })
  child.on('error', reject)
  child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${script} exited ${code}`)))
})
try {
  let ready = false
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error('Production server exited before checks')
    ready = await fetch(`${base}/api/health`).then((r) => r.ok).catch(() => false)
    if (ready) break
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  if (!ready) throw new Error('Production server did not become ready')
  for (const locale of ['en', 'de']) await run('scripts/check/ux.mjs', [base, locale])
  const identity = await fetch(`${base}/api/trpc/identity.me`).then((r) => r.json()).then((j) => j.result.data.json.id)
  await run('scripts/check/offline.mjs', [base, identity])
} finally {
  server.kill('SIGTERM')
  await new Promise((resolve) => { if (server.exitCode !== null) resolve(); else server.once('exit', resolve) })
}
