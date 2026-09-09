import { describe, expect, it } from 'vitest'
import { scientificGalleryExclusion, selectGallery, type CommonsCandidate, type InatGallerySource, type InatPhotoCandidate } from './gallery'
import { fetchInatGallery } from './sources'

const photo = (id: number, extra: Partial<InatPhotoCandidate> = {}): InatPhotoCandidate => ({
  id,
  licenseCode: 'cc-by',
  attributionName: `Author ${id}`,
  renderUrl: `https://inaturalist-open-data.s3.amazonaws.com/photos/${id}/medium.jpg`,
  curatedPosition: id,
  provenance: { status: 'native-free-local-photo', detailedRecords: 1, totalRecords: 1, conflictingMetadata: false, evidence: [] },
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
  it.each(['Odontites vulgaris', 'Odontites vernus'])('withholds only the reviewed ambiguous Commons source for %s, preserving other images', (scientificName) => {
    const candidate = commons({ sourceId: 'File:Red bartsia 800.jpg', title: 'File:Red bartsia 800.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Red_bartsia_800.jpg',
      renderUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/db/Red_bartsia_800.jpg?utm_source=commons' })
    for (const defaultId of [1, null]) {
      const input = { scientificName, inat: inat([photo(1), photo(2)], defaultId, scientificName), commons: candidate }
      const before = structuredClone(input)
      const selected = selectGallery(input)
      expect(selected.assets.map((asset) => [asset.position, asset.origin, asset.sourceUrl])).toEqual([
        [0, 'inat', 'https://www.inaturalist.org/photos/1'], [1, 'inat', 'https://www.inaturalist.org/photos/2'],
      ])
      expect(selected.rejections).toEqual([{ source: 'commons:File:Red bartsia 800.jpg', reason: 'ambiguous-species-attribution',
        review: { ruleId: 'commons-red-bartsia-ambiguous-species-v1', reason: 'ambiguous-species-attribution', evidence: 'app/etl/README.md#reviewed-scientific-image-exclusions', evidenceSha256: expect.stringMatching(/^[a-f0-9]{64}$/) } }])
      expect(input).toEqual(before)
      expect(selectGallery(input)).toEqual(selected)
    }
    expect(selectGallery({ scientificName, commons: candidate })).toMatchObject({ status: 'ok', assets: [] })
    expect(selectGallery({ scientificName, commons: commons({ title: 'Odontites vernus', categories: 'Odontites vulgaris' }) }).assets).toHaveLength(1)
  })

  it('matches exact reviewed Commons identities across URL spellings without excluding similarly named sources', () => {
    for (const sourceUrl of ['https://commons.wikimedia.org/wiki/File:Red_bartsia_800.jpg?x=1', 'https://commons.wikimedia.org/wiki/File:Red%20bartsia%20800.jpg', 'https://commons.wikimedia.org/w/index.php?title=File:Red_bartsia_800.jpg&oldid=460093141']) {
      expect(scientificGalleryExclusion({ origin: 'commons', sourceUrl })?.reason).toBe('ambiguous-species-attribution')
    }
    expect(scientificGalleryExclusion({ origin: 'commons', sourceId: 'File:Red_bartsia_800.jpg' })).not.toBeNull()
    expect(scientificGalleryExclusion({ origin: 'commons', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Red_bartsia_800.jpg/640px-Red_bartsia_800.jpg?x=2' })).not.toBeNull()
    for (const image of [
      { origin: 'inat', sourceId: 'File:Red bartsia 800.jpg' },
      { origin: 'commons', sourceId: 'File:Red bartsia 800 different.jpg' },
      { origin: 'commons', sourceUrl: 'https://other.example/wiki/File:Red_bartsia_800.jpg' },
    ]) expect(scientificGalleryExclusion(image)).toBeNull()
  })

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
    expect(selectGallery({ scientificName: 'Turdus merula', commons: commons({ licence: 'PD-made-up', licenceUrl: 'https://creativecommons.org/publicdomain/mark/1.0/' }) }).rejections[0]?.reason).toBe('unsupported-licence')
  })

  it('rejects invalid stable source identities', () => {
    expect(selectGallery({ scientificName: 'Turdus merula', inat: inat([photo(0)]) }).rejections[0]?.reason).toBe('invalid-source-id')
    expect(selectGallery({ scientificName: 'Turdus merula', commons: commons({ sourceId: '' }) }).rejections[0]?.reason).toBe('invalid-source-id')
  })

  it('withholds imported/unknown iNat candidates while retaining independently licensed Commons and species fallback', () => {
    for (const status of ['unverified-imported-licence', 'unknown-provenance'] as const) {
      const candidate = photo(1, { provenance: { status, detailedRecords: 1, totalRecords: 1, conflictingMetadata: false, evidence: [] } })
      const selected = selectGallery({ scientificName: 'Turdus merula', inat: inat([candidate]), commons: commons() })
      expect(selected.assets.map((a) => a.origin)).toEqual(['commons'])
      expect(selected.rejections).toContainEqual({ source: 'inat:1', reason: status, provenance: candidate.provenance })
      expect(selectGallery({ scientificName: 'Turdus merula', inat: inat([candidate]) })).toMatchObject({ status: 'ok', assets: [] })
    }
    expect(selectGallery({ scientificName: 'Turdus merula', inat: inat([photo(1, { provenance: undefined })]) }).rejections[0]?.reason).toBe('unknown-provenance')
  })

  it('does not let an earlier accepted duplicate hide later contrary provenance', () => {
    const selected = selectGallery({ scientificName: 'Turdus merula', inat: inat([photo(1), photo(1, { provenance: { status: 'unverified-imported-licence', detailedRecords: 1, totalRecords: 1, conflictingMetadata: false, evidence: [] } })]) })
    expect(selected.assets).toEqual([])
    expect(selected.rejections[0]?.reason).toBe('unverified-imported-licence')
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
    ['invalid-licence-url', { licenceUrl: 'https://user:pass@creativecommons.org/licenses/by-sa/4.0/' }],
    ['invalid-licence-url', { licenceUrl: 'https://creativecommons.org:8443/licenses/by-sa/4.0/' }],
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
  const rawPhoto = (id: number) => ({ id, license_code: 'cc-by', attribution: `(c) Author ${id}, some rights reserved`, url: `https://inaturalist-open-data.s3.amazonaws.com/photos/${id}/square.jpg` })
  const detailedPhoto = (id: number) => ({ ...rawPhoto(id), type: 'LocalPhoto', native_page_url: null, native_photo_id: null })
  const fetched = async (defaultPhoto: unknown, detailed: unknown[]) => {
    let calls = 0
    const fetchJson = async <T>(): Promise<T> => (++calls === 1 ? { results: [{ id: 42, name: 'Turdus merula' }] }
      : { results: [{ id: 42, name: 'Turdus merula', default_photo: defaultPhoto, taxon_photos: detailed.map((photo) => ({ photo })) }] }) as T
    const result = await fetchInatGallery('Turdus merula', [], fetchJson)
    if (result.status !== 'ok') throw new Error(`unexpected fixture failure: ${result.status}`)
    return { source: result.source, selected: selectGallery({ scientificName: 'Turdus merula', inat: result.source }) }
  }

  it('inherits default provenance only from the matching detailed native-free LocalPhoto', async () => {
    const { source, selected } = await fetched(rawPhoto(1), [
      { ...detailedPhoto(1), medium_url: 'https://inaturalist-open-data.s3.amazonaws.com/photos/1/medium.jpg', attribution_name: '  Author   1  ' },
      detailedPhoto(2),
    ])
    expect(source.photos[0]!.provenance).toMatchObject({ status: 'native-free-local-photo', detailedRecords: 1, totalRecords: 2, conflictingMetadata: false })
    expect(selected.assets.map((a) => a.sourceUrl)).toEqual(['https://www.inaturalist.org/photos/1', 'https://www.inaturalist.org/photos/2'])
    expect(selected.assets.map((a) => a.position)).toEqual([0, 1])
  })

  it('does not infer provenance from the default type, CDN URL, or another photo’s details', async () => {
    for (const defaultPhoto of [rawPhoto(1), detailedPhoto(1)]) {
      const { selected } = await fetched(defaultPhoto, [])
      expect(selected.assets).toEqual([])
      expect(selected.rejections[0]).toMatchObject({ source: 'inat:1', reason: 'unknown-provenance', provenance: { detailedRecords: 0 } })
    }
    const other = await fetched(rawPhoto(1), [detailedPhoto(2)])
    expect(other.selected.assets.map((a) => a.sourceUrl)).toEqual(['https://www.inaturalist.org/photos/2'])
    expect(other.selected.rejections[0]?.reason).toBe('unknown-provenance')
  })

  it.each([
    { type: 'FlickrPhoto' }, { native_page_url: 'https://www.flickr.com/photos/original/123' }, { native_photo_id: '123' },
    { type: 'LocalPhoto', native_page_url: 'https://commons.wikimedia.org/wiki/File:Imported.jpg', native_photo_id: 'File:Imported.jpg' },
  ])('withholds imported detailed provenance and retains rejection evidence: %j', async (fields) => {
    const { selected } = await fetched(rawPhoto(1), [{ ...detailedPhoto(1), ...fields }])
    expect(selected.assets).toEqual([])
    expect(selected.rejections[0]).toMatchObject({ source: 'inat:1', reason: 'unverified-imported-licence', provenance: { detailedRecords: 1, totalRecords: 2 } })
    expect(selected.rejections[0]!.provenance!.evidence[1]).toMatchObject({ detailed: true })
  })

  it('withholds missing detailed fields and every contradictory duplicate instead of taking the first', async () => {
    expect((await fetched(rawPhoto(1), [rawPhoto(1)])).selected.rejections[0]?.reason).toBe('unknown-provenance')
    expect((await fetched(rawPhoto(1), [{ ...detailedPhoto(1), native_photo_id: undefined }])).selected.rejections[0]?.reason).toBe('unknown-provenance')
    for (const contrary of [{ type: 'FlickrPhoto' }, { native_photo_id: '123' }, { license_code: 'cc-by-sa' }, { attribution: 'Someone else' }]) {
      const { selected } = await fetched(rawPhoto(1), [detailedPhoto(1), { ...detailedPhoto(1), ...contrary }])
      expect(selected.assets).toEqual([])
      expect(selected.rejections[0]?.reason).toBe('unverified-imported-licence')
      expect(selected.rejections[0]?.provenance?.conflictingMetadata).toBe('license_code' in contrary || 'attribution' in contrary)
    }
    const importedDefault = await fetched({ ...rawPhoto(1), native_page_url: 'https://flickr.com/example' }, [detailedPhoto(1)])
    expect(importedDefault.selected.assets).toEqual([])
    expect(importedDefault.selected.rejections[0]?.reason).toBe('unverified-imported-licence')
  })

  it('bounds checkpoint provenance while considering all detailed records', async () => {
    const { selected } = await fetched(rawPhoto(1), [...Array.from({ length: 9 }, () => detailedPhoto(1)), { ...detailedPhoto(1), native_photo_id: 'last-conflict' }])
    expect(selected.assets).toEqual([])
    expect(selected.rejections[0]).toMatchObject({ reason: 'unverified-imported-licence', provenance: { detailedRecords: 10, totalRecords: 11 } })
    expect(selected.rejections[0]!.provenance!.evidence).toHaveLength(8)
  })

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
    await expect(fetchInatGallery('Turdus merula', [], fuzzy)).resolves.toMatchObject({ status: 'absent', reason: 'no-exact-match' })
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
