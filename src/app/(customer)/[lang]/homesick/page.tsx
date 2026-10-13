import { HomesickPageImpl } from '../../_homesick-shared'
import type { Metadata } from 'next'

import type { Lang } from '@/lib/lang'
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
    path: '/homesick',
    title: s.seo_homesick_title,
    description: s.seo_homesick_desc,
    siteName: brand.name,
  })
}

export default function Page() {
  return <HomesickPageImpl />
}
