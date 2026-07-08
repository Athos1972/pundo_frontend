import type { Metadata } from 'next'
import { t } from '@/lib/translations'
import { helpContent } from '@/lib/help-content'
import { FaqAccordion } from '@/components/ui/FaqAccordion'
import { BackButton } from '@/components/ui/BackButton'
import type { Lang } from '@/lib/lang'
import { getSiteUrl } from '@/lib/seo'
import { buildHreflang } from '@/lib/routing'
import { buildCompleteOpenGraph } from '@/lib/seo/og-defaults'

interface Props {
  params: Promise<{ lang: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params as { lang: Lang }
  const tr = t(lang)
  const siteUrl = getSiteUrl()
  const pageUrl = `${siteUrl}/${lang}/help`
  const title = `${tr.page_title_help} — pundo`
  const description = tr.meta_desc_help

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
      languages: buildHreflang(siteUrl, '/help'),
    },
    openGraph,
    twitter,
  }
}

export default async function HelpPage({ params }: Props) {
  const { lang } = await params as { lang: Lang }
  const tr = t(lang)
  const categories = helpContent[lang] ?? helpContent.en

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 sm:py-12">
      <BackButton />
      <h1 className="text-2xl font-bold mb-4 sm:mb-8">{tr.page_title_help}</h1>
      <FaqAccordion categories={categories} />
    </main>
  )
}
