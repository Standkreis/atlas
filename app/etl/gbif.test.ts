import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('./fetch', () => ({
  get,
  q: (params: Record<string, unknown>) => new URLSearchParams(params as Record<string, string>).toString(),
}))

import { gbifFacet } from './gbif'

describe('gbifFacet', () => {
  beforeEach(() => get.mockReset())

  it('returns a valid non-empty facet despite GBIF field casing', async () => {
    get.mockResolvedValue({ count: 3, facets: [{ field: 'SPECIES_KEY', counts: [{ name: '1', count: 2 }] }] })
    await expect(gbifFacet('speciesKey', {}, 10)).resolves.toEqual({ total: 3, counts: [{ name: '1', count: 2 }] })
  })

  it('permits a zero-result response without a facet payload', async () => {
    get.mockResolvedValue({ count: 0 })
    await expect(gbifFacet('speciesKey', {}, 10)).resolves.toEqual({ total: 0, counts: [] })
  })

  it('pages a full facet until a short page', async () => {
    get
      .mockResolvedValueOnce({ count: 4, facets: [{ field: 'SPECIES_KEY', counts: [{ name: '1', count: 2 }, { name: '2', count: 1 }] }] })
      .mockResolvedValueOnce({ count: 4, facets: [{ field: 'SPECIES_KEY', counts: [{ name: '3', count: 1 }] }] })
    await expect(gbifFacet('speciesKey', {}, 2)).resolves.toEqual({
      total: 4,
      counts: [{ name: '1', count: 2 }, { name: '2', count: 1 }, { name: '3', count: 1 }],
    })
    expect(get.mock.calls[0]![0]).toContain('facetOffset=0')
    expect(get.mock.calls[1]![0]).toContain('facetOffset=2')
  })

  it('requests the empty terminator page for an exact multiple', async () => {
    get
      .mockResolvedValueOnce({ count: 4, facets: [{ field: 'SPECIES_KEY', counts: [{ name: '1', count: 1 }, { name: '2', count: 1 }] }] })
      .mockResolvedValueOnce({ count: 4, facets: [{ field: 'SPECIES_KEY', counts: [{ name: '3', count: 1 }, { name: '4', count: 1 }] }] })
      .mockResolvedValueOnce({ count: 4, facets: [{ field: 'SPECIES_KEY', counts: [] }] })
    await expect(gbifFacet('speciesKey', {}, 2)).resolves.toMatchObject({ total: 4 })
    expect(get).toHaveBeenCalledTimes(3)
  })

  it('fails malformed or missing non-empty facet payloads', async () => {
    get.mockResolvedValue({ count: 1, facets: [{ field: 'month', counts: [] }] })
    await expect(gbifFacet('speciesKey', {}, 10)).rejects.toThrow('no usable counts')
    get.mockResolvedValue({ count: 1, facets: [{ field: 'SPECIES_KEY', counts: [{ name: '', count: 1 }] }] })
    await expect(gbifFacet('speciesKey', {}, 10)).rejects.toThrow('malformed counts')
  })

  it('rejects duplicate values and drifting totals across pages', async () => {
    get
      .mockResolvedValueOnce({ count: 2, facets: [{ field: 'SPECIES_KEY', counts: [{ name: '1', count: 1 }] }] })
      .mockResolvedValueOnce({ count: 2, facets: [{ field: 'SPECIES_KEY', counts: [{ name: '1', count: 1 }] }] })
    await expect(gbifFacet('speciesKey', {}, 1)).rejects.toThrow('repeated value 1')

    get.mockReset()
    get
      .mockResolvedValueOnce({ count: 2, facets: [{ field: 'SPECIES_KEY', counts: [{ name: '1', count: 1 }] }] })
      .mockResolvedValueOnce({ count: 3, facets: [{ field: 'SPECIES_KEY', counts: [] }] })
    await expect(gbifFacet('speciesKey', {}, 1)).rejects.toThrow('total changed while paging')
  })
})
