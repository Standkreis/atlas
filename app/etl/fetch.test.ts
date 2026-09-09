import { afterAll, beforeAll, afterEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
const disk = vi.hoisted(() => ({ mtime: Date.now(), body: '{"source":"cache"}' }))
const guard = vi.hoisted(() => ({ dispatch: vi.fn(async <T>(fn: () => Promise<T>) => fn()), block: vi.fn(async () => {}) }))
vi.mock('./inat-request-ledger', () => ({ dispatchInat: guard.dispatch, blockInatUntil: guard.block }))
vi.mock('node:fs', () => ({ existsSync: () => true, mkdirSync: () => {}, readFileSync: () => disk.body, writeFileSync: () => {}, statSync: () => ({ mtimeMs: disk.mtime }) }))
let layer: typeof import('./fetch')
beforeAll(async () => { vi.stubEnv('VERCEL', ''); layer = await import('./fetch') })
afterAll(() => vi.unstubAllEnvs())
afterEach(() => { layer.resetFetchSchedulingForTest(); vi.useRealTimers(); vi.unstubAllGlobals(); disk.mtime = Date.now(); guard.dispatch.mockClear(); guard.block.mockClear() })

const digest = (...parts: string[]) => {
  const hash = createHash('sha256')
  for (const part of parts) hash.update(part)
  return hash.digest('hex')
}

describe('Retry-After', () => {
  it('parses seconds and dates and falls back to bounded exponential delay', () => {
    const now = Date.parse('2026-09-08T20:00:00Z')
    expect(layer.retryAfterMs('2.5', 0, now)).toBe(2_500)
    expect(layer.retryAfterMs('600', 0, now)).toBe(600_000)
    expect(layer.retryAfterMs('Tue, 08 Sep 2026 20:00:04 GMT', 0, now)).toBe(4_000)
    expect(layer.retryAfterMs('invalid', 2, now)).toBe(6_000)
    expect(layer.retryAfterMs('-1', 0, now)).toBe(1_500)
    expect(layer.retryAfterMs('1e3', 1, now)).toBe(3_000)
    expect(layer.retryAfterMs(null, 20, now)).toBe(300_000)
  })
})

describe('ETL cache freshness', () => {
  it('keeps cached iNaturalist reads free and guards every dispatched retry/error attempt', async () => {
    vi.useFakeTimers()
    const network = vi.fn().mockResolvedValueOnce(new Response('slow down', { status: 429, headers: { 'Retry-After': '2' } })).mockResolvedValueOnce(Response.json({ ok: true }))
    vi.stubGlobal('fetch', network)
    expect(await layer.get('https://api.inaturalist.org/test')).toEqual({ source: 'cache' })
    expect(guard.dispatch).not.toHaveBeenCalled()
    const result = layer.withFreshCache(() => layer.get('https://api.inaturalist.org/test'))
    await vi.advanceTimersByTimeAsync(3_000)
    await expect(result).resolves.toEqual({ ok: true })
    expect(guard.dispatch).toHaveBeenCalledTimes(2)
    expect(guard.block).toHaveBeenCalledTimes(1)
    expect(network).toHaveBeenCalledTimes(2)
    expect(network.mock.calls[0]?.[1]).toMatchObject({ redirect: 'error' })
  })

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

  it('applies a 429 Retry-After delay to every queued request for the host', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-08T20:00:00Z'))
    const calledAt: number[] = []
    const network = vi.fn(async (url: string) => {
      calledAt.push(Date.now())
      if (url.endsWith('/rate') && calledAt.length === 1) return new Response('slow down', { status: 429, headers: { 'Retry-After': '2' } })
      return Response.json({ recovered: true })
    })
    vi.stubGlobal('fetch', network)

    const first = layer.withResponseCapture(() => layer.withFreshCache(() => layer.get('https://api.gbif.org/rate')))
    const queued = layer.withFreshCache(() => layer.get('https://api.gbif.org/queued'))
    await vi.advanceTimersByTimeAsync(1_999)
    expect(network).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(500)
    const [captured, queuedResult] = await Promise.all([first, queued])
    expect(captured.value).toEqual({ recovered: true })
    expect(queuedResult).toEqual({ recovered: true })
    expect(captured.requests).toEqual({
      perHost: { 'api.gbif.org': 2 },
      networkAttempts: 2,
      hits: 0,
      misses: 1,
      retries: 1,
      tooMany: 1,
    })
    expect(calledAt.slice(1).every((at) => at - calledAt[0]! >= 2_000)).toBe(true)
  })

  it('shares an HTTP-date 503 cooldown with queued requests', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-08T20:00:00Z'))
    const calledAt: number[] = []
    const network = vi.fn(async () => {
      calledAt.push(Date.now())
      if (calledAt.length === 1) {
        return new Response('temporarily unavailable', {
          status: 503,
          headers: { 'Retry-After': 'Tue, 08 Sep 2026 20:00:04 GMT' },
        })
      }
      return Response.json({ recovered: true })
    })
    vi.stubGlobal('fetch', network)

    const result = layer.withResponseCapture(() => layer.withFreshCache(() => layer.get('https://api.gbif.org/date-retry')))
    await vi.advanceTimersByTimeAsync(3_999)
    expect(network).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(500)
    const captured = await result
    expect(captured.value).toEqual({ recovered: true })
    expect(captured.requests).toEqual({
      perHost: { 'api.gbif.org': 2 },
      networkAttempts: 2,
      hits: 0,
      misses: 1,
      retries: 1,
      tooMany: 0,
    })
    expect(calledAt[1]! - calledAt[0]!).toBeGreaterThanOrEqual(4_000)
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
    await vi.waitFor(() => expect(gates.size).toBe(2), { timeout: 1_000 })
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
