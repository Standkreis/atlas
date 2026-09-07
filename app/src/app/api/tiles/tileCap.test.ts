import { describe, expect, it } from 'vitest'
import { clientIp, fromOwnPages, takeTileToken } from './tileCap'

describe('tile cap (handoff 0025 A3)', () => {
  it('lets 600 tiles a minute through, refuses the 601st with a retry-after, refills with time', () => {
    const t0 = 5_000_000
    for (let i = 0; i < 600; i++) expect(takeTileToken('10.0.0.1', t0).ok).toBe(true)
    const refused = takeTileToken('10.0.0.1', t0)
    expect(refused.ok).toBe(false)
    expect(refused.retryAfterSeconds).toBe(1) // one token every 100 ms, rounded up to a whole second
    expect(takeTileToken('10.0.0.1', t0 + 99).ok).toBe(false)
    expect(takeTileToken('10.0.0.1', t0 + 101).ok).toBe(true)
    expect(takeTileToken('10.0.0.2', t0).ok).toBe(true) // another address has its own bucket
  })
  it('reads the address from x-real-ip, then the first x-forwarded-for hop, else "local"', () => {
    expect(clientIp(new Request('http://x/', { headers: { 'x-real-ip': '1.2.3.4', 'x-forwarded-for': '9.9.9.9' } }))).toBe('1.2.3.4')
    expect(clientIp(new Request('http://x/', { headers: { 'x-forwarded-for': '5.6.7.8, 10.0.0.1' } }))).toBe('5.6.7.8')
    expect(clientIp(new Request('http://x/'))).toBe('local')
  })
  it('refuses cross-site fetches and foreign origins, passes own pages and header-less requests', () => {
    const own = ['https://atlas.standkreis.de']
    const r = (h: Record<string, string>) => new Request('https://atlas.standkreis.de/api/tiles/8/1/1', { headers: h })
    expect(fromOwnPages(r({ 'sec-fetch-site': 'same-origin', referer: 'https://atlas.standkreis.de/de' }), own)).toBe(true)
    expect(fromOwnPages(r({ 'sec-fetch-site': 'cross-site', referer: 'https://evil.example/' }), own)).toBe(false)
    expect(fromOwnPages(r({ referer: 'https://evil.example/map' }), own)).toBe(false)
    expect(fromOwnPages(r({ origin: 'https://evil.example' }), own)).toBe(false)
    expect(fromOwnPages(r({}), own)).toBe(true)
    expect(fromOwnPages(r({ 'sec-fetch-site': 'none' }), own)).toBe(true)
    expect(fromOwnPages(new Request('http://localhost:3010/api/tiles/8/1/1', { headers: { referer: 'http://localhost:3010/de' } }), [])).toBe(true)
    expect(fromOwnPages(new Request('http://localhost:3010/api/tiles/8/1/1', { headers: { referer: 'http://evil.example/' } }), [])).toBe(false)
  })
})
