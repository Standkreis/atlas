'use client'

import { useEffect, useState } from 'react'
import { hashKey, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TRPCClientError } from '@trpc/client'
import { useTranslations } from 'next-intl'
import type { RegionStatus } from '@/generated/prisma/enums'
import { isNetworkError, useTRPC, useTRPCClient } from '@/trpc/client'
import { allTiles } from './AtlasCounters'
import { useOffline } from './OfflineBanner'
import { RegionPicker } from './RegionPicker'
import { pendingRegionAfterCompletion, pendingRegionWriteIsRetryable, regionRemovalGuard, savedRegionRows, uniqueRegionIds } from './RegionManagementState'
import { pickerIsGermanFallback, type PickerRegion } from './RegionPickerState'
import { Sheet, useSheetClose } from './Sheet'

type RegionRow = { id: string; name: string; higher: string; status: RegionStatus }

// ── The switch (handoff 0018 R5) ──────────────────────────────────────────────
// Optimistic: `identity.me` shows the new active region before the server answers, so the grid, the counters, the
// log search and the scan refetch at once (their queries key by `regionId`). Without network the mutation fails and the
// wish is kept in localStorage; `RegionReplay` sends it when the signal is back and keeps `me` on it until then.
const PENDING_KEY = 'dex.region.pending'
const pendingRegion = (): string | null => { try { return localStorage.getItem(PENDING_KEY) } catch { return null } }
const setPending = (id: string | null) => { try { if (id) localStorage.setItem(PENDING_KEY, id); else localStorage.removeItem(PENDING_KEY) } catch { /* private mode */ } }
const acknowledgePending = (completedId: string) => setPending(pendingRegionAfterCompletion(pendingRegion(), completedId))
const retryableRegionWrite = (error: unknown) => pendingRegionWriteIsRetryable(
  isNetworkError(error),
  error instanceof TRPCClientError ? (error.data as { httpStatus?: number } | undefined)?.httpStatus : undefined,
)

export function useRegionSwitch() {
  const trpc = useTRPC()
  const qc = useQueryClient()
  const meKey = trpc.identity.me.queryKey()
  const apply = (region: RegionRow) => qc.setQueryData(meKey, (old) => (old ? { ...old, region } : old))
  const mutation = useMutation(trpc.identity.setRegion.mutationOptions({
    onMutate: ({ regionId }) => { const r = qc.getQueryData(meKey)?.regions.find((x) => x.id === regionId); if (r) apply(r) },
    onSuccess: (_, { regionId }) => { acknowledgePending(regionId); void qc.invalidateQueries({ queryKey: meKey }) },
    onError: (e, { regionId }) => {
      if (!retryableRegionWrite(e)) acknowledgePending(regionId)
      if (!retryableRegionWrite(e)) void qc.invalidateQueries({ queryKey: meKey })
    },
  }))
  return {
    switchTo: (regionId: string) => {
      // TanStack pauses an offline mutation before transport (and therefore before onError). Persist the user's
      // choice first so a reload can replay it even when the observer and its paused mutation are gone.
      setPending(regionId)
      mutation.mutate({ regionId })
    },
    pending: mutation.isPending,
  }
}

/** Mounted once in the layout: replays a switch made without network, and keeps `me` on it while the server still says otherwise. */
export function RegionReplay() {
  const trpc = useTRPC()
  const qc = useQueryClient()
  const meKey = trpc.identity.me.queryKey()
  const replay = useMutation(trpc.identity.setRegion.mutationOptions({
    onSuccess: (_, { regionId }) => { acknowledgePending(regionId); void qc.invalidateQueries({ queryKey: meKey }) },
    onError: (e, { regionId }) => { if (!retryableRegionWrite(e)) { acknowledgePending(regionId); void qc.invalidateQueries({ queryKey: meKey }) } }, // no longer in the list: the server's word stands
  }))
  const { mutate } = replay
  useEffect(() => {
    const run = () => { const id = pendingRegion(); if (id && navigator.onLine) mutate({ regionId: id }) }
    run()
    const visible = () => { if (document.visibilityState === 'visible') run() }
    window.addEventListener('online', run)
    document.addEventListener('visibilitychange', visible)
    return () => { window.removeEventListener('online', run); document.removeEventListener('visibilitychange', visible) }
  }, [mutate])
  useEffect(() => qc.getQueryCache().subscribe((e) => {
    if (e.type !== 'updated' || e.action.type !== 'success' || e.action.manual || e.query.queryHash !== hashKey(meKey)) return
    const id = pendingRegion()
    const data = qc.getQueryData(meKey)
    if (!id || !data || data.region?.id === id) return
    const r = data.regions.find((x) => x.id === id)
    if (r) qc.setQueryData(meKey, { ...data, region: r }); else setPending(null)
  }), [qc, meKey])
  return null
}

