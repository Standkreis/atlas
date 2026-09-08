import { describe, expect, it, vi } from 'vitest'
import { fingerprint } from './fingerprint'
import {
  catalogueHabitatResolver, decodeHabitatBatch, decideMarineHabitat, filterMarineRegion, habitatAudit,
  wormsMatchUrl, type HabitatEvidence, type HabitatStore, type StoredHabitatBatch,
} from './marine-habitat'
import type { RegistryRegionCalculation } from './region'

// Synthetic decision fixtures: no redistributed source response/database content.
const exact = (name: string, fields: Record<string, unknown> = {}) => ({
  scientificname: name, valid_name: name, AphiaID: 1, valid_AphiaID: 1, rank: 'Species', status: 'accepted',
  match_type: 'exact', isMarine: 1, isFreshwater: 0, isTerrestrial: 0, isBrackish: null, ...fields,
})
const fresh = (name: string, fields: Record<string, unknown> = {}) => [exact(name, fields)]
const now = () => new Date('2026-09-09T09:00:00Z')
class MemoryStore implements HabitatStore {
  batches = new Map<string, StoredHabitatBatch>()
  async loadHabitat(_id: string, names: readonly string[]) { return [...this.batches.values()].filter((batch) => batch.names.some((name) => names.includes(name))) }
  async saveHabitat(_id: string, batch: StoredHabitatBatch) { this.batches.set(batch.requestFingerprint, batch) }
}

describe('conservative marine evidence', () => {
  it.each(['Raja clavata', 'Styela clava', 'Tursiops truncatus'])('excludes exact marine evidence for %s', (name) => {
    expect(decideMarineHabitat(name, fresh(name))).toMatchObject({ exclude: true, reason: 'marine', aphiaId: 1 })
  })

  it.each([
    ['Salmo trutta', { isFreshwater: 1 }], ['Amphibious example', { isTerrestrial: true }],
    ['Coastal landbird', { isMarine: 0, isTerrestrial: 1 }], ['Freshwater example', { isMarine: null, isFreshwater: true }],
  ])('retains compatible %s even with positive marine evidence', (name, fields) => {
    expect(decideMarineHabitat(name, fresh(name, fields))).toMatchObject({ exclude: false, reason: 'compatible' })
  })

  it.each([null, undefined, '1', '0', 'true', 2])('treats isMarine=%s as unknown, not a boolean', (isMarine) => {
    expect(decideMarineHabitat('Unknown example', fresh('Unknown example', { isMarine }))).toMatchObject({ exclude: false, reason: 'unknown', isMarine: null })
  })

  it('requires positive marine evidence but does not convert absent compatibility to false', () => {
    expect(decideMarineHabitat('Marine example', fresh('Marine example', { isFreshwater: null, isTerrestrial: undefined })))
      .toMatchObject({ exclude: true, isFreshwater: null, isTerrestrial: null })
    expect(decideMarineHabitat('Brackish example', fresh('Brackish example', { isMarine: null, isBrackish: 1 })))
      .toMatchObject({ exclude: false, reason: 'unknown', isBrackish: true })
    expect(decideMarineHabitat('Nonmarine example', fresh('Nonmarine example', { isMarine: false })))
      .toMatchObject({ exclude: false, reason: 'nonmarine' })
  })

  it.each([
    { match_type: 'near_1' }, { match_type: undefined }, { status: 'unaccepted' }, { rank: 'Genus' },
    { scientificname: 'Different name' }, { valid_name: 'Different name' }, { valid_AphiaID: 2 }, { AphiaID: null },
  ])('retains a record that is not an exact accepted identity: %j', (fields) => {
    expect(decideMarineHabitat('Marine example', fresh('Marine example', fields))).toMatchObject({ exclude: false, reason: 'inexact' })
  })

  it('retains unmatched and ambiguous results without choosing the most convenient record', () => {
    expect(decideMarineHabitat('Missing example', [])).toMatchObject({ exclude: false, reason: 'unmatched' })
    expect(decideMarineHabitat('Missing example', null)).toMatchObject({ exclude: false, reason: 'unmatched' })
    expect(decideMarineHabitat('Homonym example', [exact('Homonym example'), exact('Homonym example', { AphiaID: 2, valid_AphiaID: 2 })]))
      .toMatchObject({ exclude: false, reason: 'ambiguous' })
    expect(() => decideMarineHabitat('Malformed example', {})).toThrow('invalid WoRMS match list')
  })
})

