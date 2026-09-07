// The tile cap (handoff 0025 A3, findings 0010 B3): a token bucket per client IP on /api/tiles, 600 tiles a minute,
// refilled continuously, the same shape as `server/searchCap.ts`. A phone loads nine tiles per region view; a scraper
// pulling OSM through the app's origin empties the bucket and gets 429 with `retry-after`. In memory on globalThis,
// so best effort on serverless: every warm instance has its own bucket and a cold start forgives. Good enough to
// stop the app's origin from being a free tile proxy; not a quota.
const TILES_PER_MINUTE = 600
type Bucket = { tokens: number; at: number }
const buckets: Map<string, Bucket> = ((globalThis as unknown as { __dexTileBuckets?: Map<string, Bucket> }).__dexTileBuckets ??= new Map())

/** `true` when the tile may be served; `false` when the client is over the cap. `retryAfterSeconds` says when one token is back. */
export function takeTileToken(ip: string, now = Date.now(), perMinute = TILES_PER_MINUTE): { ok: boolean; retryAfterSeconds: number } {
  const b = buckets.get(ip) ?? { tokens: perMinute, at: now }
  b.tokens = Math.min(perMinute, b.tokens + ((now - b.at) / 60_000) * perMinute)
  b.at = now
  if (b.tokens < 1) {
    buckets.set(ip, b)
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(((1 - b.tokens) * 60_000) / perMinute / 1000)) }
  }
  b.tokens -= 1
  buckets.set(ip, b)
  if (buckets.size > 10_000) buckets.clear() // a scraper across many addresses must not grow the map without bound
  return { ok: true, retryAfterSeconds: 0 }
}

/**
 * The client's address: Vercel's `x-real-ip`, else the first hop of `x-forwarded-for` (Caddy, a check script), else one
 * bucket for everyone. Behind no proxy the header is the client's word, which is fine for a best-effort cap.
 */
export const clientIp = (req: Request): string => req.headers.get('x-real-ip')?.trim() || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'

/**
 * Only the app's own pages pull tiles: a fetch the browser marks `sec-fetch-site: cross-site`, or one whose `origin`
 * or `referer` names another host, is refused. Requests without any of these (curl, a navigation typed into the bar,
 * old browsers) pass and are only held by the bucket. `allowedOrigins` are the WEBAUTHN_ORIGIN list; empty means
 * the request's own host is the app (dev, `next start`).
 */
export function fromOwnPages(req: Request, allowedOrigins: string[]): boolean {
  if (req.headers.get('sec-fetch-site')?.toLowerCase() === 'cross-site') return false
  const named = req.headers.get('origin') ?? req.headers.get('referer')
  if (!named) return true
  let host: string
  try { host = new URL(named).host } catch { return false }
  const own = new Set(allowedOrigins.map((o) => { try { return new URL(o).host } catch { return o } }))
  if (!own.size) { try { own.add(new URL(req.url).host) } catch { /* no host to compare with */ } }
  return own.has(host)
}
