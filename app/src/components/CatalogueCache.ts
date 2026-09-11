import type { Query, QueryClient } from '@tanstack/react-query'

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

export const isCatalogueScopedQuery = (key: readonly unknown[]) => {
  return REGIONAL.some((path) => isPath(key, path))
}
export const keepForCatalogue = (key: readonly unknown[], data: unknown, current: CatalogueVersionState) =>
  current === undefined || !isCatalogueScopedQuery(key) || (current === null ? typeof catalogueVersionOf(data) !== 'string' : catalogueVersionOf(data) === current)

/** Only the identity handshake may establish or replace a version. Regional data is provisional. */
export const catalogueVersionToAdopt = (current: CatalogueVersionState, observed: CatalogueVersionState, authoritative: boolean): CatalogueVersionState => {
  if (authoritative) return observed === undefined ? current : observed
  return current
}

type CatalogueWatcherOptions = {
  readVersion: () => CatalogueVersionState
  writeVersion: (version: string | null) => void
  onTransition?: (version: string | null) => void
}

export type CatalogueCacheWatcher = {
  /** Apply an authoritative version received from another tab. */
  transition: (version: string | null) => void
  unsubscribe: () => void
}

/**
 * Keep the live QueryClient on one catalogue generation.
 *
 * Persistence can reject every unversioned regional value while a version is active because it
 * cannot know when that value was fetched. Runtime reads are more precise: some compatibility
 * and empty-result procedures intentionally have no version, so their request-start generation
 * is recorded. A transition destroys old queries (and their retryers) before they can settle;
 * later unversioned reads started in the new generation are valid.
 */
export function watchCatalogueCache(qc: QueryClient, options: CatalogueWatcherOptions): CatalogueCacheWatcher {
  const requestedAt = new WeakMap<Query, CatalogueVersionState>()
  // A provider can be mounted around work which has already begun. Seed those requests so a
  // valid unversioned compatibility/empty response is not mistaken for restored stale data.
  for (const query of qc.getQueryCache().getAll()) {
    if (query.state.fetchStatus === 'fetching' && isCatalogueScopedQuery(query.queryKey)) requestedAt.set(query, options.readVersion())
  }
  const compatible = (query: Query, version: CatalogueVersionState) => {
    if (!isCatalogueScopedQuery(query.queryKey) || version === undefined) return true
    if (requestedAt.has(query) && requestedAt.get(query) !== version) return false
    const observed = catalogueVersionOf(query.state.data)
    if (typeof observed === 'string') return observed === version
    // A known request generation makes null/absent metadata safe for empty results and the
    // bounded legacy wire. Hydrated values have no generation and use the stricter disk rule.
    return requestedAt.has(query) || keepForCatalogue(query.queryKey, query.state.data, version)
  }
  const remove = (predicate: (query: Query) => boolean) => {
    // `removeQueries` destroys each query and cancels its retryer synchronously. The explicit
    // cancellation also signals query functions which consume AbortSignal before removal.
    void qc.cancelQueries({ predicate }).catch(() => {})
    qc.removeQueries({ predicate })
  }
  const transition = (version: string | null, except?: Query) => {
    remove((query) => query !== except && isCatalogueScopedQuery(query.queryKey))
    options.onTransition?.(version)
  }
  const reconcile = (version: CatalogueVersionState, except?: Query) => {
    qc.removeQueries({ predicate: (query) => query !== except && !compatible(query, version) })
  }
  const unsubscribe = qc.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated') return
    if (event.action.type === 'fetch' && isCatalogueScopedQuery(event.query.queryKey)) {
      requestedAt.set(event.query, options.readVersion())
      return
    }
    if (event.action.type !== 'success') return
    const authoritative = isPath(event.query.queryKey, ['identity', 'me'])
    const previous = options.readVersion()
    const observed = catalogueVersionOf(event.query.state.data)
    const adopted = catalogueVersionToAdopt(previous, observed, authoritative)
    if (adopted !== undefined && adopted !== previous) {
      options.writeVersion(adopted)
      transition(adopted, event.query)
    } else if (authoritative) {
      // A repeated handshake also cleans values restored or inserted without a known request
      // generation, while preserving valid fresh empty/unversioned responses. Pack cleanup is
      // repeated too: an outgoing page may write the marker and unload before its async cache
      // deletion finishes, so the incoming page must complete the idempotent transition work.
      reconcile(adopted, event.query)
      if (adopted !== undefined) options.onTransition?.(adopted)
    } else if (!compatible(event.query, previous)) {
      qc.removeQueries({ predicate: (query) => query === event.query })
    }
  })
  return { transition: (version) => transition(version), unsubscribe }
}
