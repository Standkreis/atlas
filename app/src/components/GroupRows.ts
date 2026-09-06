// Progress per group (handoff 0014 P3, reworked in 0022), the pure part: one row per tile of the region's set, the
// identity's studied and seen counts over the group's size. `set.tiles` already drops fish when the region has none
// (record 0002 E12); an out-of-set find (E13) belongs to no row. Tested in GroupRows.test.ts; the card is ProgressCard.tsx.
export type GroupRow<T extends string = string> = { tile: T; studied: number; seen: number; possible: number }
export type Axis = 'seen' | 'studied'

/** The two shapes a region's membership arrives in: `dex.set` (the grid's entry) or `dex.setCounts` (0022 P3, ids only). */
export type Members<T extends string = string> = { tiles: { tile: T }[]; species: { taxonId: string; tile: T }[] }

export function groupsOf<T extends string>(set: Members<T> | null, progress: { studied: string[]; seen: string[] } | null): GroupRow<T>[] | null {
  if (!set || !progress) return null
  const tileOf = new Map(set.species.map((s) => [s.taxonId, s.tile]))
  const rows = new Map<T, GroupRow<T>>(set.tiles.map(({ tile }) => [tile, { tile, studied: 0, seen: 0, possible: 0 }]))
  for (const s of set.species) { const r = rows.get(s.tile); if (r) r.possible++ }
  for (const id of new Set(progress.studied)) { const t = tileOf.get(id); const r = t && rows.get(t); if (r) r.studied++ }
  for (const id of new Set(progress.seen)) { const t = tileOf.get(id); const r = t && rows.get(t); if (r) r.seen++ }
  return [...rows.values()]
}

/** `dex.setCounts` → the `dex.set` shape, tiles in `order` (the Tile enum), tiles without members dropped. */
export function membersOf<T extends string>(counts: { ids: Partial<Record<T, string[]>> } | null | undefined, order: T[]): Members<T> | null {
  if (!counts) return null
  const tiles = order.filter((t) => (counts.ids[t]?.length ?? 0) > 0)
  return { tiles: tiles.map((tile) => ({ tile })), species: tiles.flatMap((tile) => counts.ids[tile]!.map((taxonId) => ({ taxonId, tile }))) }
}

/** The rows of the tiles the identity keeps on (empty = all), in the set's order. */
export const onTiles = <T extends string>(rows: GroupRow<T>[] | null, tiles: T[]): GroupRow<T>[] | null =>
  rows && (tiles.length ? rows.filter((r) => tiles.includes(r.tile)) : rows)

/** The region line: the sums over the rows shown (each taxon sits in one tile, so a sum is a count of distinct ids). */
export const regionOf = <T extends string>(rows: GroupRow<T>[] | null): { studied: number; seen: number; possible: number } | null =>
  rows && rows.reduce((a, r) => ({ studied: a.studied + r.studied, seen: a.seen + r.seen, possible: a.possible + r.possible }), { studied: 0, seen: 0, possible: 0 })

/** 0022 P4: a bar only from 5 % on the shown axis; below, the row has numbers only. Width in whole per cent, or null. */
export const BAR_MIN = 0.05
export const barWidth = (n: number, possible: number): string | null => (possible > 0 && n / possible >= BAR_MIN ? `${Math.min(100, Math.round((n / possible) * 100))}%` : null)

/** 0022 P4: rows with 0 on both axes fold under one line ("5 weitere Gruppen"; "7 Gruppen" when every row folds). */
export const foldRows = <T extends string>(rows: GroupRow<T>[]): { shown: GroupRow<T>[]; folded: GroupRow<T>[] } => ({
  shown: rows.filter((r) => r.seen > 0 || r.studied > 0),
  folded: rows.filter((r) => r.seen === 0 && r.studied === 0),
})
