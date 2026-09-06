import { db } from '@/server/db'
import { readPhoto, readSound } from '@/server/photos'

// GET /api/photo/<assetId>: the bytes behind a user photo. The id is a v4 uuid nobody can guess, so the URL is the
// capability (the export lists these URLs and they must keep working from the file). The store is private: this route
// STREAMS the object (never a redirect, there is no public URL) and the worker caches the answer under this URL, so a
// photo seen once online stays on the phone. Costs one Blob read per first view per device (handoff 0011 Track A).
//
// GET /api/photo/<assetId>.mp3 (handoff 0021 D5): the xeno-canto clip of a `kind: 'sound'` Asset, stored under the
// taxon's GBIF key. Served whole with `Accept-Ranges` and a 206 for a Range request, which iOS Safari sends before it
// plays anything. The `.mp3` suffix keeps the worker's image cache away from it (D8: sounds are not in the pack).
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params
  const sound = raw.endsWith('.mp3')
  const id = sound ? raw.slice(0, -4) : raw
  if (!uuid.test(id)) return new Response('not found', { status: 404 })
  if (sound) return serveSound(req, id)
  const asset = await db.asset.findFirst({ where: { id, origin: 'user' }, select: { id: true } })
  if (!asset) return new Response('not found', { status: 404 })
  const photo = await readPhoto(asset.id)
  if (!photo) return new Response('not found', { status: 404 })
  const headers = new Headers({ 'content-type': 'image/jpeg', 'cache-control': 'private, max-age=31536000, immutable' })
  if (photo.size !== undefined) headers.set('content-length', String(photo.size))
  return new Response(photo.body, { headers })
}

async function serveSound(req: Request, id: string) {
  const asset = await db.asset.findFirst({ where: { id, kind: 'sound' }, select: { taxon: { select: { gbifKey: true } } } })
  if (!asset?.taxon) return new Response('not found', { status: 404 })
  const bytes = await readSound(asset.taxon.gbifKey)
  if (!bytes) return new Response('not found', { status: 404 })
  const headers = new Headers({ 'content-type': 'audio/mpeg', 'accept-ranges': 'bytes', 'cache-control': 'private, max-age=31536000, immutable' })
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
