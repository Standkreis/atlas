import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  GERMANY_REGISTRY_SHA256,
  RegionRegistryValidationError,
  loadGermanyRegistry,
  parseRegionRegistry,
} from './registry'

const clone = <T>(value: T): T => structuredClone(value)

describe('Germany Kreisregion registry', () => {
  it('loads the pinned BKG registry with its exact file digest and counts', () => {
    const registry = loadGermanyRegistry()
    const bytes = readFileSync(fileURLToPath(new URL('./germany-regions.json', import.meta.url)))

    expect(createHash('sha256').update(bytes).digest('hex')).toBe(GERMANY_REGISTRY_SHA256)
    expect(registry.registry.counts).toEqual({
      regions: 362,
      kreisUnits: 400,
      states: 16,
      singletonRegions: 326,
      twoUnitRegions: 34,
      threeUnitRegions: 2,
    })
    expect(registry.regions).toHaveLength(362)
    expect(new Set(registry.regions.flatMap((region) => region.kreisUnits.map((unit) => unit.key))).size).toBe(400)
    expect(new Set(registry.regions.map((region) => region.stateCode)).size).toBe(16)
  })

  it('pins exact BKG provenance, licence and attribution for both source layers', () => {
    expect(loadGermanyRegistry().registry.sources).toEqual([
      expect.objectContaining({
        id: 'bkg-ge250-2025-krg250',
        role: 'regions',
        authority: 'Bundesamt für Kartographie und Geodäsie (BKG)',
        product: 'GE250',
        layer: 'KRG250',
        topicDate: '2024-12-31',
        downloadedOn: '2026-09-08',
        archiveSha256: 'ff4e2c3c0e675cc06d8a13f0769fca73ae53b2f8a1bf0b67cb5a30c8a31b51e3',
        attribution: '© GeoBasis-DE / BKG (2026) dl-de/by-2-0',
        licence: {
          id: 'dl-de/by-2-0',
          name: 'Datenlizenz Deutschland – Namensnennung 2.0',
          url: 'https://www.govdata.de/dl-de/by-2-0',
        },
      }),
      expect.objectContaining({
        id: 'bkg-vg250-2024-12-31-krs-land',
        role: 'kreisUnits',
        authority: 'Bundesamt für Kartographie und Geodäsie (BKG)',
        product: 'VG250',
        layer: 'vg250_krs (GF = 4)',
        topicDate: '2024-12-31',
        downloadedOn: '2026-09-08',
        archiveSha256: '07e1342f3e163ebeeaecb6b028914c9fc81e854f10e05633423740a5f074f4e8',
        attribution: '© BKG (2026) dl-de/by-2-0',
        licence: {
          id: 'dl-de/by-2-0',
          name: 'Datenlizenz Deutschland – Namensnennung 2.0',
          url: 'https://www.govdata.de/dl-de/by-2-0',
        },
      }),
    ])
    for (const source of loadGermanyRegistry().registry.sources) {
      expect(source.archiveUrl).toMatch(/^https:\/\/daten\.gdz\.bkg\.bund\.de\//)
      expect(source.productUrl).toMatch(/^https:\/\/gdz\.bkg\.bund\.de\//)
      expect(source.dataSourcesUrl).toMatch(/^https:\/\/sgx\.geodatenzentrum\.de\//)
      expect(source.changeNotice).toMatch(/^Bearbeitet durch Standkreis:/)
    }
  })

  it('contains the reviewed Mainz-Bingen and Südwestpfalz identities and composition', () => {
    const registry = loadGermanyRegistry()
    const mainzBingen = registry.regions.find((region) => region.key === 'de-krg-07339000')
    const suedwestpfalz = registry.regions.find((region) => region.key === 'de-krg-07340000')

    expect(mainzBingen).toEqual({
      key: 'de-krg-07339000',
      sourceKey: '07339000',
      displayName: 'Mainz-Bingen',
      sourceName: 'Mainz-Bingen',
      stateCode: '07',
      stateName: 'Rheinland-Pfalz',
      aliases: ['Landkreis Mainz-Bingen', 'Mainz-Bingen', 'Mainz-Bingen, Landkreis', 'Rheinland-Pfalz'],
      kreisUnits: [{ key: 'de-krs-07339', ags: '07339', name: 'Mainz-Bingen', type: 'Landkreis' }],
    })
    expect(suedwestpfalz).toEqual({
      key: 'de-krg-07340000',
      sourceKey: '07340000',
      displayName: 'Südwestpfalz',
      sourceName: 'Südwestpfalz/Pirmasens/Zweibrücken',
      stateCode: '07',
      stateName: 'Rheinland-Pfalz',
      aliases: [
        'Kreisfreie Stadt Pirmasens',
        'Kreisfreie Stadt Zweibrücken',
        'Landkreis Südwestpfalz',
        'Pirmasens',
        'Pirmasens, Kreisfreie Stadt',
        'Rheinland-Pfalz',
        'Südwestpfalz',
        'Südwestpfalz, Landkreis',
        'Südwestpfalz/Pirmasens/Zweibrücken',
        'Zweibrücken',
        'Zweibrücken, Kreisfreie Stadt',
      ],
      kreisUnits: [
        { key: 'de-krs-07317', ags: '07317', name: 'Pirmasens', type: 'Kreisfreie Stadt' },
        { key: 'de-krs-07320', ags: '07320', name: 'Zweibrücken', type: 'Kreisfreie Stadt' },
        { key: 'de-krs-07340', ags: '07340', name: 'Südwestpfalz', type: 'Landkreis' },
      ],
    })
  })

  it('keeps raw BKG labels searchable while presenting normalized display spacing', () => {
    const region = loadGermanyRegistry().regions.find((candidate) => candidate.key === 'de-krg-12069000')
    expect(region).toMatchObject({
      displayName: 'Potsdam-Mittelmark/Brandenburg an der Havel',
      sourceName: 'Potsdam-Mittelmark/Brandenburg  an der Havel',
    })
    expect(region?.aliases).toEqual(expect.arrayContaining([
      'Potsdam-Mittelmark/Brandenburg  an der Havel',
      'Potsdam-Mittelmark/Brandenburg an der Havel',
    ]))
  })

  it('contains only padded BKG keys and no GADM or geometry payload', () => {
    const registry = loadGermanyRegistry()
    for (const region of registry.regions) {
      expect(region.key).toBe(`de-krg-${region.sourceKey}`)
      expect(region.sourceKey).toMatch(/^\d{8}$/)
      for (const unit of region.kreisUnits) {
        expect(unit.key).toBe(`de-krs-${unit.ags}`)
        expect(unit.ags).toMatch(/^\d{5}$/)
      }
    }
    const serialized = JSON.stringify(registry)
    expect(serialized).not.toMatch(/gadm/i)
    expect(serialized).not.toMatch(/geometry/i)
  })
})

describe('parseRegionRegistry', () => {
  it('rejects unknown fields so provider bridges cannot leak into the BKG artifact', () => {
    const draft = clone(loadGermanyRegistry()) as unknown as { regions: Array<Record<string, unknown>> }
    draft.regions[0].gadmGids = ['DEU.15.4_1']

    expect(() => parseRegionRegistry(draft)).toThrowError(RegionRegistryValidationError)
    expect(() => parseRegionRegistry(draft)).toThrow(/\$\.regions\[0\]\.gadmGids: unknown field/)
  })

  it('rejects malformed canonical keys, duplicate parents and stale counts', () => {
    const draft = clone(loadGermanyRegistry())
    draft.regions[0].sourceKey = '1002000'
    draft.regions[1].kreisUnits.push(clone(draft.regions[0].kreisUnits[0]))
    draft.registry.counts.kreisUnits = 399

    expect(() => parseRegionRegistry(draft)).toThrow(/invalid value "1002000"/)
    expect(() => parseRegionRegistry(draft)).toThrow(/a Kreis unit belongs to more than one region/)
    expect(() => parseRegionRegistry(draft)).toThrow(/declares 399, computed 401/)
  })

  it('rejects nondeterministic ordering and incomplete aliases', () => {
    const draft = clone(loadGermanyRegistry())
    draft.regions.reverse()
    draft.regions[0].aliases = draft.regions[0].aliases.filter((alias) => alias !== draft.regions[0].stateName)

    expect(() => parseRegionRegistry(draft)).toThrow(/must be strictly sorted with no duplicates/)
    expect(() => parseRegionRegistry(draft)).toThrow(/missing required alias/)
  })
})
