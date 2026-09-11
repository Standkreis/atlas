const segment = (value: string) => encodeURIComponent(value).replaceAll('%', '_')
const versionedPackPrefix = (catalogueVersion: string) => `dex-pack-v2-${segment(catalogueVersion)}-`
export const packCache = (regionId: string, catalogueVersion: string | null = null) =>
  catalogueVersion ? `dex-pack-v2-${segment(catalogueVersion)}-${regionId}` : `dex-pack-${regionId}`
export const readyKey = (regionId: string, catalogueVersion: string | null = null) =>
  catalogueVersion ? `dex.offline.ready.v2.${segment(catalogueVersion)}.${regionId}` : `dex.offline.ready.${regionId}`

export type Pack = { version: 1 | 2; catalogueVersion?: string; at: string; urls: string[] }
export type RegionalPackSpecies = { leadSmall?: string | null; lead?: { url: string } | null }

/** Explicit regional packs stay lead-only even when a detail response grows to a 12-image gallery. */
export function regionalPackUrls<T extends RegionalPackSpecies>(species: readonly T[]) {
  return [...new Set(species.map((taxon) => taxon.leadSmall ?? taxon.lead?.url ?? null).filter((url): url is string => Boolean(url)))].sort()
}

const packOf = (regionId: string, catalogueVersion: string | null): Pack | null => {
  try {
    const pack = JSON.parse(localStorage.getItem(readyKey(regionId, catalogueVersion)) ?? 'null') as Pack | null
    const versionMatches = catalogueVersion ? pack?.version === 2 && pack.catalogueVersion === catalogueVersion : pack?.version === 1
    return pack && versionMatches && Array.isArray(pack.urls) && !Number.isNaN(Date.parse(pack.at)) ? pack : null
  } catch { return null }
}
export async function verifiedAt(regionId: string, catalogueVersion: string | null, urls: string[]): Promise<string | null> {
  if (!navigator.serviceWorker?.controller) return null
  const pack = packOf(regionId, catalogueVersion)
  if (!pack || pack.urls.length !== urls.length || pack.urls.some((u, i) => u !== urls[i])) return null
  const cacheName = packCache(regionId, catalogueVersion)
  // CacheStorage.match with cacheName is a read. `caches.open` would recreate an empty pack if a
  // catalogue transition deleted it after the readiness marker was read.
  for (const url of urls) if (!(await caches.match(url, { cacheName }))?.ok) return null
  return pack.at
}

/** Remove only incompatible regional packs/markers after an online catalogue transition. */
export async function invalidateRegionalPacks(catalogueVersion: string | null) {
  const keep = catalogueVersion === null ? null : versionedPackPrefix(catalogueVersion)
  if (typeof caches !== 'undefined') {
    const stale = (name: string) => catalogueVersion === null
      ? name.startsWith('dex-pack-v2-')
      : name.startsWith('dex-pack-') && !name.startsWith(keep!)
    await Promise.all((await caches.keys()).filter(stale).map((name) => caches.delete(name)))
  }
  try {
    const markerPrefix = catalogueVersion === null ? null : `dex.offline.ready.v2.${segment(catalogueVersion)}.`
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key && (catalogueVersion === null
        ? key.startsWith('dex.offline.ready.v2.')
        : key.startsWith('dex.offline.ready.') && !key.startsWith(markerPrefix!))) localStorage.removeItem(key)
    }
  } catch { /* private mode */ }
}

/**
 * Finish an idempotent cleanup when a page starts with an already-authoritative marker.
 * A navigation can commit localStorage synchronously and then abandon the outgoing page's
 * asynchronous CacheStorage deletion; the replacement page must not rely on another version
 * change or network response to resume it.
 */
export async function resumeRegionalPackCleanup(catalogueVersion: string | null | undefined) {
  if (catalogueVersion !== undefined) await invalidateRegionalPacks(catalogueVersion)
}
