import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const origin = 'https://atlas.test'
function worker() {
  const stores = new Map<string, Map<string, Response>>()
  const key = (request: string | Request) => new URL(typeof request === 'string' ? request : request.url, origin).href
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    open: async (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map())
      const store = stores.get(name)!
      return { keys: async () => [...store.keys()].map(url => new Request(url)),
        match: async (request: string | Request) => store.get(key(request)),
        put: async (request: string | Request, response: Response) => { store.set(key(request), response) },
        delete: async (request: string | Request) => store.delete(key(request)),
      }
    },
  }
  const events = new Map<string, (event: unknown) => void>()
  const fetch = vi.fn(async () => new Response('gone', { status: 404 }))
  runInNewContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), {
    URL, Request, Response, caches, fetch, setTimeout, clearTimeout,
    self: { location: { href: `${origin}/sw.js?v=test`, origin },
      clients: { claim: async () => {}, matchAll: async () => [] },
      addEventListener: (type: string, handler: (event: unknown) => void) => events.set(type, handler),
    },
  })
  return { caches, fetch,
    activate: () => { let work!: Promise<unknown>; events.get('activate')!({ waitUntil: (p: Promise<unknown>) => { work = p } }); return work },
    request: (url: string) => { let response: Promise<Response> | undefined; events.get('fetch')!({ request: new Request(url), respondWith: (p: Promise<Response>) => { response = p }, waitUntil: () => {} }); return response },
  }
}

describe('service worker privacy and offline reference packs', () => {
  it('a cached private photo still reaches the server with no-store after deletion', async () => {
    const sw = worker()
    const cache = await sw.caches.open('dex-images')
    const url = `${origin}/api/photo/private-asset`
    await cache.put(url, new Response('private bytes'))
    expect((await sw.request(url))?.status).toBe(404)
    expect(sw.fetch).toHaveBeenCalledWith(expect.any(Request), { cache: 'no-store' })
  })
  it('activation purges legacy private photos while preserving public references and packs', async () => {
    const sw = worker()
    const cache = await sw.caches.open('dex-images')
    await cache.put(`${origin}/api/photo/private-asset`, new Response('private bytes'))
    await cache.put('https://upload.wikimedia.org/bird.jpg', new Response('public bytes'))
    const pack = await sw.caches.open('dex-pack-region')
    await pack.put('https://upload.wikimedia.org/flower.jpg', new Response('flower'))
    await sw.activate()
    expect(await cache.match(`${origin}/api/photo/private-asset`)).toBeUndefined()
    expect(await (await cache.match('https://upload.wikimedia.org/bird.jpg'))?.text()).toBe('public bytes')
    expect(await (await pack.match('https://upload.wikimedia.org/flower.jpg'))?.text()).toBe('flower')
  })
  it('serves explicitly downloaded region images offline from their protected pack', async () => {
    const sw = worker()
    const pack = await sw.caches.open('dex-pack-region')
    const url = 'https://upload.wikimedia.org/bird.jpg'
    await pack.put(url, new Response('public reference'))
    expect(await (await sw.request(url))?.text()).toBe('public reference')
    expect(sw.fetch).not.toHaveBeenCalled()
  })
})
