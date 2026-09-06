'use client'

import { useId, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import type { RegionStatus, Tile } from '@/generated/prisma/enums'
import { useTRPC } from '@/trpc/client'
import { allTiles } from './AtlasCounters'
import { type Axis, type GroupRow, barWidth, foldRows, groupsOf, membersOf, onTiles, regionOf } from './GroupRows'
import { Icon } from './Marks'

// The progress section of the profile (handoff 0022): one axis switch, then one card per region of `me.regionIds`, the
// active one first and open, the others folded to name and counts. Every bar and every bold number follow the chosen
// axis; the other axis stays as small text on the same line. Counts = the identity's `progress` ids ∩ the region's set:
// for the active region the grid's `dex.set` entry (already in the cache), for the others the light `dex.setCounts`.
// The switch and the folds are client state, so the section reads the same from the persisted cache without network.

// The axis is remembered in localStorage (P2); read through useSyncExternalStore so the server renders "seen" and the
// client takes the stored one on hydration without a setState in an effect.
const AXIS_KEY = 'dex.progress.axis'
const axisListeners = new Set<() => void>()
let memAxis: Axis | null = null // this page's pick, so the switch moves even where localStorage refuses (private mode)
const readAxis = (): Axis => { if (memAxis) return memAxis; try { return localStorage.getItem(AXIS_KEY) === 'studied' ? 'studied' : 'seen' } catch { return 'seen' } }
const writeAxis = (a: Axis) => { memAxis = a; try { localStorage.setItem(AXIS_KEY, a) } catch { /* private mode */ } axisListeners.forEach((l) => l()) }
const subscribeAxis = (l: () => void) => { axisListeners.add(l); return () => { axisListeners.delete(l) } }
type Region = { id: string; name: string; status: RegionStatus }
type Progress = { studied: string[]; seen: string[]; tiles: Tile[] }
const card = 'rounded-3xl bg-card px-4 py-4 shadow-[0_2px_12px_rgba(30,42,35,0.06)]'
const ink = (axis: Axis) => (axis === 'seen' ? 'text-moss-deep' : 'text-amber')
const fill = (axis: Axis) => (axis === 'seen' ? 'bg-moss' : 'bg-amber')

export function ProgressCard() {
  const t = useTranslations('you')
  const trpc = useTRPC()
  const me = useQuery(trpc.identity.me.queryOptions())
  const progress = useQuery(trpc.identity.progress.queryOptions())
  const axis = useSyncExternalStore(subscribeAxis, readAxis, () => 'seen' as Axis)
  const regions = me.data?.regions ?? []
  const activeId = me.data?.region?.id ?? null
  // Active first (P3), then the list's order.
  const ordered = [...regions].sort((a, b) => Number(b.id === activeId) - Number(a.id === activeId))
  const p = progress.data ?? null
  const empty = !!p && p.studied.length === 0 && p.seen.length === 0

  return (
    <section className="flex flex-col gap-3" data-testid="progress" data-axis={axis} aria-label={t('progress')}>
      <div role="radiogroup" aria-label={t('progress')} className="flex rounded-full bg-tile p-1" data-testid="axis">
        {(['seen', 'studied'] as const).map((a) => (
          <button key={a} type="button" role="radio" aria-checked={axis === a} onClick={() => writeAxis(a)} data-testid={`axis-${a}`}
            className={`motion-toggle flex-1 rounded-full py-1.5 text-[14px] font-semibold ${axis === a ? `${fill(a)} text-white` : 'text-ink-soft'}`}>
            {t(a === 'seen' ? 'axisSeen' : 'axisStudied')}
          </button>
        ))}
      </div>
      {regions.length === 0 && <p className={`${card} text-[15px] text-ink-soft`}>{me.isLoading ? '' : t('noRegion')}</p>}
      {ordered.map((r) => <RegionCard key={r.id} region={r} active={r.id === activeId} axis={axis} progress={p} empty={empty} />)}
    </section>
  )
}

function RegionCard({ region, active, axis, progress, empty }: { region: Region; active: boolean; axis: Axis; progress: Progress | null; empty: boolean }) {
  const t = useTranslations('you')
  const td = useTranslations('dex')
  const trpc = useTRPC()
  const ready = region.status === 'ready'
  // Two sources, one shape: the grid's `dex.set` for the active region (no extra request, the same cache entry the atlas
  // holds), `dex.setCounts` for the others. Both hooks are mounted; only the one this card needs is enabled.
  const set = useQuery(trpc.dex.set.queryOptions({ regionId: region.id, tiles: allTiles, nowOnly: false }, { enabled: ready && active }))
  const counts = useQuery(trpc.dex.setCounts.queryOptions({ regionId: region.id, tiles: allTiles }, { enabled: ready && !active }))
  const members = active ? (set.data ?? null) : membersOf(counts.data, allTiles)
  const rows = onTiles(groupsOf(members, progress), progress?.tiles ?? [])
  const sum = regionOf(rows)
  const [openState, setOpen] = useState<boolean | null>(null)
  const open = openState ?? active
  const [moreOpen, setMore] = useState(false)
  const bodyId = useId()

  return (
    <article className={card} data-testid="region-card" data-region={region.id} data-active={active || undefined} data-open={open}
      data-seen={sum?.seen} data-studied={sum?.studied} data-possible={sum?.possible}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={bodyId} disabled={!ready} data-testid="region-toggle" className="flex w-full items-center gap-3 text-left">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold tracking-[0.08em] text-ink-faint uppercase" data-testid="region-title">{region.name}</span>
          <span className="mt-1 block text-[15px] text-ink-soft" data-testid="region-counts">
            {!ready ? t('preparing') : sum ? <Line axis={axis} n={sum} /> : '…'}
          </span>
        </span>
        {ready && <span className="fold-chevron shrink-0 text-ink-faint" data-open={open} aria-hidden><Icon name="chevron" size={20} /></span>}
      </button>
      {ready && (
        <div className="fold" data-open={open} id={bodyId} data-testid="region-body">
          <div>
            {rows && <Rows rows={rows} axis={axis} open={moreOpen} setOpen={setMore} td={td} t={t} />}
            {active && empty && <p className="mt-3 text-[13px] text-ink-faint" data-testid="empty-hint">{t('emptyHint')}</p>}
          </div>
        </div>
      )}
    </article>
  )
}

/** "2 von 929 entdeckt · 1 studiert": the chosen axis bold in its colour, the other small. */
function Line({ axis, n }: { axis: Axis; n: { seen: number; studied: number; possible: number } }) {
  const t = useTranslations('you')
  const b = (c: ReactNode) => <b className={`font-bold ${ink(axis)}`}>{c}</b>
  return (
    <>
      {axis === 'seen' ? t.rich('seenOf', { n: n.seen, total: n.possible, b }) : t.rich('studiedOf', { n: n.studied, total: n.possible, b })}
      <span className="text-[13px]"> · {axis === 'seen' ? t('studiedN', { n: n.studied }) : t('seenN', { n: n.seen })}</span>
    </>
  )
}

function Rows({ rows, axis, open, setOpen, td, t }: { rows: GroupRow<Tile>[]; axis: Axis; open: boolean; setOpen: (v: boolean) => void; td: ReturnType<typeof useTranslations<'dex'>>; t: ReturnType<typeof useTranslations<'you'>> }) {
  const { shown, folded } = foldRows(rows)
  const foldId = useId()
  const row = (r: GroupRow<Tile>) => {
    const n = r[axis]
    const width = barWidth(n, r.possible)
    return (
      <li key={r.tile} data-testid={`group-${r.tile}`} data-seen={r.seen} data-studied={r.studied} data-possible={r.possible} data-bar={width ?? 'none'}>
        <div className="flex items-baseline justify-between gap-3 text-[15px]">
          <span className="font-semibold">{td(`tile.${r.tile}`)}</span>
          <span className="shrink-0 text-[13px] text-ink-soft">
            {t.rich('nOf', { n, total: r.possible, b: (c) => <b className={`font-bold ${ink(axis)}`}>{c}</b> })} · {axis === 'seen' ? t('studiedN', { n: r.studied }) : t('seenN', { n: r.seen })}
          </span>
        </div>
        {width && (
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-tile" aria-hidden>
            <span className={`block h-full rounded-full ${fill(axis)}`} style={{ width }} data-testid="bar" />
          </div>
        )}
      </li>
    )
  }
  return (
    <>
      {shown.length > 0 && <ul className="mt-3 flex flex-col gap-2.5" data-testid="rows-shown">{shown.map(row)}</ul>}
      {folded.length > 0 && (
        <>
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={foldId} data-testid="more-groups" className="mt-3 flex w-full items-center justify-between text-left text-[14px] font-semibold text-ink-soft">
            {shown.length ? t('moreGroups', { n: folded.length }) : t('allGroups', { n: folded.length })}
            <span className="fold-chevron shrink-0 text-ink-faint" data-open={open} aria-hidden><Icon name="chevron" size={18} /></span>
          </button>
          <div className="fold" data-open={open} id={foldId}>
            <div><ul className="mt-2 flex flex-col gap-2.5" data-testid="rows-folded">{folded.map(row)}</ul></div>
          </div>
        </>
      )}
    </>
  )
}
