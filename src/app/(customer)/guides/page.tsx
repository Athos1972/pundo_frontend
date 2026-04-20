import type { Metadata } from 'next'
import { getLangServer } from '@/lib/lang'
import { t } from '@/lib/translations'
import { getGuides } from '@/lib/guides'
import { GuidesGrid } from '@/components/guides/GuidesGrid'

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangServer()
  const tr = t(lang)
  return { title: `${tr.page_title_guides} — pundo` }
}

export default async function GuidesIndexPage() {
  const lang = await getLangServer()
  const tr = t(lang)
  const guides = getGuides(lang)

  const categoryLabels: Record<string, string> = {
    behörden: tr.category_behörden,
    mobilität: tr.category_mobilität,
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{tr.guides_index_title}</h1>
        <p className="mt-1 text-gray-500 text-sm">{tr.guides_index_subtitle}</p>
      </div>
      <GuidesGrid
        guides={guides}
        filterAll={tr.guides_filter_all}
        categoryLabels={categoryLabels}
        readtimeFn={tr.guide_readtime}
        lang={lang}
      />
    </main>
  )
}
