import { afterAll, beforeAll, afterEach, describe, expect, it, vi } from 'vitest'
const disk = vi.hoisted(() => ({ mtime: Date.now(), body: '{"source":"cache"}' }))
vi.mock('node:fs', () => ({ existsSync: () => true, mkdirSync: () => {}, readFileSync: () => disk.body, writeFileSync: () => {}, statSync: () => ({ mtimeMs: disk.mtime }) }))
let layer: typeof import('./fetch')
beforeAll(async () => { vi.stubEnv('VERCEL', ''); layer = await import('./fetch') })
afterAll(() => vi.unstubAllEnvs())
afterEach(() => { vi.unstubAllGlobals(); disk.mtime = Date.now() })
describe('ETL cache freshness', () => {
  it('reuses fresh data but a refresh run fetches even a fresh cached response', async () => {
    const network = vi.fn(async () => Response.json({ source: 'network' }))
    vi.stubGlobal('fetch', network)
    expect(await layer.get('https://api.gbif.org/test')).toEqual({ source: 'cache' })
    expect(network).not.toHaveBeenCalled()
    expect(await layer.withFreshCache(() => layer.get('https://api.gbif.org/test'))).toEqual({ source: 'network' })
    expect(network.mock.calls).toHaveLength(1)
    expect(await layer.get('https://api.gbif.org/test')).toEqual({ source: 'cache' })
  })
  it('expires old responses and sends an abort signal on network reads', async () => {
    disk.mtime = Date.now() - layer.CACHE_TTL_MS - 1
    const network = vi.fn(async (_url: string, init: RequestInit) => { expect(init.signal).toBeInstanceOf(AbortSignal); return Response.json({ fresh: true }) })
    vi.stubGlobal('fetch', network)
    expect(await layer.get('https://api.gbif.org/test')).toEqual({ fresh: true })
    expect(network.mock.calls).toHaveLength(1)
  })
})
