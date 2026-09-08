import { describe, expect, it, vi } from 'vitest'
import { resolveAcceptedSpecies } from './accepted-taxonomy'
import type { Species } from './gbif'

const species = (key: number, extra: Partial<Species> = {}): Species => ({
  key,
  rank: 'SPECIES',
  canonicalName: `Species ${key}`,
  taxonomicStatus: 'ACCEPTED',
  ...extra,
})

describe('resolveAcceptedSpecies', () => {
  it('deduplicates lookups and returns the full terminal accepted record for synonyms', async () => {
    const records = new Map<number, Species>([
      [10, species(10, { acceptedKey: 20, taxonomicStatus: 'SYNONYM' })],
      [11, species(11, { acceptedKey: 20, taxonomicStatus: 'SYNONYM' })],
      [20, species(20, { canonicalName: 'Accepted species' })],
    ])
    const lookup = vi.fn(async (key: number) => records.get(key) ?? null)

    const result = await resolveAcceptedSpecies([11, 10, 10], lookup)

    expect([...result.resolved.values()]).toEqual([
      { sourceKey: 10, acceptedKey: 20, species: records.get(20) },
      { sourceKey: 11, acceptedKey: 20, species: records.get(20) },
    ])
    expect(result.rejected).toEqual([])
    expect(lookup.mock.calls.map(([key]) => key).sort((a, b) => a - b)).toEqual([10, 11, 20])
  })

  it('follows accepted-key chains and rejects cycles', async () => {
    const chain = new Map<number, Species>([
      [1, species(1, { acceptedKey: 2 })],
      [2, species(2, { acceptedKey: 3 })],
      [3, species(3)],
    ])
    expect((await resolveAcceptedSpecies([1], async (key) => chain.get(key) ?? null)).resolved.get(1)?.acceptedKey).toBe(3)

    chain.set(3, species(3, { acceptedKey: 1 }))
    expect((await resolveAcceptedSpecies([1], async (key) => chain.get(key) ?? null)).rejected[0]?.reason).toContain('acceptedKey cycle')
  })

  it('maps a doubtful exact variant to its accepted species before returning the source key', async () => {
    const records = new Map<number, Species>([
      [6, species(6, { canonicalName: 'Rana dalmatina', kingdom: 'Animalia', taxonomicStatus: 'DOUBTFUL' })],
      [7, species(7, { canonicalName: 'Rana dalmatina', kingdom: 'Animalia' })],
    ])
    const match = vi.fn(async () => ({ ...records.get(7)!, usageKey: 7, matchType: 'EXACT', status: 'ACCEPTED' }))
    const result = await resolveAcceptedSpecies([6, 7], async (key) => records.get(key) ?? null, match)

    expect(result.rejected).toEqual([])
    expect(result.resolved.get(6)).toEqual({ sourceKey: 6, acceptedKey: 7, species: records.get(7) })
    expect(match).toHaveBeenCalledWith('rana dalmatina', 'Animalia')
  })

  it('quarantines ambiguous or unresolved doubtful concepts instead of accepting their keys', async () => {
    const source = species(6, { canonicalName: 'Rana dalmatina', kingdom: 'Animalia', taxonomicStatus: 'DOUBTFUL' })
    const fuzzy = { ...species(7, { canonicalName: 'Rana temporaria', kingdom: 'Animalia' }), usageKey: 7, matchType: 'FUZZY', status: 'ACCEPTED' }
    const fuzzyResult = await resolveAcceptedSpecies([6], async () => source, async () => fuzzy)
    const missingResult = await resolveAcceptedSpecies([6], async () => source, async () => null)
    expect(fuzzyResult.rejected[0]?.reason).toContain('expected EXACT/ACCEPTED')
    expect(missingResult.rejected[0]?.reason).toContain('no exact accepted name match')
  })

  it('quarantines unresolved, non-species, unnamed, and non-accepted terminal taxonomy without losing valid keys', async () => {
    const records = new Map<number, Species>([
      [2, species(2)],
      [3, { key: 3, rank: 'GENUS', canonicalName: 'Example' }],
      [4, { key: 4, rank: 'SPECIES' }],
      [5, species(5, { taxonomicStatus: 'SYNONYM' })],
      [6, species(6, { taxonomicStatus: 'DOUBTFUL' })],
    ])
    const result = await resolveAcceptedSpecies([1, 2, 3, 4, 5, 6], async (key) => records.get(key) ?? null, async () => null)
    expect([...result.resolved.keys()]).toEqual([2])
    expect(result.rejected.map((row) => row.sourceKey)).toEqual([1, 3, 4, 5, 6])
    expect(result.rejected.map((row) => row.reason)).toEqual([
      expect.stringContaining('did not resolve'),
      expect.stringContaining('expected SPECIES'),
      expect.stringContaining('no scientific name'),
      expect.stringContaining('no distinct acceptedKey'),
      expect.stringContaining('no exact accepted name match'),
    ])
  })

  it('quarantines a malformed accepted key but lets transport failures abort the run', async () => {
    const malformed = await resolveAcceptedSpecies([1, 2], async (key) => (
      key === 1 ? species(1, { acceptedKey: 0 }) : species(2)
    ))
    expect([...malformed.resolved.keys()]).toEqual([2])
    expect(malformed.rejected).toEqual([{ sourceKey: 1, reason: expect.stringContaining('positive safe integer') }])

    await expect(resolveAcceptedSpecies([3], async () => {
      throw new Error('GBIF unavailable')
    })).rejects.toThrow('GBIF unavailable')
  })
})
