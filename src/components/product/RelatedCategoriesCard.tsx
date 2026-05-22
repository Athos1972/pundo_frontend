import Link from 'next/link'
import { localePath } from '@/lib/routing'
import type { CategoryItem } from '@/types/api'
import type { Lang } from '@/lib/lang'

interface Props {
  categories: CategoryItem[]
  lang: Lang
  title: string
}

export function RelatedCategoriesCard({ categories, lang, title }: Props) {
  if (categories.length === 0) return null

  return (
    <section aria-label={title} className="mt-4">
      <div className="bg-surface border border-border rounded-xl p-4">
        <h2 className="font-bold text-sm text-text mb-3 font-heading rtl:text-right">{title}</h2>
        <ul className="flex flex-wrap gap-2 rtl:flex-row-reverse" role="list">
          {categories.map(cat => (
            <li key={cat.id} role="listitem">
              <Link
                href={`${localePath(lang, '/search')}?category_id=${cat.id}&category_name=${encodeURIComponent(cat.name ?? '')}`}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-bg border border-border text-sm text-text hover:bg-surface transition-colors"
              >
                {cat.name}
                {cat.product_count != null && (
                  <span className="text-text-muted text-xs">({cat.product_count})</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
