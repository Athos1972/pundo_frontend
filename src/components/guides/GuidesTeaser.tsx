import Link from 'next/link'
import { getGuides } from '@/lib/guides'
import { t } from '@/lib/translations'
import { GuideCard } from './GuideCard'

type Props = { lang: string }

export async function GuidesTeaser({ lang }: Props) {
  const tr = t(lang)
  const guides = getGuides(lang).slice(0, 4)
  const total = getGuides(lang).length

  if (guides.length === 0) return null

  const categoryLabels: Record<string, string> = {
    behörden: tr.category_behörden,
    mobilität: tr.category_mobilität,
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-text">{tr.guides_teaser_title}</h2>
        <Link href="/guides" className="text-sm text-accent">
          {tr.guides_teaser_link(total)}
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
        {guides.map((guide) => (
          <GuideCard
            key={`${guide.slug}-${guide.lang}`}
            guide={guide}
            href={`/guides/${guide.slug}`}
            variant="teaser"
            categoryLabel={categoryLabels[guide.category] ?? guide.category}
          />
        ))}
      </div>
    </section>
  )
}
