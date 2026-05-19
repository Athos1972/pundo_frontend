'use client'

import { tAdmin } from '@/lib/shop-admin-translations'

interface CategoryOption {
  id: number
  name: string
}

interface OfferFilterBarProps {
  lang: string
  searchText: string
  selectedCategoryId: number | null
  categories: CategoryOption[]
  onSearchChange: (text: string) => void
  onCategoryChange: (id: number | null) => void
}

export function OfferFilterBar({
  lang,
  searchText,
  selectedCategoryId,
  categories,
  onSearchChange,
  onCategoryChange,
}: OfferFilterBarProps) {
  const tr = tAdmin(lang)
  return (
    <div className="flex flex-wrap gap-2">
      <input
        type="search"
        value={searchText}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={tr.offer_search_placeholder}
        className="flex-1 min-w-48 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent rtl:text-right"
      />
      {categories.length > 0 && (
        <select
          value={selectedCategoryId ?? ''}
          onChange={(e) => onCategoryChange(e.target.value ? Number(e.target.value) : null)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent bg-white rtl:text-right"
        >
          <option value="">{tr.offer_filter_all_categories}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}
    </div>
  )
}
