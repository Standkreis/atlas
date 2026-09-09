import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { db } from '../../etl/db'
import { NAMES_VERSION, runNames, type NamesFetch } from '../../etl/names-work'

const registryId = randomUUID(), catalogueId = randomUUID()
const ids = Array.from({ length: 7 }, randomUUID)
const keys = ids.map((_, index) => 991021001 + index)
let regionId: string
const fingerprint = (character: string) => character.repeat(64)
const matched = (qid: string, names: { de?: string; en?: string; ja?: string } = {}): ReturnType<NamesFetch> => Promise.resolve({
  match: { path: 'P846', item: { qid, rank: 'http://www.wikidata.org/entity/Q7432', deLabel: names.de, enLabel: names.en, jaLabel: names.ja } },
  sourceFingerprint: fingerprint(qid.at(-1)?.toLowerCase() ?? 'a'),
})
const run = (options: Partial<Parameters<typeof runNames>[0]> = {}) => runNames({ catalogueVersionId: catalogueId, log: () => {}, fetchNames: async () => matched('Q1', { de: 'Name' }), ...options })

beforeAll(async () => {
  await db.regionRegistryVersion.create({ data: { id: registryId, countryCode: 'DE', version: registryId, artifactSha256: fingerprint('a'), expectedRegions: 1, expectedSourceUnits: 1 } })
  const source = await db.regionRegistrySource.create({ data: { registryVersionId: registryId, role: 'regions', name: 'Names fixture', url: 'https://example.test/source', topicDate: new Date(), downloadedAt: new Date(), sha256: fingerprint('b'), licenceId: 'dl-de/by-2-0', attribution: 'Fixture' } })
  const region = await db.region.create({ data: { name: `Names ${registryId}`, higher: 'Deutschland', canonicalKey: `names-${registryId}` } })
  regionId = region.id
  const entry = await db.regionRegistryEntry.create({ data: { registryVersionId: registryId, sourceId: source.id, regionId, sourceCode: registryId, displayName: region.name, sourceName: region.name, stateCode: '99', stateName: 'Fixtureland' } })
  await db.catalogueVersion.create({ data: { id: catalogueId, countryCode: 'DE', runKey: catalogueId, registryVersionId: registryId, inputFingerprint: 'i', sourceFingerprint: 's', plausibleRulesVersion: 1, tileMappingVersion: 1, observationWindowVersion: 1, yearFrom: 2016, yearTo: 2026, occurrencePredicates: {}, expectedRegions: 1, completedRegions: 1, generatedAt: new Date(), responseFingerprint: 'r', unionFingerprint: 'u', unionTaxa: 6, status: 'complete' } })
  await db.taxon.createMany({ data: ids.map((id, index) => ({ id, gbifKey: keys[index], sciName: `Names fixture ${index}`, rank: 'species', tile: 'bird' as const })) })
  await db.catalogueTaxon.createMany({ data: ids.slice(0, 6).map((taxonId) => ({ catalogueVersionId: catalogueId, taxonId })) })
  const build = await db.catalogueRegionBuild.create({ data: { catalogueVersionId: catalogueId, registryVersionId: registryId, registryEntryId: entry.id, status: 'complete', totalObservations: 100, monthTotals: Array(12).fill(100), regionSize: 1, perTile: { bird: 1 }, rejectedTaxa: [], requestStats: {}, responseFingerprint: 'r', setFingerprint: 's', completedAt: new Date() } })
  await db.cataloguePlausibility.create({ data: { regionBuildId: build.id, taxonId: ids[0], obs: 100, monthShare: Array(12).fill(10), peak: 1, words: 'common' } })
})

afterAll(async () => {
  await db.taxonEnrichmentWork.deleteMany({ where: { taxonId: { in: ids } } })
  await db.cataloguePlausibility.deleteMany({ where: { taxonId: { in: ids } } })
  await db.catalogueRegionBuild.deleteMany({ where: { catalogueVersionId: catalogueId } })
  await db.catalogueTaxon.deleteMany({ where: { catalogueVersionId: catalogueId } })
  await db.catalogueVersion.delete({ where: { id: catalogueId } })
  await db.regionRegistryEntry.deleteMany({ where: { registryVersionId: registryId } })
  await db.regionRegistrySource.deleteMany({ where: { registryVersionId: registryId } })
  await db.regionRegistryVersion.delete({ where: { id: registryId } })
  await db.region.delete({ where: { id: regionId } })
  await db.taxon.deleteMany({ where: { id: { in: ids } } })
  await db.$disconnect()
})

