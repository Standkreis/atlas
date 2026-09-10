// The fetch layer, ported from scripts/etl-probe/lib.mjs (record 0002 E11): GET JSON or text with a URL-keyed disk
// cache under etl/.cache/<host>/, a total network-attempt budget per process (50,000, `ETL_BUDGET`),
// durable shared iNaturalist allowance, per-host slots, GBIF in-flight cap, retries and one User-Agent.
import { createHash } from 'node:crypto'
import { AsyncLocalStorage } from 'node:async_hooks'
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { blockInatUntil, dispatchInat } from './inat-request-ledger'

export const UA = 'standkreis-dex/0.1 (https://github.com/svreiser/standkreis-dex; svreiser@gmail.com)'
export const CACHE = join(dirname(fileURLToPath(import.meta.url)), '.cache')
/** The disk cache is for the ETL on the Mac. On Vercel the bundle is read-only (`EROFS`/`ENOENT` under /var/task), so it is off; a failed write elsewhere is ignored (handoff 0011). */
const DISK = !process.env.VERCEL
function store(dir: string, file: string, body: string) {
  if (!DISK) return
  try {
    mkdirSync(dir, { recursive: true })
    writeFileSync(file, body)
  } catch {
    /* read-only or full disk: the response is still returned */
  }
}
const BUDGET = Number(process.env.ETL_BUDGET ?? 50_000)
/** Conservative minimum gaps, not guaranteed quotas: WDQS limits processing time, not a fixed request rate. */
const MIN_GAP: Record<string, number> = { 'api.inaturalist.org': 1100, 'query.wikidata.org': 1100, 'api.globalbioticinteractions.org': 300, 'api.gbif.org': 200, 'xeno-canto.org': 1100, 'gift.uni-goettingen.de': 500 }
/** Serialize WDQS work; let Retry-After extend host cooldowns. GBIF retains its two-request cap. */
const MAX_INFLIGHT: Record<string, number> = { 'api.gbif.org': 2, 'query.wikidata.org': 1 }
/** WDQS documents a 60 s query timeout; allow its response plus a small transport margin. */
const REQUEST_TIMEOUT_MS: Record<string, number> = { 'query.wikidata.org': 65_000 }
const ATTEMPTS = 5

const budget: Record<string, number> = {}
let networkAttempts = 0
/** The next free slot per host, reserved before sleeping: parallel callers queue instead of firing together. */
const nextSlot: Record<string, number> = {}
const blockedUntil: Record<string, number> = {}
const inflight: Record<string, number> = {}
const waiters: Record<string, (() => void)[]> = {}
/** Test-only scheduler reset; counters and cache evidence intentionally remain process-global. */
export function resetFetchSchedulingForTest() {
  for (const state of [nextSlot, blockedUntil]) for (const key of Object.keys(state)) delete state[key]
}
const acquire = (host: string) => {
  const max = MAX_INFLIGHT[host]
  if (!max) return Promise.resolve()
  if ((inflight[host] ?? 0) < max) {
    inflight[host] = (inflight[host] ?? 0) + 1
    return Promise.resolve()
  }
  return new Promise<void>((resolve) => (waiters[host] ??= []).push(() => { inflight[host]++; resolve() }))
}
const release = (host: string) => {
  if (!MAX_INFLIGHT[host]) return
  inflight[host]--
  waiters[host]?.shift()?.()
}
const stats = { hits: 0, misses: 0, retries: 0, tooMany: 0 }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const MAX_RETRY_FALLBACK_MS = 5 * 60_000
const MAX_TIMER_MS = 2_147_000_000

/** Parse HTTP Retry-After seconds or date; malformed/missing values use bounded exponential backoff. */
export function retryAfterMs(value: string | null, attempt: number, now = Date.now()): number {
  const fallback = Math.min(MAX_RETRY_FALLBACK_MS, 1_500 * 2 ** attempt)
  if (!value) return fallback
  const normalized = value.trim()
  if (/^\d+(?:\.\d+)?$/.test(normalized)) {
    return Math.min(MAX_TIMER_MS, Math.round(Number(normalized) * 1_000))
  }
  // Numeric-looking but invalid values must not fall through to Date.parse,
  // which accepts surprising inputs such as "-1" as calendar dates.
  if (/^[+\-.\d]/.test(normalized)) return fallback
  const date = Date.parse(normalized)
  if (!Number.isFinite(date)) return fallback
  return Math.min(MAX_TIMER_MS, Math.max(0, date - now))
}

