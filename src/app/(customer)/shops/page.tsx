import type { Metadata } from 'next'
import { getLangServer } from '@/lib/lang'
import { t } from '@/lib/translations'
import { BackButton } from '@/components/ui/BackButton'
import { ShopsContent } from './ShopsContent'

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangServer()
  const tr = t(lang)
  return { title: `${tr.page_title_shops} — pundo` }
}

export default async function ShopsIndexPage() {
  const lang = await getLangServer()
  const tr = t(lang)

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <BackButton />
      <h1 className="text-2xl font-bold">{tr.page_title_shops}</h1>
      <ShopsContent lang={lang} />
    </main>
  )
}
