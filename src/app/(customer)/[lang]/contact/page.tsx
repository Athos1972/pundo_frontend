import type { Metadata } from 'next'
import type { Lang } from '@/lib/lang'
import { t } from '@/lib/translations'

import { BackButton } from '@/components/ui/BackButton'
import { ContactForm } from '@/components/contact/ContactForm'
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
    path: '/contact',
    title: s.seo_contact_title,
    description: s.seo_contact_desc,
    siteName: brand.name,
  })
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
