/**
 * RelatedProductsCarousel — Server Component
 *
 * Horizontal scroll carousel for related products shown below the offers
 * section on the product detail page. Uses native CSS scroll-snap — no JS,
 * no external library. Inherits RTL scroll direction from the HTML dir attribute
 * set by the root layout.
 *
 * Props:
 *   items  — ProductListItem[] from GET /products/{slug}/related
 *   lang   — Current locale string (passed through to ProductCard)
 *   title  — Translated section heading (e.g. "Related products")
 */

import type { ProductListItem } from '@/types/api'
import { ProductCard } from './ProductCard'

interface Props {
  items: ProductListItem[]
  lang: string
  title: string
}

export function RelatedProductsCarousel({ items, lang, title }: Props) {
  if (items.length === 0) return null

  return (
    <section aria-label={title} className="mt-4">
      <h2
        className="font-bold text-sm text-text mb-3 font-heading"
      >
        {title}
      </h2>

      {/*
       * Scroll container:
       *   snap-x mandatory   — whole cards snap into view on touch-scroll
       *   overflow-x-auto    — horizontal scroll, hides vertical overflow
       *   pb-2               — prevents card box-shadow / focus ring clipping
       *   [-ms-overflow-style/scrollbar-width] — hide scrollbar on all browsers
       *                         while keeping it functional
       *
       * RTL note: CSS scroll-snap respects the logical direction from
       * dir="rtl" on <html> — no extra Tailwind rtl: modifier needed here.
       */}
      <div
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
        role="list"
      >
        {items.map(item => (
          <div
            key={item.slug}
            role="listitem"
            className="flex-shrink-0 w-52 snap-start"
          >
            <ProductCard item={item} lang={lang} />
          </div>
        ))}
      </div>
    </section>
  )
}
