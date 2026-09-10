import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from './db'
import { dexRouter } from './routers/dex'
import { taxonRouter } from './routers/taxon'
import { journalRouter } from './routers/journal'
import { sightingRouter } from './routers/sighting'
import type { Context } from './trpc'
import { regionalPackUrls } from '../components/OfflinePack'

const taxonIds = [randomUUID(), randomUUID()]
const keys = [990037001, 990037002]
const leadId = '00000000-0037-4000-8000-000000000001'
const reviewedLeadId = '00000000-0037-4000-8000-000000000002'
const registryId = randomUUID(), catalogueId = randomUUID()
let context: Context, regionId: string, sightingId: string
const asset = (taxonId: string, n: number, position = n) => ({ taxonId, kind: 'image' as const, position, url: `https://example.test/image/${n}/medium.jpg`, author: 'Photographer', licence: 'CC BY 4.0', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: `https://example.test/source/${n}`, origin: 'commons', caption: `Image ${n}`, createdAt: new Date('2025-01-01') })

beforeAll(async () => {
  await db.regionRegistryVersion.create({ data: { id: registryId, countryCode: 'DE', version: registryId, artifactSha256: 'a'.repeat(64), expectedRegions: 0, expectedSourceUnits: 0 } })
  await db.catalogueVersion.create({ data: { id: catalogueId, countryCode: 'DE', runKey: catalogueId, registryVersionId: registryId, inputFingerprint: 'i', sourceFingerprint: 's', plausibleRulesVersion: 1, tileMappingVersion: 1, observationWindowVersion: 1, yearFrom: 2016, yearTo: 2026, occurrencePredicates: {}, expectedRegions: 1 } })
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
    { ...asset(taxonIds[0], 2, 0), id: reviewedLeadId },
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
  await db.referenceAssetVisibility.deleteMany({ where: { catalogueVersionId: catalogueId } })
  await db.referenceGalleryReceipt.deleteMany({ where: { catalogueVersionId: catalogueId } })
  if (context) await db.identity.delete({ where: { id: context.identity.id } })
  await db.taxon.deleteMany({ where: { id: { in: taxonIds } } })
  if (regionId) await db.region.delete({ where: { id: regionId } })
  await db.catalogueVersion.deleteMany({ where: { id: catalogueId } })
  await db.regionRegistryVersion.deleteMany({ where: { id: registryId } })
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

  it('uses one reviewed visibility decision for detail, every lead read and the offline pack', async () => {
    await db.referenceGalleryReceipt.create({ data: {
      catalogueVersionId: catalogueId, taxonId: taxonIds[0], sourceSnapshot: { fixture: 'before-images' }, sourceFingerprint: 'a'.repeat(64),
      evidence: { fixture: 'target review' }, evidenceFingerprint: 'b'.repeat(64), resultSnapshot: { fixture: 'effective gallery' }, resultFingerprint: 'c'.repeat(64),
      reviewer: 'Integration reviewer', reviewedAt: new Date('2026-09-10T20:00:00.000Z'),
    } })
    await expect(db.referenceAssetVisibility.create({ data: {
      assetId: leadId, catalogueVersionId: catalogueId, taxonId: taxonIds[0], eligible: true,
      sourceAssetFingerprint: 'd'.repeat(64), evidence: { fixture: 'missing target position' }, evidenceFingerprint: 'e'.repeat(64),
      reviewer: 'Integration reviewer', reviewedAt: new Date('2026-09-10T20:00:00.000Z'),
    } })).rejects.toThrow()
    await db.referenceAssetVisibility.createMany({ data: [
      { assetId: leadId, catalogueVersionId: catalogueId, taxonId: taxonIds[0], eligible: false, hiddenReason: 'confirmed-subject-conflict', sourceAssetFingerprint: 'd'.repeat(64), evidence: { fixture: 'conflict' }, evidenceFingerprint: 'e'.repeat(64), reviewer: 'Integration reviewer', reviewedAt: new Date('2026-09-10T20:00:00.000Z') },
      { assetId: reviewedLeadId, catalogueVersionId: catalogueId, taxonId: taxonIds[0], eligible: true, targetPosition: 0, correctedLicenceUrl: null, sourceAssetFingerprint: 'f'.repeat(64), evidence: { fixture: 'eligible' }, evidenceFingerprint: '0'.repeat(64), reviewer: 'Integration reviewer', reviewedAt: new Date('2026-09-10T20:00:00.000Z') },
    ] })
    try {
      const protectedIds = (await db.asset.findMany({ where: { taxonId: taxonIds[0], OR: [{ kind: 'sound' }, { origin: 'user' }, { ownerId: { not: null } }, { sightingId: { not: null } }] }, select: { id: true }, orderBy: { id: 'asc' } })).map((row) => row.id)
      await expect(db.asset.delete({ where: { id: reviewedLeadId } })).rejects.toThrow()
      await expect(db.taxon.delete({ where: { id: taxonIds[0] } })).rejects.toThrow()
      const page = await taxonRouter.createCaller(context).page({ gbifKey: keys[0], regionId })
      expect(page!.assets.filter((row) => row.kind === 'image').map((row) => row.id)).toEqual([reviewedLeadId])
      expect(page!.assets.filter((row) => row.kind === 'sound')).toHaveLength(2)
      const dex = await dexRouter.createCaller(context).set({ regionId, tiles: ['bird'] })
      const row = dex!.species.find((species) => species.taxonId === taxonIds[0])!
      expect(row.lead?.id).toBe(reviewedLeadId)
      expect(row.lead).not.toHaveProperty('referenceVisibility')
      expect(regionalPackUrls([row])).toEqual([row.leadSmall])
      expect((await taxonRouter.createCaller(context).ensure({ gbifKey: keys[0] })).leadInfo?.sourceUrl).toBe(asset(taxonIds[0], 2).sourceUrl)
      expect((await journalRouter.createCaller(context).get({ id: sightingId }))?.reference?.id).toBe(reviewedLeadId)
      expect((await sightingRouter.createCaller(context).fill({ id: sightingId }))?.taxon.lead?.id).toBe(reviewedLeadId)
      expect((await sightingRouter.createCaller(context).outside({ regionId: randomUUID() }))[0]?.lead?.id).toBe(reviewedLeadId)
      expect((await db.asset.findMany({ where: { id: { in: protectedIds } }, select: { id: true }, orderBy: { id: 'asc' } })).map((row) => row.id)).toEqual(protectedIds)
    } finally {
      await db.referenceAssetVisibility.deleteMany({ where: { catalogueVersionId: catalogueId } })
      await db.referenceGalleryReceipt.delete({ where: { catalogueVersionId_taxonId: { catalogueVersionId: catalogueId, taxonId: taxonIds[0] } } })
    }
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
