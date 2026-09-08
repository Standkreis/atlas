import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { del, get, head, put } from '@vercel/blob'
import { db } from './db'
import { env } from './env'
import type { Prisma } from '../generated/prisma/client'
import { lock } from './quotas'

// User photos (handoff 0008 Track A, 0011 Track A). Two stores behind one seam, picked once at start:
//   BLOB_READ_WRITE_TOKEN set → Vercel Blob, private store, `photos/<assetId>.jpg` (Vercel: /tmp does not survive a request)
//   otherwise                → disk under PHOTO_DIR, `<assetId>.jpg` (dev, tests, the VM)
// The object's name IS the Asset id, so a row and its file always find each other and nothing new is stored in the DB.
// The URL a photo carries never changes (`/api/photo/<id>`): the outbox uploads to it, the worker caches it.
// Sounds (handoff 0021 D5) go through the same seam under `sounds/<gbifKey>.mp3`: keyed by the GBIF key, not the
// Asset id, so the set tables can be dumped from the dev DB to Neon while the clips stay in the one shared Blob store.
const BLOB_TOKEN = env.BLOB_READ_WRITE_TOKEN
export const photoStore: 'blob' | 'disk' = BLOB_TOKEN ? 'blob' : 'disk'
export const PHOTO_DIR = env.PHOTO_DIR ?? join(process.cwd(), 'data', 'photos')
export const photoPath = (assetId: string) => join(PHOTO_DIR, `${assetId}.jpg`)
export const blobPath = (assetId: string) => `photos/${assetId}.jpg`
/** The URL a photo Asset carries: same-origin, served by GET /api/photo/<id>. The static export prefixes NEXT_PUBLIC_API_URL on the client. */
export const photoUrl = (assetId: string) => `/api/photo/${assetId}`

export const soundBlobPath = (gbifKey: number) => `sounds/${gbifKey}.mp3`
export const soundPath = (gbifKey: number) => join(PHOTO_DIR, 'sounds', `${gbifKey}.mp3`)
/** The URL a sound Asset carries: the photo route with `.mp3`, so the worker can tell it from an image and leave it out of its cache (0021 D8). */
export const soundUrl = (assetId: string) => `/api/photo/${assetId}.mp3`

export async function writePhoto(assetId: string, bytes: Uint8Array, signal = AbortSignal.timeout(15000)) {
  if (BLOB_TOKEN) {
    await put(blobPath(assetId), Buffer.from(bytes), { access: 'private', addRandomSuffix: false, contentType: 'image/jpeg', token: BLOB_TOKEN, abortSignal: signal })
    return
  }
  await mkdir(PHOTO_DIR, { recursive: true })
  await writeFile(photoPath(assetId), bytes, { signal })
}

/** The bytes behind GET /api/photo/<id>: a stream from the private blob, or the file. `null` when the store has nothing. */
export async function readPhoto(assetId: string): Promise<{ body: ReadableStream<Uint8Array> | Uint8Array<ArrayBuffer>; size?: number } | null> {
  if (BLOB_TOKEN) {
    const r = await get(blobPath(assetId), { access: 'private', token: BLOB_TOKEN }).catch(() => null)
    if (!r || r.statusCode !== 200) return null
    return { body: r.stream, size: r.blob.size }
  }
  try {
    const bytes = new Uint8Array(await readFile(photoPath(assetId))) // a copy into its own ArrayBuffer: what Response accepts
    return { body: bytes, size: bytes.length }
  } catch {
    return null
  }
}

/** A clip, once per GBIF key. `exists` lets the ETL skip the upload when the object is already there. */
export async function writeSound(gbifKey: number, bytes: Uint8Array) {
  if (BLOB_TOKEN) {
    await put(soundBlobPath(gbifKey), Buffer.from(bytes), { access: 'private', addRandomSuffix: false, contentType: 'audio/mpeg', token: BLOB_TOKEN })
    return
  }
  await mkdir(join(PHOTO_DIR, 'sounds'), { recursive: true })
  await writeFile(soundPath(gbifKey), bytes)
}
export async function soundExists(gbifKey: number): Promise<boolean> {
  if (BLOB_TOKEN) return !!(await head(soundBlobPath(gbifKey), { token: BLOB_TOKEN }).catch(() => null))
  return stat(soundPath(gbifKey)).then(() => true, () => false)
}
/** The whole clip as bytes (≤ 1 MB): the route answers Range requests itself, which iOS Safari needs before it plays. */
export async function readSound(gbifKey: number): Promise<Uint8Array<ArrayBuffer> | null> {
  if (BLOB_TOKEN) {
    const r = await get(soundBlobPath(gbifKey), { access: 'private', token: BLOB_TOKEN }).catch(() => null)
    if (!r || r.statusCode !== 200) return null
    return new Uint8Array(await new Response(r.stream).arrayBuffer())
  }
  try {
    return new Uint8Array(await readFile(soundPath(gbifKey)))
  } catch {
    return null
  }
}

