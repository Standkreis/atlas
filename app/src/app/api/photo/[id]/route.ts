import { db } from '@/server/db'
import { readPhoto, readSound } from '@/server/photos'
import { IDENTITY_COOKIE } from '@/server/trpc'

// GET /api/photo/<assetId>: the bytes behind a user photo. The id is a v4 uuid nobody can guess, and since handoff 0025
// (A1, findings 0008 A6) the URL alone is not enough: the photo answers only to the identity that owns the Asset (the
// `dex_id` cookie, the same cookie tRPC's context resolves). Anyone else, and a request without the cookie, gets the same
// 404 as a missing photo: never a 403, so the id does not leak whether the photo exists. The export lists these URLs for
// the owner, who has the cookie; the worker caches the answer under this URL, so a photo seen once online stays on the
// phone. The store is private: this route STREAMS the object (never a redirect, there is no public URL). Costs one Blob
// read per first view per device (handoff 0011 Track A). No identity is minted here: an unknown cookie is a 404.
//
// GET /api/photo/<assetId>.mp3 (handoff 0021 D5): the xeno-canto clip of a `kind: 'sound'` Asset, stored under the
// taxon's GBIF key. Public: CC content keyed by the GBIF key, nothing private, so no cookie and a `public` cache (0025 A2,
// findings 0011 A4: the CDN and the browser keep it, the cross-region Blob read happens once per edge). Served whole with
// `Accept-Ranges` and a 206 for a Range request, which iOS Safari sends before it plays anything. The `.mp3` suffix
// keeps the worker's image cache away from it (D8: sounds are not in the pack).
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PHOTO_CACHE = 'private, max-age=31536000, immutable'
const SOUND_CACHE = 'public, max-age=31536000, immutable'

/** The `dex_id` cookie as tRPC reads it, or null: no cookie, or not a uuid. */
const identityCookie = (req: Request): string | null => {
  const m = (req.headers.get('cookie') ?? '').match(new RegExp(`(?:^|;\\s*)${IDENTITY_COOKIE}=([^;]*)`))
  const v = m?.[1]?.trim()
  return v && uuid.test(v) ? v : null
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params
  const sound = raw.endsWith('.mp3')
  const id = sound ? raw.slice(0, -4) : raw
  if (!uuid.test(id)) return new Response('not found', { status: 404 })
  if (sound) return serveSound(req, id)
  const owner = identityCookie(req)
  if (!owner) return new Response('not found', { status: 404 })
  const asset = await db.asset.findFirst({ where: { id, origin: 'user', ownerId: owner }, select: { id: true } })
  if (!asset) return new Response('not found', { status: 404 })
  const photo = await readPhoto(asset.id)
  if (!photo) return new Response('not found', { status: 404 })
  const headers = new Headers({ 'content-type': 'image/jpeg', 'cache-control': PHOTO_CACHE, vary: 'cookie' })
  if (photo.size !== undefined) headers.set('content-length', String(photo.size))
  return new Response(photo.body, { headers })
}

async function serveSound(req: Request, id: string) {
  const asset = await db.asset.findFirst({ where: { id, kind: 'sound' }, select: { taxon: { select: { gbifKey: true } } } })
  if (!asset?.taxon) return new Response('not found', { status: 404 })
  const bytes = await readSound(asset.taxon.gbifKey)
  if (!bytes) return new Response('not found', { status: 404 })
  const headers = new Headers({ 'content-type': 'audio/mpeg', 'accept-ranges': 'bytes', 'cache-control': SOUND_CACHE })
  const range = req.headers.get('range')?.match(/^bytes=(\d*)-(\d*)$/)
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, bytes.length - Number(range[2]))
    const end = range[1] && range[2] ? Math.min(Number(range[2]), bytes.length - 1) : bytes.length - 1
    if (start > end || start >= bytes.length) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${bytes.length}` } })
    headers.set('content-range', `bytes ${start}-${end}/${bytes.length}`)
    headers.set('content-length', String(end - start + 1))
    return new Response(bytes.slice(start, end + 1), { status: 206, headers })
  }
  headers.set('content-length', String(bytes.length))
  return new Response(bytes, { headers })
}
