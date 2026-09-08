import { setRequestLocale } from 'next-intl/server'
import { SourcesPage } from '@/components/SourcesPage'

export default async function Sources({ params }: PageProps<'/[locale]/sources'>) {
  const { locale } = await params
  setRequestLocale(locale)
  return <SourcesPage />
}
