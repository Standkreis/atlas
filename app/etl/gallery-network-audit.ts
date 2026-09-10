/** Local-only, resumable reference-URL checks. No reference-image bytes are retained. */
import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { db } from './db'
import { assertLocalDatabaseUrl } from './catalogue-audit'
import { referenceImages } from './gallery-work'
import { retryAfterMs, UA } from './fetch'

const HOSTS = new Set(['inaturalist-open-data.s3.amazonaws.com', 'inaturalist-static.s3.amazonaws.com',
  'static.inaturalist.org', 'upload.wikimedia.org', 'thumb.wikimedia.org'])
const MAX_AGE_MS = 24 * 60 * 60_000
export type NetworkCheck = {
  url: string; checkedAt: string; ok: boolean; status: number | null
  method: 'HEAD' | 'GET'; contentType: string | null; finalUrl: string | null; reason: string | null
}

/** HEAD must describe a normal representation; a bounded range GET may also return Partial Content. */
export function successfulReferenceStatus(method: NetworkCheck['method'], status: number) {
  return method === 'HEAD' ? status === 200 : status === 200 || status === 206
}

export function safeReferenceUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443') && HOSTS.has(url.hostname)
  } catch { return false }
}

/** HEAD checks reachability/MIME only; browser decode remains separate visual evidence. */
export async function checkReferenceUrl(url: string, options: {
  fetch?: typeof fetch; pause?: (ms: number) => Promise<void>; beforeRequest?: () => Promise<void>; now?: () => Date
} = {}): Promise<NetworkCheck> {
  const request = options.fetch ?? fetch
  const pause = options.pause ?? ((ms) => new Promise((done) => setTimeout(done, ms)))
  const now = options.now ?? (() => new Date())
  let method: 'HEAD' | 'GET' = 'HEAD'
  let current = url, redirects = 0, retries = 0
  const result = (ok: boolean, status: number | null, contentType: string | null, reason: string | null): NetworkCheck => ({
    url, checkedAt: now().toISOString(), ok, status, method, contentType, finalUrl: safeReferenceUrl(current) ? current : null, reason,
  })
  while (true) {
    if (!safeReferenceUrl(current)) return result(false, null, null, 'unreviewed-or-unsafe-image-host')
    try {
      await options.beforeRequest?.()
      const response = await request(current, { method, redirect: 'manual', signal: AbortSignal.timeout(15_000),
        headers: { 'User-Agent': UA, ...(method === 'GET' ? { Range: 'bytes=0-0' } : {}) } })
      // Even servers ignoring Range cannot cause a full image to be retained by this tool.
      await response.body?.cancel()
      const type = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? null
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location')
        if (!location || ++redirects > 4) return result(false, response.status, type, 'invalid-or-excessive-redirect')
        current = new URL(location, current).href
        continue
      }
      if ((response.status === 429 || response.status >= 500) && retries < 2) {
        await pause(retryAfterMs(response.headers.get('retry-after'), retries++))
        continue
      }
      // Some CDNs disallow HEAD despite serving the same public URL to browsers.
      if (method === 'HEAD' && [403, 405, 501].includes(response.status)) { method = 'GET'; continue }
      if (!successfulReferenceStatus(method, response.status)) return result(false, response.status, type, `http-${response.status}`)
      if (!type?.startsWith('image/')) return result(false, response.status, type, 'not-image-mime')
      return result(true, response.status, type, null)
    } catch (error) {
      if (retries++ < 2) { await pause(1_500 * retries); continue }
      return result(false, null, null, error instanceof Error ? error.name : 'network-error')
    }
  }
}

export function reusableCheck(value: unknown, now = Date.now()): value is NetworkCheck {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<NetworkCheck>
  const at = typeof row.checkedAt === 'string' ? Date.parse(row.checkedAt) : NaN
  return typeof row.url === 'string' && safeReferenceUrl(row.url) && row.ok === true &&
    Number.isInteger(row.status) && (row.method === 'HEAD' || row.method === 'GET') && successfulReferenceStatus(row.method, row.status!) &&
    typeof row.contentType === 'string' && row.contentType.startsWith('image/') &&
    typeof row.finalUrl === 'string' && safeReferenceUrl(row.finalUrl) &&
    row.reason === null && at <= now && now - at < MAX_AGE_MS
}

/** Keep failed/expired attempt history for scheduling, never as successful availability evidence. */
export function recordedCheck(value: unknown, now = Date.now()): value is NetworkCheck {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<NetworkCheck>
  const at = typeof row.checkedAt === 'string' ? Date.parse(row.checkedAt) : NaN
  return typeof row.url === 'string' && safeReferenceUrl(row.url) && typeof row.ok === 'boolean' &&
    Number.isFinite(at) && at <= now && (row.method === 'HEAD' || row.method === 'GET') &&
    (row.status === null || (Number.isInteger(row.status) && row.status! >= 100 && row.status! <= 599)) &&
    (row.contentType === null || typeof row.contentType === 'string') &&
    (row.finalUrl === null || (typeof row.finalUrl === 'string' && safeReferenceUrl(row.finalUrl))) &&
    (row.ok ? reusableCheck({ ...row, checkedAt: new Date(now).toISOString() }, now) : typeof row.reason === 'string' && Boolean(row.reason))
}

/** Never-checked URLs first, then oldest attempts: a persistent failure cannot starve bounded resumes. */
export function nextUrlChecks(urls: string[], history: Map<string, NetworkCheck>, limit: number, now = Date.now()) {
  return urls.filter((url) => !reusableCheck(history.get(url), now)).sort((a, b) => {
    const left = history.get(a), right = history.get(b)
    if (!left || !right) return left ? 1 : right ? -1 : a.localeCompare(b)
    return Date.parse(left.checkedAt) - Date.parse(right.checkedAt) || a.localeCompare(b)
  }).slice(0, limit)
}

