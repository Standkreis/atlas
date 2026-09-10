import { describe, expect, it, vi } from 'vitest'
import { get } from './fetch'
import { commonsInfo, commonsLicenceUrl } from './sources'
import { wikidataFor } from './wikidata'

vi.mock('./fetch', async (original) => ({ ...await original<typeof import('./fetch')>(), get: vi.fn() }))
const mockGet = vi.mocked(get as (url: string) => Promise<unknown>)

describe('gallery provider envelopes', () => {
  it('normalizes legacy HTTP CC deeds without changing rights or accepting mismatched metadata', () => {
    const page = 'https://commons.wikimedia.org/wiki/File:Bird.jpg'
    expect(commonsLicenceUrl('CC BY-SA 3.0', 'http://creativecommons.org/licenses/by-sa/3.0/', page)).toBe('https://creativecommons.org/licenses/by-sa/3.0/')
    expect(commonsLicenceUrl('CC BY-SA 3.0 DE', 'http://creativecommons.org/licenses/by-sa/3.0/de/', page)).toBe('https://creativecommons.org/licenses/by-sa/3.0/de/')
    expect(commonsLicenceUrl('CC BY 3.0 us', 'https://creativecommons.org/licenses/by/3.0/us/deed.en', page)).toBe('https://creativecommons.org/licenses/by/3.0/us/')
    expect(commonsLicenceUrl('CC0', 'http://creativecommons.org/publicdomain/zero/1.0/deed.en', page)).toBe('https://creativecommons.org/publicdomain/zero/1.0/')
    for (const url of ['http://creativecommons.org/licenses/by/3.0/', 'http://creativecommons.org/licenses/by-sa/4.0/', 'http://creativecommons.org.attacker.test/licenses/by-sa/3.0/', 'http://user:pass@creativecommons.org/licenses/by-sa/3.0/', 'http://creativecommons.org:8080/licenses/by-sa/3.0/']) {
      expect(commonsLicenceUrl('CC BY-SA 3.0', url, page)).toBe(url)
    }
    expect(commonsLicenceUrl('Public domain', null, page)).toBe('https://creativecommons.org/publicdomain/mark/1.0/')
    expect(commonsLicenceUrl('unknown terms', null, page)).toBe(page)
  })
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
