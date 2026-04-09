import Link from 'next/link'
import type { CategoryItem } from '@/types/api'

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

export function CategoryChips({ categories, lang: _lang }: { categories: CategoryItem[]; lang: string }) {
  if (categories.length === 0) return null

  const filtered = categories.filter(c => {
    const lower = (c.name ?? '').toLowerCase()
    return !BLOCKED.some(b => lower.includes(b))
  })

  const sorted = [...filtered].sort((a, b) => getPriority(a.name) - getPriority(b.name))

  const visible = sorted.slice(0, VISIBLE_MAX)
  const remaining = sorted.length - VISIBLE_MAX

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
      {visible.map(cat => (
        <Link
          key={cat.id}
          href={`/search?category_id=${cat.id}`}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-surface border border-border rounded-full text-sm text-text-muted hover:border-accent hover:text-accent transition-colors whitespace-nowrap"
        >
          <span>{getEmoji(cat.name)}</span>
          <span>{cat.name ?? cat.external_id}</span>
        </Link>
      ))}
      {remaining > 0 && (
        <Link
          href="/search"
          className="flex-shrink-0 flex items-center px-3 py-2 bg-surface border border-border rounded-full text-sm text-text-muted hover:border-accent hover:text-accent transition-colors whitespace-nowrap"
        >
          +{remaining}
        </Link>
      )}
    </div>
  )
}
