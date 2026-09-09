'use client'

import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useTRPC } from '@/trpc/client'
import { useOffline } from './OfflineBanner'
import {
  constituentMatch,
  matchingFallback,
  pickerCanSelect,
  pickerIsGermanFallback,
  pickerQuery,
  recentRegionIds,
  type PickerRegion,
} from './RegionPickerState'

const RECENT_KEY = 'dex.region.recent.v1'

function readRecent() {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string').slice(0, 8) : []
  } catch {
    return []
  }
}

function storeRecent(ids: string[]) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(ids)) } catch { /* private mode */ }
}

export function RegionPicker({ selectedId = null, fallbackRegions = [], tone = 'light', onSelect, onDismiss }: {
  selectedId?: string | null
  fallbackRegions?: PickerRegion[]
  tone?: 'light' | 'dark'
  onSelect: (region: PickerRegion) => void
  onDismiss?: () => void
}) {
  const t = useTranslations('regionPicker')
  const tc = useTranslations('common')
  const trpc = useTRPC()
  const offline = useOffline()
  const searchId = useId()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [recentIds, setRecentIds] = useState<string[]>([])
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [locationState, setLocationState] = useState<'idle' | 'requesting' | 'denied' | 'unsupported'>('idle')

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => { if (!cancelled) setRecentIds(readRecent()) })
    return () => { cancelled = true }
  }, [])
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 250)
    return () => clearTimeout(timer)
  }, [query])

  const personal = useQuery(trpc.regions.personal.queryOptions({ recentIds }))
  const normalized = pickerQuery(debounced)
  const shouldSearch = normalized.replaceAll(' ', '').length >= 2 && !offline
  const search = useQuery(trpc.regions.search.queryOptions({ q: debounced, limit: 20 }, { enabled: shouldSearch }))
  const locationInput = coordinates
    ? { permission: 'granted' as const, ...coordinates }
    : { permission: 'not-requested' as const }
  const location = useQuery(trpc.regions.locate.queryOptions(locationInput, { enabled: !!coordinates && !offline, retry: false }))

  const fallback = useMemo(() => matchingFallback(fallbackRegions, debounced), [fallbackRegions, debounced])
  const results = (search.data?.status === 'ok' ? search.data.results : search.data?.status === 'registry-unavailable' ? fallback : []) as PickerRegion[]
  const selected = (personal.data?.selected ?? []) as PickerRegion[]
  const recent = (personal.data?.registryVersion
    ? personal.data.recent
    : recentIds.flatMap((id) => fallbackRegions.find((region) => region.id === id && pickerIsGermanFallback(region)) ?? [])) as PickerRegion[]
  const nearby = location.data?.status === 'resolved' ? location.data.region as PickerRegion : null
  const dark = tone === 'dark'

  const choose = (region: PickerRegion) => {
    if (!pickerCanSelect(region)) return
    const next = recentRegionIds(recentIds, region.id)
    setRecentIds(next)
    storeRecent(next)
    onSelect(region)
  }
  const requestLocation = () => {
    if (offline) return
    if (!navigator.geolocation) return setLocationState('unsupported')
    setCoordinates(null)
    setLocationState('requesting')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationState('idle')
        setCoordinates({ lat: position.coords.latitude, lng: position.coords.longitude })
      },
      () => setLocationState('denied'),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    )
  }

  const muted = dark ? 'text-white/75' : 'text-ink-soft'
  return (
    <section aria-label={t('label')} data-testid="region-picker" className="min-w-0">
      <div className={dark ? 'pb-3' : 'sticky top-0 z-10 bg-paper/95 pb-3 backdrop-blur-sm'}>
        <div className="flex min-h-11 items-center justify-between gap-3">
          <label htmlFor={searchId} className={`text-[15px] font-semibold ${muted}`}>{t('searchLabel')}</label>
          {onDismiss && <button type="button" onClick={onDismiss} data-testid="region-picker-dismiss" className="min-h-11 px-2 text-[15px] font-semibold underline">{t('dismiss')}</button>}
        </div>
        <div className="relative">
          <input id={searchId} type="search" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" enterKeyHint="search"
            placeholder={t('placeholder')} data-testid="region-search" aria-describedby={`${searchId}-hint`}
            className={`h-14 w-full rounded-2xl border py-3 pr-11 pl-4 text-[17px] outline-none focus:ring-2 focus:ring-sky ${dark ? 'border-white/20 bg-white text-night placeholder:text-ink-faint' : 'border-ink/15 bg-white text-ink placeholder:text-ink-faint'}`} />
          {query && <button type="button" onClick={() => { setQuery(''); setDebounced('') }} aria-label={t('clear')} data-testid="region-search-clear" className="absolute top-1/2 right-1 min-h-11 min-w-11 -translate-y-1/2 rounded-xl text-[20px] text-ink-soft">×</button>}
        </div>
        <p id={`${searchId}-hint`} className={`mt-2 text-[13px] ${muted}`}>{offline ? t('offlineSearch') : t('searchHint')}</p>
      </div>

      {normalized.replaceAll(' ', '').length < 2 ? (
        <div className="space-y-5 pt-1">
          <RegionSection title={t('selected')} regions={selected} selectedId={selectedId} tone={tone} onChoose={choose} />
          <RegionSection title={t('recent')} regions={recent} selectedId={selectedId} tone={tone} onChoose={choose} />
          {!selected.length && !recent.length && personal.isLoading && <Status tone={tone}>{tc('working')}</Status>}
          {!selected.length && !recent.length && personal.isError && <Status tone={tone} alert>{t('savedUnavailable')}</Status>}
        </div>
      ) : offline ? (
        <Status tone={tone}>{t('offlineSearch')}</Status>
      ) : (
        <div className="pt-1" aria-live="polite" aria-busy={search.isFetching}>
          {search.isFetching && !search.data && <Status tone={tone}>{tc('working')}</Status>}
          {search.isError && <Status tone={tone} alert>{t('searchError')} <button type="button" onClick={() => void search.refetch()} className="min-h-11 font-semibold underline">{tc('retry')}</button></Status>}
          {search.data?.status === 'registry-changed' && <Status tone={tone}>{t('catalogueChanged')} <button type="button" onClick={() => void search.refetch()} className="min-h-11 font-semibold underline">{tc('retry')}</button></Status>}
          {search.data?.status === 'registry-unavailable' && !fallback.length && <Status tone={tone} alert>{t('catalogueUnavailable')}</Status>}
          {search.isSuccess && !results.length && search.data.status === 'ok' && <Status tone={tone}>{t('empty')}</Status>}
          <RegionSection title={t('results')} regions={results} selectedId={selectedId} tone={tone} query={debounced} onChoose={choose} />
        </div>
      )}

      <div className={`mt-5 border-t pt-5 ${dark ? 'border-white/20' : 'border-ink/10'}`}>
        <h3 className="text-[17px] font-bold">{t('locationTitle')}</h3>
        <p className={`mt-1 text-[14px] leading-snug ${muted}`}>{t('locationExplanation')}</p>
        <button type="button" onClick={requestLocation} disabled={offline || locationState === 'requesting' || location.isFetching} data-testid="region-location"
          className={`mt-3 min-h-12 w-full rounded-2xl px-4 text-[16px] font-bold disabled:opacity-55 ${dark ? 'bg-white/15 text-white' : 'bg-ink/8 text-ink'}`}>
          {locationState === 'requesting' || location.isFetching ? t('locating') : t('useLocation')}
        </button>
        <div aria-live="polite">
          {offline && <Status tone={tone}>{t('offlineLocation')}</Status>}
          {locationState === 'denied' && <Status tone={tone} alert>{t('locationDenied')}</Status>}
          {locationState === 'unsupported' && <Status tone={tone} alert>{t('locationUnsupported')}</Status>}
          {location.isError && <Status tone={tone} alert>{t('locationError')}</Status>}
          {location.data?.status === 'no-result' && <Status tone={tone}>{t('locationEmpty')}</Status>}
          {location.data && ['geometry-unavailable', 'registry-unavailable', 'registry-mismatch'].includes(location.data.status) && <Status tone={tone} alert>{t('locationUnavailable')}</Status>}
        </div>
        {nearby && <RegionSection title={t('nearby')} regions={[nearby]} selectedId={selectedId} tone={tone} onChoose={choose} />}
      </div>
    </section>
  )
}

