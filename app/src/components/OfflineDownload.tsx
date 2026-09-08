'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useFormatter, useTranslations } from 'next-intl'
import { useTRPC } from '@/trpc/client'
import { useAtlasSet } from './AtlasCounters'
import { useOffline } from './OfflineBanner'
import { packCache as CACHE, readyKey as READY_KEY, verifiedAt, type Pack } from './OfflinePack'

// "Für unterwegs laden" (handoff 0009 Track A, spec §🏗️ "caches the dex for the active filter"): every grid image of the
// region's set, fetched through the worker into the image cache. The button is the consent: no download on its own,
// not on Wi-Fi either. Cancelable, resumable: a URL already in the cache is skipped, so a second tap only fetches the rest.
// The state lives outside React so the drawer can close and Profil can show the same progress.
const KB_PER_IMAGE = 30 // measured (findings 0009 §C2): iNaturalist `small` 13–74 KB, median 29 KB; Wikimedia 330 px thumbs ~17 KB
const PARALLEL = 4

type Run = { regionId: string; done: number; total: number; status: 'running' | 'stopped' | 'failed' | 'ready' }
let run: Run | null = null
let cancel = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
const useRun = () => useSyncExternalStore(subscribe, () => run, () => null)
const stop = () => { cancel = true }

async function download(regionId: string, urls: string[]) {
  if (run?.status === 'running') return
  if (!navigator.serviceWorker?.controller) { run = { regionId, done: 0, total: urls.length, status: 'failed' }; emit(); return }
  try { localStorage.removeItem(READY_KEY(regionId)) } catch { /* unavailable */ }
  cancel = false
  run = { regionId, done: 0, total: urls.length, status: 'running' }
  emit()
  let cache: Cache
  try { cache = await caches.open(CACHE(regionId)) } catch { run = { ...run, status: 'failed' }; emit(); return }
  const queue = [...urls]
  let failed = false
  const worker = async () => {
    while (queue.length && !cancel && !failed) {
      const url = queue.shift()!
      try {
        if (!(await cache.match(url))?.ok) {
          // Through the worker when it controls the page (it caches the CORS response); otherwise the page stores it itself.
          const res = await fetch(url, { mode: 'cors', credentials: 'omit' })
          // A failed response is a missing image; do not count it as saved.
          if (!res.ok) { failed = true; continue }
          await cache.put(url, res.clone())
        }
        run = { ...run!, done: run!.done + 1 }
        emit()
      } catch {
        failed = true
      }
    }
  }
  await Promise.all(Array.from({ length: PARALLEL }, worker))
  if (!failed && !cancel) {
    try { localStorage.setItem(READY_KEY(regionId), JSON.stringify({ version: 1, at: new Date().toISOString(), urls } satisfies Pack)) } catch { /* private mode */ }
    // Verify all responses after the run; eviction or storage failure is never ready.
    run = { ...run!, status: await verifiedAt(regionId, urls).catch(() => null) ? 'ready' : 'failed' }
  } else run = { ...run!, status: cancel ? 'stopped' : 'failed' }
  emit()
}

/** One row: "Atlas offline · 929 Bilder · ~14 MB" and the button; progress "412 / 929"; done "Offline bereit · 5. Sep". */
export function OfflineDownload({ testId = 'offline-download' }: { testId?: string }) {
  const t = useTranslations('offline')
  const format = useFormatter()
  const trpc = useTRPC()
  const me = useQuery(trpc.identity.me.queryOptions())
  const region = me.data?.region ?? null
  const { set } = useAtlasSet(region)
  const state = useRun()
  const off = useOffline()
  const urlList = JSON.stringify([...new Set((set?.species ?? []).map(s => s.leadSmall ?? s.lead?.url ?? null).filter((u): u is string => !!u))].sort())
  const [verified, setVerified] = useState<{ regionId: string; urls: string; at: string } | null>(null)
  useEffect(() => {
    if (!region) return
    let current = true
    const verify = () => { void verifiedAt(region.id, JSON.parse(urlList) as string[]).then(at => { if (current) setVerified(at ? { regionId: region.id, urls: urlList, at } : null) }).catch(() => { if (current) setVerified(null) }) }
    verify()
    document.addEventListener('visibilitychange', verify)
    return () => { current = false; document.removeEventListener('visibilitychange', verify) }
  }, [region, urlList, state?.status])
  if (!region || !set) return null
  const urls = JSON.parse(urlList) as string[]
  const mb = Math.max(1, Math.round((urls.length * KB_PER_IMAGE) / 1024))
  const mine = state?.regionId === region.id ? state : null
  const ready = verified?.regionId === region.id && verified.urls === urlList ? verified.at : null
  const readyLabel = ready ? t('ready', { date: format.dateTime(new Date(ready), { day: 'numeric', month: 'short' }) }) : null

  let line: string
  let action: { label: string; onClick: () => void } | null = null
  if (mine?.status === 'running') {
    line = t('progress', { done: mine.done, total: mine.total })
    action = { label: t('cancel'), onClick: stop }
  } else if (mine?.status === 'failed') {
    line = t('failed', { done: mine.done, total: mine.total })
    action = off ? null : { label: t('resume'), onClick: () => { void download(region.id, urls) } }
  } else if (mine?.status === 'stopped') {
    line = t('stopped', { done: mine.done, total: mine.total })
    action = { label: t('resume'), onClick: () => { void download(region.id, urls) } }
  } else if (readyLabel) {
    line = readyLabel
    action = off ? null : { label: t('reload'), onClick: () => { void download(region.id, urls) } }
  } else {
    line = t('summary', { n: urls.length, mb })
    action = off ? null : { label: t('load'), onClick: () => { void download(region.id, urls) } }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 shadow-[0_2px_12px_rgba(30,42,35,0.06)]" data-testid={testId} data-status={mine?.status === 'ready' ? (ready ? 'ready' : 'idle') : mine?.status ?? (ready ? 'ready' : 'idle')}>
      <div className="min-w-0">
        <div className="text-[15px] font-semibold"><span aria-hidden>📴 </span>{t('title')}</div>
        <div className="mt-0.5 truncate text-[13px] text-ink-soft" data-testid={`${testId}-line`}>{line}</div>
      </div>
      {action && (
        <button type="button" onClick={action.onClick} data-testid={`${testId}-button`}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold ${mine?.status === 'running' ? 'bg-tile text-ink-soft' : 'bg-moss-soft text-moss-deep'}`}>{action.label}</button>
      )}
    </div>
  )
}
