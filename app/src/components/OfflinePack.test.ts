import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { regionalPackUrls, verifiedAt } from './OfflinePack'

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
    expect(await verifiedAt('region', urls)).toBe(at)
    images.delete(urls[1]!)
    expect(await verifiedAt('region', urls)).toBeNull()
    images.set(urls[1]!, new Response('rate limited', { status: 429 }))
    expect(await verifiedAt('region', urls)).toBeNull()
  })
  it('rejects the old date-only marker and a changed regional image list', async () => {
    expect(await verifiedAt('region', [...urls, 'https://images.test/new.jpg'])).toBeNull()
    saved = at
    expect(await verifiedAt('region', urls)).toBeNull()
  })
  it('requires a controlling worker to serve the images offline', async () => {
    vi.stubGlobal('navigator', { serviceWorker: { controller: null } })
    expect(await verifiedAt('region', urls)).toBeNull()
  })
})