export function parseNetworkArgs(args: string[]) {
  const flags = new Map<string, string>()
  for (let i = 0; i < args.length; i++) {
    const key = args[i]!, value = args[++i]
    if (!['--catalogue', '--checkpoint', '--output', '--limit'].includes(key) || flags.has(key) || !value || value.startsWith('--')) throw new Error('invalid network-audit arguments')
    flags.set(key, value)
  }
  const catalogue = flags.get('--catalogue'), checkpoint = flags.get('--checkpoint'), output = flags.get('--output')
  const limit = flags.has('--limit') ? Number(flags.get('--limit')) : Infinity
  if (!catalogue || !checkpoint || !output || (flags.has('--limit') && (!Number.isSafeInteger(limit) || limit < 1))) throw new Error('requires --catalogue <id> --checkpoint <jsonl> --output <json> [--limit <positive integer>]')
  if (resolve(checkpoint) === resolve(output)) throw new Error('checkpoint and report must be different files')
  return { catalogue, checkpoint: resolve(checkpoint), output: resolve(output), limit }
}

export async function runNetworkAudit(options: ReturnType<typeof parseNetworkArgs>) {
  assertLocalDatabaseUrl()
  const catalogue = await db.catalogueVersion.findUniqueOrThrow({ where: { id: options.catalogue } })
  if (catalogue.countryCode !== 'DE' || catalogue.status !== 'active') throw new Error('network audit requires the active German catalogue')
  const assets = await db.asset.findMany({ where: {
    ...referenceImages('unused'), taxonId: undefined, taxon: { catalogues: { some: { catalogueVersionId: catalogue.id } } },
  }, select: { id: true, taxonId: true, position: true, url: true }, orderBy: { id: 'asc' } })
  const urls = [...new Set(assets.map((asset) => asset.url))].sort()
  const checks = new Map<string, NetworkCheck>()
  try {
    const content = await readFile(options.checkpoint, 'utf8')
    // Preserve an interrupted tail; a separator prevents the next append joining it. Invalid
    // records are not trusted or reused, and their URLs will be checked again from the database.
    if (content && !content.endsWith('\n')) await appendFile(options.checkpoint, '\n')
    let damaged = 0
    for (const line of content.split('\n').filter(Boolean)) {
      try {
        const row: unknown = JSON.parse(line)
        if (recordedCheck(row) && (!checks.has(row.url) || Date.parse(row.checkedAt) >= Date.parse(checks.get(row.url)!.checkedAt))) checks.set(row.url, row)
      }
      catch { damaged++ }
    }
    if (damaged) console.error(`image URL checkpoint: ${damaged} incomplete records ignored and preserved`)
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  await mkdir(dirname(options.checkpoint), { recursive: true })
  const reused = urls.filter((url) => reusableCheck(checks.get(url))).length
  const pending = nextUrlChecks(urls, checks, options.limit)
  let next = 0, done = 0, nextRequest = 0, blockedUntil = 0, networkRequests = 0
  const pause = async (ms: number) => {
    blockedUntil = Math.max(blockedUntil, Date.now() + ms)
    await new Promise((finish) => setTimeout(finish, ms))
  }
  const beforeRequest = async () => {
    while (true) {
      const at = Math.max(Date.now(), nextRequest, blockedUntil); nextRequest = at + 200
      if (at > Date.now()) await new Promise((finish) => setTimeout(finish, at - Date.now()))
      if (Date.now() >= blockedUntil) { networkRequests++; return }
    }
  }
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < pending.length) {
      const url = pending[next++]!
      const check = await checkReferenceUrl(url, { beforeRequest, pause })
      checks.set(url, check)
      await appendFile(options.checkpoint, `${JSON.stringify(check)}\n`)
      if (++done % 100 === 0) console.error(`image URLs: ${done}/${pending.length} checked in this batch`)
    }
  }))
  const selected = urls.map((url) => checks.get(url)).filter((value): value is NetworkCheck => Boolean(value && (!value.ok || reusableCheck(value))))
  const report = {
    schemaVersion: 1, catalogueId: catalogue.id, unionFingerprint: catalogue.unionFingerprint,
    generatedAt: new Date().toISOString(), targetsFingerprint: createHash('sha256').update(JSON.stringify(assets)).digest('hex'),
    assets: assets.length, urls: urls.length, attempted: pending.length, networkRequests, reused,
    passed: selected.filter((check) => check.ok).length, failed: selected.filter((check) => !check.ok).length,
    pending: urls.length - selected.length, checks: selected,
    limitation: 'HTTP status/image MIME verified; image decoding and species/attribution visual review are separate browser evidence. No image bytes retained.',
  }
  await mkdir(dirname(options.output), { recursive: true })
  const partial = `${options.output}.partial-${process.pid}`
  await writeFile(partial, JSON.stringify(report, null, 2)); await rename(partial, options.output)
  return report
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runNetworkAudit(parseNetworkArgs(process.argv.slice(2))).then((report) => {
    console.log(`image URL audit: ${report.passed} passed, ${report.failed} failed, ${report.pending} pending (${report.attempted} URLs attempted, ${report.networkRequests} network requests)`)
    if (report.failed || report.pending) process.exitCode = 2
  }).catch((error) => { console.error(error); process.exitCode = 1 }).finally(() => db.$disconnect())
}
