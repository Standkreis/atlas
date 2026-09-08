'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { useFormatter, useTranslations } from 'next-intl'
import { Tile } from '@/generated/prisma/enums'
import { useRouter } from '@/i18n/navigation'
import { useTRPC } from '@/trpc/client'
import { Brand } from './Brand'
import { Icon, SeenMark, StudiedMark } from './Marks'
import { OnboardingSilhouette } from './OnboardingSilhouette'
import { RegionPicker } from './RegionPicker'
import { useOffline } from './OfflineBanner'

// A quiet welcome precedes the four setup steps. Change mode starts directly at region discovery,
// keeps the current groups and skips the promises. Only prepared regions can be selected.

// The splash (handoff 0013 O2): the owner's licensed image (Adobe Stock, no credit line), local, behind every step.
// The `photo` string stays in the JSON for a CC BY splash from the set one day. Focus on the lit moss, lower third.
const SPLASH = { src: '/splash.jpg', srcSet: '/splash-720.jpg 720w, /splash.jpg 1440w', position: '50% 62%' }

const allTiles = Object.values(Tile) as Tile[]
// The tiles screen's order: the big groups first, as findings 0006 C2 lists them, fish last.
const tileOrder: Tile[] = ['bird', 'insect', 'plant', 'fungus', 'mammal', 'amphibian', 'reptile', 'fish']
type Step = 'welcome' | 'region' | 'tiles' | 'ready' | 'promises'
type Region = { id: string; name: string; status: string }

export function Onboarding() {
  const change = useSearchParams().get('change') === '1'
  const trpc = useTRPC()
  const router = useRouter()
  const progress = useQuery(trpc.identity.progress.queryOptions(undefined, { enabled: change }))
  const [step, setStep] = useState<Step>(() => change ? 'region' : 'welcome')
  const screen = useRef<HTMLDivElement>(null)
  const [region, setRegion] = useState<Region | null>(null)
  const [tiles, setTiles] = useState<Set<Tile>>(() => new Set(allTiles))
  const of = change ? 3 : 4
  // In change mode the tiles screen starts from the current filter, not from "all on".
  const chosen = (r: Region) => { setRegion(r); if (change && !region && progress.data?.tiles.length) setTiles(new Set(progress.data.tiles)); setStep('tiles') }
  const go = () => router.replace('/')
  useEffect(() => {
    screen.current?.scrollTo(0, 0)
    screen.current?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true })
  }, [step])
  // O4: the page's bottom edge is the splash's bottom edge, so Safari's bar blends with it. Only while this route shows.
  useEffect(() => {
    const els = [document.documentElement, document.body]
    const before = els.map((e) => e.style.backgroundColor)
    els.forEach((e) => { e.style.backgroundColor = 'var(--color-night-deep)' })
    return () => els.forEach((e, i) => { e.style.backgroundColor = before[i] })
  }, [])
  return (
    <div className="fixed inset-0 z-30 bg-night-deep text-white" data-testid={`onboarding-${step}`}>
      <Splash />
      <div ref={screen} className="relative h-full overflow-y-auto">
        {step === 'welcome' && <WelcomeScreen onNext={() => setStep('region')} />}
        {step === 'region' && <RegionScreen change={change} initialRegion={region} onChosen={chosen} onBack={() => setStep('welcome')} of={of} canContinue={!change || !!progress.data} progressError={change && progress.isError} onRetry={() => void progress.refetch()} />}
        {step === 'tiles' && region && <TilesScreen onBack={() => setStep('region')} of={of} region={region} tiles={tiles} setTiles={setTiles} onNext={() => setStep('ready')} />}
        {step === 'ready' && region && <ReadyScreen onBack={() => setStep('tiles')} of={of} region={region} tiles={tiles} onNext={change ? go : () => setStep('promises')} />}
        {step === 'promises' && <PromisesScreen onBack={() => setStep('ready')} of={of} onNext={go} />}
      </div>
    </div>
  )
}

// The static shell paints the same welcome while the URL-dependent change mode hydrates.
export function OnboardingFallback() {
  return <div className="fixed inset-0 z-30 bg-night-deep text-white"><Splash /><div className="relative h-full overflow-y-auto"><WelcomeScreen /></div></div>
}

