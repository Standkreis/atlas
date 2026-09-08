import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let disk: string | null = 'owner-a'
beforeEach(() => {
  vi.resetModules(); disk = 'owner-a'
  vi.stubGlobal('localStorage', { getItem: () => disk })
  vi.stubGlobal('location', { origin: 'https://atlas.test' })
})
afterEach(() => vi.unstubAllGlobals())

describe('tab identity request boundary', () => {
  it('does not adopt another tab owner until a verified identity response arrives', async () => {
    const session = await import('./ClientIdentity')
    expect(session.expectedIdentity()).toBe('owner-a')
    disk = 'owner-b'
    expect(session.expectedIdentity()).toBe('owner-a')
    session.invalidateIdentity()
    expect(session.expectedIdentity()).toBe('unverified')
    session.acceptIdentity('owner-b')
    expect(session.expectedIdentity()).toBe('owner-b')
  })
  it('rejects a late identity.me response after the identity changes', async () => {
    let finish!: (response: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { finish = resolve })))
    const session = await import('./ClientIdentity')
    session.acceptIdentity('owner-a')
    const pending = session.identityFetch('/api/trpc/identity.me')
    session.invalidateIdentity(); session.acceptIdentity('owner-b')
    finish(new Response('old identity'))
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(session.expectedIdentity()).toBe('owner-b')
  })
  it('a recovery mutation invalidates bootstrap reads already in flight', async () => {
    let finish!: (response: Response) => void
    vi.stubGlobal('fetch', vi.fn((url: string) => url.includes('identity.me') ? new Promise<Response>(resolve => { finish = resolve }) : Promise.resolve(new Response('recovered'))))
    const session = await import('./ClientIdentity')
    const old = session.identityFetch('/api/trpc/identity.me')
    await session.identityFetch('/api/trpc/identity.emailVerify', { method: 'POST' })
    finish(new Response('old identity'))
    await expect(old).rejects.toMatchObject({ name: 'AbortError' })
  })
  it('rejects an old response when another tab changed storage before its event is delivered', async () => {
    let finish!: (response: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { finish = resolve })))
    const session = await import('./ClientIdentity')
    session.acceptIdentity('owner-a')
    const pending = session.identityFetch('/api/trpc/identity.me')
    disk = 'owner-b' // no invalidateIdentity/storage event yet
    finish(new Response('old identity'))
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })

})
