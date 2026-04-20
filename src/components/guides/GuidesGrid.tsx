'use client'

import { useState } from 'react'
import type { GuideMeta } from '@/lib/guides'
import { GuideCard } from './GuideCard'
import { CategoryFilter } from './CategoryFilter'

type Props = {
  guides: GuideMeta[]
  filterAll: string
  categoryLabels: Record<string, string>
  readtimeFn: (n: number) => string
  lang: string
}

export function GuidesGrid({ guides, filterAll, categoryLabels, readtimeFn }: Props) {
  const [selected, setSelected] = useState('')

  const categories = [...new Set(guides.map((g) => g.category))]
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
            readtimeLabel={readtimeFn(Number(guide.readtime))}
          />
        ))}
      </div>
    </div>
  )
}
