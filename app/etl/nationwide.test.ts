import { describe, expect, it, vi } from 'vitest'
import type { Species } from './gbif'
import type { RegistryRegionCalculation } from './region'
import {
  canonicalJson,
  catalogueOutliers,
  catalogueTaxonomyResolver,
  fingerprint,
  formatNationwideReport,
  reportNationwide,
  runGermany,
  type CatalogueHandle,
  type NationwideReport,
  type NationwideStore,
  type RegionClaim,
  type StagedRegion,
  type StoredTaxonomyResolution,
} from './nationwide'

const ZERO_REQUESTS = { perHost: {}, networkAttempts: 0, hits: 0, misses: 0, retries: 0, tooMany: 0 }

function calculation(key: string, gbifKey: number): RegistryRegionCalculation {
  const species: Species = { key: gbifKey, rank: 'SPECIES', canonicalName: `Species ${gbifKey}`, genus: `Genus ${gbifKey}` }
  return {
    target: {
      regionId: `region-${key}`,
      regionKey: key,
      registryEntryId: `entry-${key}`,
      gadmGid: null,
      name: key,
      higher: 'Deutschland › Testland',
      queryUnits: [`query-${key}`],
      registryVersion: 'registry-1',
    },
    total: 100,
    monthTotals: Array(12).fill(10),
    perTile: { plant: 1 },
    taxa: [{ gbifKey, sciName: species.canonicalName!, rank: 'species', tile: 'plant', class: null, order: null, genus: species.genus! }],
    plausibility: [{ gbifKey, obs: 20, monthShare: Array(12).fill(10_000), peak: 10_000, words: 'Ganzes Jahr' }],
    lookalikePairs: [],
    rejectedTaxa: [],
    taxonomyResolutions: [{ sourceKey: gbifKey, status: 'accepted', acceptedKey: gbifKey, species }],
    seconds: 1,
    requests: ZERO_REQUESTS,
  }
}

type FakeBuild = RegionClaim & { status: 'pending' | 'running' | 'complete' | 'failed'; owner: string | null; error: string | null; staged?: StagedRegion }

class FakeStore implements NationwideStore {
  handle: CatalogueHandle = {
    id: 'catalogue-1', countryCode: 'DE', runKey: 'germany-1', registryVersionId: 'registry-1', status: 'partial',
    inputFingerprint: 'input', sourceFingerprint: 'source', expectedRegions: 2, completedRegions: 0, unionTaxa: 0,
  }
  builds: FakeBuild[] = ['de-krg-1', 'de-krg-2'].map((regionKey, index) => ({
    id: `build-${index + 1}`, registryEntryId: `entry-${regionKey}`, regionKey, attempts: 0, status: 'pending', owner: null, error: null,
  }))
  taxonomy = new Map<number, StoredTaxonomyResolution>()
  executionOwner: string | null = null
  union = new Set<number>()

