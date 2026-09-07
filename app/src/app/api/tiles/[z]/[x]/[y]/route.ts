import { env } from '@/server/env'
import { clientIp, fromOwnPages, takeTileToken } from '../../../tileCap'

// GET /api/tiles/<z>/<x>/<y> (handoff 0010 Track B, findings 0007 B3): the map's nine OSM raster tiles through the app's
// own origin. OSM's tile policy asks for an identifying User-Agent and no bulk; every phone hitting tile.openstreetmap.org
// with the browser's UA was neither. One week of public cache: Caddy's client, the browser and the worker (as an image)
// all keep it; a region's nine tiles at zoom 8 are ~100 KB. Zoom 0–19, integer x y within the zoom's range.
// Handoff 0025 A3 (findings 0010 B3): only the app's pages pull tiles (`fromOwnPages`, a 403 for a cross-site fetch or
// a foreign origin) and each address gets 600 tiles a minute (`takeTileToken`, 429 with `retry-after` beyond it). Both
// are counted before the tile is validated, so a scraper of bad URLs is held too. Best effort on serverless: the bucket
// lives per warm instance, see tileCap.ts.
export const dynamic = 'force-dynamic'

const MAX_ZOOM = 19
const CACHE = 'public, max-age=604800'
const origins = (env.WEBAUTHN_ORIGIN ?? '').split(',').map((s) => s.trim()).filter(Boolean)
const contact = origins[0] || 'https://standkreis.de'
const userAgent = `standkreis-dex/${process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev'} (+${contact})`

const int = (s: string) => (/^\d{1,7}$/.test(s) ? Number(s) : NaN)

export async function GET(req: Request, { params }: { params: Promise<{ z: string; x: string; y: string }> }) {
  if (!fromOwnPages(req, origins)) return new Response('not from the app', { status: 403, headers: { 'cache-control': 'no-store' } })
  const token = takeTileToken(clientIp(req))
  if (!token.ok) return new Response('too many tiles', { status: 429, headers: { 'retry-after': String(token.retryAfterSeconds), 'cache-control': 'no-store' } })
  const p = await params
  const z = int(p.z), x = int(p.x), y = int(p.y)
  const span = 2 ** z
  if (!Number.isInteger(z) || z < 0 || z > MAX_ZOOM || !Number.isInteger(x) || !Number.isInteger(y) || x >= span || y >= span) return new Response('bad tile', { status: 400 })
  try {
    const upstream = await fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`, { headers: { 'user-agent': userAgent, accept: 'image/png,image/*;q=0.8' }, signal: AbortSignal.timeout(10_000) })
    if (!upstream.ok) return new Response(`upstream ${upstream.status}`, { status: 502 })
    const bytes = await upstream.arrayBuffer()
    return new Response(bytes, { headers: { 'content-type': upstream.headers.get('content-type') ?? 'image/png', 'cache-control': CACHE, 'content-length': String(bytes.byteLength) } })
  } catch {
    return new Response('upstream unreachable', { status: 502 })
  }
}
