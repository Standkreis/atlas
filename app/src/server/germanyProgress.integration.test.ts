import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from './db'
import { germanyProgress, type GermanyGeometry } from './germanyProgress'
import { identityRouter } from './routers/identity'
import { dexRouter } from './routers/dex'
import type { Context } from './trpc'
import manifest from './data/germany-land.manifest.json'
import { containingLandKeys, type LandFeature } from './regionGeometry'

// A minimal DB registry subset bound to the checked-in real geometry for the final caller test.
const registryId = manifest.registryVersion
const sha = manifest.registrySha256
const north = 'de-krg-07315000', south = 'de-krg-07340000'
const catalogueIds = [randomUUID(), randomUUID()]
const regionIds = [randomUUID(), randomUUID()]
const taxonIds = Array.from({ length: 5 }, () => randomUUID())
let identityId: string, otherId: string, ctx: Context
let priorRegistryId: string | undefined, priorCatalogueId: string | undefined

const land: LandFeature[] = [
  { key: south, bbox: [7, 48, 9, 49.5], polygons: [[[[7, 48], [9, 48], [9, 49.5], [7, 49.5], [7, 48]]]] },
  { key: north, bbox: [7, 49.5, 9, 51], polygons: [[[[7, 49.5], [9, 49.5], [9, 51], [7, 51], [7, 49.5]]]] },
]
// Minimal boundaries exercise #22's actual containment algorithm; the final test uses its BKG artifact.
const geometry = vi.fn<GermanyGeometry>(async ({ lat, lng }, id, digest) => {
  expect(id).toBe(registryId)
  expect(digest).toBe(sha)
  return { status: 'ok', regionKeys: containingLandKeys(land, [lng, lat]).reverse() }
})
const progress = () => germanyProgress(db, identityId, geometry)
async function sight(taxon: number, location: { lat?: number; lng?: number; place?: string } = {}, wildness: 'wild' | 'captive' | 'cultivated' = 'wild', owner = identityId) {
  return db.sighting.create({ data: { identityId: owner, taxonId: taxonIds[taxon], at: new Date(), ...location, wildness } })
}
async function study(taxon: number, owner = identityId) {
  return db.study.create({ data: { identityId: owner, taxonId: taxonIds[taxon] } })
}

beforeAll(async () => {
  priorRegistryId = (await db.regionRegistryVersion.findFirst({ where: { countryCode: 'DE', active: true } }))?.id
  priorCatalogueId = (await db.catalogueVersion.findFirst({ where: { countryCode: 'DE', status: 'active' } }))?.id
  await db.regionRegistryVersion.updateMany({ where: { id: priorRegistryId ?? 'absent' }, data: { active: false } })
  await db.catalogueVersion.updateMany({ where: { id: priorCatalogueId ?? 'absent' }, data: { status: 'retired' } })
  await db.regionRegistryVersion.create({ data: { id: registryId, countryCode: 'DE', version: registryId, artifactSha256: sha, expectedRegions: 2, expectedSourceUnits: 2, active: true } })
  const source = await db.regionRegistrySource.create({ data: {
    registryVersionId: registryId, role: 'regions', name: 'Fixture', url: 'https://example.test/fixture',
    topicDate: new Date('2024-12-31'), downloadedAt: new Date(), sha256: sha, licenceId: 'dl-de/by-2-0', attribution: 'Fixture',
  } })
  for (const [index, key] of [north, south].entries()) {
    await db.region.create({ data: { id: regionIds[index], canonicalKey: key, countryCode: 'DE', name: key, higher: 'Fixture', status: 'ready' } })
    await db.regionRegistryEntry.create({ data: { registryVersionId: registryId, sourceId: source.id, regionId: regionIds[index], sourceCode: key.slice(7), sourceName: key, displayName: key, stateCode: '99', stateName: 'Fixture' } })
  }
  for (const [index, id] of taxonIds.entries()) {
    await db.taxon.create({ data: { id, gbifKey: 990_026_001 + index, sciName: `Progress fixture ${index}`, rank: 'SPECIES', tile: index === 1 ? 'plant' : 'bird' } })
  }
  for (const [index, id] of catalogueIds.entries()) {
    const members = index === 0 ? taxonIds.slice(0, 4) : [taxonIds[0], taxonIds[4]]
    await db.catalogueVersion.create({ data: {
      id, countryCode: 'DE', runKey: `issue26-${index}`, registryVersionId: registryId,
      inputFingerprint: sha, sourceFingerprint: sha, responseFingerprint: sha, unionFingerprint: sha,
      plausibleRulesVersion: 1, tileMappingVersion: 1, observationWindowVersion: 1, yearFrom: 2015, yearTo: 2024,
      occurrencePredicates: {}, status: index === 0 ? 'active' : 'audited', expectedRegions: 2, completedRegions: 2,
      unionTaxa: members.length, generatedAt: new Date(), auditedAt: new Date(), activatedAt: index === 0 ? new Date() : null,
      taxa: { create: members.map((taxonId) => ({ taxonId })) },
    } })
  }
  for (const regionId of regionIds) {
    await db.plausibility.createMany({ data: taxonIds.slice(0, 4).map((taxonId) => ({ taxonId, regionId, obs: 10, monthShare: Array(12).fill(1), peak: 1, words: 'Ganzes Jahr' })) })
  }
  const identity = await db.identity.create({ data: {} })
  identityId = identity.id
  otherId = (await db.identity.create({ data: {} })).id
  ctx = { db, identity, networkKey: randomUUID(), minted: false, cookies: {}, outCookies: [], origin: 'http://localhost', locale: 'en', setCookie: () => 0 }
})

