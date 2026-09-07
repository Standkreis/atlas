import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// 0025 B9: IndexedDB that never answers (0009 A4 saw it in the Simulator). Every call races a 5 s timeout; the write
// then lands in localStorage, the next load merges it back, and the warning is printed once.
vi.mock('idb-keyval', () => ({
  createStore: () => ({}),
  entries: () => new Promise(() => {}),
  set: () => new Promise(() => {}),
  del: () => new Promise(() => {}),
  clear: () => new Promise(() => {}),
}))

const storage = new Map<string, string>()
const localStorage = { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => { storage.set(k, v) }, removeItem: (k: string) => { storage.delete(k) } }
const row = { id: 'r1', kind: 'study' as const, payload: { taxonId: 't1', taxon: { id: 't1', gbifKey: 1, sciName: 'Turdus merula', names: {}, tile: 'bird', lead: null } } }

describe('outbox on a hung IndexedDB', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    vi.stubGlobal('indexedDB', {})
    vi.stubGlobal('localStorage', localStorage)
    storage.clear()
  })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

  it('enqueue resolves after the timeout, the row is in localStorage, one warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const q = await import('./Queue')
    const p = q.enqueue(row)
    await vi.advanceTimersByTimeAsync(4_900)
    expect(q.rowsNow()).toHaveLength(0) // `load` is still waiting
    await vi.advanceTimersByTimeAsync(200) // the read hangs → 5 s; then the write
    expect(q.rowsNow().map((r) => r.id)).toEqual(['r1']) // the mirror has it as soon as the write starts
    await vi.advanceTimersByTimeAsync(5_100)
    const full = await p
    expect(full.attempts).toBe(0)
    expect(JSON.parse(storage.get(q.FALLBACK_KEY)!).map((r: { id: string }) => r.id)).toEqual(['r1'])
    // A second row: no second warning, the snapshot grows.
    const p2 = q.enqueue({ ...row, id: 'r2' })
    await vi.advanceTimersByTimeAsync(5_100)
    await p2
    expect(JSON.parse(storage.get(q.FALLBACK_KEY)!).map((r: { id: string }) => r.id)).toEqual(['r1', 'r2'])
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('a later load merges the snapshot back; remove keeps it in step; clearOutbox empties it', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    storage.set('dex.outbox.fallback', JSON.stringify([{ ...row, createdAt: 1, attempts: 0, lastError: null }]))
    const q = await import('./Queue')
    const p = q.load()
    await vi.advanceTimersByTimeAsync(5_100)
    await p
    expect(q.rowsNow().map((r) => r.id)).toEqual(['r1'])
    const r = q.remove('r1')
    await vi.advanceTimersByTimeAsync(5_100)
    await r
    expect(q.rowsNow()).toHaveLength(0)
    expect(storage.has('dex.outbox.fallback')).toBe(false)
    storage.set('dex.outbox.fallback', '[{"id":"x"}]')
    const c = q.clearOutbox()
    await vi.advanceTimersByTimeAsync(5_100)
    await c
    expect(storage.has('dex.outbox.fallback')).toBe(false)
  })
})
