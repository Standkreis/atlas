import { describe, expect, it } from 'vitest'
import { referenceGallery, type ReferenceRow, type ReferenceVisibility } from './referenceImages'

const row = (id: string, position: number, visibility?: ReferenceVisibility | null): ReferenceRow => ({
  id, kind: 'image', position, createdAt: '2026-01-01T00:00:00.000Z', url: `https://images.example.test/${id}/medium.jpg`,
  author: 'Author', licence: 'CC BY 4.0', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
  sourceUrl: `https://commons.wikimedia.org/wiki/File:${id}.jpg`, origin: 'commons', referenceVisibility: visibility,
})

describe('reviewed reference visibility', () => {
  it('keeps the complete no-row gallery backward compatible before cutover', () => {
    expect(referenceGallery([row('second', 1), row('lead', 0)]).map((asset) => asset.id)).toEqual(['lead', 'second'])
  })

  it('uses one shared eligible order after cutover and applies only its licence URL overlay', () => {
    const hidden: ReferenceVisibility = { eligible: false, targetPosition: null, hiddenReason: 'confirmed-subject-conflict', correctedLicenceUrl: null }
    const second: ReferenceVisibility = { eligible: true, targetPosition: 1, hiddenReason: null, correctedLicenceUrl: null }
    const lead: ReferenceVisibility = { eligible: true, targetPosition: 0, hiddenReason: null, correctedLicenceUrl: 'https://creativecommons.org/licenses/by/3.0/' }
    const assets = [row('legacy-without-row', 0), row('hidden', 0, hidden), row('second', 0, second), { ...row('lead', 9, lead), licence: 'CC BY 3.0', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/' }]
    const gallery = referenceGallery(assets)
    expect(gallery.map((asset) => [asset.id, asset.position, asset.licenceUrl])).toEqual([
      ['lead', 0, 'https://creativecommons.org/licenses/by/3.0/'], ['second', 1, 'https://creativecommons.org/licenses/by/4.0/'],
    ])
    expect(assets[3]).toMatchObject({ position: 9, licenceUrl: 'https://creativecommons.org/licenses/by/4.0/' })
  })

  it('fails a malformed eligible review closed instead of exposing it as a lead', () => {
    expect(referenceGallery([row('bad', 0, { eligible: true, targetPosition: 12, hiddenReason: null, correctedLicenceUrl: null })])).toEqual([])
  })
})
