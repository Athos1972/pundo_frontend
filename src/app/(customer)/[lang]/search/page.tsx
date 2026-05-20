import { Suspense } from 'react'
import type { Metadata } from 'next'
import SearchContent from './SearchContent'
import type { Lang } from '@/lib/lang'
import { getSiteUrl } from '@/lib/seo'
import { buildHreflang } from '@/lib/routing'
import { t } from '@/lib/translations'

interface Props {
  params: Promise<{ lang: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams
  const hasQuery = typeof sp['q'] === 'string' && sp['q'].length > 0
  const siteUrl = getSiteUrl()

  if (hasQuery) {
    // Parametrised search URLs must not be indexed (index bloat)
    return {
      robots: { index: false, follow: true },
    }
  }

  const { lang } = await params as { lang: Lang }
  return {
    title: 'Search',
    description: 'Search for products and shops near you in Cyprus.',
    alternates: {
      canonical: `${siteUrl}/${lang}/search`,
      languages: buildHreflang(siteUrl, '/search'),
    },
    robots: { index: true, follow: true },
  }
}

export default async function SearchPage({ params }: Props) {
  const { lang } = await params as { lang: Lang }
  const tr = t(lang)
  return (
    <Suspense fallback={
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-24 bg-surface-alt rounded-xl animate-pulse" />)}
      </div>
    }>
      {/* Visually hidden H1 for SEO — SearchBar has the visible search UI */}
      <h1 className="sr-only">{tr.search}</h1>
      <SearchContent lang={lang} />
    </Suspense>
  )
}
