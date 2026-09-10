export const CATALOGUE_VERSION_KEY = 'dex.catalogue.version'

const REGIONAL: [string, string][] = [['dex', 'set'], ['dex', 'setCounts'], ['dex', 'regions'], ['regions', 'personal'], ['regions', 'search'], ['regions', 'locate'], ['identity', 'germanyProgress'], ['identity', 'me'], ['sighting', 'outside'], ['taxon', 'page'], ['taxon', 'mapCentre']]
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const isPath = (key: readonly unknown[], path: [string, string]) => Array.isArray(key[0]) && key[0][0] === path[0] && key[0][1] === path[1]

export const catalogueVersionOf = (value: unknown): string | null => {
  if (!record(value)) return null
  if (typeof value.catalogueVersion === 'string') return value.catalogueVersion
  return record(value.catalogue) && typeof value.catalogue.id === 'string' ? value.catalogue.id : null
}

export const isCatalogueScopedQuery = (key: readonly unknown[]) => REGIONAL.some((path) => isPath(key, path))
export const keepForCatalogue = (key: readonly unknown[], data: unknown, current: string | null) =>
  !current || !isCatalogueScopedQuery(key) || catalogueVersionOf(data) === current

/** Only the identity handshake may replace a known version; late regional responses cannot roll it back. */
export const catalogueVersionToAdopt = (current: string | null, observed: string | null, authoritative: boolean) =>
  observed && (!current || authoritative) ? observed : current
