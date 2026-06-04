/**
 * ForShopsFaqGrid — 2-column FAQ grid (1-col on mobile).
 * Server Component. No accordion — static expanded layout.
 * Direction (RTL/LTR) comes from the <html dir> attribute set by the layout.
 */
import type { ForShopsFaqItem } from '@/lib/for-shops-content'

interface Props {
  items: ForShopsFaqItem[]
}

export function ForShopsFaqGrid({ items }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border border-border rounded-2xl overflow-hidden">
      {items.map((item, i) => {
        const isRightColumn = i % 2 === 1
        const isLastRow = i >= items.length - 2

        return (
          <div
            key={i}
            className={[
              'p-6',
              // Right-column items get a left border on desktop
              isRightColumn ? 'sm:border-l border-border' : '',
              // All but the last row get a bottom border
              isLastRow ? '' : 'border-b border-border',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <h3 className="font-semibold text-text mb-2 leading-snug">{item.q}</h3>
            <p className="text-sm text-text-muted leading-relaxed">{item.a}</p>
          </div>
        )
      })}
    </div>
  )
}
