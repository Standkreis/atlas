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

  it('quarantines unresolved, non-species, and unnamed taxonomy without losing valid keys', async () => {
    const records = new Map<number, Species>([
      [2, species(2)],
      [3, { key: 3, rank: 'GENUS', canonicalName: 'Example' }],
      [4, { key: 4, rank: 'SPECIES' }],
      [5, species(5, { taxonomicStatus: 'SYNONYM' })],
      [6, species(6, { taxonomicStatus: 'DOUBTFUL' })],
    ])
    const result = await resolveAcceptedSpecies([1, 2, 3, 4, 5, 6], async (key) => records.get(key) ?? null)
    expect([...result.resolved.keys()]).toEqual([2, 6])
    expect(result.rejected.map((row) => row.sourceKey)).toEqual([1, 3, 4, 5])
    expect(result.rejected.map((row) => row.reason)).toEqual([
      expect.stringContaining('did not resolve'),
      expect.stringContaining('expected SPECIES'),
      expect.stringContaining('no scientific name'),
      expect.stringContaining('no distinct acceptedKey'),
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
