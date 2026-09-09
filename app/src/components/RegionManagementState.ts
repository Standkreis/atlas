export function orderedSavedRegions<T extends { id: string }>(regions: T[], activeId: string | null) {
  return [...regions].sort((a, b) => Number(b.id === activeId) - Number(a.id === activeId))
}

export function savedRegionRows<T extends { id: string }>(regionIds: string[], activeId: string | null, base: T[], enriched: T[]) {
  const byId = new Map([...base, ...enriched].map((region) => [region.id, region]))
  return orderedSavedRegions(regionIds.flatMap((id) => byId.get(id) ?? []), activeId)
}

export function regionRemovalGuard(regionIds: string[], activeId: string | null, removeId: string) {
  if (regionIds.length <= 1) return 'last' as const
  if (removeId === activeId) return 'active' as const
  return null
}

export function uniqueRegionIds(regionIds: string[], addId: string) {
  return regionIds.includes(addId) ? regionIds : [...regionIds, addId]
}

/** A completed transport may only acknowledge the intent it actually sent. */
export function pendingRegionAfterCompletion(pendingId: string | null, completedId: string) {
  return pendingId === completedId ? null : pendingId
}
