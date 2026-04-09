import Link from 'next/link'
import type { ProductListItem } from '@/types/api'
import { t } from '@/lib/translations'
import { formatCrawledAt, fmtPrice } from '@/lib/utils'

export function ProductCard({ item, lang }: { item: ProductListItem; lang: string }) {
  const tr = t(lang)
  const offer = item.best_offer
  return (
    <div className="relative bg-surface border border-border rounded-xl p-4 hover:border-accent transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 flex-shrink-0 bg-surface-alt rounded-lg flex items-center justify-center overflow-hidden">
          {item.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={String(item.images[0])} alt="" className="w-full h-full object-cover" />
          ) : (
            <svg viewBox="0 0 40 40" className="w-8 h-8 text-text-light" fill="none">
              <rect x="8" y="8" width="24" height="24" rx="4" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="16" cy="16" r="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="m8 28 8-8 6 6 4-4 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-text text-sm leading-tight truncate" style={{ fontFamily: 'var(--font-heading), system-ui, sans-serif' }}>
            {/* Stretched link covers the whole card */}
            <Link href={`/products/${item.slug}`} className="after:absolute after:inset-0">
              {item.name ?? '—'}
            </Link>
          </p>
          {item.brand && <p className="text-xs text-text-muted mt-0.5">{item.brand}</p>}
          {offer && (
            <div className="relative z-10 flex items-center gap-2 mt-1.5">
              <span className="text-accent font-bold text-sm">{fmtPrice(offer.price)} {offer.currency}</span>
              <Link href={`/shops/${offer.shop_id}`} className="text-xs text-accent underline truncate hover:opacity-80">{offer.shop_name}</Link>
              {offer.is_available && (
                <span className="text-xs px-1.5 py-0.5 bg-success/10 text-success rounded-full">{tr.available}</span>
              )}
            </div>
          )}
          {offer && (
            <p className="text-xs text-text-light mt-0.5">{tr.last_checked}: {formatCrawledAt(offer.crawled_at, lang)}</p>
          )}
        </div>
      </div>
    </div>
  )
}
