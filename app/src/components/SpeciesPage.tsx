'use client'

import { Suspense, useCallback, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'next/navigation'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { useTRPC } from '@/trpc/client'
import { Toast } from './Fill'
import { useOffline } from './OfflineBanner'
import { Icon, SeenMark, StudiedMark } from './Marks'
import { ChipGrid, EcologyChip, LookalikeCard, useName, type Card, type DexState } from './SpeciesCard'
import { SourceInfo, useImageSource, type Source } from './SourceInfo'
import { SpeciesMap } from './SpeciesMap'
import { SpeciesSlider } from './SpeciesSlider'
import { enqueue, flush, type Lead } from './Queue'

// The Steckbrief keys a tile can carry (handoff 0021 D6), in cell order after Status. A tile without a row (insect, reptile,
// fish) shows only what the ETL happened to find; the grey "noch keine Angaben" line names only this tile's keys.
const TILE_KEYS: Record<string, string[]> = {
  bird: ['mass', 'wingspan', 'migration', 'habitat', 'diet', 'activity', 'lifespan', 'reproduction'],
  mammal: ['mass', 'length', 'diet', 'activity', 'lifespan', 'reproduction'],
  amphibian: ['mass', 'length', 'habitat', 'diet', 'activity', 'lifespan', 'reproduction'],
  plant: ['flowering', 'height', 'pollination', 'lifeform'],
  fungus: ['edibility', 'sporePrint'],
}
/** Enum-like keys: the ETL stores codes, the page translates them (`species.facts.values.<key>.<code>`), lists stay comma-joined. */
const CODED = new Set(['migration', 'habitat', 'diet', 'activity', 'pollination', 'lifeform', 'edibility', 'sporePrint'])
const METRIC = new Set(['mass', 'wingspan', 'length', 'height'])
/** Worst first, `medicinal` gone (a health claim is not an edibility; 0021 doubt A). Same list as `etl/facts.ts`, kept here so the client bundle carries no ETL code. */
const EDIBILITY_ORDER = ['deadly', 'poisonous', 'psychoactive', 'inedible', 'choice', 'edible', 'unknown']
type Fact = { value: string; source: string; url?: string; licence?: string }
const KINDS = ['eats', 'eatenBy', 'pollinates', 'visitsFlowersOf', 'hostOf', 'parasiteOf'] as const
/** The deed behind a licence string, for the ⓘ sheets (handoff 0014 D3): "CC BY-SA 4.0" → creativecommons.org; anything else has no link. */
export const licenceUrl = (l: string | null | undefined) => {
  const m = l?.match(/^CC[ -]?(BY(?:-[A-Z]{2})*|0)\s?(\d\.\d)?$/i)
  if (!m) return null
  return m[1] === '0' ? 'https://creativecommons.org/publicdomain/zero/1.0/' : `https://creativecommons.org/licenses/${m[1]!.toLowerCase()}/${m[2] ?? '4.0'}/`
}
const HOME: Record<string, string> = {
  GBIF: 'https://www.gbif.org', Wikidata: 'https://www.wikidata.org', AnAge: 'https://genomics.senescence.info/species/', GloBI: 'https://www.globalbioticinteractions.org', iNaturalist: 'https://www.inaturalist.org', 'Wikimedia Commons': 'https://commons.wikimedia.org',
  AVONET: 'https://doi.org/10.6084/m9.figshare.16586228', EltonTraits: 'https://doi.org/10.6084/m9.figshare.3559887', PanTHERIA: 'https://doi.org/10.1890/08-1494.1', AmphiBIO: 'https://doi.org/10.6084/m9.figshare.4644424', 'GIFT (Weigelt et al.)': 'https://gift.uni-goettingen.de', 'xeno-canto': 'https://xeno-canto.org',
}
// The ETL writes the year strip's words in German (record 0002 E3, schema comment); en swaps the four abbreviations that differ.
const MONTHS_EN: Record<string, string> = { Mär: 'Mar', Mai: 'May', Okt: 'Oct', Dez: 'Dec' }

/**
 * The species page (spec §🎨 3, handoff 0007 Track B): slider, three names, the two-axis state row, intro, Steckbrief,
 * Vorkommen, Verwechslungsgefahr, Ökologie, one Quellen line, the sticky "Entdeckt" and "Studiert". Dex state is the client's
 * join of `identity.progress`. Empty Steckbrief and Vorkommen show one grey line (absence is a fact worth reading); empty
 * lookalikes and ecology are left out (handoff 0014 D5). No emoji on the page (D2), seen before studied (D1). Every photo
 * and source reference carries a ⓘ (D3, `SourceInfo`); the ecology categories are wrapping chip grids with the total on
 * the right and a fold after three rows (D4, `ChipGrid`).
 */
export function SpeciesPage() {
  const t = useTranslations('species')
  const to = useTranslations('offline')
  const tc = useTranslations('common')
  const tl = useTranslations('log')
  const locale = useLocale()
  const format = useFormatter()
  const name = useName()
  const imageSource = useImageSource()
  const trpc = useTRPC()
  const qc = useQueryClient()
  const router = useRouter()
  const params = useParams<{ gbifKey: string }>()
  const gbifKey = Number(params.gbifKey)

  const me = useQuery(trpc.identity.me.queryOptions())
  const region = me.data?.region ?? null
  const page = useQuery(trpc.taxon.page.queryOptions({ gbifKey, regionId: region?.id }, { enabled: Number.isInteger(gbifKey) && me.isSuccess }))
  const progress = useQuery(trpc.identity.progress.queryOptions())
  const centre = useQuery(trpc.taxon.mapCentre.queryOptions({ regionId: region?.id ?? '' }, { enabled: !!region, staleTime: Infinity }))
  const invalidate = () => qc.invalidateQueries({ queryKey: trpc.identity.progress.queryKey() })
  const [marking, setMarking] = useState(false)
  // Study marks go through the outbox (handoff 0009 B): offline the button flips at once, the flush lands the row.
  const mark = async (taxon: { id: string; gbifKey: number; sciName: string; names: Record<string, string>; tile: string; lead: Lead }) => {
    setMarking(true)
    try {
      await enqueue({ id: crypto.randomUUID(), kind: 'study', payload: { taxonId: taxon.id, taxon } })
      qc.setQueryData(trpc.identity.progress.queryKey(), (old) => (old && !old.studied.includes(taxon.id) ? { ...old, studied: [...old.studied, taxon.id] } : old))
      void flush()
    } finally { setMarking(false) }
  }
  const unmark = useMutation(trpc.study.unmark.mutationOptions({ onSuccess: invalidate }))

  if (!Number.isInteger(gbifKey) || (page.isSuccess && !page.data)) return <Empty text={t('notFound')} link={t('toAtlas')} />
  if (page.isError && !page.data) return <Empty text={to('speciesWaits')} link={t('toAtlas')} />
  if (!page.data) return <Empty text={tc('working')} />
  const s = page.data
  const studied = new Set(progress.data?.studied ?? [])
  const seen = new Set(progress.data?.seen ?? [])
  const stateOf = (id: string): DexState => (seen.has(id) ? 'seen' : studied.has(id) ? 'studied' : 'none')
  const isStudied = studied.has(s.id), isSeen = seen.has(s.id)
  const busy = marking || unmark.isPending
  // "✓ entdeckt · 5. Sep": the latest wild sighting from `identity.progress.seenAt` (findings 0007 doubt B6).
  const seenAt = progress.data?.seenAt[s.id]
  const seenLabel = isSeen && seenAt ? `${t('state.seen')} · ${format.dateTime(new Date(seenAt), { day: 'numeric', month: 'short' })}` : t('state.seen')

  // Three names: the reader's language, Latin, the other language. A missing vernacular leaves the Latin name as the title.
  const title = s.names[locale] ?? s.sciName
  const other = s.names[locale === 'de' ? 'en' : 'de']
  const sub = [title !== s.sciName ? <i key="sci">{s.sciName}</i> : null, other && other !== title ? <span key="other">{other}</span> : null].filter(Boolean)

  // Steckbrief (0021 D6, layout A): Status always (tile and IUCN), then one cell per fact the ETL found, in the tile's
  // order; the tile's missing keys in one grey line. Each cell's source and licence sit behind its ⓘ (0014 D3).
  const facts = (s.facts ?? {}) as Record<string, Fact | undefined>
  const gbifPage = `https://www.gbif.org/species/${s.gbifKey}`
  const dataSource = (o: string, url?: string): Source => ({ origin: o, sourceUrl: url ?? HOME[o] ?? null })
  const factSource = (f: Fact): Source => ({ origin: f.source, sourceUrl: f.url ?? HOME[f.source] ?? null, licence: f.licence ?? null, licenceUrl: licenceUrl(f.licence) })
  const factWords = (k: string, v: string) => {
    if (k === 'edibility') v = v.split(', ').filter((c) => c !== 'medicinal').sort((a, b) => EDIBILITY_ORDER.indexOf(a) - EDIBILITY_ORDER.indexOf(b)).join(', ') // 0024: rows filled before it
    if (CODED.has(k)) return v.split(', ').map((c) => (t.has(`facts.values.${k}.${c}`) ? t(`facts.values.${k}.${c}`) : c)).join(', ')
    if (k === 'flowering') return locale === 'en' ? v.replace(/Mär|Mai|Okt|Dez/g, (m) => MONTHS_EN[m] ?? m) : v
    const metric = METRIC.has(k) && locale === 'de' ? v.replace(/(\d)\.(\d)/g, '$1,$2') : v
    if (k === 'height') return t('facts.values.height.max', { v: metric }) // GIFT 1.6.2 is the maximum (findings 0021 doubt C)
    if (METRIC.has(k)) return metric
    if (k === 'lifespan') return lifespanWords(v)
    if (k === 'reproduction') return reproductionWords(v)
    return v
  }
  // AnAge codes (handoff 0024): "21.8 wild" and "clutch 4.5 · perYear 2 · maturity 365"; anything else is printed as is.
  const lifespanWords = (v: string) => {
    const m = v.match(/^([\d.]+)(?: (wild|captivity))?$/)
    if (!m) return v
    const years = t('facts.values.lifespan.years', { n: format.number(Number(m[1]), { maximumFractionDigits: 1 }) })
    return m[2] ? `${years} (${t(`facts.values.lifespan.${m[2]}`)})` : years
  }
  // `perYear` names what it counts: the sibling clutch/litter part decides, else the tile (AnAge writes "clutches" for
  // egg layers and "litters" for mammals).
  const reproductionWords = (v: string) => {
    const parts = v.split(' · ')
    const brood = parts.some((p) => p.startsWith('litter ')) || (!parts.some((p) => p.startsWith('clutch ')) && s.tile === 'mammal') ? 'littersPerYear' : 'clutchesPerYear'
    return parts.map((p) => {
      const m = p.match(/^(clutch|litter|perYear|maturity) ([\d.]+)$/)
      if (!m) return p
      const key = m[1] === 'perYear' ? brood : m[1]
      return t(`facts.values.reproduction.${key}`, { n: format.number(Number(m[2]), { maximumFractionDigits: 1 }) })
    }).join(' · ')
  }
  const tileKeys = TILE_KEYS[s.tile] ?? []
  const keys = [...tileKeys, ...Object.keys(facts).filter((k) => !tileKeys.includes(k))]
  const status = { k: 'status', value: `${t(`tile.${s.tile}`)}`, sub: s.iucn ? `${s.iucn} · ${t.has(`iucn.${s.iucn}`) ? t(`iucn.${s.iucn}`) : ''}`.trim() : null, sources: [dataSource('GBIF', gbifPage), ...(s.iucn ? [dataSource('IUCN Red List', `https://www.iucnredlist.org/search?query=${encodeURIComponent(s.sciName)}`)] : [])] }
  const cells = [status, ...keys.flatMap((k) => { const f = facts[k]; return f && t.has(`facts.${k}`) ? [{ k, value: factWords(k, f.value), sub: null, sources: [factSource(f)] }] : [] })]
  const missing = tileKeys.filter((k) => !facts[k]).map((k) => t(`facts.${k}`))
  const voice = s.assets.find((a) => a.kind === 'sound') ?? null
  // No Steckbrief at all for a tile that can carry no fact and has none (an insect without a clip; D6).
  const showFacts = tileKeys.length > 0 || cells.length > 1 || !!s.iucn || !!voice
  const images = s.assets.filter((a) => a.kind === 'image')

  // Vorkommen: the words say what the bars cannot; the current month is dark; "jetzt gute Chancen" at ≥ 25 % of the peak (E3).
  const p = s.plausibility
  const words = p?.words ?? ''
  const headline = words === 'Ganzes Jahr' ? t('occurrence.wholeYear') : words ? t('occurrence.mainTime', { months: locale === 'en' ? words.replace(/Mär|Mai|Okt|Dez/g, (m) => MONTHS_EN[m] ?? m) : words }) : null
  const letters = t('occurrence.monthLetters').split(' ')

  const kinds = KINDS.filter((k) => s.interactions[k]?.length)
  const imageOrigins = [...new Set(images.map((a) => a.origin))].map((o) => (o === 'inat' || o === 'commons' || o === 'user' ? t(`origin.${o}`) : o))
  // The data line names every dataset behind a cell (AnAge, AVONET, GIFT …) after GBIF and Wikidata (0021 D6).
  const dataSources = [...new Set(['GBIF', ...(s.wikidataId ? ['Wikidata'] : []), ...keys.flatMap((k) => (facts[k] ? [facts[k]!.source] : []))])]
  const voiceSource: Source[] = voice ? [{ origin: 'xeno-canto', author: voice.author, licence: voice.licence, licenceUrl: voice.licenceUrl, sourceUrl: voice.sourceUrl, note: voice.meta ? `XC${voice.meta.xcId} · ${t(`facts.voiceType.${voiceType(voice.meta.type)}`)} · ${clock(voice.meta.length)} · ${t('facts.voiceQuality', { q: voice.meta.quality })}` : null }] : []
  const sources = [
    s.intro ? t('sources.text', { licence: s.intro.licence }) : null,
    t('sources.data', { list: dataSources.join(', ') }),
    voice ? t('sources.voice') : null,
    p ? t('sources.occurrence') : null,
    kinds.length ? t('sources.ecology') : null,
    imageOrigins.length ? t('sources.images', { list: imageOrigins.join(', ') }) : null,
  ].filter(Boolean)
  // The ⓘ sheets (D3): the intro's page, the occurrence records, the genus rule, GloBI, and the credit of every thumb in a section.
  const introSource: Source[] = s.intro ? [{ origin: 'Wikipedia', licence: s.intro.licence, licenceUrl: licenceUrl(s.intro.licence), sourceUrl: s.intro.source }] : []
  const occurrenceSources: Source[] = [{ origin: 'GBIF', sourceUrl: `https://www.gbif.org/occurrence/search?taxon_key=${s.gbifKey}`, note: t('sourceInfo.occurrence') }]
  const credits = (cards: Card[]): Source[] => cards.flatMap((c) => (c.leadInfo ? [imageSource(c.leadInfo, name(c))] : []))
  const lookalikeSources: Source[] = [{ origin: 'GBIF', sourceUrl: gbifPage, note: t('sourceInfo.lookalikes') }, ...credits(s.lookalikes)]
  const ecologyCards = [...new Map(kinds.flatMap((k) => s.interactions[k]!.filter((c) => c.inSet)).map((c) => [c.id, c])).values()]
  const ecologySources: Source[] = [{ origin: 'GloBI', sourceUrl: `https://www.globalbioticinteractions.org/?sourceTaxon=${encodeURIComponent(s.sciName)}`, note: t('sourceInfo.ecology') }, ...credits(ecologyCards)]
  const allSources: Source[] = [
    ...introSource.map((x) => ({ ...x, label: t('sourceInfo.text') })),
    ...dataSources.map((o) => ({ label: t('sourceInfo.data'), ...dataSource(o, o === 'GBIF' ? gbifPage : o === 'Wikidata' && s.wikidataId ? `https://www.wikidata.org/wiki/${s.wikidataId}` : undefined) })),
    ...voiceSource.map((x) => ({ ...x, label: t('facts.voice'), note: null })),
    ...(p ? occurrenceSources.map((x) => ({ ...x, label: t('occurrence.title'), note: null })) : []),
    ...(kinds.length ? [{ ...ecologySources[0]!, label: t('ecology.title'), note: null }] : []),
    ...credits(images.map((a) => ({ id: a.id, gbifKey: s.gbifKey, sciName: s.sciName, names: s.names, tile: s.tile, lead: a.url, leadInfo: a }))).map((x, i) => ({ ...x, label: `${t('sourceInfo.image')} ${i + 1}` })),
  ]

  return (
    <main className="mx-auto min-h-full max-w-[520px] pb-28 [&~nav]:hidden" data-testid="species">
      <SpeciesSlider assets={images} tile={s.tile} />

      <div className="px-4">
        <h1 className={`mt-3 text-[28px] leading-tight font-bold tracking-tight ${title === s.sciName ? 'italic' : ''}`}>{title}</h1>
        {sub.length > 0 && <p className="mt-1 text-[17px] text-ink-soft">{sub.map((n, i) => <span key={i}>{i > 0 && ' · '}{n}</span>)}</p>}

        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[17px]" data-testid="state">
          <span className={`flex items-center gap-2 ${isSeen ? 'font-semibold text-moss-deep' : 'text-ink-faint'}`} data-testid="state-seen">
            {isSeen ? <SeenMark size={22} title={t('state.seen')} /> : <Grey><span className="h-2 w-2 rounded-full border border-current" /></Grey>}
            {isSeen ? seenLabel : t('state.notSeen')}
          </span>
          <span className={`flex items-center gap-2 ${isStudied ? 'font-semibold text-amber-deep' : 'text-ink-faint'}`} data-testid="state-studied">
            {isStudied ? <StudiedMark size={22} title={t('state.studied')} /> : <Grey><Icon name="book" size={13} /></Grey>}
            {isStudied ? t('state.studied') : t('state.notStudied')}
          </span>
        </p>

        {s.tile === 'fungus' && (
          <aside className="mt-4 rounded-2xl border border-amber/40 bg-amber-soft px-4 py-3 text-[15px] leading-snug" data-testid="fungus-notice">
            <strong>{t('fungus.title')}</strong> {t('fungus.body')}
            {s.intro && <p className="mt-1.5 text-[13px] text-ink-soft">{t('fungus.intro')}</p>}
          </aside>
        )}

        {s.intro ? (
          <>
            {s.intro.lang !== locale && <p className="mt-4 text-[13px] text-ink-faint" data-testid="intro-lang">{t('introOtherLang', { lang: t.has(`lang.${s.intro.lang}`) ? t(`lang.${s.intro.lang}`) : s.intro.lang.toUpperCase() })}</p>}
            <p className={`${s.intro.lang !== locale ? 'mt-1' : 'mt-4'} text-[17px] leading-[1.45]`} lang={s.intro.lang}>
              {s.intro.text} <SourceInfo title={t('sourceInfo.text')} sources={introSource} size={22} className="-mb-1 align-baseline" testId="intro-info" />
            </p>
          </>
        ) : (
          <p className="mt-4 text-[15px] text-ink-faint">{t('noIntro')}</p>
        )}

        {showFacts && <Section title={t('facts.title')} testId="facts">
          <div className="grid grid-cols-2 gap-3">
            {cells.map((c, i) => (
              <div key={c.k} className={`rounded-2xl bg-card px-4 py-3 shadow-[0_2px_12px_rgba(30,42,35,0.06)] ${i === cells.length - 1 && cells.length % 2 ? 'col-span-2' : ''}`} data-testid={`fact-${c.k}`}>
                <div className="flex items-center justify-between gap-2 text-[13px] text-ink-soft">{t(`facts.${c.k}`)} <SourceInfo title={t(`facts.${c.k}`)} sources={c.sources} size={22} className="-my-1 -mr-2" testId="fact-info" /></div>
                <div className="mt-1 text-[17px] leading-tight font-bold">{c.value}</div>
                {c.sub && <div className="mt-1 text-[13px] text-ink-soft">{c.sub}</div>}
              </div>
            ))}
          </div>
          {voice && <VoiceRow asset={voice} sources={voiceSource} />}
          {missing.length > 0 && <p className="mt-3 text-[13px] text-ink-faint">{t('facts.missing', { list: missing.join(' · ') })}</p>}
        </Section>}

        <Section title={t('occurrence.title')} aside={region?.name ?? null} testId="occurrence" info={p ? <SourceInfo title={t('occurrence.title')} sources={occurrenceSources} testId="occurrence-info" /> : null}>
          {!region ? (
            <p className="text-[15px] text-ink-faint">{t('occurrence.noRegion')}</p>
          ) : !p ? (
            <p className="text-[15px] text-ink-faint" data-testid="rare">{t('occurrence.rare')}</p>
          ) : (
            <div className="rounded-3xl bg-card px-4 pt-4 pb-3 shadow-[0_2px_12px_rgba(30,42,35,0.06)]" data-testid="year">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[17px] font-bold">{headline ?? t('empty')}</span>
                {p.now && <span className="shrink-0 text-[13px] font-semibold text-moss-deep">{t('occurrence.now')}</span>}
              </div>
              <div className="mt-3 flex h-14 items-end gap-1" aria-hidden>
                {p.monthShare.map((share, i) => {
                  const h = p.peak > 0 ? Math.max(4, Math.round((share / p.peak) * 100)) : 4
                  return <span key={i} className={`flex-1 rounded-md ${i + 1 === p.month ? 'bg-moss' : 'bg-moss-soft'}`} style={{ height: `${h}%` }} />
                })}
              </div>
              <div className="mt-1.5 flex gap-1 text-[12px] text-ink-faint" aria-hidden>
                {letters.map((l, i) => <span key={i} className={`flex-1 text-center ${i + 1 === p.month ? 'font-bold text-moss-deep' : ''}`}>{l}</span>)}
              </div>
              <p className="mt-2 text-[12px] text-ink-faint">{t('occurrence.reports', { n: p.obs.toLocaleString(locale) })}</p>
            </div>
          )}
          {/* No map for an out-of-set taxon: the set is the ETL's call, and a dense GBIF map under "hier selten gemeldet" would argue with it. */}
          {region && p && centre.data && <SpeciesMap centre={centre.data} taxonKey={s.gbifKey} region={region.name} />}
        </Section>

        {s.lookalikes.length > 0 && (
          <Section title={t('lookalikes.title')} testId="lookalikes" info={<SourceInfo title={t('lookalikes.title')} sources={lookalikeSources} testId="lookalikes-info" />}>
            <Row>{s.lookalikes.map((c: Card) => <LookalikeCard key={c.id} card={c} state={stateOf(c.id)} />)}</Row>
          </Section>
        )}

        {kinds.length > 0 && (
          <Section title={t('ecology.title')} testId="ecology" info={<SourceInfo title={t('ecology.title')} sources={ecologySources} testId="ecology-info" />}>
            {kinds.map((k) => {
              const all = s.interactions[k]!
              return (
                <div key={k} className="mt-4 first:mt-0" data-testid={`kind-${k}`}>
                  {/* D4: "frisst ———— (6)", the leader fills the line, the total sits on the right. */}
                  <h3 className="flex items-baseline gap-2 text-[15px] font-semibold text-ink-soft">
                    <span>{t(`ecology.kind.${k}`)}</span>
                    <span aria-hidden className="mb-1 flex-1 border-b border-dotted border-ink-faint/60" />
                    <span className="tabular-nums" data-testid="kind-count">({all.length})</span>
                  </h3>
                  <div className="mt-2">
                    <ChipGrid key={all.length} items={all.map((c) => <EcologyChip key={c.id} card={c} state={stateOf(c.id)} inSet={c.inSet} />)} more={(n) => t('ecology.showMore', { n })} less={t('ecology.showLess')} testId={`chips-${k}`} />
                  </div>
                </div>
              )
            })}
          </Section>
        )}

        <p className="mt-8 text-[13px] leading-snug text-ink-faint" data-testid="sources">
          <span className="font-semibold">{t('sources.label')}</span> · {sources.join(' · ')} <SourceInfo title={t('sources.label')} sources={allSources} size={22} className="-mb-1 align-baseline" testId="sources-info" />
        </p>
      </div>

      {/* The sticky bar (spec §🎨 3): "Entdeckt" opens the save screen with the species preset (handoff 0008 Track A); "Studiert" toggles. Icons from the set, no emoji (0014 D2). The tab bar (a later sibling of main) is hidden on this page, as in the mock. */}
      <div className="fixed inset-x-0 z-10" style={{ bottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto flex max-w-[520px] gap-3 bg-gradient-to-t from-paper via-paper/95 to-paper/0 px-4 pt-6 pb-2">
          <button type="button" disabled={!progress.data} data-testid="log"
            onClick={() => router.push(`/log?taxon=${s.gbifKey}&from=species`)}
            className="flex h-13 flex-[1.3] items-center justify-center gap-2 rounded-full bg-moss text-[17px] font-bold text-white shadow-md disabled:opacity-60">
            <Icon name="check" size={20} /> {isSeen ? tl('logAgain') : tl('logFirst')}
          </button>
          <button type="button" disabled={busy || !progress.data} aria-pressed={isStudied} data-testid="study"
            onClick={() => (isStudied ? unmark.mutate({ taxonId: s.id }) : void mark({ id: s.id, gbifKey: s.gbifKey, sciName: s.sciName, names: s.names, tile: s.tile, lead: images[0] ? { url: images[0].url, author: images[0].author, licence: images[0].licence, licenceUrl: images[0].licenceUrl, sourceUrl: images[0].sourceUrl, origin: images[0].origin } : null }))}
            className={`flex h-13 flex-1 items-center justify-center gap-2 rounded-full text-[17px] font-bold shadow-md transition-colors disabled:opacity-60 ${isStudied ? 'bg-amber-soft text-amber-deep' : 'bg-amber text-white'}`}>
            <Icon name="book" size={20} /> {isStudied ? t('study.marked') : t('study.mark')}
          </button>
        </div>
      </div>
      <Suspense><AgainToast name={title} /></Suspense>
    </main>
  )
}

/** The quiet toast after a repeat sighting logged from this page (`?again=<id>`, doubt 12); the param goes with the toast. */
function AgainToast({ name }: { name: string }) {
  const tf = useTranslations('fill')
  const params = useSearchParams()
  const again = params.get('again')
  const kept = params.get('kept') === '1'
  const done = useCallback(() => window.history.replaceState(null, '', window.location.pathname), [])
  if (!again) return null
  return <Toast key={again} text={tf(kept ? 'kept' : 'again', { name })} onDone={done} />
}

/** "0:14" from seconds. */
const clock = (n: number) => `${Math.floor(n / 60)}:${String(Math.round(n % 60)).padStart(2, '0')}`
/** xeno-canto's free-text type ("song", "call, flight call", "male, song") → the three words the row has. */
const voiceType = (type: string) => (/song/i.test(type) ? 'song' : /call/i.test(type) ? 'call' : 'other')
type VoiceAsset = { id: string; url: string; author: string | null; licence: string | null; licenceUrl: string | null; sourceUrl: string | null; meta: { xcId: number; type: string; length: number; quality: string } | null }

/**
 * The voice row (0021 D6, D8): "♪ Gesang · 0:14 · CC BY-NC-SA 4.0 · Recordist" with play/pause and its ⓘ. A native
 * <audio> streamed from /api/photo/<id>.mp3, loaded on the first tap only; the clip is not in the offline pack, so
 * without network the row says so instead of a button that fails.
 */
function VoiceRow({ asset, sources }: { asset: VoiceAsset; sources: Source[] }) {
  const t = useTranslations('species')
  const off = useOffline()
  const ref = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const toggle = () => { const a = ref.current; if (!a) return; if (a.paused) void a.play().catch(() => setPlaying(false)); else a.pause() }
  const kind = t(`facts.voiceType.${voiceType(asset.meta?.type ?? '')}`)
  const line = [kind, asset.meta ? clock(asset.meta.length) : null, asset.licence, asset.author].filter(Boolean).join(' · ')
  return (
    <div className="mt-3 flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-[0_2px_12px_rgba(30,42,35,0.06)]" data-testid="fact-voice" data-playing={playing || undefined}>
      <audio ref={ref} src={asset.url} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} data-testid="voice-audio" />
      {off ? (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tile text-ink-faint" aria-hidden="true">♪</span>
      ) : (
        <button type="button" onClick={toggle} aria-label={playing ? t('facts.pause') : t('facts.play')} aria-pressed={playing} data-testid="voice-play"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-moss-deep text-white active:scale-95">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">{playing ? <><rect x="3" y="2" width="4.5" height="14" rx="1" /><rect x="10.5" y="2" width="4.5" height="14" rx="1" /></> : <path d="M5 2.5v13l10-6.5z" />}</svg>
        </button>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 text-[13px] text-ink-soft">{t('facts.voice')} <SourceInfo title={t('facts.voice')} sources={sources} size={22} className="-my-1 -mr-2" testId="fact-info" /></div>
        <div className="mt-0.5 text-[15px] leading-snug font-semibold">{off ? t('facts.voiceWaits') : `♪ ${line}`}</div>
      </div>
    </div>
  )
}

const Grey = ({ children }: { children: ReactNode }) => <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-tile text-ink-faint">{children}</span>

function Section({ title, aside, info, testId, children }: { title: string; aside?: string | null; info?: ReactNode; testId: string; children: ReactNode }) {
  return (
    <section className="mt-8" data-testid={testId}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-[22px] leading-tight font-bold tracking-tight">{title}{info}</h2>
        {aside && <span className="shrink truncate text-[13px] text-ink-faint">{aside}</span>}
      </div>
      {children}
    </section>
  )
}

/** A horizontally scrolling row that bleeds to the screen edges. */
const Row = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}>{children}</div>
)

function Empty({ text, link }: { text: string; link?: string }) {
  return (
    <main className="mx-auto min-h-full max-w-[520px] px-4 pt-6 pb-24">
      <p className="text-[15px] text-ink-soft">{text}</p>
      {link && <Link href="/" className="mt-3 inline-block text-[15px] font-semibold text-moss-deep">{link}</Link>}
    </main>
  )
}
