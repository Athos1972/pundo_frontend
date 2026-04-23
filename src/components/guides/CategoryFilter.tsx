'use client'

type CategoryOption = { value: string; label: string }

type Props = {
  categories: CategoryOption[]
  selected: string
  onChange: (cat: string) => void
  filterAll: string
}

export function CategoryFilter({ categories, selected, onChange, filterAll }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      <button
        onClick={() => onChange('')}
        className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
          selected === ''
            ? 'bg-accent text-white'
            : 'bg-surface-alt text-gray-700 hover:bg-gray-200'
        }`}
      >
        {filterAll}
      </button>
      {categories.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            selected === value
              ? 'bg-accent text-white'
              : 'bg-surface-alt text-gray-700 hover:bg-gray-200'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
