import { AsyncLocalStorage } from 'node:async_hooks'
import type { CATALOGUE_TARGET_SNAPSHOT_TABLES } from './catalogue-import-plan'

type Table = (typeof CATALOGUE_TARGET_SNAPSHOT_TABLES)[number]
type Phase = 'command' | 'source-validation' | 'release-validation' | 'target-snapshot' | 'planning' | 'receipt-validation' |
  'gate-close' | 'drain' | 'gate-open' | 'apply-transaction' | 'recovery-transaction' | 'maintenance-lock' |
  'table-locks' | 'before-snapshot' | 'protected-scopes' | 'before-images' | 'after-images' |
  'writes' | 'inverse-writes' | 'inbound-guards' | 'committed-snapshot' | 'post-commit-verification'
type Operation = 'snapshot-read' | 'keyed-read' | 'scope-read' | 'upsert' | 'delete' | 'inbound-read'
type Counts = { requests: number; inputRows: number; inputJsonBytes: number; outputRows: number }
export type CatalogueTelemetryEvent = Readonly<Counts & {
  kind: 'catalogue-import-telemetry'; event: 'phase' | 'batch'; phase: Phase;
  elapsedMs: number; success: boolean; operation?: Operation; table?: Table
}>
type Context = { sink: (event: CatalogueTelemetryEvent) => void; phases: { name: Phase; counts: Counts }[] }
const context = new AsyncLocalStorage<Context>()
const emptyCounts = (): Counts => ({ requests: 0, inputRows: 0, inputJsonBytes: 0, outputRows: 0 })

function emit(state: Context, event: CatalogueTelemetryEvent) {
  // Diagnostics are best effort: a broken sink cannot change commit or recovery behavior.
  try { state.sink(Object.freeze(event)) } catch { /* no transaction control from telemetry */ }
}

export function withCatalogueTelemetry<T>(sink: (event: CatalogueTelemetryEvent) => void, work: () => Promise<T>): Promise<T> {
  return context.run({ sink, phases: [] }, () => cataloguePhase('command', work))
}

export async function cataloguePhase<T>(name: Phase, work: () => Promise<T> | T): Promise<T> {
  const state = context.getStore()
  if (!state) return work()
  const phase = { name, counts: emptyCounts() }, start = performance.now()
  const child = { ...state, phases: [...state.phases, phase] }
  let success = false
  try {
    const value = await context.run(child, work)
    success = true
    return value
  } finally {
    emit(state, { kind: 'catalogue-import-telemetry', event: 'phase', phase: name,
      ...phase.counts, elapsedMs: performance.now() - start, success })
  }
}

/** Only fixed labels and counts enter telemetry; no SQL, keys, rows, URLs or error text. */
export async function catalogueRequest<T>(operation: Operation, table: Table,
  input: { rows: number; bytes: number }, work: () => Promise<T>): Promise<T> {
  const state = context.getStore()
  if (!state) return work()
  const start = performance.now(), counts = { requests: 1, inputRows: input.rows, inputJsonBytes: input.bytes, outputRows: 0 }
  let success = false
  try {
    const result = await work()
    counts.outputRows = Array.isArray(result) ? result.length : 0
    success = true
    return result
  } finally {
    for (const phase of state.phases) for (const key of Object.keys(counts) as (keyof Counts)[]) phase.counts[key] += counts[key]
    emit(state, { kind: 'catalogue-import-telemetry', event: 'batch', phase: state.phases.at(-1)?.name ?? 'command',
      operation, table, ...counts, elapsedMs: performance.now() - start, success })
  }
}