/** Missing disk files and Blob's idempotent deletion are success; other errors retain retry work. */
export async function removePhotoObject(assetId: string, signal = AbortSignal.timeout(5000)) {
  if (BLOB_TOKEN) return del(blobPath(assetId), { token: BLOB_TOKEN, abortSignal: signal })
  try { await unlink(photoPath(assetId)) } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
}
export async function queuePhotoDeletes(tx: Prisma.TransactionClient, assetIds: string[]) {
  if (assetIds.length) await tx.photoDeletion.createMany({ data: assetIds.map((assetId) => ({ assetId })), skipDuplicates: true })
}
/** Durable tombstones have no FK and survive cascades. Each successful object deletion removes its own work item. */
export async function retryPendingPhotoDeletes(limit = 10, deadlineAt = Date.now() + 15000) {
  const pending = await db.photoDeletion.findMany({ take: limit, orderBy: { createdAt: 'asc' } })
  let removed = 0
  for (const row of pending) {
    if (Date.now() >= deadlineAt) break
    try {
      await removePhotoObject(row.assetId, AbortSignal.timeout(Math.max(1, Math.min(5000, deadlineAt - Date.now()))))
      await db.photoDeletion.deleteMany({ where: { assetId: row.assetId } })
      removed++
    } catch {
      // Rotate a failing object behind older pending work so an outage for one object cannot starve the queue.
      await db.photoDeletion.updateMany({ where: { assetId: row.assetId }, data: { createdAt: new Date() } })
    }
  }
  return { removed, pending: await db.photoDeletion.count() }
}

/** Legacy helper: queue before the caller cascades rows. Prefer queuePhotoDeletes in the deletion transaction. */
export async function deletePhotoFiles(sightingIds: string[]) {
  const assets = await db.asset.findMany({ where: { origin: 'user', sightingId: { in: sightingIds } }, select: { id: true } })
  await db.$transaction((tx) => queuePhotoDeletes(tx, assets.map((a) => a.id)))
  await retryPendingPhotoDeletes()
  return assets.length
}
export async function deletePhotoFilesOfIdentity(identityId: string) {
  const assets = await db.asset.findMany({ where: { origin: 'user', ownerId: identityId }, select: { id: true } })
  await db.$transaction((tx) => queuePhotoDeletes(tx, assets.map((a) => a.id)))
  await retryPendingPhotoDeletes()
  return assets.length
}
export async function deleteAbandonedPhotos(olderThanMs = 24 * 3600000) {
  const assets = await db.asset.findMany({ where: { origin: 'user', sightingId: null, avatarOf: null, createdAt: { lt: new Date(Date.now() - olderThanMs) } }, select: { id: true, ownerId: true }, take: 100 })
  let removed = 0
  for (const asset of assets) {
    removed += await db.$transaction(async (tx) => {
      await lock(tx, `identity:${asset.ownerId}`)
      const eligible = await tx.asset.findFirst({ where: { id: asset.id, sightingId: null, avatarOf: null } })
      if (!eligible) return 0
      await queuePhotoDeletes(tx, [asset.id])
      await tx.asset.delete({ where: { id: asset.id } })
      return 1
    })
  }
  await retryPendingPhotoDeletes()
  return removed
}
export async function deletePhoto(assetId: string) {
  const owner = await db.asset.findUnique({ where: { id: assetId }, select: { ownerId: true } })
  if (!owner) return
  await db.$transaction(async (tx) => {
    await lock(tx, `identity:${owner.ownerId}`)
    const asset = await tx.asset.findUnique({ where: { id: assetId } })
    if (!asset) return
    await queuePhotoDeletes(tx, [asset.id])
    await tx.asset.delete({ where: { id: asset.id } })
    if (asset.sightingId && !await tx.asset.count({ where: { sightingId: asset.sightingId, kind: 'image' } })) {
      await tx.sighting.updateMany({ where: { id: asset.sightingId }, data: { evidence: 'claimed' } })
    }
  })
  await retryPendingPhotoDeletes(3, Date.now() + 3000)
}
