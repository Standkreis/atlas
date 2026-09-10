'use client'

import { useSyncExternalStore } from 'react'
import { createStore, entries } from 'idb-keyval'
import { createTRPCClient, httpBatchLink, TRPCClientError } from '@trpc/client'
import superjson from 'superjson'
import type { inferRouterOutputs } from '@trpc/server'
import { expectedIdentity } from './ClientIdentity'
import type { AppRouter } from '@/server/routers/_app'

// The sightings queue (handoff 0009 Track B). One IndexedDB store `outbox`; every save from the save screen writes a row
// here first and then flushes. Online the flush lands in the same tick; in the forest the row waits for the signal.
// The client mints the Sighting id, so a retried flush is idempotent on the server (`sighting.create` upserts by id).

export type Lead = { url: string; author: string; licence: string; licenceUrl: string | null; sourceUrl: string; origin: string } | null
export type QueueTaxon = { id: string; gbifKey: number; sciName: string; names: Record<string, string>; tile: string; lead: Lead }
export type Wildness = 'wild' | 'captive' | 'cultivated'

export type SightingPayload = {
  taxonId: string
  at: string // ISO, the phone's clock (findings 0008 A4)
  lat?: number
  lng?: number
  note?: string
  wildness: Wildness
  /** An Asset already on the server (uploaded online), bound at create. */
  photoId?: string
  /** A `photo` row of this outbox (uploaded offline); the flush uploads it first and binds the returned Asset id. */
  photoRow?: string
  /** What the diary and the sheet render before the server has the row. */
  taxon: QueueTaxon
  place: string | null
  /** The client's "first" (no seenAt for the taxon); the server's wins after the flush. */
  first: boolean
  /** The species is the scan's answer (handoff 0016 B4): the server stores `evidence: idAssisted`. */
  idAssisted?: boolean
}
export type PhotoPayload = { forSighting?: string; photoId?: string }
export type StudyPayload = { taxonId: string; taxon: QueueTaxon }
/**
 * A snap without signal (handoff 0016 B5): the sighting as "unbestimmt" until the flush has uploaded the photo and asked
 * `sighting.identify`. `idPending` is true until the ladder is on the row; the row then stays in the box (it is no server
 * row yet: a Sighting needs a taxon) until the user takes or rejects the answer on the save screen, which removes it.
 */
export type ScanPayload = {
  at: string
  lat?: number
  lng?: number
  place: string | null
  regionId: string
  /** The `photo` row of this outbox with the blob; the flush uploads it and moves on to `photoId`. */
  photoRow?: string
  /** The Asset on the server (uploaded online, or by the flush). */
  photoId?: string
  idPending: boolean
  /** A retired region with no reviewed successor waits for an explicit user choice. */
  requiresRegion?: boolean
  /** Why an unanswered row is waiting; maintenance is retryable, not a dead scan. */
  waitingReason?: 'offline' | 'maintenance'
  ladder?: inferRouterOutputs<AppRouter>['sighting']['identify']
  /** The diary's badge shows until the row was opened once. */
  opened?: boolean
}

export type Row = { identityId: string; id: string; createdAt: number; attempts: number; lastError: string | null; dead?: boolean } & (
  | { kind: 'sighting'; payload: SightingPayload; blob?: undefined }
  | { kind: 'photo'; payload: PhotoPayload; blob: Blob }
  | { kind: 'study'; payload: StudyPayload; blob?: undefined }
  | { kind: 'scan'; payload: ScanPayload; blob?: undefined }
)
export type Kind = Row['kind']
export type Flushed = { row: Row; result: unknown }

export const MAX_ROWS = 50
export const MAX_BLOB = 2 * 1024 * 1024
export class QueueFull extends Error { constructor() { super('queue full') } }