  async prepare() { return { ...this.handle } }
  async acquireExecution(_id: string, owner: string) {
    if (this.executionOwner && this.executionOwner !== owner) return false
    this.executionOwner = owner
    this.handle.status = 'building'
    return true
  }
  async renewExecution(_id: string, owner: string) { return this.executionOwner === owner }
  async releaseExecution(_id: string, owner: string) {
    if (this.executionOwner === owner) {
      this.executionOwner = null
      if (this.handle.status === 'building') this.handle.status = 'partial'
    }
  }
  async claimRegion(_id: string, owner: string, _now: Date, _expires: Date, attempted: ReadonlySet<string>) {
    const build = this.builds.find((row) => !attempted.has(row.id) && (row.status === 'pending' || row.status === 'failed'))
    if (!build) return null
    build.status = 'running'; build.owner = owner; build.attempts++
    return { id: build.id, registryEntryId: build.registryEntryId, regionKey: build.regionKey, attempts: build.attempts }
  }
  async renewRegion(_catalogueId: string, claimId: string, owner: string) {
    const build = this.builds.find((row) => row.id === claimId)
    return this.executionOwner === owner && build?.owner === owner && build.status === 'running'
  }
  async stageRegion(_catalogue: CatalogueHandle, claim: RegionClaim, owner: string, _at: Date, staged: StagedRegion) {
    const build = this.builds.find((row) => row.id === claim.id)!
    if (this.executionOwner !== owner || build.owner !== owner || build.status !== 'running') return false
    build.status = 'complete'; build.owner = null; build.staged = staged; build.error = null
    return true
  }
  async failRegion(_catalogue: string, claim: RegionClaim, owner: string, _at: Date, error: string) {
    const build = this.builds.find((row) => row.id === claim.id)!
    if (build.owner !== owner || build.status !== 'running') return false
    build.status = 'failed'; build.owner = null; build.error = error
    return true
  }
  async loadTaxonomy(_id: string, keys: readonly number[]) { return keys.flatMap((key) => this.taxonomy.get(key) ?? []) }
  async saveTaxonomy(_id: string, rows: readonly StoredTaxonomyResolution[]) { for (const row of rows) this.taxonomy.set(row.sourceKey, row) }
  async finalize(_id: string, owner: string) {
    if (this.executionOwner !== owner) return false
    const complete = this.builds.filter((row) => row.status === 'complete')
    this.handle.completedRegions = complete.length
    if (complete.length === this.handle.expectedRegions) {
      this.union = new Set(complete.flatMap((row) => row.staged!.calculation.taxa.map((taxon) => taxon.gbifKey)))
      this.handle.unionTaxa = this.union.size; this.handle.status = 'complete'; this.executionOwner = null
      return true
    }
    this.handle.status = 'partial'; this.executionOwner = null
    return false
  }
  async report(_id: string, stoppedReason: string | null = null): Promise<NationwideReport> {
    const rows = this.builds.map((build) => ({
      key: build.regionKey, name: build.regionKey, state: 'Testland', status: build.status, attempts: build.attempts,
      observations: build.staged?.calculation.total ?? null, size: build.staged?.calculation.plausibility.length ?? null,
      perTile: build.staged?.calculation.perTile ?? {}, rejectedTaxa: build.staged?.calculation.rejectedTaxa.length ?? 0,
      requestStats: ZERO_REQUESTS, seconds: build.staged?.calculation.seconds ?? null, error: build.error,
      responseFingerprint: build.staged?.responseFingerprint ?? null, setFingerprint: build.staged?.setFingerprint ?? null,
    }))
    const count = (status: string) => rows.filter((row) => row.status === status).length
    return {
      catalogue: {
        id: this.handle.id, countryCode: 'DE', runKey: this.handle.runKey, status: this.handle.status,
        inputFingerprint: 'input', sourceFingerprint: 'source', responseFingerprint: null, unionFingerprint: this.union.size ? fingerprint([...this.union]) : null,
        registryVersionId: 'registry-1', registryVersion: 'test', sourceTopicDates: ['2024-12-31'],
        observationWindow: { version: 1, yearFrom: 2016, yearTo: 2026 }, plausibleRulesVersion: 1, tileMappingVersion: 1,
        occurrencePredicates: {}, startedAt: '2026-09-08T00:00:00.000Z', generatedAt: this.handle.status === 'complete' ? '2026-09-08T00:00:01.000Z' : null, elapsedSeconds: 1,
      },
      regions: { expected: 2, complete: count('complete'), failed: count('failed'), pending: count('pending'), running: count('running'), rows },
      national: { uniqueTaxa: this.union.size, perTile: this.union.size ? { plant: this.union.size } : {}, unionFingerprint: fingerprint([...this.union]), contentComplete: 0, contentAwaiting: this.union.size },
      enrichment: {}, requests: ZERO_REQUESTS, outliers: catalogueOutliers(rows), stoppedReason,
    }
  }
}

const passthroughCapture = async <T>(fn: () => Promise<T>) => ({ value: await fn(), fingerprint: 'captured', requests: ZERO_REQUESTS })
const passthroughFresh = <T>(fn: () => Promise<T>) => fn()

describe('nationwide fingerprints and reports', () => {
  it('canonicalizes object keys without changing array order', () => {
    expect(canonicalJson({ z: 1, a: { y: 2, x: [3, 1] } })).toBe('{"a":{"x":[3,1],"y":2},"z":1}')
    expect(fingerprint({ b: 2, a: 1 })).toBe(fingerprint({ a: 1, b: 2 }))
  })

  it('finds deterministic regional size outliers and formats the human summary', async () => {
    const store = new FakeStore()
    const report = await reportNationwide('catalogue-1', store)
    expect(report.outliers.smallest).toEqual([])
    expect(formatNationwideReport(report)).toContain('Regions 0/2 complete')
  })
})

