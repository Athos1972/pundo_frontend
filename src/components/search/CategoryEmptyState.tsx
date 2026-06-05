'use client'
import Link from 'next/link'
import type { CategoryItem } from '@/types/api'
import type { Lang } from '@/lib/lang'
import { localePath } from '@/lib/routing'
import { tCommon } from '@/lib/i18n/common'
import { ContactCtaLink } from '@/components/contact/ContactCtaLink'

interface CategoryEmptyStateProps {
  relatedCategories: CategoryItem[]
  lang: Lang
}

export function CategoryEmptyState({ relatedCategories, lang }: CategoryEmptyStateProps) {
  const tr = tCommon(lang)
  const hasRelated = relatedCategories.length > 0
  const visibleCategories = relatedCategories.slice(0, 6)

  return (
    <div className="py-8 space-y-4 px-2">
      <p className="text-center text-text-muted rtl:text-right">{tr.category_empty_intro}</p>

      {hasRelated ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-text-muted rtl:text-right">
            {tr.category_empty_suggestions}
          </p>
          <div className="flex flex-wrap gap-2 rtl:flex-row-reverse">
            {visibleCategories.map(cat => (
              <Link
                key={cat.id}
                href={`${localePath(lang, '/search')}?category_id=${cat.id}`}
                className="flex items-center gap-1.5 px-3 py-2 bg-surface border border-border rounded-full text-sm text-text-muted hover:border-accent hover:text-accent transition-colors whitespace-nowrap"
              >
                <span>{cat.name ?? cat.external_id}</span>
                {cat.product_count != null && cat.product_count > 0 && (
                  <span className="text-xs text-text-muted opacity-60">({cat.product_count})</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center rtl:text-right">
          <Link
            href={localePath(lang, '/')}
            className="text-sm text-accent hover:underline"
          >
            {tr.category_empty_browse_all}
          </Link>
        </div>
      )}

      <ContactCtaLink variant="block" lang={lang} />
    </div>
  )
}
