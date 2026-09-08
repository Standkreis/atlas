import { describe, expect, it } from 'vitest'
import { selectGallery, type CommonsCandidate, type InatGallerySource, type InatPhotoCandidate } from './gallery'
import { fetchInatGallery } from './sources'

const photo = (id: number, extra: Partial<InatPhotoCandidate> = {}): InatPhotoCandidate => ({
  id,
  licenseCode: 'cc-by',
  attributionName: `Author ${id}`,
  renderUrl: `https://inaturalist-open-data.s3.amazonaws.com/photos/${id}/medium.jpg`,
  curatedPosition: id,
  ...extra,
})
const inat = (photos: InatPhotoCandidate[], defaultPhotoId: number | null = photos[0]?.id ?? null, matchedName = 'Turdus merula'): InatGallerySource => ({ taxonId: 42, matchedName, defaultPhotoId, photos })
const commons = (extra: Partial<CommonsCandidate> = {}): CommonsCandidate => ({
  sourceId: 'File:Turdus merula.jpg',
  title: 'File:Turdus merula.jpg',
  categories: 'Category:Turdus merula',
  renderUrl: 'https://upload.wikimedia.org/turdus.jpg',
  author: 'Commons Author',
  licence: 'CC BY-SA 4.0',
  licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Turdus_merula.jpg',
  ...extra,
})

describe('licensed gallery selection', () => {
  it('keeps the lead ladder and places Commons after an accepted default', () => {
    const selected = selectGallery({ scientificName: 'Turdus merula', inat: inat([photo(2), photo(1)], 2), commons: commons() })
    expect(selected.assets.map((asset) => [asset.position, asset.origin, asset.sourceUrl])).toEqual([
      [0, 'inat', 'https://www.inaturalist.org/photos/2'],
      [1, 'commons', 'https://commons.wikimedia.org/wiki/File:Turdus_merula.jpg'],
      [2, 'inat', 'https://www.inaturalist.org/photos/1'],
    ])
  })

  it('falls through default, Commons, alternate and honest zero-image states', () => {
    expect(selectGallery({ scientificName: 'Turdus merula', inat: inat([photo(1, { licenseCode: null }), photo(2)]), commons: commons() }).assets[0]?.origin).toBe('commons')
    expect(selectGallery({ scientificName: 'Turdus merula', inat: inat([photo(1, { licenseCode: null }), photo(2)]), commons: commons({ author: '' }) }).assets[0]?.sourceUrl).toContain('/photos/2')
    expect(selectGallery({ scientificName: 'Turdus merula', inat: inat([photo(1, { licenseCode: null })]), commons: commons({ author: '' }) })).toMatchObject({ status: 'ok', assets: [] })
  })

  it('covers one, twelve and capped galleries with contiguous positions', () => {
    expect(selectGallery({ scientificName: 'Turdus merula', inat: inat([photo(1)]) }).assets).toHaveLength(1)
    const twelve = selectGallery({ scientificName: 'Turdus merula', inat: inat(Array.from({ length: 12 }, (_, i) => photo(i + 1))) })
    expect(twelve.assets.map((asset) => asset.position)).toEqual(Array.from({ length: 12 }, (_, i) => i))
    const capped = selectGallery({ scientificName: 'Turdus merula', inat: inat(Array.from({ length: 14 }, (_, i) => photo(i + 1))) })
    expect(capped.assets).toHaveLength(12)
    expect(capped.rejections.filter((entry) => entry.reason === 'gallery-cap')).toHaveLength(2)
  })

  it('breaks equal curated positions by stable photo id', () => {
    const selected = selectGallery({ scientificName: 'Turdus merula', inat: inat([photo(9, { curatedPosition: 1 }), photo(3, { curatedPosition: 1 })], null) })
    expect(selected.assets.map((asset) => asset.sourceUrl)).toEqual(['https://www.inaturalist.org/photos/3', 'https://www.inaturalist.org/photos/9'])
  })

  it('deduplicates stable source identity/page and normalized render URL before capping', () => {
    const selected = selectGallery({
      scientificName: 'Turdus merula',
      inat: inat([
        photo(1),
        photo(1, { curatedPosition: 2, renderUrl: 'https://elsewhere.test/other.jpg' }),
        photo(2, { curatedPosition: 3, renderUrl: 'https://inaturalist-open-data.s3.amazonaws.com/photos/1/square.jpg?size=small' }),
        photo(3, { curatedPosition: 4 }),
      ], null),
      limit: 2,
    })
    expect(selected.assets.map((asset) => asset.sourceUrl)).toEqual(['https://www.inaturalist.org/photos/1', 'https://www.inaturalist.org/photos/3'])
    expect(selected.rejections.map((entry) => entry.reason)).toEqual(['duplicate-source', 'duplicate-url'])
  })

  it('fails closed on a fuzzy name unless the identity is a verified synonym', () => {
    const unsafe = selectGallery({ scientificName: 'Turdus merula', inat: inat([photo(1)], 1, 'Turdus maximus') })
    expect(unsafe.assets).toEqual([])
    expect(unsafe.rejections).toContainEqual({ source: 'inat-taxon:42', reason: 'unsafe-scientific-match' })
    expect(selectGallery({ scientificName: 'Turdus merula', verifiedSynonyms: ['Turdus maximus'], inat: inat([photo(1)], 1, 'Turdus maximus') }).assets).toHaveLength(1)
  })

  it('accepts recognized Commons public-domain and jurisdictional BY-SA terms', () => {
    expect(selectGallery({ scientificName: 'Turdus merula', commons: commons({ licence: 'PD-old-100', licenceUrl: 'https://creativecommons.org/publicdomain/mark/1.0/' }) }).assets).toHaveLength(1)
    expect(selectGallery({ scientificName: 'Turdus merula', commons: commons({ licence: 'CC BY-SA 3.0 DE', licenceUrl: 'https://creativecommons.org/licenses/by-sa/3.0/de/' }) }).assets).toHaveLength(1)
  })

  it('rejects invalid stable source identities', () => {
    expect(selectGallery({ scientificName: 'Turdus merula', inat: inat([photo(0)]) }).rejections[0]?.reason).toBe('invalid-source-id')
    expect(selectGallery({ scientificName: 'Turdus merula', commons: commons({ sourceId: '' }) }).rejections[0]?.reason).toBe('invalid-source-id')
  })

  it.each([
    ['missing-render-url', { renderUrl: undefined }],
    ['insecure-render-url', { renderUrl: 'http://example.test/photo.jpg' }],
    ['missing-author', { attribution: '', attributionName: '' }],
    ['missing-licence', { licenseCode: null }],
    ['unsupported-licence', { licenseCode: 'all-rights-reserved' }],
  ] as const)('rejects iNaturalist %s', (reason, extra) => {
    const selected = selectGallery({ scientificName: 'Turdus merula', inat: inat([photo(1, extra)]) })
    expect(selected.rejections).toContainEqual({ source: 'inat:1', reason })
  })

  it.each([
    ['missing-render-url', { renderUrl: undefined }],
    ['insecure-render-url', { renderUrl: 'http://example.test/photo.jpg' }],
    ['missing-author', { author: '' }],
    ['missing-licence', { licence: '' }],
    ['unsupported-licence', { licence: 'CC BY-NC 4.0' }],
    ['missing-licence-url', { licenceUrl: null }],
    ['invalid-licence-url', { licenceUrl: 'https://creativecommons.org/licenses/by/4.0/' }],
    ['missing-source-page', { sourceUrl: '' }],
    ['insecure-source-page', { sourceUrl: 'http://commons.wikimedia.org/wiki/File:X.jpg' }],
    ['rejected-commons-subject', { title: 'File:Turdus merula specimen.jpg' }],
  ] as const)('rejects Commons %s without inventing metadata', (reason, extra) => {
    const selected = selectGallery({ scientificName: 'Turdus merula', commons: commons(extra) })
    expect(selected.rejections[0]?.reason).toBe(reason)
    expect(selected.assets).toEqual([])
  })
})

