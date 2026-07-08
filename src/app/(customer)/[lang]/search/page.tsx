import { Suspense } from 'react'
import type { Metadata } from 'next'
import SearchContent from './SearchContent'

export const dynamic = 'force-dynamic'
import type { Lang } from '@/lib/lang'
import { getSiteUrl } from '@/lib/seo'
import { buildHreflang } from '@/lib/routing'
import { t } from '@/lib/translations'
import { buildCompleteOpenGraph } from '@/lib/seo/og-defaults'
import { getBrandFromHeaders } from '@/config/brands'

interface Props {
  params: Promise<{ lang: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams
  const hasQuery = typeof sp['q'] === 'string' && sp['q'].length > 0
  const hasCategoryId = typeof sp['category_id'] === 'string' && sp['category_id'].length > 0
  const siteUrl = getSiteUrl()

  if (hasQuery || hasCategoryId) {
    // Parametrised search / category URLs must not be indexed (index bloat)
    return {
      robots: { index: false, follow: true },
    }
  }

  const { lang } = await params as { lang: Lang }
  const tr = t(lang)
  const brand = await getBrandFromHeaders()
  const ogImageUrl = brand.assets.ogImage.startsWith('http')
    ? brand.assets.ogImage
    : `${brand.meta.siteUrl}${brand.assets.ogImage}`

  const og = buildCompleteOpenGraph({
    title: tr.search_page_title,
    description: tr.search_page_description,
    url: `${siteUrl}/${lang}/search`,
    type: 'website',
    locale: lang,
    siteName: brand.name,
    image: {
      url: ogImageUrl,
      width: 1200,
      height: 630,
      alt: brand.name,
    },
  })

  return {
    title: { absolute: tr.search_page_title },
    description: tr.search_page_description,
    alternates: {
      canonical: `${siteUrl}/${lang}/search`,
      languages: buildHreflang(siteUrl, '/search'),
    },
    openGraph: og.openGraph,
    twitter: og.twitter,
    robots: { index: true, follow: true },
  }
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { lang } = await params as { lang: Lang }
  const sp = await searchParams
  // Pass category_id from server to avoid hydration race in SearchContent
  const initialCategoryId = typeof sp['category_id'] === 'string' && sp['category_id'].length > 0
    ? sp['category_id']
    : null
  const tr = t(lang)
  return (
    <Suspense fallback={
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-24 bg-surface-alt rounded-xl animate-pulse" />)}
      </div>
    }>
      {/* Visually hidden H1 for SEO — SearchBar has the visible search UI */}
      <h1 className="sr-only">{tr.search}</h1>
      <SearchContent lang={lang} initialCategoryId={initialCategoryId} />
    </Suspense>
  )
}
