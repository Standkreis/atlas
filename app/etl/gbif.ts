// GBIF: GADM search, occurrence facets, the backbone species record (spec §🗄️).
import { get, q } from './fetch'
import { OBSERVATION_YEARS } from '../src/domain/observationWindow'

const API = 'https://api.gbif.org/v1'

/** The window and record types of record 0002 E2: last ten years, observation records with coordinates. */
export const YEARS = OBSERVATION_YEARS
export const BASIS = ['HUMAN_OBSERVATION', 'OBSERVATION', 'MACHINE_OBSERVATION', 'OCCURRENCE']
export const occurrenceBase = (gadmGid: string) => ({ year: YEARS, hasCoordinate: true, occurrenceStatus: 'PRESENT', basisOfRecord: BASIS, gadmGid })

export type Facet = { total: number; counts: { name: string; count: number }[] }
type FacetResponse = { count: number; facets?: { field?: unknown; counts?: unknown }[] }

/** One complete occurrence facet. Full pages are followed with facetOffset until a short page. */
export async function gbifFacet(field: string, params: Record<string, string | number | boolean | string[]>, limit = 10000): Promise<Facet> {
  if (!Number.isSafeInteger(limit) || limit <= 0) throw new Error('GBIF facetLimit must be a positive safe integer')
  const normalizedField = field.replace(/[^a-z0-9]/gi, '').toLowerCase()
  const counts: Facet['counts'] = []
  const names = new Set<string>()
  let total: number | undefined
  let offset = 0

  while (true) {
    const j = await get<FacetResponse>(`${API}/occurrence/search?${q({ ...params, limit: 0, facet: field, facetLimit: limit, facetOffset: offset })}`)
    if (!j) throw new Error(`GBIF facet ${field} returned 404`)
    if (!Number.isSafeInteger(j.count) || j.count < 0) throw new Error(`GBIF facet ${field} returned an invalid total`)
    if (total !== undefined && total !== j.count) throw new Error(`GBIF facet ${field} total changed while paging (${total} to ${j.count})`)
    total = j.count
    if (total === 0) return { total: 0, counts: [] }

    const facet = j.facets?.find((candidate) => (
      typeof candidate.field === 'string' && candidate.field.replace(/[^a-z0-9]/gi, '').toLowerCase() === normalizedField
    ))
    if (!facet || !Array.isArray(facet.counts)) throw new Error(`GBIF facet ${field} returned no usable counts`)
    if (facet.counts.length > limit || facet.counts.some((entry) => (
      !entry || typeof entry.name !== 'string' || !entry.name || !Number.isSafeInteger(entry.count) || entry.count < 0
    ))) throw new Error(`GBIF facet ${field} returned malformed counts`)
    for (const entry of facet.counts) {
      if (names.has(entry.name)) throw new Error(`GBIF facet ${field} repeated value ${entry.name} while paging`)
      names.add(entry.name)
      counts.push(entry)
    }
    if (facet.counts.length < limit) return { total, counts }
    if (!Number.isSafeInteger(offset + limit)) throw new Error(`GBIF facet ${field} offset exceeded the safe integer range`)
    offset += limit
  }
}

export type Gadm = { gadmGid: string; name: string; higher: string; level: number }
type GadmResponse = { results: { id: string; name: string; gadmLevel: number; higherRegions?: { id: string; name: string }[] }[] }

/** Name or gid → the GADM level-2 unit GBIF indexes (record 0002 E1). A gid like DEU.11.19_1 is looked up directly. */
export async function resolveRegion(query: string): Promise<Gadm> {
  const isGid = /^[A-Z]{3}(\.\d+)+_\d+$/.test(query)
  const j = await get<GadmResponse>(`${API}/geocode/gadm/search?${q(isGid ? { gadmGid: query, limit: 5 } : { q: query, limit: 5 })}`)
  const results = j?.results ?? []
  const g = (isGid ? results.find((r) => r.id === query) : results.find((r) => r.gadmLevel === 2)) ?? results[0]
  if (!g) throw new Error(`no GADM unit for "${query}"`)
  return { gadmGid: g.id, name: g.name, higher: (g.higherRegions ?? []).map((h) => h.name).join(' › '), level: g.gadmLevel }
}

export type Species = {
  key: number
  nubKey?: number
  acceptedKey?: number
  canonicalName?: string
  scientificName?: string
  rank?: string
  kingdom?: string
  phylum?: string
  class?: string
  order?: string
  family?: string
  genus?: string
  taxonomicStatus?: string
}

/** The backbone record for a key; null when GBIF has none. */
export const gbifSpecies = (key: number | string) => get<Species>(`${API}/species/${key}`)

export type Match = Species & { usageKey?: number; matchType?: string; status?: string; acceptedUsageKey?: number; confidence?: number }
/** Backbone match by name for GloBI targets (strict, exact matches only are used); null when GBIF has nothing. */
export const gbifMatch = (name: string) => get<Match>(`${API}/species/match?${q({ name, strict: true })}`)
/** Species-rank match used only to disambiguate a doubtful occurrence-facet concept. */
export const gbifSpeciesMatch = (name: string, kingdom?: string) => get<Match>(`${API}/species/match?${q({ name, kingdom, rank: 'SPECIES', strict: true })}`)