// ── The sheet (handoff 0018 R3) ───────────────────────────────────────────────
// "Meine Regionen" renders only the identity's saved rows. The national catalogue stays behind the explicit picker.
// Offline switching is offered only where the region's complete dex-set query is already persisted; adding/removing
// never starts an offline-pack download. The active and final saved rows are protected in both client and server paths.
export function RegionSheet({ onClose }: { onClose: () => void }) {
  const t = useTranslations('regions')
  return (
    <Sheet onClose={onClose} labelledBy="regions-title" z="z-50" maxH="max-h-[85vh]" testId="region-sheet" handleTestId="region-sheet-handle"
      handle={<h2 id="regions-title" className="mt-4 text-[24px] leading-none font-bold tracking-tight">{t('title')}</h2>}>
      <Body />
    </Sheet>
  )
}

function Body() {
  const t = useTranslations('regions')
  const tc = useTranslations('common')
  const trpc = useTRPC()
  const trpcClient = useTRPCClient()
  const qc = useQueryClient()
  const close = useSheetClose()
  const off = useOffline()
  const me = useQuery(trpc.identity.me.queryOptions())
  const legacyCatalogue = useQuery(trpc.dex.regions.queryOptions())
  const personalInput = { recentIds: [] as string[] }
  const personal = useQuery(trpc.regions.personal.queryOptions(personalInput))
  const { switchTo, pending: switchPending } = useRegionSwitch()
  const [line, setLine] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const mine = me.data?.regionIds ?? []
  const activeId = me.data?.region?.id ?? null
  const identitySaved: PickerRegion[] = (me.data?.regions ?? [])
    .map((region) => ({ ...region, selectable: region.status === 'ready' }))
    .filter(pickerIsGermanFallback)
  // The pre-national persisted identity response did not include `higher`. Its bounded `dex.regions`
  // companion did, so use that cache to recover saved-row metadata during an offline upgrade. Never
  // admit its suggestions: identity.regionIds remains the sole owner of the visible list.
  const catalogueSaved: PickerRegion[] = (legacyCatalogue.data ?? [])
    .filter((region) => mine.includes(region.id))
    .map((region) => ({
      ...region,
      selectable: region.status === 'ready',
      summary: { setSize: region.setSize, nowCount: region.nowCount },
    }))
    .filter(pickerIsGermanFallback)
  const legacySaved = [...identitySaved, ...catalogueSaved]
  // identity.me owns the saved IDs. regions.personal only enriches those same rows with catalogue
  // summaries and may still contain the persisted pre-onboarding empty result on first Profile open.
  const saved = savedRegionRows<PickerRegion>(mine, activeId, legacySaved, personal.data?.registryVersion ? personal.data.selected : [])
  const meKey = trpc.identity.me.queryKey()
  const personalKey = trpc.regions.personal.queryKey(personalInput)
  const cached = (id: string) => qc.getQueryState(trpc.dex.set.queryKey({ regionId: id, tiles: allTiles, nowOnly: false }))?.data != null

  const activate = (r: PickerRegion) => {
    if (off && !cached(r.id)) return setLine(t('offlineUnavailable', { region: r.name }))
    setLine(null)
    switchTo(r.id)
    close()
  }
  const updateMe = (regionIds: string[], added?: PickerRegion, removedId?: string) => qc.setQueryData(trpc.identity.me.queryKey(), (old) => {
    if (!old) return old
    const regions = old.regions.filter((region) => region.id !== removedId)
    const addedRow = added ? { id: added.id, name: added.name, higher: added.higher ?? 'Deutschland', status: added.status as RegionStatus } : null
    if (addedRow && !regions.some((region) => region.id === addedRow.id)) regions.push(addedRow)
    return { ...old, region: old.region ?? addedRow, regionIds, regions }
  })
  const updatePersonal = (regionIds: string[], added?: PickerRegion, removedId?: string) => qc.setQueryData(trpc.regions.personal.queryKey(personalInput), (old) => {
    const registryVersion = old?.registryVersion
    if (!old || !registryVersion) return old
    const byId = new Map(old.selected.filter((region) => region.id !== removedId).map((region) => [region.id, region]))
    if (added) byId.set(added.id, added as (typeof old.selected)[number])
    return {
      ...old,
      registryVersion,
      activeRegionId: old.activeRegionId,
      selected: regionIds.flatMap((id) => byId.get(id) ?? []),
      recent: old.recent,
      unavailableIds: old.unavailableIds.filter((id) => id !== added?.id),
    }
  })
  const setFilter = useMutation({
    mutationFn: ({ regionId, regionIds }: { regionId: string; regionIds: string[]; added?: PickerRegion; removedId?: string }) =>
      trpcClient.identity.setFilter.mutate({ regionId, regionIds }),
    onMutate: async (intent) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: meKey }),
        qc.cancelQueries({ queryKey: personalKey }),
      ])
      const beforeMe = qc.getQueryData(meKey)
      const beforePersonal = qc.getQueryData(personalKey)
      updateMe(intent.regionIds, intent.added, intent.removedId)
      updatePersonal(intent.regionIds, intent.added, intent.removedId)
      return { beforeMe, beforePersonal }
    },
    onSuccess: () => {
      setLine(null)
    },
    onError: (_error, _intent, context) => {
      qc.setQueryData(meKey, context?.beforeMe)
      qc.setQueryData(personalKey, context?.beforePersonal)
      setLine(tc('error'))
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: meKey })
      void qc.invalidateQueries({ queryKey: personalKey })
    },
    // Adding and removing are deliberately online-only. Fail and roll back if connectivity disappears between the
    // button guard and transport instead of leaving an unpersisted paused mutation behind.
    networkMode: 'always',
  })
  const mutateList = (regionIds: string[], added?: PickerRegion, removedId?: string) => {
    const nextActiveId = activeId ?? added?.id
    if (!nextActiveId) return setLine(tc('error'))
    setFilter.mutate({ regionId: nextActiveId, regionIds, added, removedId })
  }
  const add = (r: PickerRegion) => {
    if (off) return setLine(t('offlineList'))
    if (mine.includes(r.id)) return activate(r)
    setPicking(false)
    mutateList(uniqueRegionIds(mine, r.id), r)
  }
  const remove = (r: PickerRegion) => {
    if (off) return setLine(t('offlineList'))
    const guard = regionRemovalGuard(mine, activeId, r.id)
    if (guard === 'last') return setLine(t('lastStays'))
    if (guard === 'active') return setLine(t('activeStays'))
    mutateList(mine.filter((id) => id !== r.id), undefined, r.id)
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[14px] text-ink-soft">{t('savedOnly')}</p>
        <button type="button" disabled={setFilter.isPending || switchPending} onClick={() => { setLine(null); setPicking(!picking) }} aria-expanded={picking} data-testid="region-add"
          className="min-h-11 shrink-0 rounded-full bg-moss-soft px-4 text-[14px] font-bold text-moss-deep disabled:opacity-50">{picking ? t('backToSaved') : t('add')}</button>
      </div>
      {off && <p className="mt-2 text-[13px] text-amber-deep" role="status" data-testid="region-offline-management">{t('offlineManagement')}</p>}
      {picking ? (
        <div className="mt-2" data-testid="region-picker-panel">
          <RegionPicker selectedId={activeId} tone="light" fallbackRegions={legacySaved} onSelect={add} />
        </div>
      ) : (
      <>
      {personal.isLoading && !personal.data && !legacySaved.length && <p className="text-[15px] text-ink-soft">{tc('working')}</p>}
      {personal.isError && !legacySaved.length && <p className="text-[15px] text-amber-deep" role="alert">{tc('error')}</p>}
      <ul className="mt-3 flex flex-col gap-2" data-testid="region-rows">
        {saved.map((r) => {
          const active = r.id === activeId
          const unavailableOffline = off && !cached(r.id)
          return (
            <li key={r.id} className={`flex items-center gap-3 rounded-2xl bg-card px-3 py-3 shadow-[0_2px_12px_rgba(30,42,35,0.06)] ${active ? 'ring-[1.5px] ring-sky ring-inset' : ''}`} data-testid="region-row" data-region={r.id} data-active={active || undefined}>
              <button type="button" aria-pressed={active} aria-disabled={unavailableOffline || undefined} disabled={setFilter.isPending || switchPending} onClick={() => activate(r)} data-testid="region-pick" className={`flex min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-60 ${unavailableOffline ? 'opacity-60' : ''}`}>
                <span aria-hidden className={`motion-toggle grid size-6 shrink-0 place-items-center rounded-full border-2 ${active ? 'border-sky' : 'border-ink/25'}`}>{active && <span className="motion-badge size-3 rounded-full bg-sky" />}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[18px] leading-tight font-bold ${active ? 'text-sky-deep' : ''}`} data-testid="region-row-name">{r.name}</span>
                  {r.higher && <span className="mt-0.5 block truncate text-[13px] text-ink-soft">{r.higher}</span>}
                  {r.summary && <span className="block text-[13px] text-ink-soft" data-testid="region-row-counts">{t('species', { n: r.summary.setSize })} · {t('now', { n: r.summary.nowCount })}</span>}
                  <span className={`mt-0.5 block text-[13px] font-semibold ${cached(r.id) ? 'text-moss-deep' : 'text-ink-faint'}`} data-testid="region-offline">{cached(r.id) ? t('offlineReady') : t('onlineOnly')}</span>
                </span>
              </button>
              <button type="button" aria-label={t('remove', { region: r.name })} disabled={setFilter.isPending || switchPending || active || mine.length <= 1 || off} onClick={() => remove(r)} data-testid="region-remove"
                className="motion-toggle grid size-11 shrink-0 place-items-center rounded-lg text-ink-soft disabled:opacity-35">
                <span aria-hidden className="text-[24px] leading-none">×</span>
              </button>
            </li>
          )
        })}
      </ul>
      </>
      )}
      {line && <p className="mt-3 text-[14px] text-amber-deep" data-testid="region-line" role="status">{line}</p>}
      <p className="mt-4 text-[12px] text-ink-faint">{t('hint')}</p>
    </div>
  )
}
