import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { db } from '../../etl/db'
import { GALLERY_VERSION, galleryScope, referenceImages, replaceReferenceGallery, runGallery, type GalleryFetch } from '../../etl/gallery-work'
import { prismaStore, runTaxonWork } from '../../etl/taxon-work'
import { runContent } from '../../etl/content'
import * as wikidata from '../../etl/wikidata'

const registryId = randomUUID(), catalogueId = randomUUID(), secondCatalogueId = randomUUID()
const ids = Array.from({ length: 6 }, randomUUID)
const keys = ids.map((_, i) => 990036001 + i)
let regionId: string
const image = (n: number, position = 0) => ({ position, url: `https://example.test/${n}.jpg`, author: 'Author', licence: 'CC BY 4.0', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: `https://example.test/file/${n}`, origin: 'commons' as const, caption: 'Bird' })
const fetched = (n: number): GalleryFetch => ({ status: 'ok', assets: [image(n)], acceptedEvidence: [{ ...image(n), sourceId: `commons:Fixture-${n}` }], rejections: [], coverage: { inat: false, commons: true } })
const run = (options: Partial<Parameters<typeof runGallery>[0]> = {}) => runGallery({ catalogueVersionId: catalogueId, log: () => {}, fetchGallery: async () => fetched(1), ...options })

beforeAll(async () => {
  await db.regionRegistryVersion.create({ data: { id: registryId, countryCode: 'DE', version: registryId, artifactSha256: 'a'.repeat(64), expectedRegions: 1, expectedSourceUnits: 1 } })
  const source = await db.regionRegistrySource.create({ data: { registryVersionId: registryId, role: 'regions', name: 'Gallery fixture', url: 'https://example.test/source', topicDate: new Date(), downloadedAt: new Date(), sha256: 'b'.repeat(64), licenceId: 'dl-de/by-2-0', attribution: 'Fixture' } })
  const region = await db.region.create({ data: { name: `Gallery ${registryId}`, higher: 'Deutschland', canonicalKey: `gallery-${registryId}` } })
  regionId = region.id
  const entry = await db.regionRegistryEntry.create({ data: { registryVersionId: registryId, sourceId: source.id, regionId, sourceCode: registryId, displayName: region.name, sourceName: region.name, stateCode: '99', stateName: 'Fixtureland' } })
  for (const id of [catalogueId, secondCatalogueId]) await db.catalogueVersion.create({ data: { id, countryCode: 'DE', runKey: id, registryVersionId: registryId, inputFingerprint: 'i', sourceFingerprint: 's', plausibleRulesVersion: 1, tileMappingVersion: 1, observationWindowVersion: 1, yearFrom: 2016, yearTo: 2026, occurrencePredicates: {}, expectedRegions: 1, completedRegions: 1, generatedAt: new Date(), responseFingerprint: 'r', unionFingerprint: 'u', unionTaxa: 5, status: 'complete' } })
  await db.taxon.createMany({ data: ids.map((id, i) => ({ id, gbifKey: keys[i], sciName: `Gallery fixture ${i}`, rank: 'species', tile: 'bird' as const })) })
  await db.catalogueTaxon.createMany({ data: [catalogueId, secondCatalogueId].flatMap((catalogueVersionId) => ids.slice(0, 5).map((taxonId) => ({ catalogueVersionId, taxonId }))) })
  const build = await db.catalogueRegionBuild.create({ data: { catalogueVersionId: catalogueId, registryVersionId: registryId, registryEntryId: entry.id, status: 'complete', totalObservations: 100, monthTotals: Array(12).fill(100), regionSize: 1, perTile: { bird: 1 }, rejectedTaxa: [], requestStats: {}, responseFingerprint: 'r', setFingerprint: 's', completedAt: new Date() } })
  await db.cataloguePlausibility.create({ data: { regionBuildId: build.id, taxonId: ids[0], obs: 100, monthShare: Array(12).fill(10), peak: 1, words: 'common' } })
})

afterAll(async () => {
  await db.taxonEnrichmentWork.deleteMany({ where: { taxonId: { in: ids } } })
  await db.cataloguePlausibility.deleteMany({ where: { taxonId: { in: ids } } })
  await db.catalogueRegionBuild.deleteMany({ where: { catalogueVersionId: { in: [catalogueId, secondCatalogueId] } } })
  await db.catalogueTaxon.deleteMany({ where: { catalogueVersionId: { in: [catalogueId, secondCatalogueId] } } })
  await db.catalogueVersion.deleteMany({ where: { id: { in: [catalogueId, secondCatalogueId] } } })
  await db.regionRegistryEntry.deleteMany({ where: { registryVersionId: registryId } })
  await db.regionRegistrySource.deleteMany({ where: { registryVersionId: registryId } })
  await db.regionRegistryVersion.delete({ where: { id: registryId } })
  await db.region.delete({ where: { id: regionId } })
  await db.taxon.deleteMany({ where: { id: { in: ids } } })
  await db.$disconnect()
})

