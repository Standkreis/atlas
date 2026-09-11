import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { LEGACY_CATALOGUE_SENTINEL, catalogueVersionForStorage, catalogueVersionFromStorage, catalogueVersionFromStorageEvent, catalogueVersionOf, catalogueVersionToAdopt, isCatalogueScopedQuery, keepForCatalogue, watchCatalogueCache, type CatalogueVersionState } from './CatalogueCache'

const key = (path: [string, string], input?: Record<string, unknown>) => [path, ...(input ? [{ input }] : [])]
const watched = (initial: CatalogueVersionState) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  let version = initial
  const transitions: CatalogueVersionState[] = []
  const watcher = watchCatalogueCache(qc, {
    readVersion: () => version,
    writeVersion: (next) => { version = next },
    onTransition: (next) => transitions.push(next),
  })
  return { qc, watcher, transitions, version: () => version }
}

describe('catalogue-aware persisted queries', () => {
  it('recognises direct and Germany-progress catalogue versions', () => {
    expect(catalogueVersionOf({ catalogueVersion: 'v2' })).toBe('v2')
    expect(catalogueVersionOf({ catalogue: { id: 'v2' } })).toBe('v2')
    expect(catalogueVersionOf({ catalogueVersion: null })).toBeNull()
    expect(catalogueVersionOf({ species: [] })).toBeUndefined()
  })

  it('drops stale and unversioned regional reads but preserves personal history', () => {
    const set = [['dex', 'set'], { input: { regionId: 'old' } }]
    const search = [['regions', 'search'], { input: { q: 'Mainz' } }]
    const locate = [['regions', 'locate'], { input: { lat: 49.9, lng: 8.2 } }]
    const journal = [['journal', 'get'], { input: { id: 'personal' } }]
    expect(isCatalogueScopedQuery(set)).toBe(true)
    expect(isCatalogueScopedQuery(search)).toBe(true)
    expect(isCatalogueScopedQuery(locate)).toBe(true)
    expect(isCatalogueScopedQuery(key(['taxon', 'page'], { gbifKey: 1 }))).toBe(true)
    expect(isCatalogueScopedQuery(key(['taxon', 'page'], { gbifKey: 1, regionId: 'region' }))).toBe(true)
    expect(keepForCatalogue(set, { catalogueVersion: 'old' }, 'new')).toBe(false)
    expect(keepForCatalogue(search, { catalogueVersion: 'new' }, 'new')).toBe(true)
    expect(keepForCatalogue(locate, { catalogueVersion: 'old' }, 'new')).toBe(false)
    expect(keepForCatalogue(set, { species: [] }, 'new')).toBe(false)
    expect(keepForCatalogue(set, { catalogueVersion: 'new', species: [] }, null)).toBe(false)
    expect(keepForCatalogue(set, { species: [] }, null)).toBe(true)
    expect(keepForCatalogue(set, { catalogueVersion: 'new', species: [] }, undefined)).toBe(true)
    expect(keepForCatalogue(journal, { private: true }, 'new')).toBe(true)
  })

  it('does not let a late old regional response roll back the authoritative handshake', () => {
    expect(catalogueVersionToAdopt(undefined, 'v1', false)).toBeUndefined()
    expect(catalogueVersionToAdopt('v1', 'v2', true)).toBe('v2')
    expect(catalogueVersionToAdopt('v2', 'v1', false)).toBe('v2')
    expect(catalogueVersionToAdopt('v2', null, true)).toBeNull()
    expect(catalogueVersionToAdopt(null, 'v2', false)).toBeNull()
  })

  it('persists an authoritative legacy handshake distinctly from no observation', () => {
    expect(catalogueVersionFromStorage(null)).toBeUndefined()
    expect(catalogueVersionForStorage(null)).toBe(LEGACY_CATALOGUE_SENTINEL)
    expect(catalogueVersionFromStorage(LEGACY_CATALOGUE_SENTINEL)).toBeNull()
    expect(catalogueVersionFromStorage('v2')).toBe('v2')
    expect(catalogueVersionFromStorageEvent(null)).toBeNull()
    expect(catalogueVersionFromStorageEvent(LEGACY_CATALOGUE_SENTINEL)).toBeNull()
  })

  it('cancels an active unversioned request and cached regional values on rollback', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const regions = key(['dex', 'regions'])
    const journal = key(['journal', 'get'], { id: 'mine' })
    qc.setQueryData(regions, [{ id: 'active-only' }])
    qc.setQueryData(journal, { private: true })
    let version: CatalogueVersionState = 'v2'
    const transitions: CatalogueVersionState[] = []
    const watcher = watchCatalogueCache(qc, { readVersion: () => version, writeVersion: (next) => { version = next }, onTransition: (next) => transitions.push(next) })
    expect(qc.getQueryData(regions)).toEqual([{ id: 'active-only' }])
    let release!: (value: unknown) => void
    let aborted = false
    const pending = qc.fetchQuery({ queryKey: key(['regions', 'search'], { q: 'Mainz' }), queryFn: ({ signal }) => new Promise((resolve) => {
      release = resolve
      signal.addEventListener('abort', () => { aborted = true })
    }) })
    await Promise.resolve()
    await qc.fetchQuery({ queryKey: key(['identity', 'me']), queryFn: async () => ({ id: 'me', catalogueVersion: null }) })
    expect(aborted).toBe(true)
    expect(version).toBeNull()
    expect(transitions).toEqual([null])
    expect(qc.getQueryData(regions)).toBeUndefined()
    expect(qc.getQueryData(journal)).toEqual({ private: true })
    release({ catalogueVersion: null, results: [{ id: 'stale-active' }] })
    await pending.catch(() => {})
    expect(qc.getQueryData(key(['regions', 'search'], { q: 'Mainz' }))).toBeUndefined()
    watcher.unsubscribe()
  })

  it('removes late explicit versions even when the marker did not change', async () => {
    const active = watched('v2')
    const lateV1 = key(['dex', 'set'], { regionId: 'region' })
    await active.qc.fetchQuery({ queryKey: lateV1, queryFn: async () => ({ catalogueVersion: 'v1', species: [] }) })
    expect(active.qc.getQueryData(lateV1)).toBeUndefined()
    expect(active.version()).toBe('v2')
    active.watcher.unsubscribe()

    const legacy = watched(null)
    const lateV2 = key(['sighting', 'outsideVersioned'], { key: 1 })
    await legacy.qc.fetchQuery({ queryKey: lateV2, queryFn: async () => ({ catalogueVersion: 'v2', taxa: [] }) })
    expect(legacy.qc.getQueryData(lateV2)).toBeUndefined()
    expect(legacy.version()).toBeNull()
    legacy.watcher.unsubscribe()
  })

  it('keeps fresh unversioned compatibility and empty responses without refetching', async () => {
    const { qc, watcher } = watched('v2')
    let requests = 0
    const cases: [readonly unknown[], unknown][] = [
      [key(['dex', 'regions']), []],
      [key(['regions', 'search'], { q: 'zz' }), { catalogueVersion: null, results: [] }],
      [key(['regions', 'locate'], { permission: 'granted', lat: 0, lng: 0 }), { catalogueVersion: null, status: 'no-result', region: null }],
      [key(['taxon', 'page'], { gbifKey: 1 }), { catalogueVersion: null, taxon: { id: 'global' } }],
    ]
    for (const [queryKey, data] of cases) {
      await qc.fetchQuery({ queryKey, queryFn: async () => { requests++; return data } })
      expect(qc.getQueryData(queryKey)).toEqual(data)
    }
    expect(requests).toBe(cases.length)
    expect(qc.getQueryCache().getAll()).toHaveLength(cases.length)
    watcher.unsubscribe()
  })

  it('records an unversioned request already fetching when the watcher starts', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const search = key(['regions', 'search'], { q: 'zz' })
    let release!: (value: unknown) => void
    const pending = qc.fetchQuery({ queryKey: search, queryFn: () => new Promise((resolve) => { release = resolve }) })
    await Promise.resolve()
    let version: CatalogueVersionState = 'v2'
    const watcher = watchCatalogueCache(qc, { readVersion: () => version, writeVersion: (next) => { version = next } })
    release({ catalogueVersion: null, results: [] })
    await pending
    expect(qc.getQueryData(search)).toEqual({ catalogueVersion: null, results: [] })
    watcher.unsubscribe()
  })

  it('evicts a global species page on transition but keeps a fresh matching page', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const page = key(['taxon', 'page'], { gbifKey: 1 })
    qc.setQueryData(page, { catalogueVersion: null, assets: ['old-visible-photo'] })
    let version: CatalogueVersionState = null
    const watcher = watchCatalogueCache(qc, { readVersion: () => version, writeVersion: (next) => { version = next } })
    await qc.fetchQuery({ queryKey: key(['identity', 'me']), queryFn: async () => ({ id: 'me', catalogueVersion: 'v2' }) })
    expect(qc.getQueryData(page)).toBeUndefined()
    let requests = 0
    await qc.fetchQuery({ queryKey: page, queryFn: async () => { requests++; return { catalogueVersion: 'v2', assets: ['reviewed-photo'] } } })
    expect(qc.getQueryData(page)).toEqual({ catalogueVersion: 'v2', assets: ['reviewed-photo'] })
    expect(requests).toBe(1)
    watcher.unsubscribe()
  })

  it('reconciles restored catalogue entries on every authoritative handshake', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const stale = key(['regions', 'search'], { q: 'old' })
    const unversioned = key(['dex', 'regions'])
    const journal = key(['journal', 'get'], { id: 'mine' })
    qc.setQueryData(stale, { catalogueVersion: 'v1', results: [] })
    qc.setQueryData(unversioned, [{ id: 'unknown-generation' }])
    qc.setQueryData(journal, { private: true })
    let version: CatalogueVersionState = 'v2'
    const watcher = watchCatalogueCache(qc, { readVersion: () => version, writeVersion: (next) => { version = next } })
    await qc.fetchQuery({ queryKey: key(['identity', 'me']), queryFn: async () => ({ id: 'me', catalogueVersion: 'v2' }) })
    expect(qc.getQueryData(stale)).toBeUndefined()
    expect(qc.getQueryData(unversioned)).toBeUndefined()
    expect(qc.getQueryData(journal)).toEqual({ private: true })
    watcher.unsubscribe()
  })

  it('does not let a regional response establish a marker beside hydrated identity data', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const me = key(['identity', 'me'])
    const set = key(['dex', 'set'], { regionId: 'new' })
    qc.setQueryData(me, { id: 'me', region: { id: 'legacy' } })
    let version: CatalogueVersionState = undefined
    const transitions: CatalogueVersionState[] = []
    const watcher = watchCatalogueCache(qc, { readVersion: () => version, writeVersion: (next) => { version = next }, onTransition: (next) => transitions.push(next) })
    await qc.fetchQuery({ queryKey: set, queryFn: async () => ({ catalogueVersion: 'v2', species: [] }) })
    expect(version).toBeUndefined()
    expect(transitions).toEqual([])
    expect(qc.getQueryData(me)).toEqual({ id: 'me', region: { id: 'legacy' } })
    await qc.fetchQuery({ queryKey: me, queryFn: async () => ({ id: 'me', catalogueVersion: 'v2', region: { id: 'new' } }) })
    expect(version).toBe('v2')
    expect(qc.getQueryData(set)).toBeUndefined()
    expect(qc.getQueryData(me)).toMatchObject({ catalogueVersion: 'v2', region: { id: 'new' } })
    watcher.unsubscribe()
  })

  it('continues tracking for the QueryClient lifetime after provider effect cleanup', async () => {
    const { qc, watcher, transitions, version } = watched('v1')
    // Passive-effect cleanup owns the window and identity listeners, not this watcher.
    await qc.fetchQuery({ queryKey: key(['identity', 'me']), queryFn: async () => ({ id: 'me', catalogueVersion: 'v2' }) })
    expect(version()).toBe('v2')
    expect(transitions).toEqual(['v2'])
    watcher.unsubscribe()
  })
})
