import type { Metadata } from 'next'
import type { Lang } from '@/lib/lang'
import { t } from '@/lib/translations'
import { getLegalContentForBrand } from '@/lib/legal-content'
import { getBrandFromHeaders } from '@/config/brands'
import { buildHreflang } from '@/lib/routing'
import { BackButton } from '@/components/ui/BackButton'

interface Props {
  params: Promise<{ lang: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ lang }, brand] = await Promise.all([params as Promise<{ lang: Lang }>, getBrandFromHeaders()])
  const tr = t(lang)
  const siteUrl = brand.meta.siteUrl
  return {
    title: `${tr.page_title_privacy} — ${brand.name}`,
    description: tr.meta_desc_privacy,
    alternates: {
      canonical: `${siteUrl}/${lang}/legal/privacy`,
      languages: buildHreflang(siteUrl, '/legal/privacy'),
    },
  }
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
          <section key={i}>
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
