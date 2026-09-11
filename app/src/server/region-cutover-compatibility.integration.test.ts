import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from './db'
import { identityRouter } from './routers/identity'
import { dexRouter } from './routers/dex'
import { regionsRouter } from './routers/regions'
import { taxonRouter } from './routers/taxon'
import type { Context } from './trpc'

const registryId = `cutover-registry-${randomUUID()}`
const catalogueId = `cutover-catalogue-${randomUUID()}`
const sourceId = randomUUID()
const ids: Record<'mainz' | 'southWest' | 'oldMainz' | 'oldSouthWest' | 'kyoto' | 'schagen', string> = {
  mainz: randomUUID(), southWest: randomUUID(), oldMainz: randomUUID(), oldSouthWest: randomUUID(), kyoto: randomUUID(), schagen: randomUUID(),
}
const identityA = randomUUID(), identityB = randomUUID(), taxonId = randomUUID()
let previousRegistry: string[] = []
let previousCatalogues: { id: string; updatedAt: Date }[] = []
const createdRegionIds: string[] = []
let priorMainzMembers: string[] = []

const context = async (id: string): Promise<Context> => ({
  db, identity: await db.identity.findUniqueOrThrow({ where: { id } }), networkKey: randomUUID(), minted: false,
  cookies: {}, outCookies: [], origin: 'http://localhost', locale: 'en', setCookie: () => 0,
})