describe('iNaturalist curated gallery fetch', () => {
  it('fetches one curated list only for an exact match and represents a valid zero-image result', async () => {
    const calls: string[] = []
    const fetchJson = async <T>(url: string): Promise<T> => {
      calls.push(url)
      return (calls.length === 1
        ? { results: [{ id: 42, name: 'Turdus merula' }] }
        : { results: [{ id: 42, name: 'Turdus merula', default_photo: null, taxon_photos: [] }] }) as T
    }
    await expect(fetchInatGallery('Turdus merula', [], fetchJson)).resolves.toEqual({
      status: 'ok',
      source: { taxonId: 42, matchedName: 'Turdus merula', defaultPhotoId: null, photos: [] },
    })
    expect(calls).toHaveLength(2)
    expect(calls[1]).toBe('https://api.inaturalist.org/v1/taxa/42')
  })

  it('does not fetch details for a fuzzy match, but allows a separately verified synonym', async () => {
    const fuzzy = async <T>(): Promise<T> => ({ results: [{ id: 42, name: 'Turdus maximus' }] }) as T
    await expect(fetchInatGallery('Turdus merula', [], fuzzy)).resolves.toMatchObject({ status: 'failure', reason: 'unsafe-match' })
    let calls = 0
    const synonym = async <T>(): Promise<T> => {
      calls++
      return (calls === 1
        ? { results: [{ id: 42, name: 'Turdus maximus' }] }
        : { results: [{ id: 42, name: 'Turdus maximus', default_photo: null, taxon_photos: [] }] }) as T
    }
    await expect(fetchInatGallery('Turdus merula', ['Turdus maximus'], synonym)).resolves.toMatchObject({ status: 'ok' })
    expect(calls).toBe(2)
  })

  it('distinguishes provider and malformed top-level failures from valid zero', async () => {
    await expect(fetchInatGallery('Turdus merula', [], async () => { throw new Error('upstream unavailable') })).resolves.toMatchObject({ status: 'failure', reason: 'provider' })
    await expect(fetchInatGallery('Turdus merula', [], async <T>() => ({ error: 'bad response' }) as T)).resolves.toMatchObject({ status: 'failure', reason: 'malformed' })
  })
})