describe('resumable names-only catalogue work', () => {
  it('validates catalogue/region/key scope before seeding', async () => {
    await expect(run({ keys: [keys[6]] })).rejects.toThrow('must all belong')
    await expect(run({ region: regionId, keys: [keys[1]] })).rejects.toThrow('must all belong')
    expect(await db.taxonEnrichmentWork.count({ where: { taxonId: { in: ids }, kind: 'names' } })).toBe(0)
    expect(await run({ region: regionId, keys: [keys[0]] })).toMatchObject({ examined: 1, changed: 1, work: { counts: { complete: 1 } } })
  })

  it('merges only missing nonempty labels and preserves all other taxon content', async () => {
    const contentAt = new Date('2026-01-02T03:04:05Z')
    await db.taxon.update({ where: { id: ids[1] }, data: { commonNames: { de: 'Bestehend', nl: 'Bestaand', en: '' }, namePath: 'legacy', contentAt, tags: ['native'], facts: { habitat: { value: 'forest' } } } })
    const report = await run({ keys: [keys[1]], fetchNames: async () => matched('Q2', { de: 'Neu', en: 'New', ja: '新しい' }) })
    expect(report).toMatchObject({ examined: 1, changed: 1, labelsAdded: { en: 1, ja: 1 }, failed: 0 })
    const taxon = await db.taxon.findUniqueOrThrow({ where: { id: ids[1] } })
    expect(taxon).toMatchObject({ commonNames: { de: 'Bestehend', nl: 'Bestaand', en: 'New', ja: '新しい' }, namePath: 'legacy', contentAt, tags: ['native'], facts: { habitat: { value: 'forest' } }, wikidataId: null })
    const work = await db.taxonEnrichmentWork.findUniqueOrThrow({ where: { taxonId_kind_version: { taxonId: ids[1], kind: 'names', version: NAMES_VERSION } } })
    expect(work).toMatchObject({ status: 'complete', sourceFingerprint: fingerprint('2'), resultSummary: { outcome: 'matched', selected: { de: 'Neu', en: 'New', ja: '新しい' }, added: { en: 'New', ja: '新しい' }, changed: true, source: { qid: 'Q2', path: 'P846' } } })
  })

  it('checkpoints missing, non-species, and ambiguous sources as conservative completed fallbacks', async () => {
    const fetches: NamesFetch[] = [
      async () => ({ match: { path: 'none', item: null }, sourceFingerprint: fingerprint('c') }),
      async () => ({ match: { path: 'none', item: null, note: 'Q3 via P846 is not a species (genus)' }, sourceFingerprint: fingerprint('d') }),
      async () => ({ match: { path: 'P846', item: { qid: 'Q4', deLabel: 'Conflicting name', dewiki: 'https://de.wikipedia.org/wiki/Conflict' }, note: '2 items via P846, took Q4' }, sourceFingerprint: fingerprint('e') }),
    ]
    for (let index = 0; index < fetches.length; index++) await run({ keys: [keys[index + 2]], fetchNames: fetches[index] })
    const work = await db.taxonEnrichmentWork.findMany({ where: { taxonId: { in: ids.slice(2, 5) }, kind: 'names', version: NAMES_VERSION }, orderBy: { taxonId: 'asc' } })
    expect(work.every((row) => row.status === 'complete')).toBe(true)
    expect(work.map((row) => (row.resultSummary as { outcome: string }).outcome).sort()).toEqual(['ambiguous', 'non-species', 'scientific-fallback'])
    expect((await db.taxon.findMany({ where: { id: { in: ids.slice(2, 5) } }, select: { commonNames: true } })).every((taxon) => JSON.stringify(taxon.commonNames) === '{}')).toBe(true)
  })

  it('keeps provider and identity failures retryable, then skips completed work', async () => {
    const key = { taxonId: ids[5], kind: 'names', version: NAMES_VERSION }
    const failed = await run({ keys: [keys[5]], fetchNames: async () => { throw new Error('Wikidata unavailable') } })
    expect(failed).toMatchObject({ failed: 1, changed: 0 })
    expect(await db.taxonEnrichmentWork.findUniqueOrThrow({ where: { taxonId_kind_version: key } })).toMatchObject({ status: 'failed', attempts: 1, error: 'Wikidata unavailable' })
    expect(await run({ keys: [keys[5]], fetchNames: async () => ({ match: { path: 'none', item: null }, sourceFingerprint: 'not-a-digest' }) })).toMatchObject({ failed: 1, changed: 0 })
    expect(await db.taxonEnrichmentWork.findUniqueOrThrow({ where: { taxonId_kind_version: key } })).toMatchObject({ status: 'failed', attempts: 2, error: `malformed names source fingerprint for ${keys[5]}` })
    const retried = await run({ keys: [keys[5]], fetchNames: async (taxon) => { await db.taxon.update({ where: { id: taxon.id }, data: { sciName: `${taxon.sciName} drift` } }); return matched('Q5', { en: 'Retry' }) } })
    expect(retried).toMatchObject({ failed: 1, changed: 0 })
    await db.taxon.update({ where: { id: ids[5] }, data: { sciName: 'Names fixture 5' } })
    expect(await run({ keys: [keys[5]], fetchNames: async () => matched('Q5', { en: 'Retry' }) })).toMatchObject({ failed: 0, changed: 1 })
    const fetchNames = vi.fn(async () => matched('Q6', { de: 'Should not run' }))
    expect(await run({ keys: [keys[5]], fetchNames })).toMatchObject({ examined: 0, changed: 0, work: { counts: { complete: 1 } } })
    expect(fetchNames).not.toHaveBeenCalled()
    expect(await db.cataloguePlausibility.count({ where: { taxonId: ids[5] } })).toBe(0)
  })

  it('emits clean JSON from the names CLI', () => {
    const output = execFileSync(process.execPath, ['--import', 'tsx', 'etl/cli.ts', 'names', '--catalogue', catalogueId, '--keys', String(keys[5]), '--json'], { encoding: 'utf8', env: process.env, stdio: ['ignore', 'pipe', 'pipe'] })
    expect(JSON.parse(output)).toMatchObject({ catalogueVersionId: catalogueId, examined: 0, work: { counts: { complete: 1 } } })
  })
})