function Splash() {
  return <div className="absolute inset-0" aria-hidden>
    {/* eslint-disable-next-line @next/next/no-img-element -- local image, static export, no optimiser */}
    <img src={SPLASH.src} srcSet={SPLASH.srcSet} sizes="100vw" alt="" fetchPriority="high" decoding="async" className="h-full w-full object-cover" style={{ objectPosition: SPLASH.position }} data-testid="splash" />
    <div className="absolute inset-0 bg-gradient-to-b from-night/15 via-night/60 via-45% to-night-deep to-90%" />
  </div>
}

function WelcomeScreen({ onNext }: { onNext?: () => void }) {
  const t = useTranslations('onboarding')
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[520px] flex-col px-6 pt-[max(2rem,env(safe-area-inset-top))]">
      <Brand label={t('eyebrow')} inverse />
      <div className="flex flex-1 flex-col justify-center py-10">
        <h1 tabIndex={-1} className="text-[clamp(2.25rem,6vw,3rem)] leading-[1.08] font-bold tracking-tight outline-none">{t('headline')}</h1>
        <p className="mt-5 text-[20px] leading-snug text-white/85">{t('promise')}</p>
      </div>
      <div className="pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <p className="mb-4 text-[15px] leading-snug text-white/75">{t('welcomeHint')}</p>
        <button type="button" onClick={onNext} disabled={!onNext} data-testid="welcome-next" className="min-h-14 w-full rounded-2xl bg-moss px-4 py-3 text-[18px] font-bold text-white">{t('welcomeNext')}</button>
      </div>
    </div>
  )
}

// ── 1 · Region ────────────────────────────────────────────────────────────────

function RegionScreen({ change, initialRegion, onChosen, onBack, of, canContinue, progressError, onRetry }: { change: boolean; initialRegion: Region | null; onChosen: (r: Region) => void; onBack: () => void; of: number; canContinue: boolean; progressError: boolean; onRetry: () => void }) {
  const t = useTranslations('onboarding')
  const trpc = useTRPC()
  const router = useRouter()
  const [picked, setPicked] = useState<string | null>(initialRegion?.id ?? null)
  const [selected, setSelected] = useState<Region | null>(initialRegion)
  // A bounded compatibility read keeps existing offline packs and fixture databases usable until #28 cutover.
  // The picker never renders this list wholesale; it is only searched when the canonical registry is unavailable.
  const regions = useQuery(trpc.dex.regions.queryOptions())
  return (
    <StepFrame onBack={change ? () => router.back() : onBack} backLabel={change ? t('cancel') : undefined} backTestId={change ? 'cancel' : undefined} step={1} of={of} title={t('regionTitle')} body={t('regionBody')}
      action={<button type="button" disabled={!selected || !canContinue} data-testid="region-next" onClick={() => selected && onChosen(selected)} className="h-14 w-full rounded-2xl bg-moss text-[18px] font-bold text-white disabled:opacity-60">{t('chooseRegion')}</button>}>
        <div className="mt-5">
          <RegionPicker
            selectedId={picked}
            fallbackRegions={regions.data ?? []}
            tone="dark"
            onSelect={(next) => {
              setPicked(next.id)
              setSelected({ id: next.id, name: next.name, status: next.status })
            }}
          />
        </div>
        {progressError && <LoadError onRetry={onRetry} />}
    </StepFrame>
  )
}

// ── 2 · Tiles ─────────────────────────────────────────────────────────────────