describe('catalogue taxonomy checkpoint', () => {
  it('reuses accepted and terminal records without a second lookup', async () => {
    const store = new FakeStore()
    const lookup = vi.fn(async (key: number): Promise<Species | null> => key === 2
      ? { key: 2, rank: 'SPECIES', canonicalName: 'Old name', acceptedKey: 1, taxonomicStatus: 'SYNONYM' }
      : { key: 1, rank: 'SPECIES', canonicalName: 'Accepted name', taxonomicStatus: 'ACCEPTED' })
    const resolve = catalogueTaxonomyResolver('catalogue-1', store, lookup)
    expect((await resolve([2])).resolved.get(2)?.acceptedKey).toBe(1)
    expect(lookup).toHaveBeenCalledTimes(2)
    expect((await resolve([2, 1])).resolved.size).toBe(2)
    expect(lookup).toHaveBeenCalledTimes(2)
  })

  it('rejects a taxonomy checkpoint whose envelope no longer matches its digest', async () => {
    const store = new FakeStore()
    store.taxonomy.set(7, {
      sourceKey: 7,
      acceptedKey: 7,
      rejectionReason: null,
      record: { version: 1, status: 'accepted', acceptedKey: 7, species: { key: 7, rank: 'SPECIES', canonicalName: 'Damaged example' } },
      recordFingerprint: '0'.repeat(64),
    })
    const resolve = catalogueTaxonomyResolver('catalogue-1', store)
    await expect(resolve([7])).rejects.toThrow('does not match its fingerprint')
  })
})

describe('nationwide orchestration', () => {
  const base = (store: FakeStore) => ({
    registryVersionId: 'registry-1', runKey: 'germany-1', store, owner: 'worker-1',
    now: () => new Date('2026-09-08T00:00:00.000Z'), log: () => {}, fresh: passthroughFresh,
    capture: passthroughCapture,
  })

  it('stages every region, deduplicates the union, and makes an unchanged rerun a no-op', async () => {
    const store = new FakeStore()
    const calculate = vi.fn(async (_registry: string, key: string) => calculation(key, 1))
    const first = await runGermany({ ...base(store), calculate })
    expect(first).toMatchObject({ attempted: 2, completed: 2, failed: 0 })
    expect(first.report.catalogue.status).toBe('complete')
    expect(first.report.national.uniqueTaxa).toBe(1)
    const second = await runGermany({ ...base(store), calculate })
    expect(second).toMatchObject({ attempted: 0, completed: 0, owner: null })
    expect(calculate).toHaveBeenCalledTimes(2)
  })

  it('isolates a failed region and retries only it on the next invocation', async () => {
    const store = new FakeStore()
    let fail = true
    const calculate = vi.fn(async (_registry: string, key: string) => {
      if (key === 'de-krg-1' && fail) throw new Error('temporary upstream failure')
      return calculation(key, key === 'de-krg-1' ? 1 : 2)
    })
    const first = await runGermany({ ...base(store), calculate })
    expect(first).toMatchObject({ attempted: 2, completed: 1, failed: 1 })
    expect(first.report.catalogue.status).toBe('partial')
    fail = false
    const second = await runGermany({ ...base(store), calculate })
    expect(second).toMatchObject({ attempted: 1, completed: 1, failed: 0 })
    expect(second.report.national.uniqueTaxa).toBe(2)
    expect(store.builds.map((row) => row.attempts)).toEqual([2, 1])
  })

  it('stops claiming new regions after exhausting the request budget', async () => {
    const store = new FakeStore()
    const calculate = vi.fn(async () => { throw new Error('total request budget exhausted (10 network attempts)') })
    const result = await runGermany({ ...base(store), calculate })
    expect(result).toMatchObject({ attempted: 1, failed: 1, stoppedReason: 'request budget exhausted' })
    expect(store.builds.map((row) => row.status)).toEqual(['failed', 'pending'])
  })

  it('rejects unsafe concurrency and another active execution lease', async () => {
    const store = new FakeStore()
    await expect(runGermany({ ...base(store), concurrency: 5 })).rejects.toThrow('1 to 4')
    store.executionOwner = 'someone-else'
    await expect(runGermany({ ...base(store), calculate: async (_registry, key) => calculation(key, 1) })).rejects.toThrow('already running')
  })
})
