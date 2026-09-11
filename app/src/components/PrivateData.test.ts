import { afterEach, describe, expect, it, vi } from 'vitest'
import { purgePrivatePhotos } from './PrivateData'

vi.mock('./Queue', () => ({ clearOutbox: vi.fn(), suspendOutbox: vi.fn() }))

afterEach(() => vi.unstubAllGlobals())

describe('private browser data cleanup', () => {
  it('purges old private photos without opening a regional pack from a stale name snapshot', async () => {
    const privatePhoto = new Request('https://atlas.test/api/photo/private')
    const publicPhoto = new Request('https://upload.wikimedia.org/public.jpg')
    const keys = [privatePhoto, publicPhoto]
    const remove = vi.fn(async (request: Request) => {
      const index = keys.findIndex((key) => key.url === request.url)
      if (index < 0) return false
      keys.splice(index, 1)
      return true
    })
    const open = vi.fn(async () => ({ keys: async () => [...keys], delete: remove }))
    vi.stubGlobal('caches', { keys: async () => ['dex-images', 'dex-pack-v2-deleted'], open })

    await purgePrivatePhotos()

    expect(open).toHaveBeenCalledTimes(1)
    expect(open).toHaveBeenCalledWith('dex-images')
    expect(keys.map((key) => key.url)).toEqual([publicPhoto.url])
  })
})
