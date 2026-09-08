// Pure aggregation for a Kreisregion composed from one or more disjoint GBIF query units.
// Taxonomy resolution happens before this boundary: several facet keys may therefore point to one accepted species key.
import type { Species } from './gbif'
import { CUT_FLOOR, CUT_SHARE, cutTile } from './rules'

export const COMPOSITE_MONTHS = 12

export type ResolvedSpeciesCount = {
  /** The speciesKey returned by the occurrence facet (an accepted key or a synonym). */
  sourceKey: number
  /** The accepted GBIF species key selected by taxonomy resolution. */
  acceptedKey: number
  /** The accepted backbone record. Its key must equal acceptedKey. */
  species: Species
  obs: number
  byMonth: readonly number[]
}

export type QueryUnitCounts = {
  queryUnitKey: string
  total: number
  monthTotals: readonly number[]
  species: readonly ResolvedSpeciesCount[]
}

export type CompositeSpeciesCount = {
  key: number
  obs: number
  byMonth: number[]
  species: Species
  /** Audit trail for all synonymous facet keys folded into this accepted species. */
  sourceKeys: number[]
  /** Audit trail for the constituent query units that contributed a non-zero count. */
  queryUnitKeys: string[]
}

export type CompositeCounts = {
  total: number
  monthTotals: number[]
  species: CompositeSpeciesCount[]
}

type Accumulator = {
  obs: number
  byMonth: number[]
  species: Species
  metadataSignature: string
  sourceKeys: Set<number>
  queryUnitKeys: Set<string>
}

const SPECIES_METADATA_FIELDS = [
  'nubKey',
  'canonicalName',
  'scientificName',
  'rank',
  'kingdom',
  'phylum',
  'class',
  'order',
  'family',
  'genus',
  'taxonomicStatus',
] as const satisfies readonly (keyof Species)[]

function assertCount(value: number, path: string) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${path} must be a non-negative safe integer`)
}

function assertKey(value: number, path: string) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${path} must be a positive safe integer`)
}

function assertMonths(values: readonly number[], path: string) {
  if (values.length !== COMPOSITE_MONTHS) throw new Error(`${path} must contain exactly ${COMPOSITE_MONTHS} months`)
  values.forEach((value, index) => assertCount(value, `${path}[${index}]`))
}

function metadataSignature(species: Species) {
  return JSON.stringify(SPECIES_METADATA_FIELDS.map((field) => species[field] ?? null))
}

/**
 * Apply the existing floor/cumulative-share rule with the contract's accepted-key tiebreaker. `cutTile` is stable, but
 * the explicit pre-order keeps the boundary independent of fetch and grouping order.
 */
export function cutCompositeTile<T extends { key: number; obs: number }>(candidates: readonly T[], share = CUT_SHARE, floor = CUT_FLOOR): T[] {
  return cutTile([...candidates].sort((a, b) => b.obs - a.obs || a.key - b.key), share, floor)
}

/**
 * Sum raw whole-year, month and regional-total facets across disjoint query units.
 *
 * This function deliberately sees only aggregate provider counts. It does not deduplicate occurrence records that GBIF
 * may expose more than once across its datasets; those counts remain part of the documented source limitation. Only
 * synonymous source keys are folded, by their previously resolved accepted species key.
 */
export function aggregateCompositeCounts(units: readonly QueryUnitCounts[]): CompositeCounts {
  const unitKeys = new Set<string>()
  const monthTotals = Array<number>(COMPOSITE_MONTHS).fill(0)
  const species = new Map<number, Accumulator>()
  let total = 0

  for (const unit of units) {
    if (!unit.queryUnitKey) throw new Error('queryUnitKey must not be empty')
    if (unitKeys.has(unit.queryUnitKey)) throw new Error(`duplicate query unit ${unit.queryUnitKey}`)
    unitKeys.add(unit.queryUnitKey)
    assertCount(unit.total, `${unit.queryUnitKey}.total`)
    assertMonths(unit.monthTotals, `${unit.queryUnitKey}.monthTotals`)
    total += unit.total
    assertCount(total, 'composite total')
    unit.monthTotals.forEach((count, month) => {
      monthTotals[month] += count
      assertCount(monthTotals[month]!, `composite monthTotals[${month}]`)
    })

    const sourceKeys = new Set<number>()
    for (const row of unit.species) {
      assertKey(row.sourceKey, `${unit.queryUnitKey}.species.sourceKey`)
      if (sourceKeys.has(row.sourceKey)) throw new Error(`${unit.queryUnitKey} contains duplicate sourceKey ${row.sourceKey}`)
      sourceKeys.add(row.sourceKey)
      assertKey(row.acceptedKey, `${unit.queryUnitKey}.species.acceptedKey`)
      assertCount(row.obs, `${unit.queryUnitKey}.species[${row.sourceKey}].obs`)
      assertMonths(row.byMonth, `${unit.queryUnitKey}.species[${row.sourceKey}].byMonth`)
      if (row.species.key !== row.acceptedKey) {
        throw new Error(`${unit.queryUnitKey}.species[${row.sourceKey}] accepted record key ${row.species.key} does not match acceptedKey ${row.acceptedKey}`)
      }

      const signature = metadataSignature(row.species)
      const aggregate = species.get(row.acceptedKey) ?? {
        obs: 0,
        byMonth: Array<number>(COMPOSITE_MONTHS).fill(0),
        species: row.species,
        metadataSignature: signature,
        sourceKeys: new Set<number>(),
        queryUnitKeys: new Set<string>(),
      }
      if (aggregate.metadataSignature !== signature) {
        throw new Error(`acceptedKey ${row.acceptedKey} has conflicting terminal taxonomy metadata`)
      }
      aggregate.obs += row.obs
      assertCount(aggregate.obs, `species ${row.acceptedKey} composite obs`)
      row.byMonth.forEach((count, month) => {
        aggregate.byMonth[month] += count
        assertCount(aggregate.byMonth[month]!, `species ${row.acceptedKey} composite byMonth[${month}]`)
      })
      aggregate.sourceKeys.add(row.sourceKey)
      if (row.obs > 0 || row.byMonth.some((count) => count > 0)) aggregate.queryUnitKeys.add(unit.queryUnitKey)
      species.set(row.acceptedKey, aggregate)
    }
  }

  return {
    total,
    monthTotals,
    species: [...species.entries()]
      .map(([key, aggregate]) => ({
        key,
        obs: aggregate.obs,
        byMonth: aggregate.byMonth,
        species: aggregate.species,
        sourceKeys: [...aggregate.sourceKeys].sort((a, b) => a - b),
        queryUnitKeys: [...aggregate.queryUnitKeys].sort(),
      }))
      .sort((a, b) => b.obs - a.obs || a.key - b.key),
  }
}
