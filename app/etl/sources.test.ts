import { describe, expect, it, vi } from 'vitest'
import { get } from './fetch'
import { commonsInfo } from './sources'
import { wikidataFor } from './wikidata'

vi.mock('./fetch', async (original) => ({ ...await original<typeof import('./fetch')>(), get: vi.fn() }))
const mockGet = vi.mocked(get as (url: string) => Promise<unknown>)

describe('gallery provider envelopes', () => {
  it('rejects missing/malformed Commons pages instead of replacing a gallery with zero', async () => {
    for (const response of [null, {}, { query: { pages: [] } }, { query: { pages: { 1: { title: 'File:Bird.jpg' } } } }]) {
      mockGet.mockResolvedValueOnce(response)
      await expect(commonsInfo(['https://commons.wikimedia.org/Bird.jpg'], true)).rejects.toThrow('Commons')
    }
  })
  it('accepts an explicitly missing Commons file as missing coverage', async () => {
    mockGet.mockResolvedValueOnce({ query: { pages: { '-1': { title: 'File:Bird.jpg', missing: '' } } } })
    expect(await commonsInfo(['https://commons.wikimedia.org/Bird.jpg'], true)).toEqual(new Map())
  })
  it('rejects a missing Wikidata envelope instead of reporting no matching image', async () => {
    mockGet.mockResolvedValueOnce(null)
    await expect(wikidataFor([{ gbifKey: 123, sciName: 'Bird fixture' }])).rejects.toThrow('Wikidata')
  })
})
