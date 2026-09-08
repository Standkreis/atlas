'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Icon } from './Marks'
import { Sheet, useSheetClose } from './Sheet'
import { citedFacts, type Prose as ProseData } from '../server/prose'

/**
 * The generated text (handoff 0028 §🎨, placement A of 0019 S5): the paragraphs under the tiles they were written from,
 * a faint label "KI-Text aus den Quellen oben" with the judge's count and a ⓘ that opens the page's Sheet with the cited
 * fact lines in the order the prose cites them. `eco` picks the Ökologie paragraph. Nothing when `prose` is null or the
 * reader's language has no text (a partner without a German name, 0027).
 */
export function Prose({ prose, eco = false }: { prose: ProseData | null | undefined; eco?: boolean }) {
  const t = useTranslations('species.prose')
  const locale = useLocale() === 'en' ? 'en' : 'de'
  const [open, setOpen] = useState(false)
  if (!prose) return null
  const text = eco ? prose.eco[locale] : prose[locale]
  if (!text) return null
  const facts = citedFacts(text, (eco && prose.ecoFacts ? prose.ecoFacts : prose.facts)[locale])
  // Aggregate automated checks belong in the sources sheet, with an explanation of their limits.
  const j = eco ? null : prose.judged
  const judged = j ? t('judged', { n: j.supported, m: j.supported + j.partial + j.unsupported }) : null
  return (
    <div className="mt-4" data-testid={eco ? 'prose-eco' : 'prose'} lang={locale}>
      {text.paragraphs.map((p, i) => (
        <p key={i} className={i > 0 ? 'mt-3 text-[17px] leading-[1.45]' : 'text-[17px] leading-[1.45]'}>{p.sentences.map((s) => s.text).join(' ')}</p>
      ))}
      <p className="mt-2 flex items-center gap-1 text-[13px] text-ink-soft" data-testid="prose-label">
        <span>{t('label')}</span>
        <button type="button" aria-label={t('sheetTitle')} aria-haspopup="dialog" data-testid="prose-info" onClick={() => setOpen(true)}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-faint hover:text-ink-soft">
          <Icon name="info" size={13} />
        </button>
      </p>
      {open && <ProseSheet facts={facts} judged={judged} onClose={() => setOpen(false)} />}
    </div>
  )
}

/** The ⓘ sheet: one row per cited line, "F5 · AmphiBIO" over the line's words, the same Sheet as every ⓘ on the page. */
function ProseSheet({ facts, judged, onClose }: { facts: { id: string; source: string; text: string }[]; judged: string | null; onClose: () => void }) {
  const t = useTranslations('species.prose')
  return (
    <Sheet onClose={onClose} labelledBy="prose-title" z="z-50" maxH="max-h-[80vh]" testId="prose-sheet"
      handle={
        <div className="mt-3 flex items-center justify-between">
          <h2 id="prose-title" className="text-[20px] font-bold">{t('sheetTitle')}</h2>
          <CloseButton />
        </div>
      }>
      <div className="min-h-0 overflow-y-auto px-4 pt-3" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
        <p className="text-[13px] text-ink-soft">{[t('sheetHint'), judged].filter(Boolean).join(' · ')}</p>
        {facts.map((f, i) => (
          <div key={f.id} className={`${i > 0 ? 'border-t border-tile' : ''} mt-3 pt-3`} data-testid="prose-fact">
            <div className="text-[13px] text-ink-soft"><span className="font-semibold tabular-nums">{f.id}</span>{f.source && ` · ${f.source}`}</div>
            <div className="mt-0.5 text-[15px] leading-snug">{f.text}</div>
          </div>
        ))}
      </div>
    </Sheet>
  )
}

function CloseButton() {
  const tc = useTranslations('common')
  const close = useSheetClose()
  return <button type="button" onClick={close} className="min-h-11 px-2 text-[14px] text-ink-soft">{tc('close')}</button>
}
