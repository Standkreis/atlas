import { describe, expect, it, vi } from 'vitest'
import { normalizeRegionAlias } from '../domain/regionAlias'
import { locateRegion, personalRegions, regionLocationInput, regionSearchInput, searchRegions } from './regionSearch'

const entry = (n: number, status = 'ready') => ({
  id: `entry-${n}`, regionId: `region-${n}`, displayName: 'Südwestpfalz', sourceName: 'Südwestpfalz/Pirmasens/Zweibrücken',
  stateCode: '07', stateName: 'Rheinland-Pfalz', region: { canonicalKey: `de-krg-${String(n).padStart(8, '0')}`, status },
  sourceUnits: [{ canonicalKey: 'de-krs-07317', name: 'Pirmasens', kind: 'Kreisfreie Stadt' }],
})
function fixture(count = 2) {
  const db = {
    regionRegistryVersion: { findFirst: vi.fn().mockResolvedValue({ id: 'registry-v1', version: '2024' }) },
    catalogueVersion: { findFirst: vi.fn().mockResolvedValue(null) },
    regionRegistryEntry: { findMany: vi.fn().mockResolvedValue(Array.from({ length: count }, (_, i) => entry(i))), findFirst: vi.fn().mockResolvedValue(entry(0)) },
    catalogueRegionBuild: { findMany: vi.fn().mockResolvedValue([{ registryEntryId: 'entry-0', catalogueVersionId: 'catalogue-v1', regionSize: 42, nowCounts: Array(12).fill(12), perTile: { bird: 42 }, completedAt: new Date('2026-09-08') }]) },
    filter: { findUnique: vi.fn().mockResolvedValue({ regionId: 'region-0', regionIds: ['region-0'] }) },
  }
  return { spies: db, db: db as unknown as Parameters<typeof searchRegions>[0] }
}

describe('bounded German region search', () => {
  it.each(['Zweibrücken', 'ZWEIBRUECKEN', '  Zweibru\u0308cken '])('shares import/search normalization for %s', (name) => {
    expect(normalizeRegionAlias(name)).toBe('zweibruecken')
  })
  it('normalizes sharp s, punctuation, spaces and state qualifiers', () => {
    expect(normalizeRegionAlias('  Straße / Rheinland-Pfalz ')).toBe('strasse rheinland pfalz')
  })
  it.each(['', ' ', '!!', 'a'])('does not scan the catalogue for %j', async (q) => {
    const { db, spies } = fixture()
    expect((await searchRegions(db, regionSearchInput.parse({ q }))).results).toEqual([])
    expect(spies.regionRegistryEntry.findMany).not.toHaveBeenCalled()
    expect(spies.catalogueRegionBuild.findMany).not.toHaveBeenCalled()
  })
  it('caps and paginates one entry query and one batch summary query', async () => {
    const { db, spies } = fixture(21)
    const result = await searchRegions(db, regionSearchInput.parse({ q: 'Pirmasens Rheinland-Pfalz', limit: 20 }))
    expect(result.results).toHaveLength(20)
    expect(result.next).toBe('de-krg-00000019')
    const args = spies.regionRegistryEntry.findMany.mock.calls[0][0]
    expect(args.take).toBe(21)
    expect(args.where.AND).toEqual(['pirmasens', 'rheinland', 'pfalz'].map((token) => ({ aliases: { some: { normalizedName: { contains: token } } } })))
    expect(spies.catalogueRegionBuild.findMany).toHaveBeenCalledTimes(1)
    expect(spies.catalogueRegionBuild.findMany.mock.calls[0][0].where.registryEntryId.in).toHaveLength(20)
    expect(JSON.stringify(args.select)).not.toMatch(/taxon|asset|gallery|queryUnit/)
    expect(JSON.stringify(result)).not.toMatch(/gadm|gallery|asset|providerKey/)
    expect(result.results[0]).toMatchObject({ name: 'Südwestpfalz', stateName: 'Rheinland-Pfalz', summary: { setSize: 42, nowCount: 12 }, selectable: true })
    expect(result.results[1]).toMatchObject({ summaryStatus: 'unavailable', summary: null, selectable: false })
    await searchRegions(db, regionSearchInput.parse({ q: 'Pirmasens', after: result.next, registryVersion: result.registryVersion }))
    expect(spies.regionRegistryEntry.findMany.mock.calls[1][0].where.region.canonicalKey).toEqual({ gt: result.next })
  })
  it('rejects excessive limits and invalid inputs', () => {
    for (const input of [{ limit: 21 }, { limit: 0 }, { limit: 1.5 }, { q: 'x'.repeat(81) }, { after: 'DEU.1_1' }, { month: 13 }]) {
      expect(regionSearchInput.safeParse(input).success).toBe(false)
    }
  })
  it('does not silently continue pagination across registry activation', async () => {
    const { db, spies } = fixture()
    expect(await searchRegions(db, regionSearchInput.parse({ q: 'Pirmasens', registryVersion: 'old' }))).toMatchObject({ status: 'registry-changed', results: [] })
    expect(spies.regionRegistryEntry.findMany).not.toHaveBeenCalled()
  })
  it('exposes incomplete old summaries as stale and never publishes a staged build', async () => {
    const { db, spies } = fixture()
    spies.catalogueRegionBuild.findMany.mockResolvedValue([{ registryEntryId: 'entry-0', regionSize: 42, nowCounts: [] }])
    const result = await searchRegions(db, regionSearchInput.parse({ q: 'Pirmasens' }))
    expect(result.results[0]).toMatchObject({ summary: null, summaryStatus: 'stale', selectable: false })
    expect(spies.catalogueRegionBuild.findMany.mock.calls[0][0].where.catalogueVersion).toEqual({ countryCode: 'DE', status: 'active' })
  })
  it('keeps selected/recent order separate, deduplicates, and reports retired IDs', async () => {
    const { db, spies } = fixture()
    const result = await personalRegions(db, 'owner', ['region-1', 'region-0', 'retired', 'region-1'], 9)
    expect(spies.filter.findUnique).toHaveBeenCalledWith({ where: { identityId: 'owner' }, select: { regionId: true, regionIds: true } })
    expect(result.selected.map((row) => row.id)).toEqual(['region-0'])
    expect(result.recent.map((row) => row.id)).toEqual(['region-1'])
    expect(result.unavailableIds).toEqual(['retired'])
    expect(spies.regionRegistryEntry.findMany.mock.calls[0][0].where.regionId.in).toEqual(['region-0', 'region-1', 'retired'])
  })
})

