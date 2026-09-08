import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const harness = vi.hoisted(() => ({
  disk: new Map<string, unknown>(), commits: [] as { puts: string[]; drops: string[] }[],
  hangRead: false, failCommit: false,
  create: vi.fn(async () => ({ id: 'saved' })), identify: vi.fn(async () => ({ answer: null })),
  serverOwner: 'owner', me: vi.fn(),
}))
vi.mock('@trpc/client', () => ({
  createTRPCClient: () => ({ identity: { me: { query: async () => { harness.me(); return { id: harness.serverOwner } } } },
    sighting: { create: { mutate: harness.create }, identify: { mutate: harness.identify } },
    study: { mark: { mutate: harness.create } } }),
  httpBatchLink: () => ({}), TRPCClientError: class extends Error {},
}))
vi.mock('idb-keyval', () => ({
  entries: () => harness.hangRead ? new Promise(() => {}) : Promise.resolve([...harness.disk.entries()]),
  createStore: () => (_mode: string, callback: (store: unknown) => unknown) => {
    const puts: [string, unknown][] = [], drops: string[] = []
    let clear = false, aborted = false
    const transaction = {
      oncomplete: () => {}, onabort: () => {}, onerror: () => {},
      abort() { aborted = true; this.onabort() },
    }
    const result = callback({ transaction,
      put: (value: unknown, id: string) => puts.push([id, value]),
      get: (id: string) => { const request = { result: harness.disk.get(id), onsuccess: () => {} }; queueMicrotask(() => request.onsuccess()); return request },
      delete: (id: string) => drops.push(id), clear: () => { clear = true },
    })
    queueMicrotask(() => {
      if (aborted) return
      if (harness.failCommit) { transaction.abort(); return }
      if (clear) harness.disk.clear()
      for (const id of drops) harness.disk.delete(id)
      for (const [id, value] of puts) harness.disk.set(id, value)
      harness.commits.push({ puts: puts.map(([id]) => id), drops })
      transaction.oncomplete()
    })
    return result
  },
}))
const storage = new Map<string, string>()
const localStorage = { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => { storage.set(k, v) }, removeItem: (k: string) => { storage.delete(k) } }
const taxon = { id: 't1', gbifKey: 1, sciName: 'Turdus merula', names: {}, tile: 'bird', lead: null }
const study = { id: 'r1', kind: 'study' as const, payload: { taxonId: 't1', taxon } }

