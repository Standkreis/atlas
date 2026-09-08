import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from './db'
import { dexRouter } from './routers/dex'
import { taxonRouter } from './routers/taxon'
import { journalRouter } from './routers/journal'
import { sightingRouter } from './routers/sighting'
import type { Context } from './trpc'

const taxonIds = [randomUUID(), randomUUID()]
const keys = [990037001, 990037002]
const leadId = '00000000-0037-4000-8000-000000000001'
let context: Context, regionId: string, sightingId: string
const asset = (taxonId: string, n: number, position = n) => ({ taxonId, kind: 'image' as const, position, url: `https://example.test/image/${n}/medium.jpg`, author: 'Photographer', licence: 'CC BY 4.0', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: `https://example.test/source/${n}`, origin: 'commons', caption: `Image ${n}`, createdAt: new Date('2025-01-01') })

beforeAll(async () => {
  const identity = await db.identity.create({ data: {} })
  context = { db, identity, networkKey: randomUUID(), minted: false, cookies: {}, outCookies: [], origin: 'http://localhost', locale: 'en', setCookie: () => 0 }
  const region = await db.region.create({ data: { name: 'Gallery reads fixture', higher: 'Deutschland', status: 'ready' } })
  regionId = region.id
  await db.taxon.createMany({ data: taxonIds.map((id, i) => ({ id, gbifKey: keys[i], sciName: `Read fixture ${i}`, rank: 'species', tile: 'bird' as const, commonNames: { de: 3, en: ' ', fr: 'Merle noir' }, contentAt: new Date() })) })
  await db.plausibility.createMany({ data: taxonIds.map((taxonId) => ({ taxonId, regionId, obs: 100, monthShare: Array(12).fill(100), peak: 100, words: 'common' })) })
  await db.lookalike.create({ data: { regionId, taxonId: taxonIds[0], siblingId: taxonIds[1] } })
  await db.interaction.create({ data: { sourceId: taxonIds[0], targetId: taxonIds[1], kind: 'eats', origin: 'fixture', real: 3, prose: true, studies: { fixture: 3 } } })
  const sighting = await db.sighting.create({ data: { taxonId: taxonIds[0], identityId: identity.id, at: new Date() } })
  sightingId = sighting.id
  await db.study.create({ data: { taxonId: taxonIds[0], identityId: identity.id } })
  await db.asset.createMany({ data: [
    { ...asset(taxonIds[0], 100, 0), author: '', createdAt: new Date(0) },
    { ...asset(taxonIds[0], 101, 0), licence: 'unknown', createdAt: new Date(0) },
    { ...asset(taxonIds[0], 102, 0), url: 'javascript:alert(1)', createdAt: new Date(0) },
    { ...asset(taxonIds[0], 1, 0), id: leadId },
    { ...asset(taxonIds[0], 2, 0), id: '00000000-0037-4000-8000-000000000002' },
    { ...asset(taxonIds[0], 1, 1), url: 'https://example.test/image/1/small.jpg?duplicate=1' },
    { ...asset(taxonIds[0], 3, 1), sourceUrl: 'https://example.test/source/1' },
    ...Array.from({ length: 14 }, (_, i) => asset(taxonIds[0], i + 4, i + 1)),
    { ...asset(taxonIds[0], 200, 0), kind: 'sound', origin: 'xeno-canto' },
    { ...asset(taxonIds[0], 201, 0), kind: 'sound', origin: 'xeno-canto' },
    { ...asset(taxonIds[0], 300, 0), origin: 'user' },
    { ...asset(taxonIds[0], 301, 0), ownerId: identity.id },
    { ...asset(taxonIds[0], 302, 0), sightingId },
    asset(taxonIds[1], 400, 0),
  ] })
})

afterAll(async () => {
  await db.identity.delete({ where: { id: context.identity.id } })
  await db.taxon.deleteMany({ where: { id: { in: taxonIds } } })
  await db.region.delete({ where: { id: regionId } })
  await db.$disconnect()
})