function Status({ tone, alert = false, children }: { tone: 'light' | 'dark'; alert?: boolean; children: ReactNode }) {
  return <p role={alert ? 'alert' : 'status'} className={`mt-3 text-[14px] ${tone === 'dark' ? 'text-white/80' : 'text-ink-soft'}`}>{children}</p>
}

function RegionSection({ title, regions, selectedId, tone, query = '', onChoose }: {
  title: string
  regions: PickerRegion[]
  selectedId: string | null
  tone: 'light' | 'dark'
  query?: string
  onChoose: (region: PickerRegion) => void
}) {
  const t = useTranslations('regionPicker')
  if (!regions.length) return null
  const dark = tone === 'dark'
  const card = dark ? 'bg-white/10 text-white ring-white/15' : 'bg-card text-ink ring-ink/10 shadow-[0_2px_12px_rgba(30,42,35,0.06)]'
  const active = dark ? 'ring-sky bg-white text-night' : 'ring-sky bg-sky/10 text-ink'
  return (
    <section className="mt-4" aria-label={title}>
      <h3 className={`mb-2 text-[13px] font-semibold tracking-wide uppercase ${dark ? 'text-white/65' : 'text-ink-faint'}`}>{title}</h3>
      <ul className="flex flex-col gap-2" data-testid="region-results">
        {regions.map((region) => {
          const enabled = pickerCanSelect(region)
          const constituent = query ? constituentMatch(region, query) : null
          const higher = region.higher ?? (region.stateName ? `Deutschland › ${region.stateName}` : '')
          return <li key={region.id}>
            <button type="button" disabled={!enabled} onClick={() => onChoose(region)} data-region={region.id} data-testid="region-result"
              aria-current={selectedId === region.id ? 'true' : undefined}
              className={`min-h-14 w-full rounded-2xl px-4 py-3 text-left ring-1 transition disabled:cursor-not-allowed disabled:opacity-55 ${card} ${selectedId === region.id ? active : ''}`}>
              <span className="block text-[17px] leading-tight font-bold">{region.name}</span>
              {higher && <span className={`mt-0.5 block text-[13px] ${dark && selectedId !== region.id ? 'text-white/70' : 'text-ink-soft'}`}>{higher}</span>}
              {constituent && <span className={`mt-1 block text-[13px] font-semibold ${dark && selectedId !== region.id ? 'text-sky-soft' : 'text-sky-deep'}`}>{t('constituentMatch', { place: constituent.name })}</span>}
              {region.summary && <span className={`mt-1 block text-[13px] ${dark && selectedId !== region.id ? 'text-white/70' : 'text-ink-soft'}`}>{t('counts', { total: region.summary.setSize, now: region.summary.nowCount })}</span>}
              {!enabled && <span className={`mt-1 block text-[13px] font-semibold ${dark ? 'text-amber-soft' : 'text-amber-deep'}`}>{t('unavailable')}</span>}
            </button>
          </li>
        })}
      </ul>
    </section>
  )
}
