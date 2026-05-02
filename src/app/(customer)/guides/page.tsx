import type { Metadata } from 'next'
import { getLangServer } from '@/lib/lang'
import { t } from '@/lib/translations'
import { getGuides } from '@/lib/guides'
import { GuidesGrid } from '@/components/guides/GuidesGrid'
import { BackButton } from '@/components/ui/BackButton'

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangServer()
  const tr = t(lang)
  return {
    title: `${tr.page_title_guides} — pundo`,
    description: tr.guides_index_subtitle,
    openGraph: {
      title: tr.page_title_guides,
      description: tr.guides_index_subtitle,
    },
  }
}

export default async function GuidesIndexPage() {
  const lang = await getLangServer()
  const tr = t(lang)
  const guides = getGuides(lang)

  const categoryLabels: Record<string, string> = {
    behörden: tr.category_behörden,
    mobilität: tr.category_mobilität,
    haustiere: tr.category_haustiere,
    gesundheit: tr.category_gesundheit,
    wohnen: tr.category_wohnen,
    finanzen: tr.category_finanzen,
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <BackButton />
      <div>
        <h1 className="text-2xl font-bold">{tr.guides_index_title}</h1>
        <p className="mt-1 text-gray-500 text-sm">{tr.guides_index_subtitle}</p>
      </div>
      <GuidesGrid
        guides={guides}
        filterAll={tr.guides_filter_all}
        categoryLabels={categoryLabels}
        readtimeLabels={Object.fromEntries(
          [...new Set(guides.map((g) => g.readtime))].map((rt) => [rt, tr.guide_readtime(Number(rt))])
        )}
        lang={lang}
      />
    </main>
  )
}