beforeAll(async () => {
  previousRegistry = (await db.regionRegistryVersion.findMany({ where: { countryCode: 'DE', active: true }, select: { id: true } })).map((row) => row.id)
  previousCatalogues = await db.catalogueVersion.findMany({ where: { countryCode: 'DE', status: 'active' }, select: { id: true, updatedAt: true } })
  await db.regionRegistryVersion.updateMany({ where: { id: { in: previousRegistry } }, data: { active: false } })
  await db.catalogueVersion.updateMany({ where: { id: { in: previousCatalogues.map((row) => row.id) } }, data: { status: 'retired' } })
  await db.regionRegistryVersion.create({ data: { id: registryId, countryCode: 'DE', version: registryId, artifactSha256: 'a'.repeat(64), expectedRegions: 2, expectedSourceUnits: 2, active: true } })
  await db.regionRegistrySource.create({ data: { id: sourceId, registryVersionId: registryId, role: 'regions', name: 'Cutover fixture', url: 'https://example.test', topicDate: new Date('2024-12-31'), downloadedAt: new Date(), sha256: 'b'.repeat(64), licenceId: 'dl-de/by-2-0', attribution: 'Fixture' } })
  for (const [key, unique, data] of [
    ['mainz', { canonicalKey: 'de-krg-07339000' }, { canonicalKey: 'de-krg-07339000', countryCode: 'DE', name: 'Mainz-Bingen', higher: 'Deutschland › Rheinland-Pfalz', status: 'ready' as const, pickerSummary: { version: 1, setSize: 1, content: 0, introEn: 0, noGermanName: 0, nowCounts: Array(12).fill(1), refreshedAt: new Date().toISOString() } }],
    ['southWest', { canonicalKey: 'de-krg-07340000' }, { canonicalKey: 'de-krg-07340000', countryCode: 'DE', name: 'Südwestpfalz', higher: 'Deutschland › Rheinland-Pfalz', status: 'ready' as const, pickerSummary: { version: 1, setSize: 0, content: 0, introEn: 0, noGermanName: 0, nowCounts: Array(12).fill(0), refreshedAt: new Date().toISOString() } }],
    ['oldMainz', { gadmGid: 'DEU.11.19_1' }, { gadmGid: 'DEU.11.19_1', name: 'Mainz-Bingen', higher: 'Deutschland', status: 'ready' as const }],
    ['oldSouthWest', { gadmGid: 'DEU.11.30_1' }, { gadmGid: 'DEU.11.30_1', name: 'Südwestpfalz', higher: 'Deutschland', status: 'ready' as const }],
    ['kyoto', { gadmGid: 'JPN.22.13_1' }, { gadmGid: 'JPN.22.13_1', name: 'Kyoto', higher: 'Japan', status: 'ready' as const }],
    ['schagen', { gadmGid: 'NLD.9.73_1' }, { gadmGid: 'NLD.9.73_1', name: 'Schagen', higher: 'Nederland', status: 'ready' as const }],
  ] as const) {
    const proposedId = ids[key]
    const region = await db.region.upsert({ where: unique, create: { id: proposedId, ...data }, update: {}, select: { id: true } })
    ids[key] = region.id
    if (region.id === proposedId) createdRegionIds.push(region.id)
  }
  await db.regionRegistryEntry.createMany({ data: [
    { id: randomUUID(), registryVersionId: registryId, sourceId, regionId: ids.mainz, sourceCode: '07339000', sourceName: 'Mainz-Bingen', displayName: 'Mainz-Bingen', stateCode: '07', stateName: 'Rheinland-Pfalz' },
    { id: randomUUID(), registryVersionId: registryId, sourceId, regionId: ids.southWest, sourceCode: '07340000', sourceName: 'Südwestpfalz/Pirmasens/Zweibrücken', displayName: 'Südwestpfalz', stateCode: '07', stateName: 'Rheinland-Pfalz' },
  ] })
  const activatedAt = new Date()
  await db.catalogueVersion.create({ data: { id: catalogueId, countryCode: 'DE', runKey: catalogueId, registryVersionId: registryId, inputFingerprint: 'c', sourceFingerprint: 'd', responseFingerprint: 'e', unionFingerprint: 'f', plausibleRulesVersion: 1, tileMappingVersion: 1, observationWindowVersion: 1, yearFrom: 2016, yearTo: 2026, occurrencePredicates: {}, status: 'active', expectedRegions: 2, completedRegions: 2, unionTaxa: 1, generatedAt: activatedAt, auditedAt: activatedAt, activatedAt } })
  await db.taxon.create({ data: { id: taxonId, gbifKey: -Math.floor(Math.random() * 1_000_000_000), sciName: 'Compatibilis testus', rank: 'species', tile: 'bird' } })
  priorMainzMembers = (await db.plausibility.findMany({ where: { regionId: ids.mainz }, select: { taxonId: true } })).map(({ taxonId }) => taxonId)
  await db.plausibility.create({ data: { taxonId, regionId: ids.mainz, obs: 10, monthShare: Array(12).fill(100), peak: 100, words: 'all year' } })
  await db.identity.createMany({ data: [{ id: identityA }, { id: identityB }] })
  await db.filter.create({ data: { identityId: identityA, regionId: ids.kyoto, regionIds: [ids.kyoto, ids.oldSouthWest, ids.oldMainz, ids.schagen], tiles: ['bird'] } })
  await db.filter.create({ data: { identityId: identityB, regionId: ids.kyoto, regionIds: [ids.kyoto, ids.schagen], tiles: ['bird'] } })
})

afterAll(async () => {
  await db.identity.deleteMany({ where: { id: { in: [identityA, identityB] } } })
  await db.plausibility.deleteMany({ where: { taxonId } })
  await db.taxon.deleteMany({ where: { id: taxonId } })
  await db.catalogueVersion.deleteMany({ where: { id: catalogueId } })
  await db.regionRegistryEntry.deleteMany({ where: { registryVersionId: registryId } })
  await db.regionRegistrySource.deleteMany({ where: { registryVersionId: registryId } })
  await db.regionRegistryVersion.deleteMany({ where: { id: registryId } })
  await db.region.deleteMany({ where: { id: { in: createdRegionIds } } })
  await db.regionRegistryVersion.updateMany({ where: { id: { in: previousRegistry } }, data: { active: true } })
  for (const row of previousCatalogues) await db.catalogueVersion.update({ where: { id: row.id }, data: { status: 'active', updatedAt: row.updatedAt } })
  await db.$disconnect()
})

