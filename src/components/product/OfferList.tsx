import Link from 'next/link'
import type { OfferDetail } from '@/types/api'
import { t } from '@/lib/translations'
import { formatCrawledAt, fmtPrice } from '@/lib/utils'

export function OfferList({ offers, lang }: { offers: OfferDetail[]; lang: string }) {
  const tr = t(lang)
  const sorted = [...offers].sort((a, b) => {
    if (a.is_available !== b.is_available) return a.is_available ? -1 : 1
    return parseFloat(a.price) - parseFloat(b.price)
  })

  return (
    <div className="space-y-3">
      {sorted.map((offer, i) => (
        <div key={i} className={`flex items-start justify-between gap-3 py-3 ${i > 0 ? 'border-t border-border' : ''}`}>
          <div className="min-w-0">
            <Link href={`/shops/${offer.shop_slug}`} className="font-medium text-sm text-accent underline truncate hover:opacity-80 block">{offer.shop_name}</Link>
            {offer.shop_address && <p className="text-xs text-text-muted">{offer.shop_address}</p>}
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${offer.is_available ? 'bg-success/10 text-success' : 'bg-surface-alt text-text-muted'}`}>
                {offer.is_available ? tr.available : tr.unavailable}
              </span>
              <span className="text-xs text-text-light">{tr.last_checked}: {formatCrawledAt(offer.crawled_at, lang)}</span>
            </div>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="font-bold text-accent">{fmtPrice(offer.price)} {offer.currency}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
