import { z } from 'zod'
import type { PrismaClient } from '../generated/prisma/client'

const summary = z.object({ version: z.literal(1), setSize: z.number().int().nonnegative(), content: z.number().int().nonnegative(), introEn: z.number().int().nonnegative(), noGermanName: z.number().int().nonnegative(), nowCounts: z.array(z.number().int().nonnegative()).length(12), refreshedAt: z.string() })

/** Temporary numeric response for the existing picker. Missing summaries are omitted, never zeroed. */
export async function legacyRegions(db: Pick<PrismaClient, 'region' | 'filter'>, identityId: string, month: number) {
  const filter = await db.filter.findUnique({ where: { identityId }, select: { regionIds: true } })
  const selectedIds = [...new Set(filter?.regionIds ?? [])].slice(0, 20)
  const select = { id: true, gadmGid: true, name: true, higher: true, status: true, refreshedAt: true, pickerSummary: true } as const
  const [selected, suggestions] = await Promise.all([
    selectedIds.length ? db.region.findMany({ where: { id: { in: selectedIds }, status: { not: 'unprepared' } }, take: 20, select }) : [],
    db.region.findMany({ where: { status: { not: 'unprepared' }, ...(selectedIds.length ? { id: { notIn: selectedIds } } : {}) }, orderBy: [{ name: 'asc' }, { id: 'asc' }], take: 20, select }),
  ])
  return [...selected, ...suggestions].flatMap(({ pickerSummary, ...region }) => {
    const parsed = summary.safeParse(pickerSummary)
    if (!parsed.success) return []
    const { setSize, content, introEn, noGermanName, nowCounts } = parsed.data
    return [{ ...region, setSize, content, introEn, noGermanName, nowCount: nowCounts[month - 1], introEnShare: setSize ? +(introEn / setSize).toFixed(3) : 0 }]
  }).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
}
