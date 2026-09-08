import { normalizeRegionAlias } from '../domain/regionAlias'

export type PickerConstituent = { name: string; kind: string }
export type PickerRegion = {
  id: string
  name: string
  status: string
  canonicalKey?: string
  higher?: string
  stateName?: string
  sourceName?: string
  selectable?: boolean
  summary?: { setSize: number; nowCount: number } | null
  summaryStatus?: 'available' | 'stale' | 'unavailable'
  constituents?: PickerConstituent[]
}

export const pickerQuery = (value: string) => normalizeRegionAlias(value)
export const pickerCanSelect = (region: PickerRegion) => region.selectable ?? region.status === 'ready'

export function constituentMatch(region: PickerRegion, query: string) {
  const normalized = pickerQuery(query)
  if (!normalized || pickerQuery(region.name).includes(normalized)) return null
  return region.constituents?.find((constituent) => pickerQuery(constituent.name).includes(normalized)) ?? null
}

export function recentRegionIds(current: string[], id: string, limit = 8) {
  return [id, ...current.filter((value) => value !== id)].slice(0, limit)
}

export function pickerIsGermanFallback(region: PickerRegion) {
  const geography = pickerQuery([region.higher, region.stateName].filter(Boolean).join(' '))
  const isGerman = geography.includes('deutschland') || geography.includes('germany')
  const retiredLegacyRegion = ['kyoto', 'schagen', 'pirmasens', 'zweibruecken'].includes(pickerQuery(region.name))
  return isGerman && !retiredLegacyRegion
}

/** Transitional, bounded fallback for pre-canonical fixture/offline reads. Never receives the national catalogue. */
export function matchingFallback(regions: PickerRegion[], query: string, limit = 20) {
  const tokens = pickerQuery(query).split(' ').filter(Boolean)
  if (tokens.join('').length < 2) return []
  return regions.filter((region) => {
    if (!pickerIsGermanFallback(region)) return false
    const haystack = pickerQuery([region.name, region.higher, region.stateName, region.sourceName].filter(Boolean).join(' '))
    return tokens.every((token) => haystack.includes(token))
  }).slice(0, limit)
}
