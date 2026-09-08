'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'

const GROUPS = [
  { key: 'atlas', sources: [
    ['bkg', 'BKG / BBSR · GE250', 'https://gdz.bkg.bund.de/index.php/default/gebietseinheiten-1-250-000-ge250.html'],
    ['gbif', 'GBIF', 'https://www.gbif.org'],
  ] },
  { key: 'identity', sources: [
    ['wikidata', 'Wikidata', 'https://www.wikidata.org'],
    ['wikipedia', 'Wikipedia', 'https://www.wikipedia.org'],
    ['iucn', 'IUCN Red List', 'https://www.iucnredlist.org'],
  ] },
  { key: 'profile', sources: [
    ['avonet', 'AVONET', 'https://doi.org/10.6084/m9.figshare.16586228'],
    ['elton', 'EltonTraits', 'https://doi.org/10.6084/m9.figshare.3559887'],
    ['pantheria', 'PanTHERIA', 'https://doi.org/10.1890/08-1494.1'],
    ['amphibio', 'AmphiBIO', 'https://doi.org/10.6084/m9.figshare.4644424'],
    ['gift', 'GIFT', 'https://gift.uni-goettingen.de'],
    ['anage', 'AnAge', 'https://genomics.senescence.info/species/'],
  ] },
  { key: 'ecology', sources: [
    ['globi', 'GloBI', 'https://www.globalbioticinteractions.org'],
  ] },
  { key: 'media', sources: [
    ['inaturalist', 'iNaturalist', 'https://www.inaturalist.org'],
    ['commons', 'Wikimedia Commons', 'https://commons.wikimedia.org'],
    ['xenoCanto', 'xeno-canto', 'https://xeno-canto.org'],
  ] },
  { key: 'identification', sources: [
    ['anthropic', 'Anthropic', 'https://www.anthropic.com/legal/commercial-terms'],
  ] },
] as const

/** One calm, durable explanation of the atlas inputs. Individual media keep their author and licence beside the asset. */
export function SourcesPage() {
  const t = useTranslations('sourcesPage')
  const router = useRouter()
  const back = () => {
    try {
      if (document.referrer && new URL(document.referrer).origin === window.location.origin) return router.back()
    } catch { /* fall through to the Atlas */ }
    router.replace('/')
  }

  return (
    <main className="mx-auto min-h-full max-w-[520px] px-4 pt-3 pb-24" data-testid="sources-page">
      <div className="relative flex h-10 items-center justify-center">
        <button type="button" onClick={back} className="absolute left-0 flex h-9 items-center gap-1 rounded-full bg-tile px-3 text-[15px] text-ink-soft">
          <span aria-hidden>‹</span> {t('back')}
        </button>
        <h1 className="text-[28px] leading-none font-bold tracking-tight">{t('title')}</h1>
      </div>

      <p className="mt-5 text-[17px] leading-[1.45] text-ink-soft">{t('intro')}</p>
      <aside className="mt-4 rounded-2xl bg-moss-soft p-4 text-[15px] leading-snug text-moss-deep">
        <strong>{t('limitsTitle')}</strong> {t('limitsBody')}
      </aside>

      {GROUPS.map((group) => (
        <section key={group.key} className="mt-8">
          <h2 className="text-[22px] leading-tight font-bold tracking-tight">{t(`groups.${group.key}.title`)}</h2>
          <div className="mt-3 divide-y divide-paper overflow-hidden rounded-3xl bg-card shadow-[0_2px_12px_rgba(30,42,35,0.06)]">
            {group.sources.map(([key, name, url]) => (
              <a key={key} href={url} target="_blank" rel="noreferrer" className="block p-4 active:bg-tile/50">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[17px] font-bold">{name}</h3>
                  <span className="shrink-0 text-[13px] font-semibold text-moss-deep">{t('open')} ↗</span>
                </div>
                <p className="mt-1 text-[15px] leading-snug text-ink-soft">{t(`sources.${key}`)}</p>
              </a>
            ))}
          </div>
        </section>
      ))}

      <p className="mt-8 text-[13px] leading-snug text-ink-faint">{t('imageNote')}</p>
    </main>
  )
}