describe('canonical/retired region compatibility', () => {
  it('projects approved successors in order without changing stored filters', async () => {
    const caller = identityRouter.createCaller(await context(identityA))
    const me = await caller.me()
    expect(me.catalogueVersion).toBe(catalogueId)
    expect(me.regionIds).toEqual([ids.southWest, ids.mainz])
    expect(me.region?.id).toBe(ids.southWest)
    expect(me.regionTransitions.map((row) => [row.inputId, row.regionId])).toEqual([
      [ids.kyoto, null], [ids.oldSouthWest, ids.southWest], [ids.oldMainz, ids.mainz], [ids.schagen, null],
    ])
    const stored = await db.filter.findUniqueOrThrow({ where: { identityId: identityA } })
    expect(stored.regionId).toBe(ids.kyoto)
    expect(stored.regionIds).toEqual([ids.kyoto, ids.oldSouthWest, ids.oldMainz, ids.schagen])
  })

  it('returns empty discovery when no saved region has a German successor', async () => {
    const me = await identityRouter.createCaller(await context(identityB)).me()
    expect(me.region).toBeNull()
    expect(me.regionIds).toEqual([])
    expect(me.regions).toEqual([])
  })

  it('serves an old regional request from the versioned canonical set and hides retired suggestions', async () => {
    const ctx = await context(identityA)
    const set = await dexRouter.createCaller(ctx).set({ regionId: ids.oldMainz, tiles: ['bird'] })
    expect(set).toMatchObject({ catalogueVersion: catalogueId, registryVersion: registryId, region: { id: ids.mainz }, setSize: priorMainzMembers.length + 1 })
    expect(set).toEqual(await dexRouter.createCaller(ctx).set({ regionId: ids.mainz, tiles: ['bird'] }))
    expect(set!.species.some((row) => row.taxonId === taxonId)).toBe(true)
    expect((await db.plausibility.findMany({ where: { regionId: ids.mainz }, select: { taxonId: true } })).map(({ taxonId }) => taxonId).sort())
      .toEqual([...priorMainzMembers, taxonId].sort())
    const legacyPicker = await dexRouter.createCaller(ctx).regions()
    expect(legacyPicker.map((row) => row.id).sort()).toEqual([ids.mainz, ids.southWest].sort())
    const compatibility = await regionsRouter.createCaller(ctx).compatibility({ regionIds: [ids.oldMainz, ids.kyoto] })
    expect(compatibility.resolutions.map((row) => row.regionId)).toEqual([ids.mainz, null])
    const globalPage = await taxonRouter.createCaller(ctx).page({ gbifKey: (await db.taxon.findUniqueOrThrow({ where: { id: taxonId }, select: { gbifKey: true } })).gbifKey })
    expect(globalPage).toMatchObject({ catalogueVersion: catalogueId, registryVersion: registryId })
  })

  it('keeps legacy behavior until the matched catalogue and registry are active', async () => {
    await db.catalogueVersion.update({ where: { id: catalogueId }, data: { status: 'audited' } })
    const me = await identityRouter.createCaller(await context(identityA)).me()
    expect(me.catalogueVersion).toBeNull()
    expect(me.regionIds).toEqual([ids.kyoto, ids.oldSouthWest, ids.oldMainz, ids.schagen])
    expect(me.region?.id).toBe(ids.kyoto)
    const missing = randomUUID()
    const compatibility = await regionsRouter.createCaller(await context(identityA)).compatibility({ regionIds: [ids.kyoto, missing] })
    expect(compatibility.catalogueVersion).toBeNull()
    expect(compatibility.resolutions).toEqual([
      { inputId: ids.kyoto, regionId: ids.kyoto, canonicalKey: null, reason: 'active' },
      { inputId: missing, regionId: null, canonicalKey: null, reason: 'unknown' },
    ])
    await db.catalogueVersion.update({ where: { id: catalogueId }, data: { status: 'active' } })
  })
})
