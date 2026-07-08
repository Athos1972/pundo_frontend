import type { Metadata } from 'next'
import type { Lang } from '@/lib/lang'
import { t } from '@/lib/translations'
import { getSiteUrl } from '@/lib/seo'
import { buildHreflang } from '@/lib/routing'
import { buildCompleteOpenGraph } from '@/lib/seo/og-defaults'
import { BackButton } from '@/components/ui/BackButton'
import { ContactForm } from '@/components/contact/ContactForm'

interface Props {
  params: Promise<{ lang: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params as { lang: Lang }
  const tr = t(lang)
  const siteUrl = getSiteUrl()
  const pageUrl = `${siteUrl}/${lang}/contact`
  const title = `${tr.page_title_contact} — pundo`
  const description = tr.meta_desc_contact

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
      languages: buildHreflang(siteUrl, '/contact'),
    },
    openGraph,
    twitter,
  }
}

export default async function ContactPage({ params }: Props) {
  const { lang } = await params as { lang: Lang }
  const tr = t(lang)

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 sm:py-12">
      <BackButton />
      <h1 className="text-2xl font-bold mb-6">{tr.page_title_contact}</h1>
      <ContactForm lang={lang} />
    </main>
  )
}