beforeEach(async () => {
  geometry.mockClear()
  await db.sighting.deleteMany({ where: { identityId: { in: [identityId, otherId] } } })
  await db.study.deleteMany({ where: { identityId: { in: [identityId, otherId] } } })
  await db.filter.deleteMany({ where: { identityId } })
  await db.asset.deleteMany({ where: { taxonId: { in: taxonIds } } })
  await db.regionRegistryVersion.update({ where: { id: registryId }, data: { active: true } })
  await db.catalogueVersion.updateMany({ where: { id: { in: catalogueIds } }, data: { status: 'audited' } })
  await db.catalogueVersion.update({ where: { id: catalogueIds[0] }, data: { status: 'active' } })
})

afterAll(async () => {
  await db.identity.deleteMany({ where: { id: { in: [identityId, otherId].filter(Boolean) } } })
  await db.catalogueTaxon.deleteMany({ where: { catalogueVersionId: { in: catalogueIds } } })
  await db.catalogueVersion.deleteMany({ where: { id: { in: catalogueIds } } })
  await db.regionRegistryEntry.deleteMany({ where: { registryVersionId: registryId } })
  await db.regionRegistrySource.deleteMany({ where: { registryVersionId: registryId } })
  await db.regionRegistryVersion.deleteMany({ where: { id: registryId } })
  await db.region.deleteMany({ where: { id: { in: regionIds } } })
  await db.taxon.deleteMany({ where: { id: { in: taxonIds } } })
  if (priorRegistryId) await db.regionRegistryVersion.update({ where: { id: priorRegistryId }, data: { active: true } })
  if (priorCatalogueId) await db.catalogueVersion.update({ where: { id: priorCatalogueId }, data: { status: 'active' } })
  await db.$disconnect()
})

