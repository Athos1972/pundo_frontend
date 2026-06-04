// src/components/home/HomepageStatsStrip.tsx — Server Component
import type { Lang } from '@/lib/lang'
import { tHome } from '@/lib/translations'

interface Props {
  lang: Lang
}

export function HomepageStatsStrip({ lang }: Props) {
  const tr = tHome(lang)

  // TODO BB: confirm real numbers before launch
  const stats = [
    { value: tr.stats_businesses, label: tr.stats_businesses_label },
    { value: tr.stats_searches,   label: tr.stats_searches_label },
    { value: tr.stats_cities,     label: tr.stats_cities_label },
    { value: tr.stats_languages,  label: tr.stats_languages_label },
  ]

  return (
    <section className="w-full bg-text">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center text-center gap-1">
              <span className="font-display text-3xl font-bold text-accent">{value}</span>
              <span className="text-white/50 text-xs uppercase tracking-widest leading-snug">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