describe('durable, identity-owned outbox', () => {
  beforeEach(() => {
    vi.resetModules(); vi.useFakeTimers()
    vi.stubGlobal('indexedDB', {}); vi.stubGlobal('localStorage', localStorage)
    vi.stubGlobal('document', { documentElement: { lang: 'en' } })
    vi.stubGlobal('navigator', { onLine: true, locks: { request: async (_name: unknown, _options: unknown, run: (lock: object) => Promise<void>) => run({}) } })
    storage.clear(); storage.set('dex.persist.identity', 'owner')
    harness.disk.clear(); harness.commits = []; harness.hangRead = false; harness.failCommit = false; harness.serverOwner = 'owner'
    harness.create.mockClear(); harness.identify.mockClear(); harness.me.mockClear()
  })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

  it('refuses a hung store instead of claiming the photo is saved', async () => {
    harness.hangRead = true
    const q = await import('./Queue')
    const saved = q.enqueue({ id: 'photo', kind: 'photo', payload: {}, blob: new Blob(['jpeg']) })
    const rejected = expect(saved).rejects.toBeInstanceOf(q.QueueStorageError)
    await vi.advanceTimersByTimeAsync(5100)
    await rejected
    expect(q.rowsNow()).toEqual([])
    expect(storage.has(q.FALLBACK_KEY)).toBe(false)
  })
  it('does not publish a row whose transaction failed', async () => {
    harness.failCommit = true
    const q = await import('./Queue')
    await expect(q.enqueue(study)).rejects.toBeInstanceOf(q.QueueStorageError)
    expect(q.rowsNow()).toEqual([])
    expect(harness.disk.size).toBe(0)
  })
  it('persists the owner and full Blob before reporting a save', async () => {
    const q = await import('./Queue')
    const blob = new Blob(['jpeg'])
    const row = await q.enqueue({ id: 'photo', kind: 'photo', payload: {}, blob })
    expect(row.identityId).toBe('owner')
    expect(harness.disk.get('photo')).toEqual(row)
    expect(q.rowOf('photo')?.blob).toBe(blob)
  })
  it('never sends legacy unowned rows or rows under a changed cookie', async () => {
    harness.disk.set('legacy', { ...study, id: 'legacy', createdAt: 1 })
    const q = await import('./Queue')
    await q.enqueue(study)
    harness.serverOwner = 'somebody-else'
    await q.flush()
    expect(q.rowsNow()).toHaveLength(1)
    expect(harness.create).not.toHaveBeenCalled()
  })
  it('commits photo acknowledgement and removal together before creating the sighting', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id: 'asset', url: '/photo' }))))
    const q = await import('./Queue')
    await q.enqueue({ id: 'photo', kind: 'photo', payload: {}, blob: new Blob(['jpeg']) })
    await q.enqueue({ id: 'sighting', kind: 'sighting', payload: { taxonId: 't1', taxon, at: new Date().toISOString(), wildness: 'wild', first: true, place: null, photoRow: 'photo' } })
    await q.flush()
    expect(harness.commits).toContainEqual({ puts: ['sighting'], drops: ['photo'] })
    expect(harness.create).toHaveBeenCalledWith(expect.objectContaining({ photoId: 'asset' }), expect.anything())
    expect(q.rowsNow()).toEqual([])
  })
  it('a late upload response cannot recreate a cleared row or call identification', async () => {
    let finish!: (r: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { finish = resolve })))
    const q = await import('./Queue')
    await q.enqueue({ id: 'photo', kind: 'photo', payload: {}, blob: new Blob(['jpeg']) })
    await q.enqueue({ id: 'scan', kind: 'scan', payload: { at: new Date().toISOString(), place: null, regionId: 'region', photoRow: 'photo', idPending: true } })
    const flushing = q.flush()
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'))
    await q.clearOutbox()
    finish(new Response(JSON.stringify({ id: 'asset', url: '/photo' })))
    await flushing
    expect(q.rowsNow()).toEqual([])
    expect(harness.disk.size).toBe(0)
    expect(harness.identify).not.toHaveBeenCalled()
  })
  it('does not acknowledge new saves while deletion is paused', async () => {
    const q = await import('./Queue')
    q.pauseOutbox()
    await expect(q.enqueue(study)).rejects.toBeInstanceOf(q.QueueStorageError)
    expect(harness.disk.size).toBe(0)
    q.resumeOutbox()
    await q.enqueue(study)
    expect(harness.disk.size).toBe(1)
  })

  it('reloads persisted rows after bootstrap establishes the owner', async () => {
    storage.delete('dex.persist.identity')
    harness.disk.set('saved', { ...study, id: 'saved', identityId: 'owner', createdAt: 1, attempts: 0, lastError: null })
    const q = await import('./Queue')
    await q.load()
    expect(q.rowsNow()).toEqual([])
    const session = await import('./ClientIdentity')
    session.acceptIdentity('owner')
    storage.set('dex.persist.identity', 'owner')
    await q.load()
    expect(q.rowsNow().map(row => row.id)).toEqual(['saved'])
  })

  it('never competes with bootstrap to mint a cookie, or verifies an empty queue', async () => {
    storage.delete('dex.persist.identity')
    const q = await import('./Queue')
    await q.flush()
    expect(harness.me).not.toHaveBeenCalled()
    const session = await import('./ClientIdentity')
    session.acceptIdentity('owner')
    storage.set('dex.persist.identity', 'owner')
    await q.flush()
    expect(harness.me).not.toHaveBeenCalled()
  })

})
