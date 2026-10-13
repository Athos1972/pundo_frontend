import type { Metadata } from 'next'
import Link from 'next/link'
import type { Lang } from '@/lib/lang'
import { t } from '@/lib/translations'

import { localePath } from '@/lib/routing'

import { BackButton } from '@/components/ui/BackButton'
import { ShopsContent } from './ShopsContent'
import { tSeo } from '@/lib/translations'
import { buildStaticPageMetadata } from '@/lib/seo/static-page-metadata'
import { getBrandFromHeaders } from '@/config/brands'

interface Props {
  params: Promise<{ lang: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params as { lang: Lang }
  const brand = await getBrandFromHeaders()
  const s = tSeo(lang)
  return buildStaticPageMetadata({
    lang,
    path: '/shops',
    title: s.seo_shops_title,
    description: s.seo_shops_desc,
    siteName: brand.name,
  })
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