const api = process.env.NEXT_PUBLIC_API_URL ?? ''
const store = typeof indexedDB === 'undefined' ? null : createStore('dex-outbox', 'outbox')
// A vanilla client of its own: the flush runs outside React (timers, the online event) and must not depend on the provider.
// `x-dex-locale` (handoff 0016 A5): the flush's `identify` answers in the page's language, as the provider's client does.
const client = createTRPCClient<AppRouter>({ links: [httpBatchLink({ url: `${api}/api/trpc`, transformer: superjson, headers: () => ({ 'x-dex-locale': document.documentElement.lang, 'x-dex-identity': activeOwner ?? '' }), fetch: (url, opts) => fetch(url, { ...opts, credentials: 'include' }) })] })

// A save is acknowledged only after IndexedDB commits, including its Blob. A plain-text
// fallback cannot preserve photos and must never make the save screen report success.
const IDB_TIMEOUT = 5000
export const FALLBACK_KEY = 'dex.outbox.fallback'
export const IDENTITY_KEY = 'dex.persist.identity'
export class QueueStorageError extends Error { constructor() { super('Could not save on this device. Please try again.') } }
let epoch = 0
let activeOwner: string | null = null
let paused = false
let controller = new AbortController()
const transactions = new Set<IDBTransaction>()
const owner = () => { try { const stored = localStorage.getItem(IDENTITY_KEY); return stored === expectedIdentity() ? stored : null } catch { return null } }
const timed = <T>(p: Promise<T>): Promise<T> => new Promise((resolve, reject) => {
  const h = setTimeout(() => reject(new QueueStorageError()), IDB_TIMEOUT)
  p.then(v => { clearTimeout(h); resolve(v) }, e => { clearTimeout(h); reject(e) })
})
function cancelRun() {
  epoch++
  controller.abort()
  controller = new AbortController()
  for (const tx of transactions) { try { tx.abort() } catch { /* already finished */ } }
}
// One transaction commits both the upload acknowledgement and removal of its Blob.
async function persist(put: Row[] = [], drop: string[] = [], clearAll = false, patches: { id: string; patch: (row: Row) => Row }[] = []) {
  if (!store) throw new QueueStorageError()
  const start = epoch
  const deadline = Date.now() + IDB_TIMEOUT
  if (paused && (put.length || patches.length)) throw new QueueStorageError()
  await timed(store('readwrite', objectStore => new Promise<void>((resolve, reject) => {
    const tx = objectStore.transaction
    if (start !== epoch || Date.now() >= deadline || (paused && (put.length || patches.length))) { tx.abort(); reject(new QueueStorageError()); return }
    transactions.add(tx)
    const timer = setTimeout(() => { try { tx.abort() } catch { /* finished */ } }, Math.max(1, deadline - Date.now() - 50))
    const finish = () => { clearTimeout(timer); transactions.delete(tx) }
    tx.oncomplete = () => { finish(); resolve() }
    tx.onabort = tx.onerror = () => { finish(); reject(new QueueStorageError()) }
    if (clearAll) objectStore.clear()
    for (const id of drop) objectStore.delete(id)
    for (const row of put) objectStore.put(row, row.id)
    for (const { id, patch } of patches) {
      const request = objectStore.get(id)
      request.onsuccess = () => {
        const current = request.result as Row | undefined
        if (!current || current.identityId !== owner()) { tx.abort(); return }
        const next = patch(current)
        put.push(next)
        objectStore.put(next, id)
      }
    }
  })))
  if (start !== epoch) throw new QueueStorageError()
  rows = (clearAll ? [] : rows.filter(r => !drop.includes(r.id) && !put.some(p => p.id === r.id))).concat(put).sort(byAge)
  notify()
}

// ── The in-memory mirror: every read of the box goes through it, every write updates it and IndexedDB and tells the listeners ──
let rows: Row[] = []
let quarantined: Row[] = []
let loaded: Promise<void> | null = null
let loadedFor: string | null | undefined
let isLoaded = typeof indexedDB === 'undefined' // no IndexedDB (SSR, a test): nothing to wait for
const listeners = new Set<() => void>()
const flushedListeners = new Set<(f: Flushed) => void>()
const notify = () => { for (const l of listeners) l() }
const byAge = (a: Row, b: Row) => a.createdAt - b.createdAt