export type RequestStats = {
  perHost: Record<string, number>
  networkAttempts?: number
  hits: number
  misses: number
  retries: number
  tooMany: number
}

const emptyRequestStats = (): RequestStats => ({ perHost: {}, networkAttempts: 0, hits: 0, misses: 0, retries: 0, tooMany: 0 })

export class ResponseCaptureFailure extends Error {
  readonly requests: RequestStats

  constructor(cause: unknown, requests: RequestStats) {
    super(cause instanceof Error ? cause.message : String(cause), { cause })
    this.name = 'ResponseCaptureFailure'
    this.requests = requests
  }
}

export const failedCaptureRequests = (error: unknown): RequestStats | null => (
  error instanceof ResponseCaptureFailure ? error.requests : null
)

const cachePolicy = new AsyncLocalStorage<{ refresh: boolean }>()
export const withFreshCache = <T>(fn: () => Promise<T>): Promise<T> => cachePolicy.run({ refresh: true }, fn)
type ResponseCapture = { entries: { url: string; response: string }[]; requests: RequestStats }
export type ResponseEvidence = { url: string; responseFingerprint: string }
export function responseEvidenceFingerprint(entries: readonly ResponseEvidence[]) {
  const fingerprint = createHash('sha256')
  for (const entry of [...entries].sort((a, b) => a.url.localeCompare(b.url) || a.responseFingerprint.localeCompare(b.responseFingerprint))) {
    fingerprint.update(entry.url).update('\0').update(entry.responseFingerprint).update('\n')
  }
  return fingerprint.digest('hex')
}
/**
 * Capture the effective responses read by an ETL operation without retaining their bodies.
 * The returned digest is stable for the same URL/response pairs, regardless of completion order.
 * Each async context owns its entries, so concurrent runs cannot contaminate one another.
 */
export async function withResponseCapture<T>(fn: () => Promise<T>): Promise<{ value: T; fingerprint: string; responses: ResponseEvidence[]; requests: RequestStats }> {
  const capture: ResponseCapture = { entries: [], requests: emptyRequestStats() }
  let value: T
  try {
    value = await responseCapture.run(capture, fn)
  } catch (error) {
    throw new ResponseCaptureFailure(error, capture.requests)
  }
  const responses = capture.entries.map(({ url, response }) => ({ url, responseFingerprint: response }))
    .sort((a, b) => a.url.localeCompare(b.url) || a.responseFingerprint.localeCompare(b.responseFingerprint))
  return { value, fingerprint: responseEvidenceFingerprint(responses), responses, requests: capture.requests }
}
const responseCapture = new AsyncLocalStorage<ResponseCapture>()
const recordResponse = (url: string, response: string) => responseCapture.getStore()?.entries.push({ url, response })
const recordRequest = (kind: 'hits' | 'misses' | 'retries' | 'tooMany', amount = 1) => {
  const captured = responseCapture.getStore()?.requests
  if (captured) captured[kind] += amount
}
const recordAttempt = (host: string) => {
  const captured = responseCapture.getStore()?.requests
  if (!captured) return
  captured.networkAttempts = (captured.networkAttempts ?? 0) + 1
  captured.perHost[host] = (captured.perHost[host] ?? 0) + 1
}
const bodyFingerprint = (body: string) => createHash('sha256').update(body).digest('hex')
export const CACHE_TTL_MS = 30 * 86_400_000
type Opts = { headers?: Record<string, string>; text?: boolean; bytes?: boolean; maxAgeMs?: number; signal?: AbortSignal }
/** An API key travels in the query string (xeno-canto v3); it never reaches a log line or an error message. */
const redact = (url: string) => url.replace(/([?&]key=)[^&]+/, '$1…')

