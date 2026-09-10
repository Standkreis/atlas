import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { invalidateRegionalPacks, packCache, readyKey, regionalPackUrls, verifiedAt } from './OfflinePack'

const at = '2026-09-08T12:00:00.000Z'
const urls = ['https://images.test/a.jpg', 'https://images.test/b.jpg']
let saved: string | null
let images: Map<string, Response>
beforeEach(() => {
  saved = JSON.stringify({ version: 1, at, urls })
  images = new Map(urls.map(url => [url, new Response('jpeg')]))
  vi.stubGlobal('localStorage', { getItem: () => saved })
  vi.stubGlobal('navigator', { serviceWorker: { controller: {} } })
  vi.stubGlobal('caches', { open: async () => ({ match: async (url: string) => images.get(url) }) })
})
afterEach(() => vi.unstubAllGlobals())

describe('offline pack readiness', () => {
  it('includes at most one lead per taxon regardless of detail-gallery cardinality', () => {
    const gallery = Array.from({ length: 12 }, (_, index) => ({ url: `https://images.test/gallery-${index}.jpg` }))
    expect(regionalPackUrls([
      { leadSmall: 'https://images.test/lead-a-small.jpg', lead: gallery[0], assets: gallery },
      { lead: { url: 'https://images.test/lead-b.jpg' }, assets: gallery },
      { leadSmall: 'https://images.test/lead-a-small.jpg', assets: gallery },
      { lead: null, assets: gallery },
    ])).toEqual(['https://images.test/lead-a-small.jpg', 'https://images.test/lead-b.jpg'])
  })

  it('requires every current image to be present and successful', async () => {
    expect(await verifiedAt('region', null, urls)).toBe(at)
    images.delete(urls[1]!)
    expect(await verifiedAt('region', null, urls)).toBeNull()
    images.set(urls[1]!, new Response('rate limited', { status: 429 }))
    expect(await verifiedAt('region', null, urls)).toBeNull()
  })
  it('rejects the old date-only marker and a changed regional image list', async () => {
    expect(await verifiedAt('region', null, [...urls, 'https://images.test/new.jpg'])).toBeNull()
    saved = at
    expect(await verifiedAt('region', null, urls)).toBeNull()
  })
  it('requires a controlling worker to serve the images offline', async () => {
    vi.stubGlobal('navigator', { serviceWorker: { controller: null } })
    expect(await verifiedAt('region', null, urls)).toBeNull()
  })
  it('keeps legacy packs valid before activation and binds rebuilt packs to one catalogue', async () => {
    expect(packCache('region')).toBe('dex-pack-region')
    expect(packCache('region', 'catalogue/v2')).toContain('dex-pack-v2-catalogue_2Fv2-region')
    saved = JSON.stringify({ version: 2, catalogueVersion: 'catalogue/v2', at, urls })
    const getItem = localStorage.getItem
    vi.stubGlobal('localStorage', { getItem: (key: string) => key === readyKey('region', 'catalogue/v2') ? saved : getItem(key) })
    expect(await verifiedAt('region', 'catalogue/v2', urls)).toBe(at)
    expect(await verifiedAt('region', 'another', urls)).toBeNull()
  })
  it('removes only stale regional pack caches and markers after an online transition', async () => {
    const deleted: string[] = []
    const current = packCache('region', 'v2')
    vi.stubGlobal('caches', { keys: async () => ['dex-images', 'dex-pack-legacy', current, 'dex-pack-v2-old-region'], delete: async (name: string) => { deleted.push(name); return true } })
    const values = new Map([[readyKey('legacy'), 'old'], [readyKey('region', 'v2'), 'new'], ['dex.persist.identity', 'owner']])
    vi.stubGlobal('localStorage', {
      get length() { return values.size }, key: (i: number) => [...values.keys()][i] ?? null,
      getItem: (key: string) => values.get(key) ?? null, removeItem: (key: string) => { values.delete(key) },
    })
    await invalidateRegionalPacks('v2')
    expect(deleted.sort()).toEqual(['dex-pack-legacy', 'dex-pack-v2-old-region'])
    expect(values.has(readyKey('legacy'))).toBe(false)
    expect(values.has(readyKey('region', 'v2'))).toBe(true)
    expect(values.get('dex.persist.identity')).toBe('owner')
  })
  it('removes only v2 packs and markers after rollback to the legacy catalogue', async () => {
    const deleted: string[] = []
    vi.stubGlobal('caches', { keys: async () => ['dex-images', 'dex-pack-legacy', 'dex-pack-v2-active-region', 'dex-pack-v2-old-region'], delete: async (name: string) => { deleted.push(name); return true } })
    const values = new Map([[readyKey('legacy'), 'legacy'], [readyKey('region', 'active'), 'active'], ['dex.persist.identity', 'owner']])
    vi.stubGlobal('localStorage', {
      get length() { return values.size }, key: (i: number) => [...values.keys()][i] ?? null,
      getItem: (key: string) => values.get(key) ?? null, removeItem: (key: string) => { values.delete(key) },
    })
    await invalidateRegionalPacks(null)
    expect(deleted.sort()).toEqual(['dex-pack-v2-active-region', 'dex-pack-v2-old-region'])
    expect(values.has(readyKey('legacy'))).toBe(true)
    expect(values.has(readyKey('region', 'active'))).toBe(false)
    expect(values.get('dex.persist.identity')).toBe('owner')
  })
})
