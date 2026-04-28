'use client'

// =============================================================================
// src/components/recently-viewed/RecentlyViewedList.tsx
//
// Tabbed list of recently-viewed products and shops.
// Variant 'home': renders null when both lists are empty.
// Variant 'drawer' / 'page': always renders (shows empty state).
// Uses useRecentlyViewed for live updates across tabs.
// =============================================================================

import { useState } from 'react'
import Link from 'next/link'
import { t } from '@/lib/translations'
import { useRecentlyViewed } from '@/lib/useRecentlyViewed'

interface RecentlyViewedListProps {
  variant: 'home' | 'page' | 'drawer'
  lang: string
}

export function RecentlyViewedList({ variant, lang }: RecentlyViewedListProps) {
  const tr = t(lang)
  const { products, shops, clear } = useRecentlyViewed()
  const [activeTab, setActiveTab] = useState<'products' | 'shops'>('products')

  const isEmpty = products.length === 0 && shops.length === 0

  // On homepage, hide if nothing viewed yet
  if (variant === 'home' && isEmpty) return null

  const items = activeTab === 'products' ? products : shops
  const itemHref = (slug: string) =>
    activeTab === 'products' ? `/products/${slug}` : `/shops/${slug}`

  return (
    <div className="w-full">
      {/* Tab bar */}
      <div className="flex gap-0 border-b border-border mb-3">
        {(
          [
            { key: 'products', label: tr.recently_viewed_tab_products, count: products.length },
            { key: 'shops', label: tr.recently_viewed_tab_shops, count: shops.length },
          ] as const
        ).map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {label}
            {count > 0 && (
              <span className="ms-1.5 text-xs text-text-light tabular-nums">
                ({count})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {items.length === 0 ? (
        <p className="text-sm text-text-muted py-4 text-start">
          {tr.recently_viewed_empty}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((entry) => (
            <li key={entry.id}>
              <Link
                href={itemHref(entry.slug)}
                className="flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-surface-alt transition-colors"
              >
                {entry.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.image_url}
                    alt={entry.name}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-lg object-cover bg-surface-alt border border-border shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-surface-alt border border-border shrink-0 flex items-center justify-center text-text-light text-lg">
                    {activeTab === 'products' ? '📦' : '🏪'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate text-start">
                    {entry.name}
                  </p>
                  {entry.price_display && (
                    <p className="text-xs text-text-muted text-start">{entry.price_display}</p>
                  )}
                  {entry.city && (
                    <p className="text-xs text-text-muted text-start">{entry.city}</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Clear button */}
      {!isEmpty && (
        <div className="mt-4 pt-3 border-t border-border">
          <button
            type="button"
            onClick={() => {
              if (window.confirm(tr.recently_viewed_clear_confirm)) {
                clear()
              }
            }}
            className="text-xs text-text-muted hover:text-text transition-colors"
          >
            {tr.recently_viewed_clear}
          </button>
        </div>
      )}
    </div>
  )
}