describe('Germany-wide personal progress', () => {
  it('intersects unique accepted taxa with the active catalogue independently of location and recap', async () => {
    await sight(0, { lat: 50, lng: 8 })
    await sight(0, { lat: 49, lng: 8 })
    await sight(1, { lat: 35.68, lng: 139.69 })
    await sight(2, { place: 'Mainz' })
    await sight(4, { lat: 50, lng: 8 }) // outside catalogue: still German physical evidence
    await study(1)
    await study(4)
    expect(await progress()).toMatchObject({
      catalogue: { id: catalogueIds[0], species: 4, discovered: 3, studied: 1, registryVersion: { id: registryId } },
      territory: { germanSightings: 3, visitedRegions: 2, visitedRegionIds: regionIds },
    })
    expect(geometry).toHaveBeenCalledTimes(3) // repeated coordinates resolved once
  })

  it('excludes captive/cultivated discovery and visits and isolates each identity', async () => {
    await sight(0, { lat: 50, lng: 8 }, 'captive')
    await sight(1, { lat: 49, lng: 8 }, 'cultivated')
    await sight(2, { lat: 50, lng: 8 }, 'wild', otherId)
    await study(2, otherId)
    await study(1) // independent of cultivation in the journal
    expect(await progress()).toMatchObject({ catalogue: { discovered: 0, studied: 1 }, territory: { germanSightings: 0, visitedRegions: 0 } })
  })

  it('does not turn selected regions, place text, foreign or open-water points into visits', async () => {
    await db.filter.create({ data: { identityId, regionId: regionIds[0], regionIds, tiles: ['bird'] } })
    await sight(0, { place: 'Germany', lat: 50 }) // incomplete coordinate
    await sight(1, { lat: 35.68, lng: 139.69 }) // foreign
    await sight(2, { lat: 47.6, lng: 9.5 }) // open lake, no land membership
    const before = await progress()
    expect(before).toMatchObject({ catalogue: { discovered: 3 }, territory: { germanSightings: 0, visitedRegions: 0 } })
    await db.filter.update({ where: { identityId }, data: { regionId: regionIds[1], tiles: ['plant'] } })
    expect(await progress()).toEqual(before)
  })

  it('assigns an official shared boundary to exactly one region by immutable key', async () => {
    await sight(0, { lat: 49.5, lng: 8 })
    expect(await progress()).toMatchObject({ territory: { germanSightings: 1, visitedRegions: 1, visitedRegionIds: [regionIds[0]] } })
  })

  it('labels a refresh and recalculates intersections without rewriting personal evidence', async () => {
    await sight(0)
    await sight(1)
    await sight(2)
    await sight(4)
    await study(0)
    await study(1)
    await study(2)
    await study(4)
    const before = await db.identity.findUniqueOrThrow({ where: { id: identityId }, include: { sightings: { orderBy: { id: 'asc' } }, studies: { orderBy: { id: 'asc' } } } })
    expect(await progress()).toMatchObject({ catalogue: { id: catalogueIds[0], species: 4, discovered: 3, studied: 3 } })
    await db.$transaction([
      db.catalogueVersion.update({ where: { id: catalogueIds[0] }, data: { status: 'retired' } }),
      db.catalogueVersion.update({ where: { id: catalogueIds[1] }, data: { status: 'active', activatedAt: new Date() } }),
    ])
    expect(await progress()).toMatchObject({ catalogue: { id: catalogueIds[1], runKey: 'issue26-1', species: 2, discovered: 2, studied: 2 } })
    expect(await db.identity.findUniqueOrThrow({ where: { id: identityId }, include: { sightings: { orderBy: { id: 'asc' } }, studies: { orderBy: { id: 'asc' } } } })).toEqual(before)
  })

  it('keeps every progress measure stable when reference assets are added, reordered and removed', async () => {
    await sight(0, { lat: 50, lng: 8 })
    await study(1)
    const before = await progress()
    await db.asset.createMany({ data: [0, 1, 2].map((index) => ({ taxonId: taxonIds[0], origin: 'inat' as const, kind: 'image' as const, url: `https://example.test/${index}.jpg`, sourceUrl: 'https://example.test/source', author: 'Fixture', licence: 'cc-by', createdAt: new Date(2024, 0, index + 1) })) })
    expect(await progress()).toEqual(before)
    await db.asset.updateMany({ where: { taxonId: taxonIds[0] }, data: { createdAt: new Date('2020-01-01') } })
    expect(await progress()).toEqual(before)
    await db.asset.deleteMany({ where: { taxonId: taxonIds[0] } })
    expect(await progress()).toEqual(before)
  })

  it('preserves the existing location-independent regional progress and global state', async () => {
    await sight(0)
    await sight(1, { lat: 35.68, lng: 139.69 })
    await sight(2, { lat: 50, lng: 8 }, 'captive')
    await sight(3, {}, 'cultivated')
    await study(0)
    const regional = dexRouter.createCaller(ctx), identity = identityRouter.createCaller(ctx)
    const before = await regional.setCounts({ regionId: regionIds[0], tiles: ['bird', 'plant'] })
    const personal = await identity.progress()
    await progress()
    expect(await regional.setCounts({ regionId: regionIds[0], tiles: ['bird', 'plant'] })).toEqual(before)
    expect(before).toMatchObject({ total: 4, seen: { bird: 1, plant: 1 }, studied: { bird: 1, plant: 0 } })
    expect(await identity.progress()).toEqual(personal)
  })

  it('distinguishes no active catalogue, no registry, and unavailable geometry from zero progress', async () => {
    await db.catalogueVersion.update({ where: { id: catalogueIds[0] }, data: { status: 'audited' } })
    expect(await progress()).toMatchObject({ catalogue: null, territory: { germanSightings: 0, visitedRegions: 0 } })
    const unavailable = await germanyProgress(db, identityId, async () => ({ status: 'geometry-unavailable' }))
    expect(unavailable.territory).toMatchObject({ germanSightings: null, visitedRegions: null, visitedRegionIds: null })
    await db.regionRegistryVersion.update({ where: { id: registryId }, data: { active: false } })
    expect(await progress()).toEqual({ countryCode: 'DE', catalogue: null, territory: null })
  })

  it('serves the owner-bound endpoint with real BKG land containment, composite cities and open water', async () => {
    await sight(0, { lat: 49.2017, lng: 7.6058 }) // Pirmasens, Südwestpfalz composite
    await sight(0, { lat: 49.2494, lng: 7.364 }) // Zweibrücken, same composite
    await sight(1, { lat: 49.999, lng: 8.273 }) // Mainz
    await sight(2, { lat: 47.6259, lng: 9.3683 }) // Bodensee open water
    await sight(2, { lat: 54.4, lng: 7.8 }) // North Sea
    await sight(3, { lat: 52, lng: 4 }) // Netherlands
    await sight(3) // no coordinates
    await sight(4, { lat: 49.999, lng: 8.273 }, 'wild', otherId)
    const result = await identityRouter.createCaller(ctx).germanyProgress()
    expect(result).toMatchObject({ catalogue: { species: 4, discovered: 4 }, territory: { germanSightings: 3, visitedRegions: 2, visitedRegionIds: regionIds } })
    expect(JSON.stringify(result)).not.toMatch(/"(?:lat|lng|place|sightings)":/)
  })

  it('does not return a partial geographic count if geometry becomes unavailable', async () => {
    await sight(0, { lat: 50, lng: 8 })
    await sight(1, { lat: 49, lng: 8 })
    let calls = 0
    const result = await germanyProgress(db, identityId, async () => ++calls === 1 ? { status: 'ok', regionKeys: [north] } : { status: 'geometry-unavailable' })
    expect(result).toMatchObject({ catalogue: { discovered: 2 }, territory: { germanSightings: null, visitedRegions: null, visitedRegionIds: null } })
  })
})
