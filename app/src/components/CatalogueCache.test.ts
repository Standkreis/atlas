import { describe, expect, it } from 'vitest'
import { LEGACY_CATALOGUE_SENTINEL, catalogueVersionForStorage, catalogueVersionFromStorage, catalogueVersionFromStorageEvent, catalogueVersionOf, catalogueVersionToAdopt, isCatalogueScopedQuery, keepForCatalogue } from './CatalogueCache'

describe('catalogue-aware persisted queries', () => {
  it('recognises direct and Germany-progress catalogue versions', () => {
    expect(catalogueVersionOf({ catalogueVersion: 'v2' })).toBe('v2')
    expect(catalogueVersionOf({ catalogue: { id: 'v2' } })).toBe('v2')
    expect(catalogueVersionOf({ catalogueVersion: null })).toBeNull()
    expect(catalogueVersionOf({ species: [] })).toBeUndefined()
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
    expect(keepForCatalogue(set, { catalogueVersion: 'new', species: [] }, null)).toBe(false)
    expect(keepForCatalogue(set, { species: [] }, null)).toBe(true)
    expect(keepForCatalogue(set, { catalogueVersion: 'new', species: [] }, undefined)).toBe(true)
    expect(keepForCatalogue(journal, { private: true }, 'new')).toBe(true)
  })

  it('does not let a late old regional response roll back the authoritative handshake', () => {
    expect(catalogueVersionToAdopt(undefined, 'v1', false)).toBe('v1')
    expect(catalogueVersionToAdopt('v1', 'v2', true)).toBe('v2')
    expect(catalogueVersionToAdopt('v2', 'v1', false)).toBe('v2')
    expect(catalogueVersionToAdopt('v2', null, true)).toBeNull()
    expect(catalogueVersionToAdopt(null, 'v2', false)).toBeNull()
  })

  it('persists an authoritative legacy handshake distinctly from no observation', () => {
    expect(catalogueVersionFromStorage(null)).toBeUndefined()
    expect(catalogueVersionForStorage(null)).toBe(LEGACY_CATALOGUE_SENTINEL)
    expect(catalogueVersionFromStorage(LEGACY_CATALOGUE_SENTINEL)).toBeNull()
    expect(catalogueVersionFromStorage('v2')).toBe('v2')
    expect(catalogueVersionFromStorageEvent(null)).toBeNull()
    expect(catalogueVersionFromStorageEvent(LEGACY_CATALOGUE_SENTINEL)).toBeNull()
  })
})
