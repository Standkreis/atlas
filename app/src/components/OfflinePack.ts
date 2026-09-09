export const packCache = (regionId: string) => `dex-pack-${regionId}`
export const readyKey = (regionId: string) => `dex.offline.ready.${regionId}`

export type Pack = { version: 1; at: string; urls: string[] }
export type RegionalPackSpecies = { leadSmall?: string | null; lead?: { url: string } | null }

/** Explicit regional packs stay lead-only even when a detail response grows to a 12-image gallery. */
export function regionalPackUrls<T extends RegionalPackSpecies>(species: readonly T[]) {
  return [...new Set(species.map((taxon) => taxon.leadSmall ?? taxon.lead?.url ?? null).filter((url): url is string => Boolean(url)))].sort()
}

const packOf = (regionId: string): Pack | null => {
  try {
    const pack = JSON.parse(localStorage.getItem(readyKey(regionId)) ?? 'null') as Pack | null
    return pack && pack.version === 1 && Array.isArray(pack.urls) && !Number.isNaN(Date.parse(pack.at)) ? pack : null
  } catch { return null }
}
export async function verifiedAt(regionId: string, urls: string[]): Promise<string | null> {
  if (!navigator.serviceWorker?.controller) return null
  const pack = packOf(regionId)
  if (!pack || pack.urls.length !== urls.length || pack.urls.some((u, i) => u !== urls[i])) return null
  const cache = await caches.open(packCache(regionId))
  for (const url of urls) if (!(await cache.match(url))?.ok) return null
  return pack.at
}
