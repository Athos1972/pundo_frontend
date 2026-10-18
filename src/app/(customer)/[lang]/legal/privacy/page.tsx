import type { Metadata } from 'next'
import type { Lang } from '@/lib/lang'
import { t } from '@/lib/translations'
import { getLegalContentForBrand } from '@/lib/legal-content'
import { getBrandFromHeaders } from '@/config/brands'

import { BackButton } from '@/components/ui/BackButton'
import { tSeo } from '@/lib/translations'
import { buildStaticPageMetadata } from '@/lib/seo/static-page-metadata'

interface Props {
  params: Promise<{ lang: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params as { lang: Lang }
  const brand = await getBrandFromHeaders()
  const s = tSeo(lang)
  return buildStaticPageMetadata({
    lang,
    path: '/legal/privacy',
    title: s.seo_privacy_title,
    description: s.seo_privacy_desc,
    siteName: brand.name,
    siteUrl: brand.meta.siteUrl,
  })
}

export default async function PrivacyPage({ params }: Props) {
  const [{ lang }, brand] = await Promise.all([params as Promise<{ lang: Lang }>, getBrandFromHeaders()])
  const tr = t(lang)
  const content = getLegalContentForBrand('privacy', lang, brand)

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 sm:py-12">
      <BackButton />
      <h1 className="text-2xl font-bold mb-4 sm:mb-8">{tr.page_title_privacy}</h1>
      <div className="space-y-6">
        {content.sections.map((section, i) => (
          <section key={i} id={section.id}>
            {section.heading && (
              <h2 className="text-lg font-semibold mb-2">{section.heading}</h2>
            )}
            <p className="text-gray-700 whitespace-pre-line">{section.body}</p>
          </section>
        ))}
      </div>
    </main>
  )
}
