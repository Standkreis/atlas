import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

const url = new URL(process.env.DATABASE_URL ?? 'postgresql://dex:dex@localhost:5433/dex_check_missing')
if (!['localhost', '127.0.0.1'].includes(url.hostname) || !/^\/dex_check_[a-z0-9_]+$/.test(url.pathname)) throw new Error('Integration tests require a disposable local dex_check_* database')
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['src/**/*.integration.test.ts'],
    fileParallelism: false,
    testTimeout: 30000,
    env: { DATABASE_URL: url.toString(), BLOB_READ_WRITE_TOKEN: '', PHOTO_DIR: '/tmp/dex-check-photo-objects', ANTHROPIC_API_KEY: '', RESEND_API_KEY: '', WEBAUTHN_SECRET: 'integration-only-not-a-production-secret', UPLOAD_IDENTITY_DAILY: '3', UPLOAD_NETWORK_DAILY: '5', UPLOAD_GLOBAL_STORAGE_BYTES: '1048576' },
  },
})
