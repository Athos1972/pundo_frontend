'use client'

import { useState } from 'react'
import type { GuideMeta } from '@/lib/guides'
import { GuideCard } from './GuideCard'
import { CategoryFilter } from './CategoryFilter'

type Props = {
  guides: GuideMeta[]
  filterAll: string
  categoryLabels: Record<string, string>
  readtimeLabels: Record<string, string>
  lang: string
}

export function GuidesGrid({ guides, filterAll, categoryLabels, readtimeLabels }: Props) {
  const [selected, setSelected] = useState('')

  const categories = [...new Set(guides.map((g) => g.category))].map((cat) => ({
    value: cat,
    label: categoryLabels[cat] ?? cat,
  }))
  const filtered = selected ? guides.filter((g) => g.category === selected) : guides

  return (
    <div className="space-y-4">
      <CategoryFilter
        categories={categories}
        selected={selected}
        onChange={setSelected}
        filterAll={filterAll}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {filtered.map((guide) => (
          <GuideCard
            key={`${guide.slug}-${guide.lang}`}
            guide={guide}
            href={`/guides/${guide.slug}`}
            variant="grid"
            categoryLabel={categoryLabels[guide.category] ?? guide.category}
            readtimeLabel={readtimeLabels[guide.readtime] ?? ''}
          />
        ))}
      </div>
    </div>
  )
}
