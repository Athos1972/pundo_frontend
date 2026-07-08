import type { Metadata } from 'next'
import type { Lang } from '@/lib/lang'
import { t } from '@/lib/translations'
import { legalContent } from '@/lib/legal-content'
import { getSiteUrl } from '@/lib/seo'
import { buildHreflang } from '@/lib/routing'
import { BackButton } from '@/components/ui/BackButton'

interface Props {
  params: Promise<{ lang: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params as { lang: Lang }
  const tr = t(lang)
  const siteUrl = getSiteUrl()
  return {
    title: `${tr.page_title_about} — pundo`,
    description: tr.meta_desc_about,
    alternates: {
      canonical: `${siteUrl}/${lang}/about`,
      languages: buildHreflang(siteUrl, '/about'),
    },
  }
}

export default async function AboutPage({ params }: Props) {
  const { lang } = await params as { lang: Lang }
  const tr = t(lang)
  const content = legalContent.about[lang]

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 sm:py-12">
      <BackButton />
      <h1 className="text-2xl font-bold mb-4 sm:mb-8">{tr.page_title_about}</h1>
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
