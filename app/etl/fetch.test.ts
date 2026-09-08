import { afterAll, beforeAll, afterEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
const disk = vi.hoisted(() => ({ mtime: Date.now(), body: '{"source":"cache"}' }))
vi.mock('node:fs', () => ({ existsSync: () => true, mkdirSync: () => {}, readFileSync: () => disk.body, writeFileSync: () => {}, statSync: () => ({ mtimeMs: disk.mtime }) }))
let layer: typeof import('./fetch')
beforeAll(async () => { vi.stubEnv('VERCEL', ''); layer = await import('./fetch') })
afterAll(() => vi.unstubAllEnvs())
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); disk.mtime = Date.now() })

const digest = (...parts: string[]) => {
  const hash = createHash('sha256')
  for (const part of parts) hash.update(part)
  return hash.digest('hex')
}
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
  it('retries a transient server error and returns the eventual success', async () => {
    vi.useFakeTimers()
    const before = layer.requests()
    const network = vi.fn()
      .mockResolvedValueOnce(new Response('temporary failure', { status: 503 }))
      .mockResolvedValueOnce(Response.json({ recovered: true }))
    vi.stubGlobal('fetch', network)

    const result = layer.withFreshCache(() => layer.get('https://api.gbif.org/retry-regression'))
    await vi.advanceTimersByTimeAsync(1500)
    await expect(result).resolves.toEqual({ recovered: true })
    expect(network).toHaveBeenCalledTimes(2)
    const after = layer.requests()
    expect((after.perHost['api.gbif.org'] ?? 0) - (before.perHost['api.gbif.org'] ?? 0)).toBe(2)
    expect((after.networkAttempts ?? 0) - (before.networkAttempts ?? 0)).toBe(2)
  })
})

describe('response capture', () => {
  it('captures cache, JSON, text, and 404 responses without exposing bodies', async () => {
    const network = vi.fn(async (url: string) => {
      if (url.endsWith('/text')) return new Response('hello')
      if (url.endsWith('/missing')) return new Response('gone', { status: 404 })
      return Response.json({ answer: 42 })
    })
    vi.stubGlobal('fetch', network)

    const result = await layer.withResponseCapture(async () => {
      const cached = await layer.get<{ source: string }>('https://api.gbif.org/cached')
      const json = await layer.withFreshCache(() => layer.get<{ answer: number }>('https://api.gbif.org/json'))
      const text = await layer.withFreshCache(() => layer.get('https://api.gbif.org/text', { text: true }))
      const missing = await layer.withFreshCache(() => layer.get('https://api.gbif.org/missing'))
      return { cached, json, text, missing }
    })

    expect(result.value).toEqual({ cached: { source: 'cache' }, json: { answer: 42 }, text: 'hello', missing: null })
    expect(result.fingerprint).toBe(digest(
      'https://api.gbif.org/cached\0' + digest(disk.body) + '\n' +
      'https://api.gbif.org/json\0' + digest('{"answer":42}') + '\n' +
      'https://api.gbif.org/missing\0' + '404\n' +
      'https://api.gbif.org/text\0' + digest('hello') + '\n',
    ))
    expect(result.fingerprint).not.toContain('answer')
    expect(result.fingerprint).not.toContain('hello')
    expect(result.requests).toEqual({
      perHost: { 'api.gbif.org': 3 },
      networkAttempts: 3,
      hits: 1,
      misses: 3,
      retries: 0,
      tooMany: 0,
    })
  })

  it('carries request evidence out of a failed capture', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('bad request', { status: 400 })))
    const failure = await layer.withResponseCapture(() => layer.withFreshCache(() => layer.get('https://api.gbif.org/fails'))).catch((error) => error)
    expect(failure).toBeInstanceOf(layer.ResponseCaptureFailure)
    expect(layer.failedCaptureRequests(failure)).toEqual({
      perHost: { 'api.gbif.org': 1 },
      networkAttempts: 1,
      hits: 0,
      misses: 1,
      retries: 0,
      tooMany: 0,
    })
  })

  it('isolates concurrent capture contexts and sorts completion order', async () => {
    const gates = new Map<string, () => void>()
    vi.stubGlobal('fetch', vi.fn((url: string) => new Promise<Response>((resolve) => {
      gates.set(url, () => resolve(Response.json({ url })))
    })))
    const one = layer.withResponseCapture(() => layer.withFreshCache(() => layer.get('https://api.gbif.org/one')))
    const two = layer.withResponseCapture(() => layer.withFreshCache(() => layer.get('https://api.gbif.org/two')))
    await Promise.resolve()
    await Promise.resolve()
    gates.get('https://api.gbif.org/two')?.()
    gates.get('https://api.gbif.org/one')?.()
    const [a, b] = await Promise.all([one, two])

    expect(a.value).toEqual({ url: 'https://api.gbif.org/one' })
    expect(b.value).toEqual({ url: 'https://api.gbif.org/two' })
    expect(a.fingerprint).toBe(digest('https://api.gbif.org/one\0' + digest('{"url":"https://api.gbif.org/one"}') + '\n'))
    expect(b.fingerprint).toBe(digest('https://api.gbif.org/two\0' + digest('{"url":"https://api.gbif.org/two"}') + '\n'))
    expect(a.fingerprint).not.toBe(b.fingerprint)
    expect(a.requests).toEqual({ perHost: { 'api.gbif.org': 1 }, networkAttempts: 1, hits: 0, misses: 1, retries: 0, tooMany: 0 })
    expect(b.requests).toEqual({ perHost: { 'api.gbif.org': 1 }, networkAttempts: 1, hits: 0, misses: 1, retries: 0, tooMany: 0 })
  })
})