export function load(): Promise<void> {
  if (!store) return Promise.resolve()
  const currentOwner = owner()
  if (loadedFor !== currentOwner) { loaded = null; loadedFor = currentOwner }
  const start = epoch
  return (loaded ??= timed(entries<string, Row>(store)).then(all => {
    if (start !== epoch) return
    // Legacy rows without an owner are quarantined: never attach somebody else's
    // old offline discoveries to whichever cookie happens to be present today.
    let fallback: Row[] = []
    try { const saved: unknown = JSON.parse(localStorage.getItem(FALLBACK_KEY) ?? '[]'); if (Array.isArray(saved)) fallback = saved.filter(r => r && typeof r.id === 'string' && !r.identityId) as Row[] } catch { /* unreadable legacy snapshot */ }
    quarantined = [...new Map([...all.map(([, r]) => r).filter(r => !r.identityId), ...fallback].map(row => [row.id, row])).values()].sort(byAge)
    rows = all.map(([, r]) => r).filter(r => !!r.identityId && r.identityId === owner()).sort(byAge)
  }).then(() => { isLoaded = true; notify() }).catch(e => { loaded = null; throw e }))
}
export const rowsNow = () => rows
export const rowOf = (id: string) => rows.find((r) => r.id === id)
export function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l) } }
export function onFlushed(l: (f: Flushed) => void) { flushedListeners.add(l); return () => { flushedListeners.delete(l) } }
/** The rows of the box as React state; loaded once, then live. */
export function useOutbox(): Row[] {
  return useSyncExternalStore(subscribe, rowsNow, () => empty)
}
const empty: Row[] = []
export function useQuarantinedOutbox(): Row[] { return useSyncExternalStore(subscribe, () => quarantined, () => empty) }
/** Complete local recovery copy, including every available photo byte. No guesses
 * about identity ownership and no requests to the server are involved. */
