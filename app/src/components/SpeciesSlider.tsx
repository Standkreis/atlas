'use client'

import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useTranslations } from 'next-intl'
import type { Tile } from '@/generated/prisma/enums'
import { useRouter } from '@/i18n/navigation'
import { Icon } from './Marks'
import { OnboardingSilhouette } from './OnboardingSilhouette'
import { SourceInfo, SourceSheet, useImageSource } from './SourceInfo'
import { speciesOrigin } from './SpeciesOrigin'
import { clampGalleryIndex, galleryIndexForScroll, galleryKeyTarget } from './SpeciesSliderState'

export type Asset = { id: string; kind: string; url: string; author: string; licence: string; licenceUrl: string | null; sourceUrl: string; origin: string; caption: string | null }

const LONG_PRESS_MS = 500

/**
 * The image slider of spec §🎨 3 with attribution per view (spec §⚖️): the ⓘ over the image (handoff 0014 D3) and a
 * long-press open the same sheet with author · licence · source. The caption line under the image went with 0014.
 * Scroll-snap, no library; the dots follow the scroll offset.
 */
export function SpeciesSlider({ assets, tile }: { assets: Asset[]; tile: string }) {
  const t = useTranslations('species')
  const router = useRouter()
  const imageSource = useImageSource()
  const [requestedIndex, setRequestedIndex] = useState(0)
  const [sheet, setSheet] = useState<Asset | null>(null)
  const [broken, setBroken] = useState<Set<string>>(() => new Set())
  const slider = useRef<HTMLDivElement | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  // Derived clamping makes a stale persisted/rendered position harmless when a gallery is refreshed to fewer images.
  const index = clampGalleryIndex(requestedIndex, assets.length)
  const current = assets[index] ?? null

  const moveTo = (requested: number) => {
    const next = clampGalleryIndex(requested, assets.length)
    setRequestedIndex(next)
    const node = slider.current
    if (node) node.scrollTo({ left: next * node.clientWidth, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  const keyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = galleryKeyTarget(event.key, index, assets.length)
    if (target === null) return
    event.preventDefault()
    moveTo(target)
  }

  const cancel = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; start.current = null }
  const down = (a: Asset) => (e: PointerEvent) => {
    cancel()
    start.current = { x: e.clientX, y: e.clientY }
    timer.current = setTimeout(() => { timer.current = null; setSheet(a) }, LONG_PRESS_MS)
  }
  const move = (e: PointerEvent) => { if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) cancel() }

  // P4 (handoff 0014): not history.back(). Back goes to where the chain of species pages started, the atlas or the diary
  // (SpeciesOrigin), so a lookalike → lookalike hop never traps the reader between two pages.
  const back = () => router.push(speciesOrigin())

  return (
    <>
      <div className="relative">
        {assets.length ? (
          <div ref={slider} className="flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] motion-reduce:scroll-auto [&::-webkit-scrollbar]:hidden"
            onScroll={(e) => setRequestedIndex(galleryIndexForScroll(e.currentTarget.scrollLeft, e.currentTarget.clientWidth, assets.length))}
            onKeyDown={keyboard} tabIndex={assets.length > 1 ? 0 : undefined} role="region" aria-label={t('gallery.label')} data-testid="slider">
            {assets.map((a, i) => (
              <div key={a.id} role="group" aria-roledescription={t('gallery.image')} aria-label={t('gallery.position', { current: i + 1, total: assets.length })}
                className="relative h-full w-full shrink-0 snap-center" data-testid="gallery-slide" data-broken={broken.has(a.id) || undefined}
                onPointerDown={down(a)} onPointerUp={cancel} onPointerCancel={cancel} onPointerLeave={cancel} onPointerMove={move}
                onContextMenu={(e) => { e.preventDefault(); cancel(); setSheet(a) }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- static export, validated remote reference hosts, no optimiser */}
                <img src={a.url} alt={a.caption ?? ''} draggable={false} loading={i === 0 ? 'eager' : 'lazy'} fetchPriority={i === 0 ? 'high' : 'auto'} decoding="async"
                  className={`h-full w-full object-cover select-none [-webkit-touch-callout:none] ${broken.has(a.id) ? 'invisible' : ''}`}
                  onError={() => setBroken((old) => new Set(old).add(a.id))} />
                {broken.has(a.id) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-tile text-ink-faint" data-testid="gallery-broken" role="status">
                    <OnboardingSilhouette tile={tile as Tile} className="h-16 w-16 opacity-50" />
                    <span className="px-5 text-center text-[13px]">{t('gallery.unavailable')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 bg-tile text-ink-faint">
            <OnboardingSilhouette tile={tile as Tile} className="h-16 w-16 opacity-50" />
            <span className="text-[13px]">{t('noImage')}</span>
          </div>
        )}
        <button type="button" onClick={back} aria-label={t('back')} className="absolute top-3 left-3 flex h-11 w-11 items-center justify-center rounded-full bg-card/90 text-ink shadow-md backdrop-blur">
          <Icon name="arrowLeft" size={18} />
        </button>
        {assets.length > 1 && (
          <>
            <button type="button" onClick={() => moveTo(index - 1)} disabled={index === 0} aria-label={t('gallery.previous')} data-testid="gallery-previous"
              className="absolute top-1/2 left-2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-ink shadow-md backdrop-blur disabled:opacity-35">
              <Icon name="arrowLeft" size={20} />
            </button>
            <button type="button" onClick={() => moveTo(index + 1)} disabled={index === assets.length - 1} aria-label={t('gallery.next')} data-testid="gallery-next"
              className="absolute top-1/2 right-2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-ink shadow-md backdrop-blur disabled:opacity-35">
              <Icon name="arrowLeft" size={20} className="rotate-180" />
            </button>
          </>
        )}
        {current && <SourceInfo title={t('attribution.title')} sources={[imageSource(current)]} tone="card" size={32} className="absolute right-3 bottom-3" testId="slider-info" />}
        {assets.length > 1 && (
          <div className="pointer-events-none absolute inset-x-14 bottom-3 flex justify-center gap-1.5" aria-hidden>
            {assets.map((a, i) => <span key={a.id} className={`h-1.5 rounded-full bg-white/90 shadow-sm transition-all ${i === index ? 'w-6' : 'w-1.5 opacity-70'}`} />)}
          </div>
        )}
        {assets.length > 1 && <p className="sr-only" role="status" aria-live="polite" aria-atomic="true" data-testid="gallery-position">{t('gallery.position', { current: index + 1, total: assets.length })}</p>}
      </div>
      {/* No caption line under the image since 0014: the ⓘ over the image is the attribution per view (spec §⚖️), owner's call. */}
      {sheet && (
        <SourceSheet title={t('attribution.title')} sources={[imageSource(sheet)]} onClose={() => setSheet(null)}>
          <p className="mt-4 text-[12px] text-ink-faint">{t('attribution.hint')}</p>
        </SourceSheet>
      )}
    </>
  )
}
