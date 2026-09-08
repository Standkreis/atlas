export function orderedSavedRegions<T extends { id: string }>(regions: T[], activeId: string | null) {
  return [...regions].sort((a, b) => Number(b.id === activeId) - Number(a.id === activeId))
}

export function regionRemovalGuard(regionIds: string[], activeId: string | null, removeId: string) {
  if (regionIds.length <= 1) return 'last' as const
  if (removeId === activeId) return 'active' as const
  return null
}

export function uniqueRegionIds(regionIds: string[], addId: string) {
  return regionIds.includes(addId) ? regionIds : [...regionIds, addId]
}
