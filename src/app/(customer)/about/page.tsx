import type { Metadata } from 'next'
import { getLangServer } from '@/lib/lang'
import { t } from '@/lib/translations'
import { legalContent } from '@/lib/legal-content'

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangServer()
  const tr = t(lang)
  return { title: `${tr.page_title_about} — pundo` }
}

export default async function AboutPage() {
  const lang = await getLangServer()
  const tr = t(lang)
  const content = legalContent.about[lang]

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">{tr.page_title_about}</h1>
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
