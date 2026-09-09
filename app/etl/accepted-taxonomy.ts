import { pool } from './fetch'
import { gbifSpecies, gbifSpeciesMatch, type Match, type Species } from './gbif'

export type AcceptedSpecies = {
  sourceKey: number
  acceptedKey: number
  species: Species
}

export type TaxonomyRejection = {
  sourceKey: number
  reason: string
}

export type AcceptedTaxonomyResult = {
  resolved: Map<number, AcceptedSpecies>
  rejected: TaxonomyRejection[]
}

export type SpeciesLookup = (key: number) => Promise<Species | null>
export type SpeciesMatchLookup = (name: string, kingdom?: string) => Promise<Match | null>

function assertSpeciesKey(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${label} must be a positive safe integer`)
}

function speciesRecordError(requestedKey: number, species: Species | null): string | null {
  if (!species) return `GBIF taxonomy did not resolve species ${requestedKey}`
  if (species.key !== requestedKey) return `GBIF taxonomy request ${requestedKey} returned key ${species.key}`
  if (species.rank?.toUpperCase() !== 'SPECIES') {
    return `GBIF taxonomy key ${requestedKey} has rank ${species.rank ?? 'unknown'}, expected SPECIES`
  }
  if (!species.canonicalName && !species.scientificName) {
    return `GBIF taxonomy key ${requestedKey} has no scientific name`
  }
  if (species.taxonomicStatus?.includes('SYNONYM') && (!species.acceptedKey || species.acceptedKey === requestedKey)) {
    return `GBIF taxonomy synonym ${requestedKey} has no distinct acceptedKey`
  }
  return null
}

function normalizedName(species: Species): string {
  return (species.canonicalName ?? species.scientificName ?? '').trim().toLocaleLowerCase('en')
}

function doubtfulMatch(source: Species, match: Match | null): { acceptedKey: number } | { error: string } {
  if (!match) return { error: `GBIF doubtful taxonomy key ${source.key} has no exact accepted name match` }
  const key = match.acceptedUsageKey ?? match.usageKey ?? match.key
  const status = (match.status ?? match.taxonomicStatus ?? '').toUpperCase()
  if (match.matchType?.toUpperCase() !== 'EXACT' || status !== 'ACCEPTED') {
    return { error: `GBIF doubtful taxonomy key ${source.key} matched ${match.matchType ?? 'unknown'}/${status || 'unknown'}, expected EXACT/ACCEPTED` }
  }
  if (!Number.isSafeInteger(key) || !key || key <= 0 || key === source.key) {
    return { error: `GBIF doubtful taxonomy key ${source.key} has no distinct positive accepted match key` }
  }
  if (normalizedName(source) !== normalizedName(match)) {
    return { error: `GBIF doubtful taxonomy key ${source.key} changed canonical name in its accepted match` }
  }
  if (source.kingdom && match.kingdom && source.kingdom !== match.kingdom) {
    return { error: `GBIF doubtful taxonomy key ${source.key} changed kingdom in its accepted match` }
  }
  return { acceptedKey: key }
}

/**
 * Resolve every raw occurrence-facet key through GBIF's acceptedKey chain.
 *
 * The lookup is deduplicated across all supplied year/month facets. Accepted targets are fetched
 * as full records so persisted taxonomy never inherits the name or ranks of a synonym.
 */
export async function resolveAcceptedSpecies(
  sourceKeys: readonly number[],
  lookup: SpeciesLookup = gbifSpecies,
  match: SpeciesMatchLookup = gbifSpeciesMatch,
): Promise<AcceptedTaxonomyResult> {
  const requested = [...new Set(sourceKeys)].sort((a, b) => a - b)
  requested.forEach((key) => assertSpeciesKey(key, 'source species key'))

  const records = new Map<number, Species>()
  const invalid = new Map<number, string>()
  let pending = requested
  while (pending.length > 0) {
    const batch = pending.filter((key) => !records.has(key))
    if (batch.length === 0) break
    const fetched = await pool(batch, 6, lookup)
    pending = []
    const doubtful: Species[] = []
    batch.forEach((key, index) => {
      const species = fetched[index] ?? null
      const error = speciesRecordError(key, species)
      if (error) {
        invalid.set(key, error)
        return
      }
      const validSpecies = species!
      records.set(key, validSpecies)
      if (validSpecies.taxonomicStatus?.toUpperCase() === 'DOUBTFUL' && validSpecies.acceptedKey === undefined) {
        doubtful.push(validSpecies)
        return
      }
      if (validSpecies.acceptedKey !== undefined) {
        if (!Number.isSafeInteger(validSpecies.acceptedKey) || validSpecies.acceptedKey <= 0) {
          invalid.set(key, `accepted key for ${key} must be a positive safe integer`)
          records.delete(key)
          return
        }
        if (!records.has(validSpecies.acceptedKey)) pending.push(validSpecies.acceptedKey)
      }
    })
    const matches = await pool(doubtful, 6, (species) => match(normalizedName(species), species.kingdom))
    doubtful.forEach((species, index) => {
      const result = doubtfulMatch(species, matches[index] ?? null)
      if ('error' in result) {
        invalid.set(species.key, result.error)
        records.delete(species.key)
        return
      }
      records.set(species.key, { ...species, acceptedKey: result.acceptedKey })
      if (!records.has(result.acceptedKey)) pending.push(result.acceptedKey)
    })
    pending = [...new Set(pending)].sort((a, b) => a - b)
  }

  const resolved = new Map<number, AcceptedSpecies>()
  const rejected: TaxonomyRejection[] = []
  for (const sourceKey of requested) {
    const visited = new Set<number>()
    let acceptedKey = sourceKey
    while (true) {
      if (visited.has(acceptedKey)) {
        rejected.push({ sourceKey, reason: `GBIF taxonomy acceptedKey cycle from ${sourceKey}` })
        break
      }
      visited.add(acceptedKey)
      const species = records.get(acceptedKey)
      if (!species) {
        rejected.push({ sourceKey, reason: invalid.get(acceptedKey) ?? `GBIF taxonomy accepted target ${acceptedKey} is missing` })
        break
      }
      const next = species.acceptedKey
      if (next === undefined || next === acceptedKey) {
        if (species.taxonomicStatus?.toUpperCase() !== 'ACCEPTED') {
          rejected.push({ sourceKey, reason: `GBIF taxonomy terminal key ${acceptedKey} has status ${species.taxonomicStatus ?? 'unknown'}, expected ACCEPTED` })
          break
        }
        resolved.set(sourceKey, { sourceKey, acceptedKey, species })
        break
      }
      acceptedKey = next
    }
  }
  return { resolved, rejected }
}
