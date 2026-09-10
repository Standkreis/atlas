import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchReferenceGallery, parseGalleryArgs } from './gallery-work'
import { commonsInfo, fetchInatGallery } from './sources'
import { wikidataFor } from './wikidata'

vi.mock('./sources', async (original) => ({ ...await original<typeof import('./sources')>(), fetchInatGallery: vi.fn(), commonsInfo: vi.fn() }))
vi.mock('./wikidata', () => ({ wikidataFor: vi.fn() }))
const taxon = { id: 'taxon', gbifKey: 123, sciName: 'Turdus merula' }

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(fetchInatGallery).mockResolvedValue({ status: 'absent', reason: 'no-exact-match' })
  vi.mocked(wikidataFor).mockResolvedValue(new Map([[123, { path: 'none', item: null }]]))
})

describe('complete reference-gallery fetching', () => {
  it('does not broaden malformed operator scopes', () => {
    for (const args of [['--catalogue', 'cat', '--keys'], ['--catalogue', 'cat', '--region', '--json'], ['--catalogue', 'cat', '--key', '1'], ['--catalogue', 'cat', '--keys', '1', '--keys', '2']]) {
      expect(() => parseGalleryArgs(args)).toThrow()
    }
    expect(parseGalleryArgs(['--catalogue', 'cat', '--keys', '1,2', '--limit', '10', '--json'])).toMatchObject({ catalogueVersionId: 'cat', keys: [1, 2], limit: 10, json: true })
  })
  it('treats safely absent sources as a successful zero', async () => {
    await expect(fetchReferenceGallery(taxon)).resolves.toEqual({ status: 'ok', assets: [], acceptedEvidence: [], rejections: [], coverage: { inat: false, commons: false } })
  })
  it('never turns a provider or unsafe detail response into zero', async () => {
    vi.mocked(fetchInatGallery).mockResolvedValue({ status: 'failure', reason: 'unsafe-match', detail: 'detail identity changed' })
    await expect(fetchReferenceGallery(taxon)).rejects.toThrow('detail identity changed')
    expect(wikidataFor).not.toHaveBeenCalled()
  })
  it('fails the whole fetch if Commons fails after an iNaturalist match', async () => {
    vi.mocked(fetchInatGallery).mockResolvedValue({ status: 'ok', source: { taxonId: 42, matchedName: taxon.sciName, defaultPhotoId: null, photos: [] } })
    vi.mocked(wikidataFor).mockResolvedValue(new Map([[123, { path: 'P846', item: { qid: 'Q1', img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bird.jpg' } }]]))
    vi.mocked(commonsInfo).mockRejectedValue(new Error('Commons malformed'))
    await expect(fetchReferenceGallery(taxon)).rejects.toThrow('Commons malformed')
    expect(commonsInfo).toHaveBeenCalledWith(['https://commons.wikimedia.org/wiki/Special:FilePath/Bird.jpg'], true)
  })
})
