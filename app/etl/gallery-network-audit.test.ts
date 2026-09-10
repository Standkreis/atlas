import { describe, expect, it, vi } from 'vitest'
import { checkReferenceUrl, nextUrlChecks, parseNetworkArgs, recordedCheck, reusableCheck, safeReferenceUrl, successfulReferenceStatus, type NetworkCheck } from './gallery-network-audit'

const url = 'https://upload.wikimedia.org/example.jpg'
const now = () => new Date('2026-09-09T08:00:00Z')
const image = () => new Response(null, { status: 200, headers: { 'content-type': 'image/jpeg; charset=utf-8' } })
const pause = async () => {}

describe('bounded external reference checks', () => {
  it('accepts reviewed public hosts, not credentials, local hosts, arbitrary ports or deceptive suffixes', () => {
    expect(safeReferenceUrl(url)).toBe(true)
    for (const bad of ['http://upload.wikimedia.org/a', 'https://127.0.0.1/a', 'https://upload.wikimedia.org.attacker.test/a', 'https://user:pass@upload.wikimedia.org/a', 'https://upload.wikimedia.org:444/a']) expect(safeReferenceUrl(bad)).toBe(false)
  })
  it('records a successful HEAD without claiming decoded pixels', async () => {
    const request = vi.fn().mockResolvedValue(image())
    expect(await checkReferenceUrl(url, { fetch: request, now })).toEqual({ url, checkedAt: now().toISOString(), ok: true, status: 200, method: 'HEAD', contentType: 'image/jpeg', finalUrl: url, reason: null })
    expect(request.mock.calls[0]![1].method).toBe('HEAD')
  })
  it('falls back to a byte-range GET when HEAD is forbidden', async () => {
    const request = vi.fn().mockResolvedValueOnce(new Response(null, { status: 403 })).mockResolvedValueOnce(image())
    const result = await checkReferenceUrl(url, { fetch: request, now, pause })
    expect(result).toMatchObject({ ok: true, method: 'GET' })
    expect(request.mock.calls[1]![1].headers.Range).toBe('bytes=0-0')
  })
  it('rejects successful HTML responses and broken URLs', async () => {
    expect(await checkReferenceUrl(url, { fetch: vi.fn().mockResolvedValue(new Response(null, { headers: { 'content-type': 'text/html' } })), now })).toMatchObject({ ok: false, reason: 'not-image-mime' })
    expect(await checkReferenceUrl(url, { fetch: vi.fn().mockResolvedValue(new Response(null, { status: 404 })), now })).toMatchObject({ ok: false, reason: 'http-404' })
  })
  it('rejects bodyless 2xx statuses instead of treating them as reusable image evidence', async () => {
    const request = vi.fn().mockResolvedValue(new Response(null, { status: 204, headers: { 'content-type': 'image/jpeg' } }))
    const result = await checkReferenceUrl(url, { fetch: request, now })
    expect(result).toMatchObject({ ok: false, status: 204, reason: 'http-204' })
    expect(reusableCheck({ ...result, ok: true, reason: null }, now().getTime())).toBe(false)
    expect(successfulReferenceStatus('HEAD', 200)).toBe(true)
    expect(successfulReferenceStatus('GET', 206)).toBe(true)
    expect(successfulReferenceStatus('HEAD', 204)).toBe(false)
    expect(successfulReferenceStatus('GET', 205)).toBe(false)
  })
  it('refuses redirects to an unreviewed/private host before fetching it', async () => {
    const request = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: 'https://127.0.0.1/private' } }))
    expect(await checkReferenceUrl(url, { fetch: request, now })).toMatchObject({ ok: false, reason: 'unreviewed-or-unsafe-image-host' })
    expect(request).toHaveBeenCalledTimes(1)
  })
  it('follows bounded redirects between approved image hosts', async () => {
    const request = vi.fn().mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: 'https://thumb.wikimedia.org/example.jpg' } })).mockResolvedValueOnce(image())
    expect(await checkReferenceUrl(url, { fetch: request, now })).toMatchObject({ ok: true, finalUrl: 'https://thumb.wikimedia.org/example.jpg' })
  })
  it('honours Retry-After and bounds repeated failures', async () => {
    const wait = vi.fn().mockResolvedValue(undefined)
    const request = vi.fn().mockResolvedValueOnce(new Response(null, { status: 429, headers: { 'retry-after': '2' } })).mockResolvedValueOnce(image())
    expect(await checkReferenceUrl(url, { fetch: request, pause: wait, now })).toMatchObject({ ok: true })
    expect(wait).toHaveBeenCalledWith(2000)
    const failed = vi.fn().mockRejectedValue(new TypeError('offline'))
    expect(await checkReferenceUrl(url, { fetch: failed, pause, now })).toMatchObject({ ok: false, reason: 'TypeError' })
    expect(failed).toHaveBeenCalledTimes(3)
  })
  it('reuses only recent positive HTTP image checks', async () => {
    const result = await checkReferenceUrl(url, { fetch: vi.fn().mockResolvedValue(image()), now })
    expect(reusableCheck(result, now().getTime())).toBe(true)
    expect(reusableCheck(result, now().getTime() + 86_400_000)).toBe(false)
    expect(reusableCheck({ ...result, ok: false }, now().getTime())).toBe(false)
    expect(reusableCheck({ ...result, checkedAt: '2027-01-01' }, now().getTime())).toBe(false)
  })
  it('requires explicit distinct artifact paths and a bounded positive limit', () => {
    const args = ['--catalogue', 'v2', '--checkpoint', '/tmp/checks.jsonl', '--output', '/tmp/report.json']
    expect(parseNetworkArgs(args)).toMatchObject({ catalogue: 'v2', limit: Infinity })
    for (const value of ['0', '-1', 'Infinity', 'NaN', '1.5']) expect(() => parseNetworkArgs([...args, '--limit', value])).toThrow()
    expect(() => parseNetworkArgs(['--catalogue', 'v2', '--checkpoint', '/tmp/a', '--output', '/tmp/a'])).toThrow()
  })
  it('keeps failed and expired attempts without treating them as fresh successful evidence', async () => {
    const passed = await checkReferenceUrl(url, { fetch: vi.fn().mockResolvedValue(image()), now })
    const failed: NetworkCheck = { ...passed, ok: false, status: 404, reason: 'http-404' }
    expect(recordedCheck(failed, now().getTime())).toBe(true)
    expect(reusableCheck(failed, now().getTime())).toBe(false)
    expect(recordedCheck(passed, now().getTime() + 86_400_000)).toBe(true)
    expect(recordedCheck({ ...failed, checkedAt: '2099-01-01' }, now().getTime())).toBe(false)
    expect(recordedCheck({ ...failed, reason: null }, now().getTime())).toBe(false)
  })
  it('bounded resumes advance beyond a persistent first failure and rotate retries oldest first', async () => {
    const failed = await checkReferenceUrl(url, { fetch: vi.fn().mockResolvedValue(new Response(null, { status: 404 })), now })
    const a = 'https://upload.wikimedia.org/a.jpg', b = 'https://upload.wikimedia.org/b.jpg'
    const history = new Map<string, NetworkCheck>([[a, { ...failed, url: a }]])
    expect(nextUrlChecks([a, b], history, 1, now().getTime())).toEqual([b])
    history.set(b, { ...failed, url: b, checkedAt: new Date(now().getTime() + 1000).toISOString() })
    expect(nextUrlChecks([a, b], history, 1, now().getTime() + 1000)).toEqual([a])
    history.set(a, { ...failed, url: a, checkedAt: new Date(now().getTime() + 2000).toISOString() })
    expect(nextUrlChecks([a, b], history, 1, now().getTime() + 2000)).toEqual([b])
  })
})
