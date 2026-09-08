export type GermanyProgressData = {
  countryCode: 'DE'
  catalogue: {
    id: string
    runKey: string
    species: number
    discovered: number
    studied: number
    yearFrom: number
    yearTo: number
  } | null
  territory: {
    regions: number
    germanSightings: number | null
    visitedRegions: number | null
  } | null
}

export type GermanyProgressView =
  | { kind: 'loading' | 'error' | 'offline-missing' | 'preparing' }
  | {
      kind: 'ready'
      offline: boolean
      empty: boolean
      catalogue: NonNullable<GermanyProgressData['catalogue']>
      territory: GermanyProgressData['territory']
      denominatorVersion: string
    }

/** A cached national result remains truthful offline; absence and zero are deliberately different. */
export function germanyProgressView(input: {
  data: GermanyProgressData | null
  offline: boolean
  loading: boolean
  error: boolean
}): GermanyProgressView {
  if (!input.data) {
    if (input.offline) return { kind: 'offline-missing' }
    if (input.error) return { kind: 'error' }
    return { kind: 'loading' }
  }
  if (!input.data.catalogue) return { kind: 'preparing' }
  const territory = input.data.territory
  return {
    kind: 'ready',
    offline: input.offline,
    empty: input.data.catalogue.discovered === 0 && input.data.catalogue.studied === 0 &&
      (territory?.germanSightings ?? 0) === 0 && (territory?.visitedRegions ?? 0) === 0,
    catalogue: input.data.catalogue,
    territory,
    denominatorVersion: `${input.data.catalogue.runKey}:${input.data.catalogue.species}`,
  }
}

export type SavedRegion = { id: string }

/** The server caps saved regions at 20; keep the UI bounded if old or corrupt clients exceed that. */
export function regionDrilldown<T extends SavedRegion>(regions: T[], activeId: string | null, expanded: boolean) {
  const bounded = regions.slice(0, 20)
  const ordered = [...bounded].sort((a, b) => Number(b.id === activeId) - Number(a.id === activeId))
  return {
    primary: ordered[0] ?? null,
    additional: Math.max(0, ordered.length - 1),
    visible: expanded ? ordered : ordered.slice(0, 1),
    total: ordered.length,
  }
}