describe('resumable gallery work', () => {
  it('validates region/key membership before seeding and claims only the allow-list', async () => {
    await expect(run({ keys: [keys[5]] })).rejects.toThrow('must all belong')
    await expect(run({ region: regionId, keys: [keys[1]] })).rejects.toThrow('must all belong')
    expect(await galleryScope({ catalogueVersionId: catalogueId, region: regionId })).toHaveLength(1)
    await prismaStore.seed(ids.slice(0, 3).map((taxonId) => ({ taxonId, kind: 'gallery', version: GALLERY_VERSION })))
    const report = await run({ keys: [keys[0]], concurrency: 4 })
    expect(report).toMatchObject({ examined: 1, changed: 1, unchanged: 0, images: 1, failed: 0, sources: { commons: 1, commonsImages: 1 }, work: { completed: 1, counts: { complete: 1 } } })
    expect(await db.taxonEnrichmentWork.count({ where: { taxonId: { in: ids.slice(1, 3) }, status: 'pending' } })).toBe(2)
    await expect(runTaxonWork({ catalogueVersionId: catalogueId, kind: 'gallery', version: GALLERY_VERSION, taxonIds: [ids[5]], worker: async () => {} })).rejects.toThrow('outside')
  })

  it('reuses completed work in another catalogue without fetching or rewriting assets', async () => {
    const before = await db.asset.findMany({ where: referenceImages(ids[0]) })
    const fetchGallery = vi.fn(async () => fetched(2))
    expect(await run({ catalogueVersionId: secondCatalogueId, keys: [keys[0]], fetchGallery })).toMatchObject({ examined: 0, changed: 0, work: { counts: { complete: 1 } } })
    expect(fetchGallery).not.toHaveBeenCalled()
    expect(await db.asset.findMany({ where: referenceImages(ids[0]) })).toEqual(before)
  })

  it('preserves the complete old gallery on fetch or validation failure, then retries a successful zero', async () => {
    await db.$transaction((tx) => replaceReferenceGallery(tx, ids[1], [image(20)]))
    const before = await db.asset.findMany({ where: referenceImages(ids[1]) })
    expect(await run({ keys: [keys[1]], fetchGallery: async () => { throw new Error('provider down') } })).toMatchObject({ failed: 1, changed: 0 })
    expect(await db.asset.findMany({ where: referenceImages(ids[1]) })).toEqual(before)
    expect(await run({ keys: [keys[1]], fetchGallery: async () => ({ ...fetched(20), assets: [{ ...image(21), author: '' }] }) })).toMatchObject({ failed: 1, changed: 0 })
    expect(await db.asset.findMany({ where: referenceImages(ids[1]) })).toEqual(before)
    expect(await run({ keys: [keys[1]], fetchGallery: async () => ({ ...fetched(20), assets: [], acceptedEvidence: [], coverage: { inat: false, commons: false } }) })).toMatchObject({ failed: 0, changed: 1, zero: 1, images: 0 })
    expect(await db.asset.count({ where: referenceImages(ids[1]) })).toBe(0)
    expect(await run({ keys: [keys[1]] })).toMatchObject({ examined: 0, failed: 0 })
  })

  it('keeps identical image IDs and every non-reference media class', async () => {
    const identity = await db.identity.create({ data: {} })
    const sighting = await db.sighting.create({ data: { identityId: identity.id, taxonId: ids[2], at: new Date() } })
    const base = { ...image(30), taxonId: ids[2] }
    const protectedRows = await Promise.all([
      db.asset.create({ data: { ...base, kind: 'sound', origin: 'xeno-canto' } }),
      db.asset.create({ data: { ...base, origin: 'user' } }),
      db.asset.create({ data: { ...base, ownerId: identity.id } }),
      db.asset.create({ data: { ...base, sightingId: sighting.id } }),
      db.asset.create({ data: { ...base, avatarOf: { connect: { id: identity.id } } } }),
    ])
    await db.$transaction((tx) => replaceReferenceGallery(tx, ids[2], [image(31), image(32, 1)]))
    await db.taxonEnrichmentWork.create({ data: { taxonId: ids[2], kind: 'gallery', version: 'licensed-gallery-v5', status: 'complete', completedAt: new Date(), sourceFingerprint: '5'.repeat(64), resultSummary: { historical: true } } })
    const before = await db.asset.findMany({ where: referenceImages(ids[2]), orderBy: { position: 'asc' } })
    const replayAssets = [image(31), image(32, 1)]
    const report = await run({ keys: [keys[2]], fetchGallery: async () => ({ ...fetched(31), assets: replayAssets, acceptedEvidence: replayAssets.map((asset) => ({ ...asset, sourceId: `commons:Fixture-${asset.position}` })), rejections: [{ source: 'commons:cap', reason: 'gallery-cap' }, { source: 'commons:bad', reason: 'missing-author' }] }) })
    expect(report).toMatchObject({ changed: 0, unchanged: 1, images: 2, capped: 1, rejected: 1 })
    expect(await db.asset.findMany({ where: referenceImages(ids[2]), orderBy: { position: 'asc' } })).toEqual(before)
    expect(await db.taxonEnrichmentWork.findUnique({ where: { taxonId_kind_version: { taxonId: ids[2], kind: 'gallery', version: 'licensed-gallery-v5' } } })).toMatchObject({ status: 'complete', resultSummary: { historical: true } })
    expect(await db.asset.count({ where: { id: { in: protectedRows.map((a) => a.id) } } })).toBe(5)
    await db.asset.deleteMany({ where: { id: { in: protectedRows.map((a) => a.id) } } })
    await db.identity.delete({ where: { id: identity.id } })
  })

  it('rolls back replacement and completion together, and lost leases never publish', async () => {
    const key = { taxonId: ids[3], kind: 'gallery', version: GALLERY_VERSION }
    await prismaStore.seed([key])
    await prismaStore.claim(catalogueId, key.kind, key.version, 'owner', new Date(), new Date(Date.now() + 60000), new Set(), [key.taxonId])
    await db.$transaction((tx) => replaceReferenceGallery(tx, key.taxonId, [image(40)]))
    const before = await db.asset.findMany({ where: referenceImages(key.taxonId) })
    await expect(prismaStore.complete(key, 'owner', new Date(), { publish: async (tx) => { await replaceReferenceGallery(tx, key.taxonId, [image(41)]); throw new Error('after write') } })).rejects.toThrow('after write')
    expect(await db.asset.findMany({ where: referenceImages(key.taxonId) })).toEqual(before)
    const publish = vi.fn(async () => {})
    expect(await prismaStore.complete(key, 'stale-owner', new Date(), { publish })).toBe(false)
    expect(publish).not.toHaveBeenCalled()
    await db.taxonEnrichmentWork.update({ where: { taxonId_kind_version: key }, data: { leaseExpiresAt: new Date(0) } })
    expect(await run({ keys: [keys[3]], fetchGallery: async () => {
      await db.taxonEnrichmentWork.update({ where: { taxonId_kind_version: key }, data: { leaseOwner: 'replacement-owner' } })
      return fetched(42)
    } })).toMatchObject({ examined: 1, changed: 0, lost: 1 })
    expect(await db.asset.findMany({ where: referenceImages(key.taxonId) })).toEqual(before)
    await db.taxonEnrichmentWork.update({ where: { taxonId_kind_version: key }, data: { leaseExpiresAt: new Date(0) } })
    expect(await run({ keys: [keys[3]], fetchGallery: async () => fetched(42) })).toMatchObject({ changed: 1, failed: 0 })
  })

  it('limits attempted work and repeated limited runs advance', async () => {
    const report = await run({ limit: 1, concurrency: 8 })
    expect(report).toMatchObject({ examined: 1, work: { attempted: 1, completed: 1 } })
    expect(await run({ limit: 1 })).toMatchObject({ examined: 0, work: { counts: { complete: 5 } } })
  })

  it('keeps old content and media when legacy purge fails before fetching completes', async () => {
    const before = await db.taxon.findUniqueOrThrow({ where: { id: ids[0] }, include: { assets: true } })
    const spy = vi.spyOn(wikidata, 'wikidataFor').mockRejectedValueOnce(new Error('Wikidata unavailable'))
    await expect(runContent({ purge: keys[0], log: () => {} })).rejects.toThrow('unavailable')
    spy.mockRestore()
    expect(await db.taxon.findUniqueOrThrow({ where: { id: ids[0] }, include: { assets: true } })).toEqual(before)
  })

  it('runs the documented JSON CLI without mixing progress into stdout', () => {
    const output = execFileSync(process.execPath, ['--import', 'tsx', 'etl/cli.ts', 'gallery', '--catalogue', catalogueId, '--limit', '1', '--json'], { encoding: 'utf8', env: process.env, stdio: ['ignore', 'pipe', 'pipe'] })
    expect(JSON.parse(output)).toMatchObject({ catalogueVersionId: catalogueId, examined: 0, work: { counts: { complete: 5 } } })
  })
})
