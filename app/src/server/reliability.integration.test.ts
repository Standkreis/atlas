import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { randomUUID, createHash } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import { db } from './db'
import { identityRouter } from './routers/identity'
import { sightingRouter } from './routers/sighting'
import { journalRouter } from './routers/journal'
import { dataRouter } from './routers/data'
import { createContext, type Context } from './trpc'
import { boundedScan, consume, dailyAllowance, limits, lock, networkKey } from './quotas'
import { contentDigest } from '../../etl/catalogue-gallery-transfer'
import { photoPath, deletePhoto, retryPendingPhotoDeletes } from './photos'
import { POST } from '../app/api/photo/route'

vi.mock('./mail', () => ({ sendCode: vi.fn(async () => undefined) }))
const owned: string[] = []
const taxonIds: string[] = []
const photoIds = new Set<string>()
const originalLimits = { ...limits }
const readPending = db.photoDeletion.findMany.bind(db.photoDeletion)
let quotaBefore: Awaited<ReturnType<typeof db.quotaBucket.findMany>> = []
let pendingBefore: Awaited<ReturnType<typeof readPending>> = []
let sharedKeys: string[] = []
const protectedDeletionId = randomUUID()

beforeAll(async () => {
  // Exercise preservation even on an otherwise empty seeded control database.
  await db.photoDeletion.create({ data: { assetId: protectedDeletionId } })
  // The production retry loop remains real, but this exclusive fixture DB worker must only
  // process its own newly queued objects. Pre-existing deletion work is not ours to execute.
  vi.spyOn(db.photoDeletion, 'findMany').mockImplementation((args) => readPending({
    ...args, where: { AND: [args?.where ?? {}, { assetId: { notIn: pendingBefore.map(({ assetId }) => assetId) } }] },
  }))
})
const codeHash = (s: string) => createHash('sha256').update(s).digest('hex')
async function subject() {
  const identity = await db.identity.create({ data: {} })
  owned.push(identity.id)
  const ctx: Context = { db, identity, networkKey: randomUUID(), minted: false, cookies: {}, outCookies: [], origin: 'http://localhost', locale: 'en', setCookie: () => 0 }
  return { ctx, identity: identityRouter.createCaller(ctx), sighting: sightingRouter.createCaller(ctx), journal: journalRouter.createCaller(ctx), data: dataRouter.createCaller(ctx) }
}
async function photo(ownerId: string) {
  const asset = await db.asset.create({ data: { ownerId, origin: 'user', kind: 'image', url: '', sourceUrl: '', author: '', licence: '', byteSize: 100 } })
  photoIds.add(asset.id)
  return asset
}
let taxonId: string
beforeEach(async () => {
  quotaBefore = await db.quotaBucket.findMany({ orderBy: { key: 'asc' } })
  pendingBefore = await readPending({ orderBy: { assetId: 'asc' } })
  const stamp = new Date().toISOString(), day = stamp.slice(0, 10)
  sharedKeys = [`scan:${day}:global`, `upload:${day}:global`, `upload:${day}:network:${networkKey(new Headers())}`,
    `scan-budget:day:${day}`, `scan-budget:month:${stamp.slice(0, 7)}`, `mail:global:${stamp.slice(0, 13)}`]
  // Neutralize only exact shared counters used by this test and restore their before-images.
  await db.quotaBucket.updateMany({ where: { key: { in: sharedKeys } }, data: { value: 0 } })
  const storage = await db.asset.aggregate({ where: { origin: 'user' }, _sum: { byteSize: true } })
  limits.storageGlobal = originalLimits.storageGlobal + (storage._sum.byteSize ?? 0) + pendingBefore.length * 8 * 1024 * 1024
  limits.scanConcurrency = originalLimits.scanConcurrency + quotaBefore.filter(({ key, expiresAt }) => key.startsWith('scan-active:') && expiresAt > new Date()).length
  const taxon = await db.taxon.create({ data: { gbifKey: -Math.floor(Math.random() * 1000000000), sciName: `Test ${randomUUID()}`, rank: 'SPECIES', tile: 'bird' } })
  taxonId = taxon.id; taxonIds.push(taxon.id)
})
afterEach(async () => {
  const assets = await db.asset.findMany({ where: { ownerId: { in: owned } }, select: { id: true } })
  assets.forEach(({ id }) => photoIds.add(id))
  const previousPendingIds = new Set(pendingBefore.map(({ assetId }) => assetId))
  const newPending = (await readPending()).filter(({ assetId }) => !previousPendingIds.has(assetId))
  newPending.forEach(({ assetId }) => photoIds.add(assetId))
  await db.identity.deleteMany({ where: { id: { in: owned } } })
  await db.taxon.deleteMany({ where: { id: { in: taxonIds } } })
  await db.photoDeletion.deleteMany({ where: { assetId: { in: [...photoIds] } } })
  for (const id of photoIds) await rm(photoPath(id), { recursive: true, force: true })
  const previousKeys = new Set(quotaBefore.map(({ key }) => key))
  const createdKeys = (await db.quotaBucket.findMany({ select: { key: true } })).map(({ key }) => key).filter((key) => !previousKeys.has(key))
  await db.quotaBucket.deleteMany({ where: { key: { in: createdKeys } } })
  for (const row of quotaBefore.filter(({ key }) => sharedKeys.includes(key))) {
    await db.quotaBucket.update({ where: { key: row.key }, data: { value: row.value, expiresAt: row.expiresAt } })
  }
  expect(contentDigest(await db.quotaBucket.findMany({ orderBy: { key: 'asc' } }))).toBe(contentDigest(quotaBefore))
  expect(contentDigest(await readPending({ orderBy: { assetId: 'asc' } }))).toBe(contentDigest(pendingBefore))
  Object.assign(limits, originalLimits)
  owned.length = 0; taxonIds.length = 0; photoIds.clear()
})
afterAll(async () => {
  vi.mocked(db.photoDeletion.findMany).mockRestore()
  await db.photoDeletion.deleteMany({ where: { assetId: protectedDeletionId } })
  await db.$disconnect()
})

