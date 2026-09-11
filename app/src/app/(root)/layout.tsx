import type { ReactNode } from 'react'
import { atlasMetadata } from '@/brand/metadata'
import { AnalyticsBoundary } from '@/components/AnalyticsBoundary'
import de from '@/i18n/de.json'
import { titillium } from '@/styles/fonts'
import '../globals.css'

export const metadata = atlasMetadata('de', de.app)

// Root layout for `/` only: it picks a locale on the client and leaves. Everything else lives under [locale].
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className={titillium.variable}>
      <body className="font-sans">
        {children}
        <AnalyticsBoundary />
      </body>
    </html>
  )
}
