/** Local, participating-process iNaturalist attempt accounting. Never infers missing history. */
import * as fs from 'node:fs'
import { createHash, randomUUID } from 'node:crypto'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'
import { z } from 'zod'
import { setTimeout as pause } from 'node:timers/promises'

export const INAT_WINDOW_MS = 24 * 60 * 60_000
export const INAT_GAP_MS = 1_100
const instant = z.number().int().nonnegative().safe()
const ledgerSchema = z.object({
  version: z.literal(1), host: z.literal('api.inaturalist.org'), initializedAt: instant,
  holdUntil: instant, reason: z.string().trim().min(1), dailyLimit: z.number().int().min(1).max(10_000),
  lastClock: instant, blockedUntil: instant, attempts: z.array(instant).max(10_000),
}).strict()
type Ledger = z.infer<typeof ledgerSchema>
type Options = { path?: string; now?: () => number; sleep?: (ms: number) => Promise<void>; lockWaitMs?: number; signal?: AbortSignal }
const checksum = (ledger: Ledger) => createHash('sha256').update(JSON.stringify(ledger)).digest('hex')
export class InatLedgerError extends Error {}
const fail = (message: string): never => { throw new InatLedgerError(`iNaturalist request ledger: ${message}`) }

function ledgerPath(value: string | undefined) {
  if (!value || !isAbsolute(value) || resolve(value) !== value || !basename(value).endsWith('.json')) return fail('set ETL_INAT_LEDGER to one existing shared absolute .json path')
  // Resolve directory aliases so two worktrees cannot acquire different locks for one ledger.
  try { return join(fs.realpathSync(dirname(value)), basename(value)) } catch { return fail('parent directory is unavailable') }
}
function clock(now: () => number, previous = 0) {
  const value = now()
  if (!Number.isSafeInteger(value) || value < previous) return fail('invalid or backward clock; operator review required')
  return value
}
function read(path: string): Ledger {
  try {
    const stat = fs.lstatSync(path)
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 250_000) return fail('not a bounded regular file')
    const envelope = z.object({ ledger: ledgerSchema, sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict().parse(JSON.parse(fs.readFileSync(path, 'utf8')))
    const ledger = envelope.ledger
    if (checksum(ledger) !== envelope.sha256 || ledger.lastClock < ledger.initializedAt || ledger.holdUntil < ledger.initializedAt ||
      ledger.attempts.length > ledger.dailyLimit || ledger.attempts.some((at, i) => at < ledger.initializedAt || at > ledger.lastClock || (i > 0 && at < ledger.attempts[i - 1]!))) return fail('inconsistent history or checksum')
    return ledger
  } catch (error) {
    if (error instanceof InatLedgerError) throw error
    return fail('missing or corrupt history; do not replace it with an empty ledger')
  }
}
function syncDirectory(path: string) {
  const fd = fs.openSync(dirname(path), 'r')
  try { fs.fsyncSync(fd) } finally { fs.closeSync(fd) }
}
function persist(path: string, ledger: Ledger) {
  const temporary = `${path}.next`
  const fd = fs.openSync(temporary, 'wx', 0o600)
  try { fs.writeFileSync(fd, JSON.stringify({ ledger, sha256: checksum(ledger) }) + '\n'); fs.fsyncSync(fd) } finally { fs.closeSync(fd) }
  fs.renameSync(temporary, path)
  syncDirectory(path)
}
async function lock(path: string, options: Options) {
  const lockPath = `${path}.lock`, started = performance.now()
  while (true) {
    options.signal?.throwIfAborted()
    let fd: number
    try { fd = fs.openSync(lockPath, 'wx', 0o600) } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') return fail('cannot acquire reservation lock')
      if (performance.now() - started >= (options.lockWaitMs ?? 5_000)) return fail('reservation lock remains held; never steal or age-delete it')
      await pause(25, undefined, { signal: options.signal })
      continue
    }
    try { fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, token: randomUUID() })); fs.fsyncSync(fd) } finally { fs.closeSync(fd) }
    return () => { fs.unlinkSync(lockPath); syncDirectory(path) }
  }
}