describe('PostgreSQL identity and sighting concurrency', () => {
  it('returns one owned sighting for simultaneous retries and never rebinds its photo', async () => {
    const caller = await subject(), asset = await photo(caller.ctx.identity.id), id = randomUUID()
    const input = { id, taxonId, at: new Date(), wildness: 'wild' as const, photoId: asset.id }
    const replies = await Promise.all(Array.from({ length: 8 }, () => caller.sighting.create(input)))
    expect(new Set(replies.map((r) => r.id))).toEqual(new Set([id]))
    expect(await db.sighting.count({ where: { identityId: caller.ctx.identity.id } })).toBe(1)
    expect((await db.asset.findUniqueOrThrow({ where: { id: asset.id } })).sightingId).toBe(id)
    const other = await subject()
    await expect(other.sighting.create(input)).rejects.toMatchObject({ code: 'CONFLICT' })
  })
  it('lets only one concurrent sighting claim an unattached photo', async () => {
    const caller = await subject(), asset = await photo(caller.ctx.identity.id)
    const replies = await Promise.allSettled(Array.from({ length: 2 }, () => caller.sighting.create({ id: randomUUID(), taxonId, at: new Date(), wildness: 'wild', photoId: asset.id })))
    expect(replies.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(await db.sighting.count({ where: { identityId: caller.ctx.identity.id } })).toBe(1)
  })
  it('commits at most five wrong attempts and consumes a valid code only once', async () => {
    const caller = await subject()
    const code = await db.emailCode.create({ data: { identityId: caller.ctx.identity.id, email: `${randomUUID()}@example.invalid`, codeHash: codeHash('123456'), expiresAt: new Date(Date.now() + 60000), locale: 'en' } })
    const wrong = await Promise.allSettled(Array.from({ length: 12 }, () => caller.identity.emailVerify({ code: '000000' })))
    expect(wrong.every((r) => r.status === 'rejected')).toBe(true)
    expect((await db.emailCode.findUniqueOrThrow({ where: { id: code.id } })).attempts).toBe(5)
    await db.emailCode.update({ where: { id: code.id }, data: { attempts: 0 } })
    const right = await Promise.allSettled(Array.from({ length: 8 }, () => caller.identity.emailVerify({ code: '123456' })))
    expect(right.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect((await db.emailCode.findUniqueOrThrow({ where: { id: code.id } })).attempts).toBe(1)
  })
  it('adopts the source avatar, passkeys and duplicate sighting photos atomically', async () => {
    const from = await subject(), into = await subject(), email = `${randomUUID()}@example.invalid`
    await db.identity.update({ where: { id: into.ctx.identity.id }, data: { email, emailVerifiedAt: new Date() } })
    const avatar = await photo(from.ctx.identity.id), picture = await photo(from.ctx.identity.id)
    await db.identity.update({ where: { id: from.ctx.identity.id }, data: { avatarAssetId: avatar.id } })
    const at = new Date()
    const retained = await db.sighting.create({ data: { identityId: into.ctx.identity.id, taxonId, at } })
    await db.sighting.create({ data: { identityId: from.ctx.identity.id, taxonId, at, photos: { connect: { id: picture.id } } } })
    const passkey = await db.passkey.create({ data: { identityId: from.ctx.identity.id, credentialId: randomUUID(), publicKey: Buffer.from('test') } })
    await db.emailCode.create({ data: { identityId: from.ctx.identity.id, email, codeHash: codeHash('123456'), expiresAt: new Date(Date.now() + 60000), locale: 'en' } })
    expect((await from.identity.emailVerify({ code: '123456' })).adopted).toBe(true)
    expect((await db.identity.findUniqueOrThrow({ where: { id: into.ctx.identity.id } })).avatarAssetId).toBe(avatar.id)
    expect((await db.asset.findUniqueOrThrow({ where: { id: picture.id } })).sightingId).toBe(retained.id)
    expect((await db.sighting.findUniqueOrThrow({ where: { id: retained.id } })).evidence).toBe('photographed')
    expect((await db.passkey.findUniqueOrThrow({ where: { id: passkey.id } })).identityId).toBe(into.ctx.identity.id)
  })
  it('rolls code consumption back when adoption is refused', async () => {
    const from = await subject(), into = await subject(), email = `${randomUUID()}@example.invalid`
    await db.identity.update({ where: { id: from.ctx.identity.id }, data: { email: `${randomUUID()}@example.invalid`, emailVerifiedAt: new Date() } })
    await db.identity.update({ where: { id: into.ctx.identity.id }, data: { email, emailVerifiedAt: new Date() } })
    const code = await db.emailCode.create({ data: { identityId: from.ctx.identity.id, email, codeHash: codeHash('123456'), expiresAt: new Date(Date.now() + 60000), locale: 'en' } })
    await expect(from.identity.emailVerify({ code: '123456' })).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' })
    expect((await db.emailCode.findUniqueOrThrow({ where: { id: code.id } })).usedAt).toBeNull()
  })
  it('serializes email sends for the same address across anonymous identities', async () => {
    const email = `${randomUUID()}@example.invalid`
    const callers = await Promise.all(Array.from({ length: 8 }, () => subject()))
    const replies = await Promise.allSettled(callers.map((caller) => caller.identity.emailStart({ email })))
    expect(replies.filter((r) => r.status === 'fulfilled')).toHaveLength(3)
    expect(await db.emailCode.count({ where: { email } })).toBe(3)
  })
  it('rejects an outbox owner mismatch before minting or mutating', async () => {
    const caller = await subject()
    await expect(createContext({ req: new Request('http://localhost/api/photo', { headers: { cookie: `dex_id=${caller.ctx.identity.id}`, 'x-dex-identity': randomUUID() } }) })).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
})

describe('durable expensive-operation admission and deletion', () => {
  it('atomically stops concurrent quota reservations at the budget', async () => {
    const key = `test:${randomUUID()}`
    const results = await Promise.allSettled(Array.from({ length: 12 }, () => db.$transaction((tx) => consume(tx, key, 2, 10, new Date(Date.now() + 60000)))))
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(5)
    expect((await db.quotaBucket.findUniqueOrThrow({ where: { key } })).value).toBe(10)
    await db.quotaBucket.delete({ where: { key } })
  })
  it('coalesces concurrent scans and reuses the successful same-photo/version result', async () => {
    const caller = await subject(), asset = await photo(caller.ctx.identity.id)
    let unblock!: () => void
    const hold = new Promise<void>((resolve) => { unblock = resolve })
    const run = vi.fn(async () => { await hold; return { answer: 'bird' } })
    const args = { photoId: asset.id, version: 'test-v1', identity: caller.ctx.identity.id, network: caller.ctx.networkKey, reserveCents: 1, run }
    const first = boundedScan(args)
    try {
      await vi.waitFor(() => expect(run).toHaveBeenCalledTimes(1))
      await expect(boundedScan(args)).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' })
      unblock(); await first
      expect(await boundedScan(args)).toEqual({ answer: 'bird' })
      expect(run).toHaveBeenCalledTimes(1)
    } finally { unblock(); await first.catch(() => undefined) }
  })
  it('blocks scans before provider invocation when their reserve exceeds the global spending cutoff', async () => {
    const caller = await subject(), asset = await photo(caller.ctx.identity.id), run = vi.fn(async () => ({ answer: 'bird' }))
    await expect(boundedScan({ photoId: asset.id, version: 'budget', identity: caller.ctx.identity.id, network: caller.ctx.networkKey, reserveCents: 1001, run })).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' })
    expect(run).not.toHaveBeenCalled()
    expect(await db.scanWork.count({ where: { photoId: asset.id } })).toBe(0)
  })
  it('does not refund the spending reservation when a provider attempt fails', async () => {
    const caller = await subject(), asset = await photo(caller.ctx.identity.id)
    await expect(boundedScan({ photoId: asset.id, version: 'failed', identity: caller.ctx.identity.id, network: caller.ctx.networkKey, reserveCents: 7, run: async () => { throw new Error('provider timeout') } })).rejects.toThrow('provider timeout')
    const key = `scan-budget:day:${new Date().toISOString().slice(0, 10)}`
    expect((await db.quotaBucket.findUniqueOrThrow({ where: { key } })).value).toBe(7)
  })
  it('keeps the network upload cap when clients mint fresh identities', async () => {
    const network = randomUUID()
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => db.$transaction(async (tx) => {
      await lock(tx, 'upload-admission')
      await dailyAllowance(tx, 'upload', randomUUID(), network)
    })))
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(5)
  })
  it('limits global scan concurrency across independent anonymous identities', async () => {
    const callers = await Promise.all(Array.from({ length: 5 }, () => subject()))
    const assets = await Promise.all(callers.map((caller) => photo(caller.ctx.identity.id)))
    let unblock!: () => void
    const hold = new Promise<void>((resolve) => { unblock = resolve })
    const run = vi.fn(async () => { await hold; return { answer: 'bird' } })
    const replies = Promise.allSettled(callers.map((caller, i) => boundedScan({ photoId: assets[i].id, version: 'concurrent', identity: caller.ctx.identity.id, network: caller.ctx.networkKey, reserveCents: 1, run })))
    try {
      await vi.waitFor(() => expect(run).toHaveBeenCalledTimes(4))
      await db.asset.deleteMany({ where: { id: { in: assets.map((a) => a.id) } } })
      const extra = await subject(), extraPhoto = await photo(extra.ctx.identity.id)
      await expect(boundedScan({ photoId: extraPhoto.id, version: 'after-delete', identity: extra.ctx.identity.id, network: extra.ctx.networkKey, reserveCents: 1, run })).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' })
      unblock()
      expect((await replies).filter((r) => r.status === 'fulfilled')).toHaveLength(4)
    } finally { unblock(); await replies }
  })
  it('rejects the monthly spending ceiling independently of the daily allowance', async () => {
    const caller = await subject(), asset = await photo(caller.ctx.identity.id), key = `scan-budget:month:${new Date().toISOString().slice(0, 7)}`
    await db.quotaBucket.upsert({ where: { key }, create: { key, value: 30000, expiresAt: new Date(Date.now() + 86400000) }, update: { value: 30000 } })
    const run = vi.fn(async () => ({ answer: 'bird' }))
    await expect(boundedScan({ photoId: asset.id, version: 'month', identity: caller.ctx.identity.id, network: caller.ctx.networkKey, reserveCents: 1, run })).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' })
    expect(run).not.toHaveBeenCalled()
  })
  it('counts other identities against the global photo-storage ceiling', async () => {
    const owner = await subject(), caller = await subject(), asset = await photo(owner.ctx.identity.id)
    await db.asset.update({ where: { id: asset.id }, data: { byteSize: 1048576 } })
    const jpeg = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#00aa44' } }).jpeg().toBuffer()
    const form = new FormData(); form.set('file', new File([new Uint8Array(jpeg)], 'photo.jpg'))
    try {
      const response = await POST(new Request('http://localhost/api/photo', { method: 'POST', headers: { cookie: `dex_id=${caller.ctx.identity.id}` }, body: form }))
      expect(response.status).toBe(429)
      expect(await response.json()).toEqual({ error: 'Photo storage allowance reached.' })
      expect(await db.asset.count({ where: { ownerId: caller.ctx.identity.id } })).toBe(0)
    } finally { await db.asset.delete({ where: { id: asset.id } }) }
  })
  it('caps the actual multipart body even without a content-length header', async () => {
    const caller = await subject(), form = new FormData()
    form.set('file', new File([new Uint8Array(9 * 1024 * 1024)], 'too-large.jpg'))
    const req = new Request('http://localhost/api/photo', { method: 'POST', headers: { cookie: `dex_id=${caller.ctx.identity.id}` }, body: form })
    expect(req.headers.has('content-length')).toBe(false)
    expect((await POST(req)).status).toBe(413)
  })
  it('keeps retryable object deletion after its asset row is removed', async () => {
    const caller = await subject(), asset = await photo(caller.ctx.identity.id), path = photoPath(asset.id)
    await mkdir(path, { recursive: true }) // unlink(directory) fails; simulates unavailable storage
    await deletePhoto(asset.id)
    expect(await db.asset.findUnique({ where: { id: asset.id } })).toBeNull()
    expect(await db.photoDeletion.findUnique({ where: { assetId: asset.id } })).not.toBeNull()
    await rm(path, { recursive: true })
    await writeFile(path, Buffer.from('photo'))
    await retryPendingPhotoDeletes(100)
    expect(await db.photoDeletion.findUnique({ where: { assetId: asset.id } })).toBeNull()
  })
  it('normalizes uploads and caps cumulative attempts per identity', async () => {
    const caller = await subject()
    const jpeg = await sharp({ create: { width: 2000, height: 1000, channels: 3, background: '#00aa44' } }).jpeg().toBuffer()
    const upload = () => { const form = new FormData(); form.set('file', new File([new Uint8Array(jpeg)], 'photo.jpg', { type: 'image/jpeg' })); return POST(new Request('http://localhost/api/photo', { method: 'POST', headers: { cookie: `dex_id=${caller.ctx.identity.id}` }, body: form })) }
    const response = await upload()
    expect(response.status).toBe(201)
    const payload = await response.json() as { id: string }
    const metadata = await sharp(photoPath(payload.id)).metadata()
    expect(metadata.width).toBe(1600); expect(metadata.exif).toBeUndefined()
    expect((await upload()).status).toBe(201)
    expect((await upload()).status).toBe(201)
    const rejected = await upload()
    expect(rejected.status).toBe(429)
    expect(await rejected.json()).toEqual({ error: 'Application allowance reached. Try again later.' })
    const assets = await db.asset.findMany({ where: { ownerId: caller.ctx.identity.id } })
    for (const asset of assets) await deletePhoto(asset.id)
  })
})

it('paginates more than 600 sightings at the exact same timestamp without omissions', async () => {
  const caller = await subject(), at = new Date('2026-09-01T12:00:00Z')
  await db.sighting.createMany({ data: Array.from({ length: 650 }, () => ({ identityId: caller.ctx.identity.id, taxonId, at })) })
  const first = await caller.journal.days({ kind: 'all', tz: 'UTC' })
  expect(first.days.flatMap((d) => d.rows)).toHaveLength(600)
  expect(first.nextBefore).not.toBeNull()
  const second = await caller.journal.days({ kind: 'all', tz: 'UTC', cursor: first.nextBefore })
  const rows = [...first.days, ...second.days].flatMap((d) => d.rows)
  expect(rows).toHaveLength(650)
  expect(new Set(rows.map((r) => r.id)).size).toBe(650)
  expect(second.nextBefore).toBeNull()
})