describe('authoritative point-location seam', () => {
  it.each(['denied', 'not-requested'] as const)('requires no coordinates, database or provider for %s permission', async (permission) => {
    const { db, spies } = fixture()
    const resolver = vi.fn()
    expect(await locateRegion(db, { permission }, resolver)).toEqual({ status: 'permission-required', region: null })
    expect(resolver).not.toHaveBeenCalled()
    expect(spies.regionRegistryVersion.findFirst).not.toHaveBeenCalled()
    expect(regionLocationInput.safeParse({ permission, lat: 49, lng: 7 }).success).toBe(false)
  })
  it('reports missing geometry honestly without calling any external geocoder', async () => {
    const { db } = fixture()
    expect(await locateRegion(db, { permission: 'granted', lat: 49, lng: 7 })).toMatchObject({ status: 'geometry-unavailable', region: null })
  })
  it('distinguishes no land containment from geometry unavailability', async () => {
    const { db } = fixture()
    expect(await locateRegion(db, { permission: 'granted', lat: 0, lng: 0 }, async () => ({ status: 'ok', regionKeys: [] }))).toMatchObject({ status: 'no-result', region: null })
  })
  it('resolves boundary ties deterministically and collapses duplicates', async () => {
    const { db, spies } = fixture()
    const keys = ['de-krg-00000001', 'de-krg-00000000', 'de-krg-00000001']
    const result = await locateRegion(db, { permission: 'granted', lat: 49, lng: 7 }, async () => ({ status: 'ok', regionKeys: keys }))
    expect(result).toMatchObject({ status: 'resolved', boundaryTie: true, region: { name: 'Südwestpfalz' } })
    expect(spies.regionRegistryEntry.findFirst.mock.calls[0][0].where.region.canonicalKey).toBe('de-krg-00000000')
  })
  it('rejects invalid coordinates and missing permission', () => {
    expect(regionLocationInput.safeParse({ permission: 'granted', lat: 91, lng: 7 }).success).toBe(false)
    expect(regionLocationInput.safeParse({ lat: 49, lng: 7 }).success).toBe(false)
  })
})
