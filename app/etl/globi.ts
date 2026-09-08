// GloBI (record 0002 E9, handoff 0006 "GloBI cap"; handoff 0028 / 0027 F1): interaction?sourceTaxon= with
// includeObservations=true paged to the end, one row per record, folded to six kinds and unique (kind, target) pairs that
// carry their studies and their real (non-metaweb) record count; in-set targets first, at most 200 per species.
import { get, q } from './fetch'
import { capEdges, foldKind, isMetaweb, usableTargetName, type Kind } from './prune'

const API = 'https://api.globalbioticinteractions.org/interaction'
const PAGE = 1000
/**
 * ≤ 50 pages of 1 000 (sheets.mjs:77; 0026 stopped at 10 and every unseen in-set pair became a "0 records" drop). A species
 * with more rows (Apis mellifera, > 200 000) is `truncated`: the caller asks per pair (`globiPair`) for the edges it keeps.
 */
export const MAX_PAGES = 50

type Row = { interaction_type: string; target_taxon_name?: string; target_taxon_external_id?: string; target_taxon_path?: string; study?: string; study_title?: string }
export type Edge = { kind: Kind; target: string; externalId?: string; path?: string; studies: Record<string, number>; real: number }

/** The study citation of a json.v2 row without its "Accessed at …" tail (sheets.mjs:studyKey); "?" when the row names none. */
export const studyKey = (r: { study?: string; study_title?: string }) => (r.study ?? r.study_title ?? '').replace(/\s*Accessed (at|on) .*$/, '').trim() || '?'

const addRow = (pairs: Map<string, Edge>, kind: Kind, r: Row, target: string) => {
  let e = pairs.get(`${kind}|${target}`)
  if (!e) {
    e = { kind, target, externalId: r.target_taxon_external_id, path: r.target_taxon_path, studies: {}, real: 0 }
    pairs.set(`${kind}|${target}`, e)
  }
  const s = studyKey(r)
  e.studies[s] = (e.studies[s] ?? 0) + 1
  if (!isMetaweb(s)) e.real++
}

/** Every edge with the species as source, pages of 1,000 until a short page or `MAX_PAGES`. */
export async function globiEdges(sciName: string): Promise<{ edges: Edge[]; pages: number; raw: number; truncated: boolean }> {
  const pairs = new Map<string, Edge>()
  let raw = 0
  let pages = 0
  for (let offset = 0; pages < MAX_PAGES; offset += PAGE) {
    const rows = (await get<Row[]>(`${API}?${q({ sourceTaxon: sciName, type: 'json.v2', includeObservations: true, limit: PAGE, offset })}`)) ?? []
    pages++
    raw += rows.length
    for (const r of rows) {
      const kind = foldKind(r.interaction_type)
      if (kind && usableTargetName(r.target_taxon_name, sciName)) addRow(pairs, kind, r, r.target_taxon_name!)
    }
    if (rows.length < PAGE) break
  }
  return { edges: [...pairs.values()], pages, raw, truncated: raw >= MAX_PAGES * PAGE }
}

/**
 * The records of one (source, target) pair, every kind, for a truncated species: the answer also holds the target's
 * subtaxa (a row whose path contains the target counts for it), which the paged answer does not (sheets.mjs:92).
 */
export async function globiPair(sciName: string, target: string): Promise<Edge[]> {
  const rows = (await get<Row[]>(`${API}?${q({ sourceTaxon: sciName, targetTaxon: target, type: 'json.v2', includeObservations: true, limit: PAGE })}`)) ?? []
  const pairs = new Map<string, Edge>()
  for (const r of rows) {
    const kind = foldKind(r.interaction_type)
    if (kind && (r.target_taxon_name === target || r.target_taxon_path?.split(' | ').includes(target))) addRow(pairs, kind, r, target)
  }
  return [...pairs.values()]
}

export { capEdges }
