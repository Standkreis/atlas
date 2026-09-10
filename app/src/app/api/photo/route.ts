import sharp from 'sharp'
import { TRPCError } from '@trpc/server'
import { createContext } from '@/server/trpc'
import { photoUrl, writePhoto, queuePhotoDeletes, retryPendingPhotoDeletes } from '@/server/photos'
import { dailyAllowance, limits, lock } from '@/server/quotas'
import { admitCatalogueWrite, releaseCatalogueWrite } from '@/server/catalogueCutoverGate'

const MAX = 8 * 1024 * 1024
async function boundedForm(req: Request) {
  const reader = req.body?.getReader()
  if (!reader) throw new Error('multipart expected')
  const chunks: Uint8Array[] = []
  let size = 0
  const deadline = AbortSignal.timeout(15000)
  const timedOut = new Promise<never>((_, reject) => deadline.addEventListener('abort', () => reject(new Error('upload timed out')), { once: true }))
  try {
    while (true) {
      const result = await Promise.race([reader.read(), timedOut])
      if (result.done) break
      size += result.value.byteLength
      if (size > MAX + 65536) throw new TRPCError({ code: 'PAYLOAD_TOO_LARGE', message: 'too large' })
      chunks.push(result.value)
    }
    return await new Response(Buffer.concat(chunks), { headers: { 'content-type': req.headers.get('content-type') ?? '' } }).formData()
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock() }
}
export async function POST(req: Request) {
  const headers = new Headers({ 'content-type': 'application/json', 'cache-control': 'no-store' })
  const bad = (message: string, status = 400) => new Response(JSON.stringify({ error: message }), { status, headers })
  let ctx: Awaited<ReturnType<typeof createContext>>
  try { ctx = await createContext({ req }) } catch (error) {
    if (error instanceof TRPCError && error.code === 'UNAUTHORIZED') return bad(error.message, 401)
    if (error instanceof TRPCError && error.code === 'SERVICE_UNAVAILABLE') { headers.set('retry-after', '30'); return bad(error.message, 503) }
    throw error
  }
  // If bootstrap was admitted just before maintenance closed, keep its new identity reachable
  // even when the separate photo admission below is refused.
  for (const cookie of ctx.outCookies) headers.append('set-cookie', cookie)
  let admission: Awaited<ReturnType<typeof admitCatalogueWrite>>
  try { admission = await admitCatalogueWrite(ctx.db, 'photo-upload', { identityId: ctx.identity.id }) } catch (error) {
    if (error instanceof TRPCError && error.code === 'SERVICE_UNAVAILABLE') { headers.set('retry-after', '30'); return bad(error.message, 503) }
    throw error
  }
  try {
  // Reserve requests before reading multipart data; the counter survives malformed uploads and identity resets.
  try {
    await ctx.db.$transaction(async (tx) => { await lock(tx, 'upload-admission'); await dailyAllowance(tx, 'upload', ctx.identity.id, ctx.networkKey) })
  } catch (error) { if (error instanceof TRPCError) return bad(error.message, 429); throw error }
  if (Number(req.headers.get('content-length')) > MAX + 65536) return bad('too large', 413)
  let form: FormData
  try { form = await boundedForm(req) } catch (error) { return bad(error instanceof Error ? error.message : 'multipart expected', error instanceof TRPCError && error.code === 'PAYLOAD_TOO_LARGE' ? 413 : 400) }
  const file = form.get('file')
  if (!(file instanceof File)) return bad('field "file" missing')
  if (file.size > MAX) return bad('too large', 413)
  let bytes: Buffer
  try {
    const source = Buffer.from(await file.arrayBuffer())
    if (source[0] !== 0xff || source[1] !== 0xd8) return bad('JPEG expected')
    bytes = await sharp(source, { limitInputPixels: 40000000 }).rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer()
  } catch { return bad('valid JPEG expected') }
  let assetId: string | undefined
  try {
    const asset = await ctx.db.$transaction(async (tx) => {
      await lock(tx, 'upload-admission')
      await lock(tx, `identity:${ctx.identity.id}`)
      const [all, own, pending] = await Promise.all([
        tx.asset.aggregate({ where: { origin: 'user' }, _sum: { byteSize: true } }),
        tx.asset.aggregate({ where: { origin: 'user', ownerId: ctx.identity.id }, _sum: { byteSize: true } }),
        tx.photoDeletion.count(),
      ])
      if ((all._sum.byteSize ?? 0) + pending * MAX + bytes.length > limits.storageGlobal || (own._sum.byteSize ?? 0) + bytes.length > limits.storageIdentity) throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Photo storage allowance reached.' })
      return tx.asset.create({ data: { kind: 'image', url: '', author: ctx.identity.displayName ?? 'Du', licence: 'eigenes Foto', sourceUrl: '', origin: 'user', ownerId: ctx.identity.id, byteSize: bytes.length }, select: { id: true } })
    })
    assetId = asset.id
    const url = photoUrl(asset.id)
    // Share the identity lock with deletion/adoption, so an upload cannot recreate an object after deletion.
    await ctx.db.$transaction(async (tx) => {
      await lock(tx, `identity:${ctx.identity.id}`)
      const live = await tx.asset.findFirst({ where: { id: asset.id, ownerId: ctx.identity.id } })
      if (!live) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'identity changed' })
      await writePhoto(asset.id, bytes)
      await tx.asset.update({ where: { id: asset.id }, data: { url, sourceUrl: url } })
    }, { timeout: 30000, maxWait: 30000 })
    return new Response(JSON.stringify({ id: asset.id, url }), { status: 201, headers })
  } catch (error) {
    if (assetId) {
      await ctx.db.$transaction(async (tx) => {
        await queuePhotoDeletes(tx, [assetId!])
        await tx.asset.deleteMany({ where: { id: assetId } })
      })
      await retryPendingPhotoDeletes()
    }
    if (error instanceof TRPCError) return bad(error.message, error.code === 'UNAUTHORIZED' ? 401 : 429)
    return bad('Photo storage unavailable. Try again.', 503)
  }
  } finally {
    await releaseCatalogueWrite(ctx.db, admission.id)
  }
}
