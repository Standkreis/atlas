import { describe, expect, it } from 'vitest'
import { catalogueVersionOf, catalogueVersionToAdopt, isCatalogueScopedQuery, keepForCatalogue } from './CatalogueCache'

describe('catalogue-aware persisted queries', () => {
  it('recognises direct and Germany-progress catalogue versions', () => {
    expect(catalogueVersionOf({ catalogueVersion: 'v2' })).toBe('v2')
    expect(catalogueVersionOf({ catalogue: { id: 'v2' } })).toBe('v2')
    expect(catalogueVersionOf({ catalogueVersion: null })).toBeNull()
  })

  it('drops stale and unversioned regional reads but preserves personal history', () => {
    const set = [['dex', 'set'], { input: { regionId: 'old' } }]
    const search = [['regions', 'search'], { input: { q: 'Mainz' } }]
    const locate = [['regions', 'locate'], { input: { lat: 49.9, lng: 8.2 } }]
    const journal = [['journal', 'get'], { input: { id: 'personal' } }]
    expect(isCatalogueScopedQuery(set)).toBe(true)
    expect(isCatalogueScopedQuery(search)).toBe(true)
    expect(isCatalogueScopedQuery(locate)).toBe(true)
    expect(keepForCatalogue(set, { catalogueVersion: 'old' }, 'new')).toBe(false)
    expect(keepForCatalogue(search, { catalogueVersion: 'new' }, 'new')).toBe(true)
    expect(keepForCatalogue(locate, { catalogueVersion: 'old' }, 'new')).toBe(false)
    expect(keepForCatalogue(set, { species: [] }, 'new')).toBe(false)
    expect(keepForCatalogue(set, { species: [] }, null)).toBe(true)
    expect(keepForCatalogue(journal, { private: true }, 'new')).toBe(true)
  })

  it('does not let a late old regional response roll back the authoritative handshake', () => {
    expect(catalogueVersionToAdopt(null, 'v1', false)).toBe('v1')
    expect(catalogueVersionToAdopt('v1', 'v2', true)).toBe('v2')
    expect(catalogueVersionToAdopt('v2', 'v1', false)).toBe('v2')
  })
})
