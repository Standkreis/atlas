// The DB read behind the sheet (handoff 0028): a taxon with its facts, every region's month profile, and its edges with
// the target's names, set membership, studies and the F1/F2 flag. Read only; the writer is step.ts.
import { db } from '../db'
import type { Kind } from '../prune'
import type { SheetTaxon } from './sheet'

export type ProseTaxon = SheetTaxon & { id: string; prose: unknown }

/** The set of a region, filled taxa only (`contentAt` set), or just `keys`. */
/**
 * In chunks: Prisma fetches the nested relations with `IN (...)` lists over every interaction of the chunk, and Postgres
 * takes 65 535 parameters per query. Mainz-Bingen's 929 taxa carry 123 622 edges (P2029 on the first smoke of 0028 A).
 */
const CHUNK = 40
export async function loadTaxa({ regionId, keys }: { regionId?: string; keys?: number[] }): Promise<ProseTaxon[]> {
  const where = { contentAt: { not: null }, ...(keys ? { gbifKey: { in: keys } } : {}), ...(regionId ? { plausibility: { some: { regionId } } } : {}) }
  const ids = (await db.taxon.findMany({ where, orderBy: { gbifKey: 'asc' }, select: { id: true } })).map((t) => t.id)
  const out: ProseTaxon[] = []
  for (let i = 0; i < ids.length; i += CHUNK) out.push(...(await loadChunk(ids.slice(i, i + CHUNK), regionId)))
  return out
}

async function loadChunk(ids: string[], regionId?: string): Promise<ProseTaxon[]> {
  const rows = await db.taxon.findMany({
    where: { id: { in: ids } },
    orderBy: { gbifKey: 'asc' },
    select: {
      id: true, gbifKey: true, sciName: true, rank: true, tile: true, class: true, order: true, iucn: true, commonNames: true, facts: true, prose: true,
      plausibility: { select: { obs: true, monthShare: true, peak: true, words: true, region: { select: { name: true } } } },
      interactionsFrom: { select: { kind: true, studies: true, real: true, prose: true, target: { select: { sciName: true, commonNames: true, plausibility: { where: regionId ? { regionId } : {}, select: { id: true }, take: 1 } } } } },
    },
  })
  return rows.map((t) => ({
    id: t.id, gbifKey: t.gbifKey, sciName: t.sciName, rank: t.rank, tile: t.tile, class: t.class, order: t.order, iucn: t.iucn, prose: t.prose,
    commonNames: (t.commonNames ?? {}) as Record<string, string>,
    facts: (t.facts ?? null) as SheetTaxon['facts'],
    regions: t.plausibility.map((p) => ({ name: p.region.name, obs: p.obs, monthShare: p.monthShare, peak: p.peak, words: p.words })),
    edges: t.interactionsFrom.map((i) => ({ kind: i.kind as Kind, sciName: i.target.sciName, commonNames: (i.target.commonNames ?? {}) as Record<string, string>, inSet: i.target.plausibility.length > 0, studies: (i.studies ?? {}) as Record<string, number>, real: i.real, prose: i.prose })),
  }))
}