describe('public gallery read contract', () => {
  it('filters invalid/private rows, breaks position/timestamp ties by id, deduplicates before cap and retains all sounds', async () => {
    const page = await taxonRouter.createCaller(context).page({ gbifKey: keys[0], regionId })
    expect(page?.names).toEqual({ fr: 'Merle noir' })
    const images = page!.assets.filter((a) => a.kind === 'image')
    expect(images).toHaveLength(12)
    expect(images[0].id).toBe(leadId)
    expect(images.map((a) => a.url)).not.toContain('javascript:alert(1)')
    expect(images.every((a) => a.author && a.licence === 'CC BY 4.0')).toBe(true)
    expect(page!.assets.filter((a) => a.kind === 'sound')).toHaveLength(2)
    expect(new Set(images.map((a) => a.sourceUrl)).size).toBe(12)
    expect(page!.lookalikes[0].lead).toBe(asset(taxonIds[1], 400).url)
    expect(page!.interactions.eats![0].leadInfo?.author).toBe('Photographer')
  })

  it('returns the same single lead in atlas, ensure, journal, detail, outside and fill without gallery arrays', async () => {
    const dex = await dexRouter.createCaller(context).set({ regionId, tiles: ['bird'] })
    const row = dex!.species.find((s) => s.taxonId === taxonIds[0])!
    expect(row.lead?.id).toBe(leadId)
    expect(row).not.toHaveProperty('assets')
    expect(row.lead).not.toHaveProperty('meta')
    const taxon = await taxonRouter.createCaller(context).ensure({ gbifKey: keys[0] })
    expect(taxon.lead).toBe(row.lead!.url)
    expect(taxon).not.toHaveProperty('assets')
    const journal = journalRouter.createCaller(context)
    const days = await journal.days({})
    expect(JSON.stringify(days)).not.toContain('image/2/medium.jpg')
    const detail = await journal.get({ id: sightingId })
    expect(detail?.reference?.id).toBe(leadId)
    expect(detail?.taxon.lead).toBe(row.lead!.url)
    const fill = await sightingRouter.createCaller(context).fill({ id: sightingId })
    expect(fill?.taxon.lead?.id).toBe(leadId)
    const outside = await sightingRouter.createCaller(context).outside({ regionId: randomUUID() })
    expect(outside[0].lead?.id).toBe(leadId)
  })

  it('keeps optional-content pages functional when every reference and common name is malformed', async () => {
    await db.asset.deleteMany({ where: { taxonId: taxonIds[1] } })
    await db.asset.create({ data: { ...asset(taxonIds[1], 401), licenceUrl: null } })
    await db.taxon.update({ where: { id: taxonIds[1] }, data: { commonNames: ['bad legacy shape'] } })
    const page = await taxonRouter.createCaller(context).page({ gbifKey: keys[1] })
    expect(page?.assets).toEqual([])
    expect(page?.names).toEqual({})
    expect(page?.plausibility).toBeNull()
  })

  it('keeps a 1,000-taxon region response lead-only with twelve references per taxon', async () => {
    const extra = Array.from({ length: 1000 }, () => randomUUID())
    taxonIds.push(...extra)
    await db.taxon.createMany({ data: extra.map((id, i) => ({ id, gbifKey: 990037100 + i, sciName: `Scale fixture ${i}`, rank: 'species', tile: 'bird' as const })) })
    await db.plausibility.createMany({ data: extra.map((taxonId) => ({ taxonId, regionId, obs: 100, monthShare: Array(12).fill(100), peak: 100, words: 'common' })) })
    for (let i = 0; i < extra.length; i += 100) await db.asset.createMany({ data: extra.slice(i, i + 100).flatMap((id) => Array.from({ length: 12 }, (_, n) => asset(id, n))) })
    const start = performance.now()
    const result = await dexRouter.createCaller(context).set({ regionId, tiles: ['bird'] })
    const bytes = Buffer.byteLength(JSON.stringify(result))
    expect(result!.species).toHaveLength(1002)
    expect(result!.species.every((row) => !('assets' in row))).toBe(true)
    expect(bytes).toBeLessThan(1_500_000)
    console.info(`gallery-read scale: 1000 taxa × 12 references → ${bytes} response bytes in ${Math.round(performance.now() - start)} ms`)
  })
})
