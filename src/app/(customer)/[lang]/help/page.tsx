import type { Metadata } from 'next'
import { t } from '@/lib/translations'
import { helpContent } from '@/lib/help-content'
import { FaqAccordion } from '@/components/ui/FaqAccordion'
import { BackButton } from '@/components/ui/BackButton'
import type { Lang } from '@/lib/lang'

import { tSeo } from '@/lib/translations'
import { buildStaticPageMetadata } from '@/lib/seo/static-page-metadata'
import { getBrandFromHeaders } from '@/config/brands'
import { progressionHelpDetails, progressionHelpText } from '@/lib/progression-help-text'

interface Props {
  params: Promise<{ lang: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params as { lang: Lang }
  const brand = await getBrandFromHeaders()
  const s = tSeo(lang)
  return buildStaticPageMetadata({
    lang,
    path: '/help',
    title: s.seo_help_title,
    description: s.seo_help_desc,
    siteName: brand.name,
  })
}

export default async function HelpPage({ params }: Props) {
  const { lang } = await params as { lang: Lang }
  const tr = t(lang)
  const categories = helpContent[lang] ?? helpContent.en
  const progression = progressionHelpText[lang]
  const brand = await getBrandFromHeaders()
  const detail = progressionHelpDetails[lang][brand.slug === 'naidivse' ? 'naidivse' : 'pundo']

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 sm:py-12">
      <BackButton />
      <h1 className="text-2xl font-bold mb-4 sm:mb-8">{tr.page_title_help}</h1>
      <section id="credits-and-levels" className="mb-8 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-lg font-bold text-text">{detail.names.rank} · {detail.names.currency}</h2>
        <p className="mt-2 text-sm text-text">{detail.what ?? detail.names.rank}</p>
        <p className="mt-2 text-sm text-text-muted">{progression.helpDetails}</p>
      </section>
      <FaqAccordion categories={categories} />
    </main>
  )
}