function TilesScreen({ onBack, of, region, tiles, setTiles, onNext }: { onBack: () => void; of: number; region: Region; tiles: Set<Tile>; setTiles: (s: Set<Tile>) => void; onNext: () => void }) {
  const t = useTranslations('onboarding')
  const tt = useTranslations('dex.tile')
  const trpc = useTRPC()
  const qc = useQueryClient()
  const offline = useOffline()
  const ready = region.status === 'ready'
  const set = useQuery(trpc.dex.set.queryOptions({ regionId: region.id, tiles: allTiles, nowOnly: false }, { enabled: ready }))
  const counts = new Map(set.data?.tiles.map((x) => [x.tile, x.count]) ?? [])
  // Owner-supplied category photos are bundled locally; only counts depend on the selected region.
  // Fish is shown only when the region's set has some (E12). Before the set exists we cannot know: the seven land tiles.
  const shown = tileOrder.filter((x) => x !== 'fish' || (counts.get('fish') ?? 0) > 0)
  const setFilter = useMutation(trpc.identity.setFilter.mutationOptions({ onSuccess: () => { qc.invalidateQueries({ queryKey: trpc.identity.pathKey() }); onNext() } }))
  // Handoff 0018 R6: the first run makes the list `[it]`; change mode (no link left, the URL still works) keeps the list and adds it.
  const me = useQuery(trpc.identity.me.queryOptions())
  const regionIds = [...new Set([...(me.data?.regionIds ?? []), region.id])]
  const toggle = (x: Tile) => { const n = new Set(tiles); if (n.has(x)) n.delete(x); else n.add(x); setTiles(n) }
  const chosen = shown.filter((x) => tiles.has(x))

  return (
    <StepFrame onBack={onBack} backDisabled={setFilter.isPending} step={2} of={of} title={t('tilesTitle')} body={t('tilesBody')}
      action={<button type="button" disabled={!chosen.length || !set.data || !me.data || setFilter.isPending || offline} data-testid="tiles-next" onClick={() => setFilter.mutate({ regionId: region.id, regionIds, tiles: chosen, nowOnly: false })} className="h-14 w-full rounded-2xl bg-moss text-[18px] font-bold text-white disabled:opacity-50">{setFilter.isPending ? t('working') : t('next')}</button>}>
      <p className="mt-4 text-[15px] font-semibold" data-testid="chosen-region">{region.name}</p>
      {(!set.data || !me.data) && !set.isError && !me.isError && <p role="status" className="mt-3 text-white/80">{offline ? t('offlineSetup') : t('working')}</p>}
      {(set.isError || (set.isSuccess && !set.data)) && <LoadError onRetry={() => void set.refetch()} />}
      {me.isError && <LoadError onRetry={() => void me.refetch()} />}
      <ul className="mt-3 grid grid-cols-2 gap-3" data-testid="tiles" aria-busy={set.isLoading}>
        {shown.map((x) => {
          const on = tiles.has(x)
          const n = counts.get(x)
          return (
            <li key={x} className="relative">
              {/* Multi-select mirrors the region choice: its checkbox leads on the left and the whole card is clickable. */}
              <label className={`motion-toggle flex h-full w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl p-3 text-left ${on ? 'bg-white text-night' : 'bg-white/10 text-white/60'}`}>
                <input type="checkbox" checked={on} onChange={() => toggle(x)} data-tile={x} className="peer sr-only" />
                <span aria-hidden className={`motion-toggle flex size-6 shrink-0 items-center justify-center rounded-md border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-sky peer-focus-visible:ring-offset-2 ${on ? 'border-sky bg-white text-sky' : 'border-white/45 bg-transparent text-transparent'}`}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                </span>
                <span className="order-3 w-full min-w-0">
                  <span className="block text-[15px] leading-tight font-bold [overflow-wrap:anywhere]">{tt(x)}</span>
                  <span className={`mt-1 block text-[13px] leading-tight ${on ? 'text-ink-soft' : ''}`}>{n === undefined ? (ready ? '' : t('countsPending')) : t('speciesHere', { n })}</span>
                </span>
                <span className="order-2 ml-auto flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-tile" aria-hidden>
                  <span className={`flex h-full w-full items-center justify-center overflow-hidden rounded-full ${on ? 'bg-tile' : 'bg-white/10'}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- pre-optimized local 3x thumbnails, also served by the static export */}
                    <img src={`/onboarding/${x}.webp`} width={144} height={144} alt="" decoding="async" className={`motion-toggle h-full w-full object-cover ${on ? '' : 'opacity-45 grayscale'}`} />
                  </span>
                </span>
              </label>
            </li>
          )
        })}
      </ul>
      {offline && set.data && <p role="status" className="mt-3 text-white/85">{t('offlineSetup')}</p>}
      {setFilter.isError && <p role="alert" className="mt-3 text-[15px] text-[#f0a030]">{t('saveError')}</p>}
    </StepFrame>
  )
}

// ── 3 · Ready ─────────────────────────────────────────────────────────────────

function ReadyScreen({ onBack, of, region, tiles, onNext }: { onBack: () => void; of: number; region: Region; tiles: Set<Tile>; onNext: () => void }) {
  const t = useTranslations('onboarding')
  const species = useTranslations('species')
  const format = useFormatter()
  const trpc = useTRPC()
  // The filter is written; from here the app reads it back, polling while the region job runs (5 s, handoff 0007).
  const me = useQuery(trpc.identity.me.queryOptions(undefined, { refetchInterval: (q) => (q.state.data?.region?.status === 'queued' ? 5000 : false) }))
  const status = me.data?.region?.status ?? region.status
  const ready = status === 'ready'
  const chosen = allTiles.filter((x) => tiles.has(x))
  // O9a: two numbers from one read. `setSize` is the whole region's set; this month's count is the `now` members of
  // the chosen tiles, which is exactly what `nowOnly: true` would return (dex.ts filters on the same flag).
  const set = useQuery(trpc.dex.set.queryOptions({ regionId: region.id, tiles: chosen, nowOnly: false }, { enabled: ready }))
  const month = format.dateTime(new Date(), { month: 'long' })
  const now = set.data?.species.filter((s) => s.now) ?? []
  // The demo species: the first `now` member with a lead image, so the card shows what the grid will show.
  const demo = now.find((s) => s.lead) ?? now[0] ?? null
  const last = of === 3

  return (
    <StepFrame onBack={onBack} step={3} of={of} title={set.data ? t('readyTitle') : t('previewTitle')}
      body={ready && set.data
        ? t.rich('readyBody', { n: now.length, total: set.data.setSize, month, region: region.name, b: (c) => <strong className="text-white" data-testid="number">{c}</strong> })
        : set.isError || set.isSuccess ? null : status === 'failed' ? t('readyFailed', { region: region.name }) : t('working')}
      action={<button type="button" disabled={!set.data} data-testid={last ? 'go' : 'ready-next'} onClick={onNext} className="h-14 w-full rounded-2xl bg-moss text-[18px] font-bold text-white disabled:opacity-50">{last ? t('go') : t('next')}</button>}>
      {(set.isError || (set.isSuccess && !set.data)) && <LoadError onRetry={() => void set.refetch()} />}
      <div className="mt-5 flex flex-col gap-4" data-testid="preview">
        {/* Studying is the usual first step: learn what to notice, then discover it outdoors. */}
        <DemoCard demo={demo} state="studied" title={t('axisStudyTitle')} text={t('axisStudy', { action: species('study.mark') })} />
        <DemoCard demo={demo} state="seen" title={t('axisSeenTitle')} text={t('axisSeen')} />
      </div>
    </StepFrame>
  )
}

// Show the Atlas cell changing from its quiet new state into the studied or discovered state.
// The visual floats so the title, status and explanation remain one continuous content block.
function DemoCard({ demo, state, title, text }: { demo: DemoSpecies | null; state: 'studied' | 'seen'; title: string; text: string }) {
  return (
    <section className="flow-root rounded-2xl bg-white p-5 text-night" aria-labelledby={`demo-${state}-title`} data-testid={`demo-${state}`}>
      <div className="mb-2 ml-4 flex items-center gap-1.5" style={{ float: 'right' }} aria-hidden>
        <DemoCell demo={demo} state="new" />
        <svg viewBox="0 0 28 16" width="28" height="16" className="shrink-0 text-night/45" fill="none">
          <path d="M2 8h22m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <DemoCell demo={demo} state={state} />
      </div>
      <h2 id={`demo-${state}-title`} className="text-[22px] leading-tight font-bold">{title}</h2>
      <p className="mt-2 text-[17px] leading-snug">{text}</p>
    </section>
  )
}

type DemoSpecies = { tile: Tile; lead: { url: string } | null; leadSmall: string | null }

function DemoCell({ demo, state }: { demo: DemoSpecies | null; state: 'new' | 'studied' | 'seen' }) {
  const src = demo?.leadSmall ?? demo?.lead?.url ?? null
  return (
    <div className="relative shrink-0 overflow-hidden rounded-xl bg-tile" style={{ width: 72, height: 72 }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- static export, remote hosts
        <img src={src} alt="" className={`h-full w-full object-cover ${state === 'seen' ? '' : state === 'studied' ? 'opacity-70 grayscale' : 'opacity-45 grayscale'}`} />
      ) : (
        <OnboardingSilhouette tile={demo?.tile ?? 'bird'} className="h-full w-full p-3 text-night/40" />
      )}
      {state !== 'new' && <span className={`pointer-events-none absolute inset-0 rounded-xl ring-2 ring-inset ${state === 'seen' ? 'ring-moss' : 'ring-amber'}`} />}
      {state === 'seen' && <SeenMark size={24} className="absolute right-1 bottom-1" />}
      {state === 'studied' && <StudiedMark size={24} className="absolute bottom-1 left-1" />}
    </div>
  )
}

// ── 4 · Promises ──────────────────────────────────────────────────────────────

// A mutual commitment: the project stays open and not-for-profit; the community puts nature first.
// Skipped in change mode.
function PromisesScreen({ onBack, of, onNext }: { onBack: () => void; of: number; onNext: () => void }) {
  const t = useTranslations('onboarding')
  return (
    <StepFrame onBack={onBack} step={4} of={of} title={t('promisesTitle')} body={t('promisesBody')}
      action={<button type="button" data-testid="go" onClick={onNext} className="h-14 w-full rounded-2xl bg-moss text-[18px] font-bold text-white">{t('promisesGo')}</button>}>
      <div className="mt-5 flex flex-col gap-4" data-testid="promises">
        <section className="rounded-2xl bg-white p-5 text-night" aria-labelledby="promise-ours-title">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-red-500/25 bg-red-500/10 text-red-500" aria-hidden><Icon name="heart" size={22} /></span>
            <h2 id="promise-ours-title" className="text-[22px] leading-tight font-bold">{t('promisesOurs')}</h2>
          </div>
          <p className="mt-2 text-[17px] leading-snug">{t('promisesOursText')}</p>
        </section>
        <section className="rounded-2xl bg-white p-5 text-night" aria-labelledby="promise-yours-title">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-moss/25 bg-moss/10 text-moss" aria-hidden><Icon name="leaf" size={22} /></span>
            <h2 id="promise-yours-title" className="text-[22px] leading-tight font-bold">{t('promisesYours')}</h2>
          </div>
          <p className="mt-2 text-[17px] leading-snug">{t('promisesYoursText')}</p>
        </section>
      </div>
    </StepFrame>
  )
}

// One frame for setup steps over the splash: white on the scrim, theme-stable tokens only; the action sticks to the
// bottom on a fade to the page's bottom colour so the list scrolls under it.
function StepFrame({ onBack, backLabel, backTestId = 'onboarding-back', backDisabled = false, step, of, title, body, children, action }: { onBack: () => void; backLabel?: string; backTestId?: string; backDisabled?: boolean; step: number; of: number; title: string; body: React.ReactNode; children: React.ReactNode; action: React.ReactNode }) {
  const t = useTranslations('onboarding')
  return (
    <div className="mx-auto flex min-h-full max-w-[520px] flex-col px-5" style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top))' }}>
      <div className="flex items-center justify-between text-[15px] text-white/85"><button type="button" disabled={backDisabled} onClick={onBack} data-testid={backTestId} className="min-h-11 pr-4 underline disabled:opacity-50">{backLabel ?? t('back')}</button><span>{t('stepOf', { step, of })}</span></div>
      <h1 tabIndex={-1} className="mt-1 text-[32px] leading-[1.1] font-bold tracking-tight outline-none">{title}</h1>
      {body && <p className="mt-2 text-[18px] leading-snug text-white/80">{body}</p>}
      <div className="flex-1">{children}</div>
      {/* The safe-area padding lives in the sticky footer, not the container: `bottom: 0` ignores the container's padding,
          and a moss button flush with the page bottom is what Safari's bar sampled its tint from (green bar on steps 2–4). */}
      <div className="sticky bottom-0 -mx-5 mt-6 bg-gradient-to-t from-night-deep from-70% to-transparent px-5 pt-6" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>{action}</div>
    </div>
  )
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations('onboarding')
  const tc = useTranslations('common')
  return <p role="alert" className="mt-3 text-[15px] text-white/85">{t('loadError')} <button type="button" onClick={onRetry} className="min-h-11 px-2 font-semibold underline">{tc('retry')}</button></p>
}
