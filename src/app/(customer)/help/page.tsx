import type { Metadata } from 'next'
import { getLangServer } from '@/lib/lang'
import { t } from '@/lib/translations'
import { helpContent } from '@/lib/help-content'
import { FaqAccordion } from '@/components/ui/FaqAccordion'
import { BackButton } from '@/components/ui/BackButton'
import type { Lang } from '@/lib/lang'

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangServer()
  const tr = t(lang)
  return { title: `${tr.page_title_help} — pundo` }
}

export default async function HelpPage() {
  const lang = await getLangServer()
  const tr = t(lang)
  const categories = helpContent[lang as Lang] ?? helpContent.en

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 sm:py-12">
      <BackButton />
      <h1 className="text-2xl font-bold mb-4 sm:mb-8">{tr.page_title_help}</h1>
      <FaqAccordion categories={categories} />
    </main>
  )
}
