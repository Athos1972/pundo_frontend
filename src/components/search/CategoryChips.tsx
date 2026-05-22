'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { CategoryItem } from '@/types/api'
import { localePath } from '@/lib/routing'
import type { Lang } from '@/lib/lang'
import { tSearch } from '@/lib/translations'

const EMOJI_MAP: Record<string, string> = {
  'Animals & Pet Supplies': '🐾',
  'Pet Supplies': '🐾',
  'Dog Supplies': '🐕',
  'Cat Supplies': '🐈',
  'Bird Supplies': '🐦',
  'Fish Supplies': '🐠',
  'Small Animal Supplies': '🐹',
  'Reptile Supplies': '🦎',
}

// Priority order — lower index = shown first.
// Specific names (e.g. 'Dog Supplies') must come before generic prefixes
// ('Dog') so that Dog Apparel / Dog Beds don't beat Cat/Bird/Fish.
const PRIORITY_ORDER = [
  'Pet Supplies',
  'Dog Supplies',
  'Cat Supplies',
  'Bird Supplies',
  'Fish Supplies',
  'Small Animal Supplies',
  'Reptile Supplies',
  'Dog',
  'Cat',
  'Bird',
  'Fish',
  'Small Animal',
  'Reptile',
]

const BLOCKED = ['live animals', 'animals & pet supplies']

function getEmoji(name: string | null): string {
  if (!name) return '🏪'
  for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return emoji
  }
  return '🏪'
}

function getPriority(name: string | null): number {
  if (!name) return 99
  const lower = name.toLowerCase()
  const idx = PRIORITY_ORDER.findIndex(p => lower.includes(p.toLowerCase()))
  return idx === -1 ? 99 : idx
}

const VISIBLE_MAX = 4

interface Props {
  categories: CategoryItem[]
  lang: string
  /** When true, preserves the input order instead of applying PRIORITY_ORDER sort.
   *  Pass true when categories come from the curated steuerfile (already ordered editorially). */
  preserveOrder?: boolean
}

export function CategoryChips({ categories, lang, preserveOrder = false }: Props) {
  const [expanded, setExpanded] = useState(false)
  const tr = tSearch(lang)

  if (categories.length === 0) return null

  const filtered = categories.filter(c => {
    const lower = (c.name ?? '').toLowerCase()
    return !BLOCKED.some(b => lower.includes(b))
  })

  const sorted = preserveOrder
    ? filtered
    : [...filtered].sort((a, b) => getPriority(a.name) - getPriority(b.name))

  const visible = expanded ? sorted : sorted.slice(0, VISIBLE_MAX)
  const hiddenCount = sorted.length - VISIBLE_MAX

  const chipClass = 'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-surface border border-border rounded-full text-sm text-text-muted hover:border-accent hover:text-accent transition-colors whitespace-nowrap'

  return (
    <div className="flex flex-wrap gap-2 pb-1 -mx-1 px-1">
      {visible.map(cat => (
        <Link
          key={cat.id}
          href={`${localePath(lang as Lang, '/search')}?category_id=${cat.id}&category_name=${encodeURIComponent(cat.name ?? '')}`}
          className={chipClass}
        >
          <span>{getEmoji(cat.name)}</span>
          <span>{cat.name ?? cat.external_id}</span>
        </Link>
      ))}
      {!expanded && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className={chipClass}
          aria-label={`Show ${hiddenCount} more categories`}
        >
          +{hiddenCount}
        </button>
      )}
      {expanded && (
        <button
          onClick={() => setExpanded(false)}
          className={chipClass}
        >
          {tr.categories_show_less}
        </button>
      )}
    </div>
  )
}
