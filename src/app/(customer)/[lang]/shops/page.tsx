import type { Metadata } from 'next'
import Link from 'next/link'
import type { Lang } from '@/lib/lang'
import { t } from '@/lib/translations'
import { getSiteUrl } from '@/lib/seo'
import { buildHreflang, localePath } from '@/lib/routing'
import { buildCompleteOpenGraph } from '@/lib/seo/og-defaults'
import { BackButton } from '@/components/ui/BackButton'
import { ShopsContent } from './ShopsContent'

interface Props {
  params: Promise<{ lang: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params as { lang: Lang }
  const tr = t(lang)
  const siteUrl = getSiteUrl()
  const pageUrl = `${siteUrl}/${lang}/shops`
  const title = `${tr.page_title_shops} — pundo`
  const description = tr.meta_desc_shops

  const { openGraph, twitter } = buildCompleteOpenGraph({
    title,
    description,
    url: pageUrl,
    type: 'website',
    locale: lang,
    siteName: 'pundo',
    image: {
      url: `${siteUrl}/og/shop-fallback-default.jpg`,
      width: 1200,
      height: 630,
      alt: 'pundo',
    },
  })

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
      languages: buildHreflang(siteUrl, '/shops'),
    },
    openGraph,
    twitter,
  }
}

export default async function ShopsIndexPage({ params }: Props) {
  const { lang } = await params as { lang: Lang }
  const tr = t(lang)

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <BackButton />
      <h1 className="text-2xl font-bold">{tr.page_title_shops}</h1>
      {/* B5900-007/T7 — entry link into the crawlable city-index hub */}
      <Link
        href={localePath(lang, '/shops/cities')}
        className="inline-block text-sm text-accent hover:underline"
      >
        {tr.shops_browse_by_city_link} →
      </Link>
      <ShopsContent lang={lang} />
    </main>
  )
}
