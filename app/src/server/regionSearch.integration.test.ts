import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'
import { normalizeRegionAlias } from '../domain/regionAlias'
import { db } from './db'
import { regionsRouter } from './routers/regions'
import { dexRouter } from './routers/dex'
import type { Context } from './trpc'

const registryId = `search-${randomUUID()}`
const catalogueId = `search-catalogue-${randomUUID()}`
const ids = Array.from({ length: 25 }, () => randomUUID())
let previousActive: string[] = []
let identityId: string
let caller: ReturnType<typeof regionsRouter.createCaller>
const observedDb = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }), log: [{ emit: 'event', level: 'query' }] })
const queries: string[] = []
observedDb.$on('query', (event) => queries.push(event.query))

beforeAll(async () => {
  previousActive = (await db.regionRegistryVersion.findMany({ where: { countryCode: 'DE', active: true }, select: { id: true } })).map((row) => row.id)
  await db.regionRegistryVersion.updateMany({ where: { id: { in: previousActive } }, data: { active: false } })
  await db.regionRegistryVersion.create({ data: {
    id: registryId, countryCode: 'DE', version: registryId, artifactSha256: 'a'.repeat(64), expectedRegions: 25, expectedSourceUnits: 25, active: true,
  } })
  const source = await db.regionRegistrySource.create({ data: {
    registryVersionId: registryId, role: 'regions', name: 'BKG test fixture', url: 'https://example.test/bkg',
    topicDate: new Date('2024-12-31'), downloadedAt: new Date(), sha256: 'b'.repeat(64), licenceId: 'dl-de/by-2-0', attribution: 'Test fixture',
  } })
  for (const [index, id] of ids.entries()) {
    const name = index === 0 ? 'Südwestpfalz' : index <= 2 ? 'Neustadt' : `Testregion ${index}`
    const stateName = index === 2 ? 'Bayern' : 'Rheinland-Pfalz'
    await db.region.create({ data: { id, canonicalKey: `de-krg-99${String(index).padStart(6, '0')}`, countryCode: 'DE', name, higher: stateName, status: index === 24 ? 'failed' : 'ready' } })
    await db.regionRegistryEntry.create({ data: {
      id: `${registryId}-${index}`, registryVersionId: registryId, sourceId: source.id, regionId: id,
      sourceCode: `99${String(index).padStart(6, '0')}`, sourceName: name, displayName: name, stateCode: index === 2 ? '09' : '07', stateName,
      aliases: { create: [...new Set([name, stateName, 'Testkatalog', ...(index === 0 ? ['Pirmasens', 'Zweibrücken', 'Landkreis Südwestpfalz'] : [])])].map((alias) => ({ kind: 'variant', name: alias, normalizedName: normalizeRegionAlias(alias) })) },
    } })
  }
  await db.catalogueVersion.create({ data: {
    id: catalogueId, countryCode: 'DE', runKey: catalogueId, registryVersionId: registryId,
    inputFingerprint: 'c'.repeat(64), sourceFingerprint: 'd'.repeat(64), plausibleRulesVersion: 1, tileMappingVersion: 1,
    observationWindowVersion: 1, yearFrom: 2015, yearTo: 2025, occurrencePredicates: {}, status: 'active', expectedRegions: 25,
    completedRegions: 25, generatedAt: new Date(), auditedAt: new Date(), activatedAt: new Date(),
    responseFingerprint: 'e'.repeat(64), unionFingerprint: 'f'.repeat(64), unionTaxa: 42,
  } })
  await db.catalogueRegionBuild.create({ data: {
    catalogueVersionId: catalogueId, registryVersionId: registryId, registryEntryId: `${registryId}-0`, status: 'complete',
    regionSize: 42, nowCounts: Array(12).fill(12), perTile: { bird: 42 }, completedAt: new Date(),
    totalObservations: 420, monthTotals: Array(12).fill(35), rejectedTaxa: [], requestStats: {},
    responseFingerprint: 'e'.repeat(64), setFingerprint: 'f'.repeat(64),
  } })
  identityId = (await db.identity.create({ data: {} })).id
  await db.filter.create({ data: { identityId, regionId: ids[0], regionIds: [ids[0]], tiles: ['bird'] } })
  caller = regionsRouter.createCaller({ db, identity: { id: identityId } } as Context)
})

afterAll(async () => {
  await db.identity.deleteMany({ where: { id: { in: identityId ? [identityId] : [] } } })
  await db.catalogueRegionBuild.deleteMany({ where: { catalogueVersionId: catalogueId } })
  await db.catalogueVersion.deleteMany({ where: { id: catalogueId } })
  await db.regionRegistryAlias.deleteMany({ where: { registryEntry: { registryVersionId: registryId } } })
  await db.regionRegistryEntry.deleteMany({ where: { registryVersionId: registryId } })
  await db.regionRegistrySource.deleteMany({ where: { registryVersionId: registryId } })
  await db.regionRegistryVersion.deleteMany({ where: { id: registryId } })
  await db.region.deleteMany({ where: { id: { in: ids } } })
  await db.regionRegistryVersion.updateMany({ where: { id: { in: previousActive } }, data: { active: true } })
  await db.$disconnect()
  await observedDb.$disconnect()
})

