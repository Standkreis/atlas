'use client'

import { useQuery } from '@tanstack/react-query'
import { useId } from 'react'
import { useTranslations } from 'next-intl'
import { useTRPC } from '@/trpc/client'
import { useOffline } from './OfflineBanner'
import { germanyProgressView, type GermanyProgressData } from './GermanyProgressState'

const card = 'rounded-3xl bg-card px-4 py-4 shadow-[0_2px_12px_rgba(30,42,35,0.06)]'

/** Germany-wide collection counts. The response contains counts only: no Taxon assets or gallery rows. */
export function GermanyProgressCard() {
  const t = useTranslations('you')
  const trpc = useTRPC()
  const offline = useOffline()
  const query = useQuery(trpc.identity.germanyProgress.queryOptions(undefined, { refetchOnMount: 'always' }))
  const titleId = useId()
  const view = germanyProgressView({ data: (query.data as GermanyProgressData | undefined) ?? null, offline, loading: query.isLoading, error: query.isError })

  if (view.kind !== 'ready') {
    const copy = view.kind === 'preparing' ? t('germanyPreparing') : view.kind === 'offline-missing' ? t('germanyOfflineMissing') : view.kind === 'error' ? t('germanyError') : t('germanyLoading')
    return (
      <section className={card} aria-labelledby={titleId} data-testid="germany-progress" data-state={view.kind}>
        <Header titleId={titleId} />
        <p className="mt-3 text-[15px] leading-snug text-ink-soft" role={view.kind === 'error' ? 'alert' : 'status'}>{copy}</p>
        {view.kind === 'error' && <button type="button" onClick={() => query.refetch()} className="mt-3 min-h-11 rounded-full bg-moss px-4 text-[14px] font-semibold text-white">{t('retry')}</button>}
      </section>
    )
  }

  const { catalogue, territory } = view
  return (
    <section className={card} aria-labelledby={titleId} data-testid="germany-progress" data-state="ready" data-catalogue={catalogue.runKey} data-denominator={view.denominatorVersion}>
      <Header titleId={titleId} />
      {view.offline && <p className="mt-2 text-[12px] font-semibold text-amber-deep" role="status" data-testid="germany-offline">{t('germanyOfflineSaved')}</p>}
      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4" data-testid="germany-counts">
        <Metric value={catalogue.discovered} label={t('germanyDiscovered')} tone="text-moss-deep" testId="germany-discovered" />
        <Metric value={catalogue.studied} label={t('germanyStudied')} tone="text-amber-deep" testId="germany-studied" />
        <Metric value={territory?.visitedRegions ?? null} label={t('germanyRegions')} testId="germany-regions" />
        <Metric value={territory?.germanSightings ?? null} label={t('germanySightings')} testId="germany-sightings" />
      </dl>
      {!territory || territory.germanSightings === null || territory.visitedRegions === null
        ? <p className="mt-3 text-[12px] leading-snug text-ink-faint">{t('germanyTerritoryUnavailable')}</p>
        : null}
      {view.empty && <p className="mt-4 rounded-2xl bg-paper px-3 py-2.5 text-[13px] leading-snug text-ink-soft" data-testid="germany-empty">{t('germanyEmpty')}</p>}
      <div className="mt-4 border-t border-tile pt-3 text-[12px] leading-snug text-ink-faint" data-testid="germany-denominator">
        <p>{t('germanyDenominator', { total: catalogue.species })}</p>
        <p className="mt-1 break-words">{t('germanyVersion', { version: catalogue.runKey, from: catalogue.yearFrom, to: catalogue.yearTo })}</p>
      </div>
    </section>
  )
}

function Header({ titleId }: { titleId: string }) {
  const t = useTranslations('you')
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[12px] font-semibold tracking-[0.1em] text-ink-faint uppercase">{t('germanyScope')}</p>
        <h2 id={titleId} className="mt-0.5 text-[22px] leading-tight font-bold">{t('germanyTitle')}</h2>
      </div>
      <span className="text-[24px]" aria-hidden>🇩🇪</span>
    </div>
  )
}

function Metric({ value, label, tone = 'text-ink', testId }: { value: number | null; label: string; tone?: string; testId: string }) {
  return (
    <div data-testid={testId}>
      <dt className="mt-1.5 text-[12px] leading-tight text-ink-soft">{label}</dt>
      <dd className={`mt-1.5 text-[26px] leading-none font-bold tabular-nums ${tone}`}>{value ?? '—'}</dd>
    </div>
  )
}
