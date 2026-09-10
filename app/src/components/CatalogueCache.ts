export const CATALOGUE_VERSION_KEY = 'dex.catalogue.version'
export const LEGACY_CATALOGUE_SENTINEL = '__dex_catalogue_legacy__'

const REGIONAL: [string, string][] = [['dex', 'set'], ['dex', 'setCounts'], ['dex', 'regions'], ['regions', 'personal'], ['regions', 'search'], ['regions', 'locate'], ['identity', 'germanyProgress'], ['identity', 'me'], ['sighting', 'outside'], ['sighting', 'outsideVersioned'], ['taxon', 'page'], ['taxon', 'mapCentre']]
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const isPath = (key: readonly unknown[], path: [string, string]) => Array.isArray(key[0]) && key[0][0] === path[0] && key[0][1] === path[1]

/** `undefined` means no version observation; `null` is an authoritative legacy catalogue. */
export type CatalogueVersionState = string | null | undefined
export const catalogueVersionOf = (value: unknown): CatalogueVersionState => {
  if (!record(value)) return undefined
  if (typeof value.catalogueVersion === 'string') return value.catalogueVersion
  if (value.catalogueVersion === null) return null
  if (record(value.catalogue) && typeof value.catalogue.id === 'string') return value.catalogue.id
  if (value.catalogue === null) return null
  return undefined
}

export const catalogueVersionFromStorage = (value: string | null): CatalogueVersionState =>
  value === null ? undefined : value === LEGACY_CATALOGUE_SENTINEL ? null : value
export const catalogueVersionFromStorageEvent = (value: string | null): string | null =>
  value === null ? null : catalogueVersionFromStorage(value) ?? null
export const catalogueVersionForStorage = (value: string | null) => value ?? LEGACY_CATALOGUE_SENTINEL

export const isCatalogueScopedQuery = (key: readonly unknown[]) => REGIONAL.some((path) => isPath(key, path))
export const keepForCatalogue = (key: readonly unknown[], data: unknown, current: CatalogueVersionState) =>
  current === undefined || !isCatalogueScopedQuery(key) || (current === null ? typeof catalogueVersionOf(data) !== 'string' : catalogueVersionOf(data) === current)

/** Only the identity handshake may replace a known version; late regional responses cannot roll it back. */
export const catalogueVersionToAdopt = (current: CatalogueVersionState, observed: CatalogueVersionState, authoritative: boolean): CatalogueVersionState => {
  if (authoritative) return observed === undefined ? current : observed
  return current === undefined && typeof observed === 'string' ? observed : current
}