/** Explicit operator initialization only; hold must cover all prior unaccounted activity. */
export async function initializeInatLedger(pathValue: string, input: { holdUntil: string; reason: string; dailyLimit?: number }, now = Date.now()) {
  const path = ledgerPath(pathValue)
  const at = clock(() => now), holdUntil = Date.parse(input.holdUntil)
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(input.holdUntil) || !Number.isSafeInteger(holdUntil) || holdUntil < at) return fail('initial holdUntil must be explicit UTC at or after initialization')
  const ledger = ledgerSchema.parse({ version: 1, host: 'api.inaturalist.org', initializedAt: at, holdUntil, reason: input.reason,
    dailyLimit: input.dailyLimit ?? 9_000, lastClock: at, blockedUntil: 0, attempts: [] })
  const release = await lock(path, {})
  let safe = true
  try {
    try { fs.lstatSync(path); return fail('initialization refuses existing history') } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    safe = false
    persist(path, ledger)
    safe = true
  } finally { if (safe) release() }
}

/** Persist BEFORE invoking dispatch, including retries/errors; release before awaiting its response. */
export async function dispatchInat<T>(dispatch: () => Promise<T>, options: Options = {}): Promise<T> {
  const path = ledgerPath(options.path ?? process.env.ETL_INAT_LEDGER), now = options.now ?? Date.now
  while (true) {
    const release = await lock(path, options)
    let safe = true, delay = 0
    let outcome: Promise<{ value: T } | { error: unknown }> | undefined
    try {
      const ledger = read(path), at = clock(now, ledger.lastClock)
      if (at < ledger.holdUntil) return fail(`initial uncertainty hold until ${new Date(ledger.holdUntil).toISOString()}: ${ledger.reason}`)
      ledger.attempts = ledger.attempts.filter((time) => at - time < INAT_WINDOW_MS)
      if (ledger.attempts.length >= ledger.dailyLimit) return fail(`rolling 24h allowance exhausted (${ledger.dailyLimit}); next expiry ${new Date(ledger.attempts[0]! + INAT_WINDOW_MS).toISOString()}`)
      delay = Math.max(0, ledger.blockedUntil - at, (ledger.attempts.at(-1) ?? -INAT_GAP_MS) + INAT_GAP_MS - at)
      if (!delay) {
        ledger.lastClock = at
        ledger.attempts.push(at)
        safe = false
        persist(path, ledger)
        // Attach rejection handling immediately, including if the callback throws synchronously.
        try { outcome = Promise.resolve(dispatch()).then((value) => ({ value }), (error: unknown) => ({ error })) }
        catch (error) { outcome = Promise.resolve({ error }) }
        const dispatchedBy = clock(now, at)
        ledger.attempts[ledger.attempts.length - 1] = dispatchedBy
        ledger.lastClock = dispatchedBy
        persist(path, ledger)
        safe = true
      }
    } catch (error) {
      if (error instanceof InatLedgerError) throw error
      return fail('reservation persistence failed; keep lock/history for operator recovery')
    } finally { if (safe) release() }
    if (outcome) {
      const result = await outcome
      if ('error' in result) throw result.error
      return result.value
    }
    const delayMs = Math.min(delay, 60_000)
    if (options.sleep) await options.sleep(delayMs)
    else await pause(delayMs, undefined, { signal: options.signal })
  }
}

/** Retry-After extends the same durable host guard across later batches. */
export async function blockInatUntil(until: number, options: Options = {}) {
  const path = ledgerPath(options.path ?? process.env.ETL_INAT_LEDGER)
  const release = await lock(path, options)
  let safe = true
  try {
    const ledger = read(path), at = clock(options.now ?? Date.now, ledger.lastClock)
    if (!Number.isSafeInteger(until) || until < 0) return fail('invalid cooldown')
    ledger.lastClock = at
    ledger.blockedUntil = Math.max(ledger.blockedUntil, until)
    safe = false
    persist(path, ledger)
    safe = true
  } catch (error) {
    if (error instanceof InatLedgerError) throw error
    return fail('cooldown persistence failed; keep lock/history for operator recovery')
  } finally { if (safe) release() }
}