describe('German region tRPC API against Postgres', () => {
  it.each(['Pirmasens', 'Zweibrücken', 'ZWEIBRUECKEN', 'Zweibru\u0308cken', 'Landkreis Südwestpfalz'])('resolves %s to the one composite', async (q) => {
    const result = await caller.search({ q, month: 9 })
    expect(result.results).toHaveLength(1)
    expect(result.results[0]).toMatchObject({ id: ids[0], name: 'Südwestpfalz', summary: { setSize: 42, nowCount: 12 }, summaryStatus: 'available' })
  })
  it('disambiguates same names by state and permits state-qualified tokens', async () => {
    expect((await caller.search({ q: 'Neustadt' })).results.map((row) => row.stateName)).toEqual(['Rheinland-Pfalz', 'Bayern'])
    expect((await caller.search({ q: 'Neustadt Bayern' })).results.map((row) => row.id)).toEqual([ids[2]])
  })
  it('returns no catalogue on empty search and enforces a server page limit', async () => {
    expect((await caller.search()).results).toEqual([])
    const first = await caller.search({ q: 'Testkatalog', limit: 20 })
    expect(first.results).toHaveLength(20)
    const last = await caller.search({ q: 'Testkatalog', limit: 20, after: first.next!, registryVersion: first.registryVersion! })
    expect(last.results).toHaveLength(5)
    expect(last.next).toBeNull()
    expect(new Set([...first.results, ...last.results].map((row) => row.id)).size).toBe(25)
    expect(last.results.at(-1)).toMatchObject({ status: 'failed', selectable: false, summary: null })
    await expect(caller.search({ q: 'Testkatalog', limit: 21 })).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })
  it('reads persisted summaries without any live taxon membership and hides staged counts', async () => {
    expect(await db.plausibility.count({ where: { regionId: ids[0] } })).toBe(0)
    expect((await caller.search({ q: 'Pirmasens' })).results[0].summary?.setSize).toBe(42)
    await db.catalogueVersion.update({ where: { id: catalogueId }, data: { status: 'audited' } })
    try {
      expect((await caller.search({ q: 'Pirmasens' })).results[0]).toMatchObject({ summary: null, selectable: false })
    } finally {
      await db.catalogueVersion.update({ where: { id: catalogueId }, data: { status: 'active' } })
    }
  })
  it('keeps actual SQL query count constant from one to twenty regions without taxon or media reads', async () => {
    const observedCaller = regionsRouter.createCaller({ db: observedDb, identity: { id: identityId } } as unknown as Context)
    queries.length = 0
    await observedCaller.search({ q: 'Pirmasens' })
    const smallCount = queries.length
    queries.length = 0
    await observedCaller.search({ q: 'Testkatalog', limit: 20 })
    expect(queries.length).toBe(smallCount)
    expect(queries.length).toBeLessThanOrEqual(6)
    expect(queries.join('\n')).not.toMatch(/"(?:Taxon|Asset|Plausibility|CataloguePlausibility|RegionQueryUnit)"/)
  })
  it('keeps the legacy picker numeric, bounded and free from live aggregation', async () => {
    await db.$executeRaw`SELECT refresh_region_picker_summary(${ids[0]})`
    const dex = dexRouter.createCaller({ db: observedDb, identity: { id: identityId } } as unknown as Context)
    queries.length = 0
    const rows = await dex.regions()
    expect(rows.length).toBeLessThanOrEqual(40)
    expect(rows.find((row) => row.id === ids[0])).toMatchObject({ setSize: 0, nowCount: 0, content: 0, introEn: 0, noGermanName: 0, introEnShare: 0 })
    expect(queries.length).toBeLessThanOrEqual(3)
    expect(queries.join('\n')).not.toMatch(/"(?:Taxon|Asset|Plausibility|CataloguePlausibility)"/)
    expect(queries.join('\n')).toContain('LIMIT')
  })
  it('uses German aliases for legacy lookup without a GADM provider query', async () => {
    const dex = dexRouter.createCaller({ db: observedDb, identity: { id: identityId } } as unknown as Context)
    queries.length = 0
    expect(await dex.lookupRegion({ q: 'Zweibrücken' })).toEqual([{ gadmGid: 'de-krg-99000000', name: 'Südwestpfalz', higher: 'Deutschland › Rheinland-Pfalz', parent: 'Rheinland-Pfalz', type: 'Kreisregion', typeEn: 'District region', region: { id: ids[0], status: 'ready' } }])
    expect(queries.join('\n')).not.toMatch(/"(?:Taxon|Asset|RegionQueryUnit)"/)
    expect(await dex.lookupRegion({ lat: 0, lng: 0 })).toEqual([])
  })
  it('separates selected and recent IDs, preserving unavailable references', async () => {
    const retired = randomUUID()
    const result = await caller.personal({ recentIds: [ids[1], ids[0], retired] })
    expect(result.selected.map((row) => row.id)).toEqual([ids[0]])
    expect(result.recent.map((row) => row.id)).toEqual([ids[1]])
    expect(result.unavailableIds).toEqual([retired])
    await expect(caller.personal({ recentIds: Array(21).fill(ids[0]) })).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })
  it('reports absent authoritative geometry and permits the permission-free path', async () => {
    expect(await caller.locate({ permission: 'not-requested' })).toMatchObject({ status: 'permission-required', region: null })
    expect(await caller.locate({ permission: 'granted', lat: 49.2, lng: 7.6 })).toMatchObject({ status: 'geometry-unavailable', region: null })
  })
})
