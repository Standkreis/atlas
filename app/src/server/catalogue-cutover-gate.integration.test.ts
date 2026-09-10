import { randomUUID } from 'node:crypto'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { db } from './db'
import { admitCatalogueWrite, catalogueWriteDrain, closeCatalogueGate, openCatalogueGate, readCatalogueCutoverState, releaseCatalogueWrite, requireDrainedCatalogueMaintenance, withCatalogueWriteAdmission } from './catalogueCutoverGate'
import { identityRouter } from './routers/identity'
import { sightingRouter } from './routers/sighting'
import { studyRouter } from './routers/study'
import { dataRouter } from './routers/data'
import { sweep } from './sweep'
import { POST } from '../app/api/photo/route'
import { createContext, type Context } from './trpc'

const identityId = randomUUID()
const taxonId = randomUUID()
const operationId = `issue-62-${randomUUID()}`
let ctx: Context

beforeAll(async () => {
  await db.identity.create({ data: { id: identityId } })
  await db.taxon.create({ data: { id: taxonId, gbifKey: -Math.floor(Math.random() * 1_000_000_000), sciName: 'Gateus testus', rank: 'species', tile: 'bird' } })
  const identity = await db.identity.findUniqueOrThrow({ where: { id: identityId } })
  ctx = { db, identity, networkKey: randomUUID(), minted: false, cookies: {}, outCookies: [], origin: 'http://localhost', locale: 'en', setCookie: () => 0 }
})

afterEach(async () => {
  await db.catalogueWriteAdmission.deleteMany({ where: { countryCode: 'DE' } })
  const gate = await db.catalogueCutoverGate.findUnique({ where: { countryCode: 'DE' } })
  if (gate?.state === 'maintenance' && gate.operationId) await db.$transaction((tx) => openCatalogueGate(tx, { operationId: gate.operationId! }))
})

afterAll(async () => {
  await db.study.deleteMany({ where: { identityId } })
  await db.sighting.deleteMany({ where: { identityId } })
  await db.identity.deleteMany({ where: { id: identityId } })
  await db.taxon.deleteMany({ where: { id: taxonId } })
  await db.$disconnect()
})

describe('distributed catalogue cutover gate', () => {
  it('records already-admitted external work and rejects new work after maintenance closes', async () => {
    let finish!: () => void
    const held = withCatalogueWriteAdmission(db, 'test-external-identify', { identityId }, async () => {
      await new Promise<void>((resolve) => { finish = resolve })
      await db.study.upsert({ where: { identityId_taxonId: { identityId, taxonId } }, create: { identityId, taxonId }, update: {} })
    })
    await expect.poll(async () => (await catalogueWriteDrain(db)).count).toBe(1)
    await db.$transaction((tx) => closeCatalogueGate(tx, { operationId, targetCatalogueId: 'catalogue-v2' }))
    await expect(admitCatalogueWrite(db, 'late-write')).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' })
    expect(await readCatalogueCutoverState(db)).toMatchObject({ state: 'maintenance', activeWrites: 1, operationId })
    finish()
    await held
    expect((await catalogueWriteDrain(db)).count).toBe(0)
    await db.$transaction((tx) => openCatalogueGate(tx, { operationId }))
  })

  it('keeps reads available but makes personal/API/background writes retryable without side effects', async () => {
    const studiesBefore = await db.study.count({ where: { identityId } })
    const identitiesBefore = await db.identity.count()
    await db.$transaction((tx) => closeCatalogueGate(tx, { operationId, targetCatalogueId: 'catalogue-v2' }))
    const identity = identityRouter.createCaller(ctx)
    const sighting = sightingRouter.createCaller(ctx)
    const study = studyRouter.createCaller(ctx)
    const data = dataRouter.createCaller(ctx)
    expect((await identity.me()).id).toBe(identityId)
    await expect(identity.setName({ displayName: 'blocked' })).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' })
    await expect(study.mark({ taxonId })).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' })
    await expect(sighting.create({ id: randomUUID(), taxonId, at: new Date(), wildness: 'wild' })).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' })
    await expect(sighting.removePhoto({ photoId: randomUUID() })).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' })
    await expect(data.delete(null)).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' })
    await expect(createContext({ req: new Request('http://localhost/api/trpc/identity.me') })).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' })
    await expect(sweep(() => {})).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' })
    const response = await POST(new Request('http://localhost/api/photo', { method: 'POST', headers: { cookie: `dex_id=${identityId}` } }))
    expect(response.status).toBe(503)
    expect(response.headers.get('retry-after')).toBe('30')
    expect(await db.study.count({ where: { identityId } })).toBe(studiesBefore)
    expect(await db.identity.count()).toBe(identitiesBefore)
    expect(await db.sighting.count({ where: { identityId } })).toBe(0)
    expect((await db.identity.findUniqueOrThrow({ where: { id: identityId } })).displayName).toBeNull()
    await db.$transaction((tx) => openCatalogueGate(tx, { operationId }))
  })

  it('refuses to reopen while any durable admission remains', async () => {
    const admission = await admitCatalogueWrite(db, 'unfinished-cleanup', { identityId })
    await db.$transaction((tx) => closeCatalogueGate(tx, { operationId, targetCatalogueId: 'catalogue-v2' }))
    await expect(db.$transaction((tx) => openCatalogueGate(tx, { operationId }))).rejects.toThrow('admitted write')
    await expect(db.$transaction((tx) => requireDrainedCatalogueMaintenance(tx, { operationId, targetCatalogueId: 'catalogue-v2' }))).rejects.toThrow('drain is not empty')
    await releaseCatalogueWrite(db, admission.id)
    await db.$transaction((tx) => requireDrainedCatalogueMaintenance(tx, { operationId, targetCatalogueId: 'catalogue-v2' }))
    await db.$transaction((tx) => openCatalogueGate(tx, { operationId }))
  })
})
