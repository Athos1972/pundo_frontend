import type { Metadata } from 'next'
import { getLangServer } from '@/lib/lang'
import { t } from '@/lib/translations'
import { BackButton } from '@/components/ui/BackButton'
import { ContactForm } from '@/components/contact/ContactForm'

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangServer()
  const tr = t(lang)
  return { title: `${tr.page_title_contact} — pundo` }
}

export default async function ContactPage() {
  const lang = await getLangServer()
  const tr = t(lang)

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 sm:py-12">
      <BackButton />
      <h1 className="text-2xl font-bold mb-6">{tr.page_title_contact}</h1>
      <ContactForm lang={lang} />
    </main>
  )
}
