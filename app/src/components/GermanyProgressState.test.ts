import { describe, expect, it } from 'vitest'
import { germanyProgressView, regionDrilldown, type GermanyProgressData } from './GermanyProgressState'

const data = (overrides: Partial<NonNullable<GermanyProgressData['catalogue']>> = {}): GermanyProgressData => ({
  countryCode: 'DE',
  catalogue: { id: 'catalogue-1', runKey: 'germany-2026-a', species: 7_042, discovered: 0, studied: 0, yearFrom: 2016, yearTo: 2026, ...overrides },
  territory: { regions: 362, germanSightings: 0, visitedRegions: 0 },
})

describe('Germany progress presentation state', () => {
  it('distinguishes empty progress from an unavailable catalogue', () => {
    expect(germanyProgressView({ data: data(), offline: false, loading: false, error: false })).toMatchObject({ kind: 'ready', empty: true })
    expect(germanyProgressView({ data: { countryCode: 'DE', catalogue: null, territory: null }, offline: false, loading: false, error: false })).toEqual({ kind: 'preparing' })
  })

  it('uses saved data offline and names a missing offline result honestly', () => {
    expect(germanyProgressView({ data: data({ discovered: 12 }), offline: true, loading: false, error: true })).toMatchObject({ kind: 'ready', offline: true, empty: false })
    expect(germanyProgressView({ data: null, offline: true, loading: false, error: true })).toEqual({ kind: 'offline-missing' })
  })

  it('makes a catalogue refresh visible in the denominator identity', () => {
    const before = germanyProgressView({ data: data(), offline: false, loading: false, error: false })
    const after = germanyProgressView({ data: data({ runKey: 'germany-2026-b', species: 7_118, discovered: 3, studied: 2 }), offline: false, loading: false, error: false })
    expect(before.kind === 'ready' && before.denominatorVersion).toBe('germany-2026-a:7042')
    expect(after.kind === 'ready' && after.denominatorVersion).toBe('germany-2026-b:7118')
  })
})

describe('saved-region drilldown', () => {
  it('shows one region directly and reveals additional saved regions only on request', () => {
    expect(regionDrilldown([{ id: 'one' }], 'one', false)).toMatchObject({ primary: { id: 'one' }, additional: 0, total: 1, visible: [{ id: 'one' }] })
    const rows = [{ id: 'other' }, { id: 'active' }, { id: 'third' }]
    expect(regionDrilldown(rows, 'active', false)).toMatchObject({ primary: { id: 'active' }, additional: 2, visible: [{ id: 'active' }] })
    expect(regionDrilldown(rows, 'active', true).visible.map((row) => row.id)).toEqual(['active', 'other', 'third'])
  })

  it('defensively caps old saved-region data at twenty', () => {
    const rows = Array.from({ length: 25 }, (_, index) => ({ id: `r-${index}` }))
    expect(regionDrilldown(rows, null, true)).toMatchObject({ total: 20, additional: 19 })
    expect(regionDrilldown(rows, null, true).visible).toHaveLength(20)
  })
})