describe('bounded authoritative match checkpoints', () => {
  it('encodes array parameters and explicitly includes nonmarine matches', () => {
    const url = new URL(wormsMatchUrl(['Genus species', 'A & B']))
    expect(url.searchParams.getAll('scientificnames[]')).toEqual(['Genus species', 'A & B'])
    expect(url.searchParams.get('marine_only')).toBe('false')
    expect(() => wormsMatchUrl([])).toThrow('1–50')
    expect(() => wormsMatchUrl(Array.from({ length: 51 }, (_, index) => `Species ${index}`))).toThrow('1–50')
  })

  it('deduplicates names, batches at 50, and resumes in another resolver without source I/O', async () => {
    const store = new MemoryStore()
    const lookup = vi.fn(async (names: readonly string[]) => JSON.stringify(names.map(() => [])))
    const names = Array.from({ length: 103 }, (_, index) => `Species ${String(index).padStart(3, '0')}`)
    const result = await catalogueHabitatResolver('cat', store, lookup, now)([...names, names[0]!])
    expect(result.size).toBe(103)
    expect(lookup.mock.calls.map(([batch]) => batch.length)).toEqual([50, 50, 3])
    const resumed = await catalogueHabitatResolver('cat', store, lookup, now)(names.slice().reverse())
    expect([...resumed]).toEqual([...result])
    expect(lookup).toHaveBeenCalledTimes(3)
    const audit = habitatAudit([...store.batches.values()])
    expect(audit).toMatchObject({ batches: 3, names: 103, reasons: { unmatched: 103 }, sourceDates: ['2026-09-09'] })
    expect(JSON.stringify(audit)).not.toContain('rawResponse')
  })

  it('serializes overlapping concurrent regions to prevent duplicate name lookups', async () => {
    const store = new MemoryStore()
    const lookup = vi.fn(async (names: readonly string[]) => JSON.stringify(names.map((name) => fresh(name))))
    const resolve = catalogueHabitatResolver('cat', store, lookup, now)
    const [one, two] = await Promise.all([resolve(['Shared example', 'North example']), resolve(['Shared example', 'South example'])])
    expect(one.get('Shared example')).toEqual(two.get('Shared example'))
    expect(lookup.mock.calls.flatMap(([names]) => names).filter((name) => name === 'Shared example')).toHaveLength(1)
  })

  it('persists successful batches before request exhaustion and retries only missing names', async () => {
    const store = new MemoryStore()
    const names = Array.from({ length: 51 }, (_, index) => `Species ${String(index).padStart(3, '0')}`)
    const lookup = vi.fn(async (batch: readonly string[]) => {
      if (batch.length === 1) throw new Error('total request budget exhausted (1 network attempts)')
      return JSON.stringify(batch.map(() => []))
    })
    await expect(catalogueHabitatResolver('cat', store, lookup, now)(names)).rejects.toThrow('request budget exhausted')
    expect(store.batches.size).toBe(1)
    const retry = vi.fn(async (batch: readonly string[]) => JSON.stringify(batch.map(() => [])))
    expect((await catalogueHabitatResolver('cat', store, retry, now)(names)).size).toBe(51)
    expect(retry.mock.calls).toEqual([[[names[50]]]])
  })

  it.each(['null', '[]', '[{}]', '[[null]]', '[[null,null]]', 'not json'])('refuses malformed/incomplete source envelopes: %s', async (raw) => {
    const store = new MemoryStore()
    await expect(catalogueHabitatResolver('cat', store, async () => raw, now)(['Example species'])).rejects.toThrow()
    expect(store.batches.size).toBe(0)
  })

  it('detects damaged bodies and request/name/source drift in a checkpoint', async () => {
    const store = new MemoryStore()
    await catalogueHabitatResolver('cat', store, async () => ' [ [] ] ', now)(['Example species'])
    const saved = [...store.batches.values()][0]!
    expect((decodeHabitatBatch(saved).envelope).rawResponse).toBe(' [ [] ] ')
    expect(() => decodeHabitatBatch({ ...saved, recordFingerprint: 'bad' })).toThrow('fingerprint')
    expect(() => decodeHabitatBatch({ ...saved, names: ['Changed species'] })).toThrow('source envelope')
    expect(() => habitatAudit([saved, saved])).toThrow('overlapping name checkpoints')
    const changed = { ...decodeHabitatBatch(saved).envelope, source: { ...decodeHabitatBatch(saved).envelope.source, marine_only: true } }
    expect(() => decodeHabitatBatch({ ...saved, record: changed, recordFingerprint: fingerprint(changed) })).toThrow('source envelope')
  })
})

describe('regional downstream consistency', () => {
  it('removes both directions of lookalikes and recalculates tile counts without altering source observation totals', () => {
    const names = ['Raja clavata', 'Salmo trutta', 'Unknown species']
    const calculation: RegistryRegionCalculation = {
      target: { regionId: 'north', regionKey: 'north', registryEntryId: 'entry', gadmGid: null, name: 'North', higher: 'DE', queryUnits: ['query'], registryVersion: 'registry' },
      total: 100, monthTotals: Array(12).fill(50), perTile: { fish: 3 },
      taxa: names.map((sciName, index) => ({ gbifKey: index + 1, sciName, tile: 'fish', rank: 'species', class: null, order: null, genus: 'Example' })),
      plausibility: names.map((_, index) => ({ gbifKey: index + 1, obs: 20, monthShare: Array(12).fill(10), peak: 10, words: 'all' })),
      lookalikePairs: [[1, 2], [2, 1], [2, 3], [3, 2]], rejectedTaxa: [], taxonomyResolutions: [], seconds: 1,
      requests: { perHost: {}, hits: 0, misses: 0, retries: 0, tooMany: 0 },
    }
    const evidence = new Map<string, HabitatEvidence>(names.map((name, index) => [name, {
      ...decideMarineHabitat(name, index === 2 ? [] : fresh(name, { isFreshwater: index === 1 ? 1 : 0 })), batchFingerprint: 'source',
    }]))
    const filtered = filterMarineRegion(calculation, evidence)
    expect(filtered.calculation.taxa.map((taxon) => taxon.gbifKey)).toEqual([2, 3])
    expect(filtered.calculation.plausibility.map((taxon) => taxon.gbifKey)).toEqual([2, 3])
    expect(filtered.calculation.lookalikePairs).toEqual([[2, 3], [3, 2]])
    expect(filtered.calculation.perTile).toEqual({ fish: 2 })
    expect(filtered.calculation.total).toBe(100)
    expect(filtered.calculation.monthTotals).toEqual(calculation.monthTotals)
    expect(filtered.summary).toMatchObject({ examined: 3, retained: 2, reasons: { marine: 1, compatible: 1, unmatched: 1 }, excluded: [{ gbifKey: 1, sciName: 'Raja clavata', aphiaId: 1 }] })
    expect(calculation.taxa).toHaveLength(3)
    expect(() => filterMarineRegion(calculation, new Map())).toThrow('missing habitat evidence')
  })
})