export async function downloadOutboxRecovery() {
  const legacy = await Promise.all(quarantined.map(async row => {
    const photoDataUrl = row.blob ? await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(row.blob!)
    }) : undefined
    return { ...row, blob: undefined, photoDataUrl }
  }))
  const url = URL.createObjectURL(new Blob([JSON.stringify({ format: 'standkreis-outbox-recovery', version: 1, exportedAt: new Date().toISOString(), rows: legacy }, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url; link.download = 'standkreis-unsent-recovery.json'; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
/** Has the box been read from IndexedDB once? A screen that decides on `rowOf()` at mount (the scan, the save screen's queued photo) waits for this. */
export function useOutboxReady(): boolean {
  return useSyncExternalStore(subscribe, () => isLoaded, () => false)
}

async function write(row: Row) {
  if (row.identityId !== owner()) throw new QueueStorageError()
  await persist([row])
}
export async function update(id: string, patch: (r: Row) => Row) {
  if (rowOf(id)) await persist([], [], false, [{ id, patch }])
}
export async function remove(id: string) { await persist([], [id]) }
/** Abort in-flight work before clearing, including requests that would otherwise
 * resurrect a cleared row when their response eventually arrives. */
export async function clearOutbox(identityId?: string) {
  cancelRun()
  rows = []
  quarantined = []
  loaded = null
  notify()
  try { if (!identityId) localStorage.removeItem(FALLBACK_KEY) } catch { /* private mode */ }
  if (identityId && store) {
    const all = await timed(entries<string, Row>(store))
    await persist([], all.filter(([, row]) => row.identityId === identityId).map(([id]) => id))
  } else await persist([], [], true)
}
export function suspendOutbox() { cancelRun(); rows = []; loaded = null; notify() }
export function pauseOutbox() { paused = true; suspendOutbox() }
export function resumeOutbox() { paused = false }

/**
 * Put a row into the box. The 51st row is refused (`QueueFull`): iOS evicts the store after seven unused days (record
 * Q5), so the box stays small and the save screen says "Erst wieder ins Netz". A blob over 2 MB is refused the same way.
 */
export async function enqueue(row: Omit<Row, 'identityId' | 'createdAt' | 'attempts' | 'lastError'> & { id: string }): Promise<Row> {
  if (paused) throw new QueueStorageError()
  await load()
  if (paused) throw new QueueStorageError()
  if (rows.filter((r) => !r.dead).length >= MAX_ROWS) throw new QueueFull()
  if (row.blob && row.blob.size > MAX_BLOB) throw new QueueFull()
  const identityId = owner()
  if (!identityId) throw new QueueStorageError()
  const full = { ...row, identityId, createdAt: Date.now(), attempts: 0, lastError: null } as Row
  await write(full)
  return full
}

/** "Erneut" on a row that fell out: back into the line. */
export async function retry(id: string) {
  const r = rowOf(id)
  if (!r) return
  await write({ ...r, dead: false, lastError: null, attempts: 0 })
  void flush()
}

// ── The flush ──
/** A response that came back: 4xx other than 401 and 429 means the row is wrong and falls out; everything else waits. */
class HttpError extends Error { constructor(public status: number, message: string) { super(message) } }
const httpStatus = (e: unknown) => e instanceof TRPCClientError ? (e.data as { httpStatus?: number } | undefined)?.httpStatus : e instanceof HttpError ? e.status : undefined
function verdict(e: unknown): 'dead' | 'wait' {
  const status = httpStatus(e)
  if (status === undefined) return 'wait' // no answer: offline, a timeout, a dead server
  return status >= 400 && status < 500 && status !== 401 && status !== 429 ? 'dead' : 'wait'
}
const message = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 200)

async function upload(blob: Blob): Promise<{ id: string; url: string }> {
  const form = new FormData()
  form.append('file', blob, 'photo.jpg')
  const r = await fetch(`${api}/api/photo`, { method: 'POST', body: form, credentials: 'include', headers: { 'x-dex-identity': activeOwner ?? '' }, signal: controller.signal })
  if (!r.ok) throw new HttpError(r.status, `upload ${r.status}`)
  return (await r.json()) as { id: string; url: string }
}

/** Send the saved payload unchanged; a refused photo keeps its parent visible for retry. */
function assertActive(row: Row) {
  if (row.identityId !== owner() || row.identityId !== activeOwner || !rowOf(row.id)) throw new Error('Identity changed')
}
async function send(row: Row): Promise<unknown> {
  assertActive(row)
  if (row.kind === 'sighting') {
    const p = row.payload
    let photoId = p.photoId
    const photo = p.photoRow ? rowOf(p.photoRow) : undefined
    if (photo?.kind === 'photo') {
      photoId = (await upload(photo.blob)).id
      assertActive(row)
      await persist([], [photo.id], false, [{ id: row.id, patch: current => current.kind === row.kind ? { ...current, payload: { ...current.payload, photoRow: undefined, photoId } } as Row : current }])
    }
    if (p.photoRow && !photoId) throw new HttpError(410, 'photo gone')
    assertActive(row)
    return client.sighting.create.mutate({ id: row.id, taxonId: p.taxonId, at: new Date(p.at), lat: p.lat, lng: p.lng, note: p.note, wildness: p.wildness, photoId, idAssisted: p.idAssisted && !!photoId ? true : undefined }, { signal: controller.signal })
  }
  if (row.kind === 'study') return client.study.mark.mutate({ taxonId: row.payload.taxonId }, { signal: controller.signal })
  if (row.kind === 'scan') {
    // B5: the photo first (a refused file kills the row: there is nothing to identify), then the engine; the ladder lands on the row.
    const p = row.payload
    let photoId = p.photoId
    const photo = p.photoRow ? rowOf(p.photoRow) : undefined
    if (photo?.kind === 'photo') {
      photoId = (await upload(photo.blob)).id
      assertActive(row)
      await persist([], [photo.id], false, [{ id: row.id, patch: current => current.kind === row.kind ? { ...current, payload: { ...current.payload, photoRow: undefined, photoId } } as Row : current }])
    }
    if (!photoId) throw new HttpError(410, 'photo gone')
    const ladder = await client.sighting.identify.mutate({ photoId, regionId: p.regionId, locale: document.documentElement.lang === 'en' ? 'en' : 'de' }, { signal: controller.signal })
    assertActive(row)
    const cur = rowOf(row.id) // the point may have landed on the row while the engine worked
    const base: Row & { kind: 'scan' } = cur?.kind === 'scan' ? cur : row
    await update(base.id, current => current.kind === 'scan' ? { ...current, payload: { ...current.payload, photoRow: undefined, photoId, idPending: false, ladder }, lastError: null } : current)
    return ladder
  }
  // A photo row alone: bound to a sighting that already exists on the server (kind `photo` with forSighting); an unbound one waits for its sighting row.
  if (row.payload.forSighting) {
    const photoId = row.payload.photoId ?? (await upload(row.blob)).id
    assertActive(row)
    await write({ ...row, payload: { ...row.payload, photoId } })
    return client.sighting.attachPhoto.mutate({ sightingId: row.payload.forSighting, photoId }, { signal: controller.signal })
  }
  return null
}

/**
 * Fold queued scan regions through the server-owned reviewed map. Approved successors are
 * deterministic; no-successor rows remain byte-backed in the outbox until the user chooses.
 */
async function transitionScanRegions(): Promise<Set<string>> {
  const blocked = new Set<string>()
  const scans = rowsNow().filter((row): row is Row & { kind: 'scan' } => row.kind === 'scan' && !row.dead && row.payload.idPending && !row.payload.requiresRegion)
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  const invalid = scans.filter((scan) => !uuid.test(scan.payload.regionId))
  for (const scan of invalid) {
    blocked.add(scan.id)
    await update(scan.id, current => current.kind === 'scan' ? {
      ...current,
      dead: false,
      lastError: 'region-invalid',
      payload: { ...current.payload, requiresRegion: true },
    } : current)
  }

  const valid = scans.filter((scan) => uuid.test(scan.payload.regionId))
  const ids = [...new Set(valid.map((row) => row.payload.regionId))]
  for (let offset = 0; offset < ids.length; offset += 50) {
    const batch = ids.slice(offset, offset + 50)
    let result: Awaited<ReturnType<typeof client.regions.compatibility.query>>
    try {
      result = await client.regions.compatibility.query({ regionIds: batch }, { signal: controller.signal })
    } catch {
      // Compatibility being unavailable must not block unrelated outbox work. Pending scans wait unchanged.
      for (const scan of valid) if (batch.includes(scan.payload.regionId)) blocked.add(scan.id)
      continue
    }
    if (!result.catalogueVersion) continue
    const byInput = new Map(result.resolutions.map((resolution) => [resolution.inputId, resolution]))
    for (const scan of valid.filter((row) => batch.includes(row.payload.regionId))) {
      const resolution = byInput.get(scan.payload.regionId)
      if (!resolution || resolution.regionId === scan.payload.regionId) continue
      await update(scan.id, current => current.kind === 'scan' ? {
        ...current,
        dead: false,
        lastError: resolution.regionId ? null : 'region-retired',
        payload: { ...current.payload, regionId: resolution.regionId ?? current.payload.regionId, requiresRegion: !resolution.regionId },
      } : current)
    }
  }
  return blocked
}

/** Explicit recovery action for a no-successor scan; the photo/draft is not recreated or discarded. */
export async function rebindScanRegion(id: string, region: { id: string; name: string }) {
  await update(id, current => current.kind === 'scan' ? {
    ...current,
    dead: false,
    attempts: 0,
    lastError: null,
    payload: { ...current.payload, regionId: region.id, place: region.name, requiresRegion: false, waitingReason: undefined, idPending: true },
  } : current)
  void flush()
}

const ORPHAN_AGE = 24 * 3_600_000
let running: Promise<void> | null = null
/**
 * Flush the box: in order, one row at a time. The first row without an answer stops the run (the signal is gone, or the
 * server is); a row the server refuses falls out with its payload kept and its error shown, the line behind it moves on.
 * One run at a time; a second call while one runs joins it.
 */
export function flush(): Promise<void> {
  if (paused || typeof navigator === 'undefined' || !navigator.locks) return Promise.resolve()
  return (running ??= navigator.locks.request('dex-outbox-flush', { ifAvailable: true }, async lock => {
    if (lock) await run()
  }).then(() => {}).catch(() => { /* keep durable rows for retry */ }).finally(() => { running = null; activeOwner = null }))
}
async function run() {
  const start = epoch
  loaded = null // another tab may have acknowledged rows since our last snapshot
  await load()
  if (typeof navigator !== 'undefined' && !navigator.onLine) return
  const expectedOwner = owner()
  if (!expectedOwner || !rows.length) return // main identity.me is the only bootstrap; never mint a competing cookie
  activeOwner = expectedOwner
  const identity = await client.identity.me.query(undefined, { signal: controller.signal })
  if (paused || start !== epoch || identity.id !== owner()) return
  activeOwner = identity.id
  const transitionBlocked = await transitionScanRegions()
  for (const snapshot of [...rows]) {
    if (paused || start !== epoch) return
    const row = rowOf(snapshot.id)
    if (!row || row.identityId !== activeOwner) continue
    if (row.dead) continue
    if (transitionBlocked.has(row.id)) continue
    if (row.kind === 'scan' && row.payload.requiresRegion) continue
    if (row.kind === 'photo' && !row.payload.forSighting) {
      // Waits for its sighting; if none ever comes (chooser → back), it goes after a day, like the server's abandoned Assets.
      if (Date.now() - row.createdAt > ORPHAN_AGE && !rows.some((r) => (r.kind === 'sighting' || r.kind === 'scan') && r.payload.photoRow === row.id)) await remove(row.id)
      continue
    }
    if (row.kind === 'scan' && !row.payload.idPending) continue // answered: waits for the user, not for the signal
    try {
      const result = await send(row)
      if (start !== epoch || !rowOf(row.id)) return
      assertActive(row)
      if (row.kind !== 'scan') await remove(row.id) // an answered scan row stays until the save screen takes it
      for (const l of flushedListeners) l({ row, result })
    } catch (e) {
      if (start !== epoch) return
      const current = rowOf(row.id)
      if (!current) continue
      const dead = verdict(e) === 'dead'
      await update(current.id, saved => {
        const failed = { ...saved, attempts: saved.attempts + 1, lastError: message(e), dead }
        return failed.kind === 'scan' && httpStatus(e) === 503
          ? { ...failed, payload: { ...failed.payload, waitingReason: 'maintenance' } }
          : failed
      })
      if (!dead) return
    }
  }
}

/** Resolve with the server's answer for one row when it lands within `ms`, else null: the save screen waits this long and no longer. */
export function landing<T>(id: string, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const off = onFlushed((f) => { if (f.row.id === id) { off(); clearTimeout(h); resolve(f.result as T) } })
    const h = setTimeout(() => { off(); resolve(null) }, ms)
  })
}

/** Still waiting or fallen out: what the diary merges in. */
export const pending = (all: Row[]) => all.filter((r) => r.kind !== 'photo')
/** Is there a wild row for this taxon already in the box (so a second offline save of the same species is not "first")? */
export const queuedWild = (all: Row[], taxonId: string) => all.some((r) => r.kind === 'sighting' && r.payload.taxonId === taxonId && r.payload.wildness === 'wild')
