import type { Metadata } from 'next'

type BrandCopy = { name: string; description: string; shareAlt: string }

/** Also used by `/`: link unfurlers don't run its client-side locale redirect. */
export function atlasMetadata(locale: string, copy: BrandCopy): Metadata {
  const image = { url: `/brand/atlas-share-${locale}.png`, width: 1200, height: 630, alt: copy.shareAlt }
  return {
    metadataBase: new URL('https://atlas.standkreis.de'),
    title: copy.name,
    applicationName: copy.name,
    description: copy.description,
    // Keep the initial analytics referrer useful at origin granularity without disclosing an Atlas path.
    referrer: 'origin',
    publisher: 'Standkreis',
    manifest: '/manifest.webmanifest',
    icons: {
      icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
      apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    },
    appleWebApp: { capable: true, title: 'Atlas', statusBarStyle: 'default' },
    openGraph: {
      type: 'website',
      title: copy.name,
      description: copy.description,
      siteName: copy.name,
      locale: locale === 'de' ? 'de_DE' : 'en_GB',
      images: [image],
    },
    twitter: { card: 'summary_large_image', title: copy.name, description: copy.description, images: [image] },
  }
}