/** GET with cache. A 404 is cached as null (or '' for text). Throws after five attempts on 429/5xx/network errors. `bytes` skips the disk cache (a sound clip) and returns the body as is. */
export async function get<T = unknown>(url: string, opts?: Opts & { text?: false; bytes?: false }): Promise<T | null>
export async function get(url: string, opts: Opts & { text: true }): Promise<string>
export async function get(url: string, opts: Opts & { bytes: true }): Promise<Uint8Array | null>
export async function get(url: string, { headers = {}, text = false, bytes = false, maxAgeMs = CACHE_TTL_MS, signal }: Opts = {}): Promise<unknown> {
  const host = new URL(url).hostname
  const dir = join(CACHE, host)
  const file = join(dir, createHash('sha1').update(url).digest('hex') + (text ? '.txt' : '.json'))
  if (DISK && !bytes && !cachePolicy.getStore()?.refresh && existsSync(file) && Date.now() - statSync(file).mtimeMs < maxAgeMs) {
    stats.hits++
    recordRequest('hits')
    const raw = readFileSync(file, 'utf8')
    recordResponse(url, bodyFingerprint(raw))
    return text ? raw : JSON.parse(raw)
  }
  stats.misses++
  recordRequest('misses')
  if (networkAttempts >= BUDGET) throw new Error(`total request budget exhausted (${BUDGET} network attempts)`)
  const gap = MIN_GAP[host] ?? 100
  const slot = async () => {
    while (true) {
      const now = Date.now()
      const at = Math.max(now, nextSlot[host] ?? 0, blockedUntil[host] ?? 0)
      nextSlot[host] = at + gap
      const wait = at - now
      if (wait > 0) await sleep(wait)
      if (Date.now() >= (blockedUntil[host] ?? 0)) return
    }
  }
  await acquire(host)
  try {
    return await attempts()
  } finally {
    release(host)
  }

  async function attempts(): Promise<unknown> {
    let lastErr: Error | undefined
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      await slot()
      if (networkAttempts >= BUDGET) throw new Error(`total request budget exhausted (${BUDGET} network attempts)`)
      try {
        const dispatch = () => {
          // Recheck after a shared-ledger wait; another host may have consumed the process budget.
          if (networkAttempts >= BUDGET) throw new Error(`total request budget exhausted (${BUDGET} network attempts)`)
          signal?.throwIfAborted()
          networkAttempts += 1
          budget[host] = (budget[host] ?? 0) + 1
          recordAttempt(host)
          const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS[host] ?? 15_000)
          return fetch(url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
            ...(host === 'api.inaturalist.org' ? { redirect: 'error' as const } : {}),
            headers: { 'User-Agent': UA, Accept: text || bytes ? '*/*' : 'application/json', ...headers } })
        }
        const r = await (host === 'api.inaturalist.org' ? dispatchInat(dispatch, { signal }) : dispatch())
        if (r.status === 404) {
          if (!bytes) store(dir, file, text ? '' : 'null')
          if (!bytes) recordResponse(url, '404')
          return text ? '' : null
        }
        if (r.status === 429 || r.status >= 500) {
          if (r.status === 429) { stats.tooMany++; recordRequest('tooMany') }
          stats.retries++
          recordRequest('retries')
          lastErr = new Error(`${r.status} ${redact(url)}`)
          const retryAt = Date.now() + retryAfterMs(r.headers.get('retry-after'), attempt)
          blockedUntil[host] = Math.max(blockedUntil[host] ?? 0, retryAt)
          if (host === 'api.inaturalist.org') await blockInatUntil(retryAt)
          continue
        }
        if (!r.ok) throw new Error(`${r.status} ${redact(url)}`)
        if (bytes) return new Uint8Array(await r.arrayBuffer())
        const body = await r.text()
        if (!text) JSON.parse(body)
        store(dir, file, body)
        if (!bytes) recordResponse(url, bodyFingerprint(body))
        return text ? body : JSON.parse(body)
      } catch (e) {
        lastErr = e as Error
        if (!/fetch failed|ECONNRESET|ETIMEDOUT|UND_ERR/.test(lastErr.message)) throw e
        stats.retries++
        recordRequest('retries')
        await sleep(1500 * 2 ** attempt)
      }
    }
    throw lastErr
  }
}

/** Requests actually attempted per host, plus cache-miss, retry and 429 counters. */
export const requests = (): RequestStats => ({ perHost: { ...budget }, networkAttempts, ...stats })

/** Query string; array values repeat the key (GBIF style), undefined values are dropped. */
export const q = (params: Record<string, string | number | boolean | (string | number)[] | undefined>) =>
  Object.entries(params)
    .flatMap(([k, v]) => (Array.isArray(v) ? v : [v]).filter((x) => x !== undefined).map((x) => `${k}=${encodeURIComponent(String(x))}`))
    .join('&')

/** Run fn over items with at most n in flight, preserving order. */
export async function pool<T, R>(items: readonly T[], n: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length)
  let i = 0
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++
        out[k] = await fn(items[k], k)
      }
    }),
  )
  return out
}
