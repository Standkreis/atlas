import { afterEach, describe, expect, it, vi } from 'vitest'
import { runTaxonWork, type TaxonWorkKey, type TaxonWorkStore } from './taxon-work'

function fakeStore(ids: string[], onRenew: () => boolean = () => true): TaxonWorkStore {
  type FakeRow = TaxonWorkKey & {
    status: 'pending' | 'running' | 'complete' | 'failed'
    attempts: number
    owner?: string
    outcome?: unknown
    error?: string
  }
  const rows = new Map<string, FakeRow>()
  const key = (k: TaxonWorkKey) => `${k.taxonId}|${k.kind}|${k.version}`
  return {
    async taxonIds() { return ids },
    async seed(keys) { for (const k of keys) rows.set(key(k), { ...k, status: rows.get(key(k))?.status ?? 'pending', attempts: 0 }) },
    async claim(_catalogueVersionId, kind, version, owner, _now, _until, exclude) {
      const row = [...rows.values()].find((r) => r.kind === kind && r.version === version && !exclude.has(r.taxonId) && ['pending', 'failed'].includes(r.status))
      if (!row) return null
      row.status = 'running'; row.owner = owner; row.attempts++
      return row.taxonId
    },
    async renew(k, owner) { const r = rows.get(key(k)); return onRenew() && Boolean(r && r.owner === owner && r.status === 'running') },
    async complete(k, owner, _at, outcome) { const r = rows.get(key(k)); if (!r || r.owner !== owner || r.status !== 'running') return false; r.status = 'complete'; r.outcome = outcome; return true },
    async fail(k, owner, _at, error) { const r = rows.get(key(k)); if (!r || r.owner !== owner || r.status !== 'running') return false; r.status = 'failed'; r.error = error; return true },
    async counts(_catalogueVersionId, kind, version) { return Object.fromEntries([...rows.values()].filter((r) => r.kind === kind && r.version === version).reduce((m, r) => m.set(r.status, (m.get(r.status) ?? 0) + 1), new Map<string, number>())) },
  }
}

afterEach(() => vi.useRealTimers())

describe('global taxon enrichment work', () => {
  it('deduplicates the catalogue union and isolates failures', async () => {
    const store = fakeStore(['a', 'b', 'a'])
    const result = await runTaxonWork({ catalogueVersionId: 'cat', kind: 'content', version: 'v1', store, owner: 'test', concurrency: 2, worker: async ({ taxonId }) => { if (taxonId === 'b') throw new Error('provider unavailable') } })
    expect(result).toMatchObject({ seeded: 2, attempted: 2, completed: 1, failed: 1, lost: 0, counts: { complete: 1, failed: 1 } })
  })

  it('reuses completed work across a second catalogue seed', async () => {
    const store = fakeStore(['a'])
    const worker = async () => undefined
    await runTaxonWork({ catalogueVersionId: 'one', kind: 'facts', version: 'v1', store, owner: 'one', worker })
    const second = await runTaxonWork({ catalogueVersionId: 'two', kind: 'facts', version: 'v1', store, owner: 'two', worker })
    expect(second).toMatchObject({ seeded: 1, attempted: 0, completed: 0, counts: { complete: 1 } })
  })

  it('renews a lease while a long-running worker is active', async () => {
    vi.useFakeTimers()
    const renewed = vi.fn(() => true)
    const store = fakeStore(['a'], renewed)
    let finish!: () => void
    const running = runTaxonWork({
      catalogueVersionId: 'cat', kind: 'gallery', version: 'v1', store, owner: 'worker', leaseMs: 1_000,
      worker: async (_key, signal) => {
        expect(signal.aborted).toBe(false)
        await new Promise<void>((resolve) => { finish = resolve })
      },
    })
    await vi.advanceTimersByTimeAsync(400)
    expect(renewed).toHaveBeenCalled()
    finish()
    await expect(running).resolves.toMatchObject({ completed: 1, lost: 0 })
  })

  it('aborts a worker and does not commit after losing its lease', async () => {
    vi.useFakeTimers()
    const store = fakeStore(['a'], () => false)
    let workerSignal: AbortSignal | undefined
    const running = runTaxonWork({
      catalogueVersionId: 'cat', kind: 'gallery', version: 'v1', store, owner: 'old-owner', leaseMs: 1_000,
      worker: async (_key, signal) => {
        workerSignal = signal
        await new Promise<void>((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }))
      },
    })
    await vi.advanceTimersByTimeAsync(400)
    await expect(running).resolves.toMatchObject({ completed: 0, failed: 0, lost: 1, counts: { running: 1 } })
    expect(workerSignal?.aborted).toBe(true)
  })
})
