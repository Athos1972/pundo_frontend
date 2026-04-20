'use client'

type Props = {
  categories: string[]
  selected: string
  onChange: (cat: string) => void
  filterAll: string
}

export function CategoryFilter({ categories, selected, onChange, filterAll }: Props) {
  const all = [filterAll, ...categories]
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {all.map((cat) => {
        const isAll = cat === filterAll
        const active = isAll ? selected === '' : selected === cat
        return (
          <button
            key={cat}
            onClick={() => onChange(isAll ? '' : cat)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-accent text-white'
                : 'bg-surface-alt text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        )
      })}
    </div>
  )
}
