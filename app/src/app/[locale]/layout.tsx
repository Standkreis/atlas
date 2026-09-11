import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { Shell } from '@/components/Shell'
import { AnalyticsBoundary } from '@/components/AnalyticsBoundary'
import { ServiceWorker } from '@/components/ServiceWorker'
import { IdentityBoot } from '@/components/IdentityBoot'
import { QueueFlusher } from '@/components/QueueFlusher'
import { RegionReplay } from '@/components/RegionSheet'
import { TRPCReactProvider } from '@/trpc/client'
import Script from 'next/script'
import { ThemeBoot, themeScript } from '@/components/Appearance'
import { atlasMetadata } from '@/brand/metadata'
import { titillium } from '@/styles/fonts'
import '../globals.css'

// No `dynamicParams = false` here: Next applies it to every route below the segment (its own TODO in
// build/static-paths/app.js), so a server build answered every species and sighting page with 404 (found in
// handoff 0009 Track A on the production build). Unknown locales still end in notFound() below.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'app' })
  return atlasMetadata(locale, { name: t('name'), description: t('description'), shareAlt: t('shareAlt') })
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f2ea' },
    { media: '(prefers-color-scheme: dark)', color: '#121b16' },
  ],
}

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)
  return (
    <html lang={locale} className={titillium.variable} suppressHydrationWarning>
      <head>
        {/* Darstellung: applies a stored light/dark choice before paint; the default follows the system. */}
        <Script id="dex-theme" strategy="beforeInteractive">{themeScript}</Script>
      </head>
      <body className="font-sans">
        <NextIntlClientProvider>
          <TRPCReactProvider>
            {children}
            <Shell />
            <IdentityBoot />
            <QueueFlusher />
            <RegionReplay />
            <ThemeBoot />
            <ServiceWorker />
            <AnalyticsBoundary />
          </TRPCReactProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
