/** Runtime HTTP reads: bounded requests, no ETL filesystem or local disk cache. */
export const UA = 'standkreis-dex/0.1 (https://github.com/svreiser/standkreis-dex; svreiser@gmail.com)'
export const q = (params: Record<string, string | number | boolean | (string | number)[] | undefined>) =>
  Object.entries(params).flatMap(([k, v]) => (Array.isArray(v) ? v : [v]).filter((x) => x !== undefined).map((x) => `${k}=${encodeURIComponent(String(x))}`)).join('&')
export async function get<T>(url: string): Promise<T | null> {
  const response = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(8_000), cache: 'no-store' })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Upstream request failed (${response.status})`)
  return await response.json() as T
}
export type Species = { key: number; nubKey?: number; canonicalName?: string; scientificName?: string; rank?: string; kingdom?: string; phylum?: string; class?: string; order?: string; family?: string; genus?: string; taxonomicStatus?: string }
export const gbifSpecies = (key: number | string) => get<Species>(`https://api.gbif.org/v1/species/${key}`)
