import Link from 'next/link'
import type { OfferDetail } from '@/types/api'
import { t } from '@/lib/translations'
import { localePath } from '@/lib/routing'
import type { Lang } from '@/lib/lang'
import { formatCrawledAt, formatPriceOrLabel, fmtPrice } from '@/lib/utils'
import { sanitizeExternalUrl } from '@/lib/url-safety'

export function OfferList({ offers, lang, productName: _productName }: { offers: OfferDetail[]; lang: string; productName: string }) {
  const tr = t(lang)

  const sorted = [...offers].sort((a, b) => {
    // Available before unavailable
    if (a.is_available !== b.is_available) return a.is_available ? -1 : 1
    // Fixed-price offers first, sorted by price ascending
    if (a.price_type === 'fixed' && b.price_type === 'fixed') {
      return parseFloat(a.price!) - parseFloat(b.price!)
    }
    if (a.price_type === 'fixed') return -1
    if (b.price_type === 'fixed') return 1
    // Non-fixed: alphabetical by shop name
    return a.shop_name.localeCompare(b.shop_name)
  })

  return (
    <div className="space-y-3">
      {sorted.map((offer, i) => {
        const safeUrl = sanitizeExternalUrl(offer.url)
        const hasCta = offer.price_type === 'on_request' && (offer.shop_phone || safeUrl)

        const hasPromo = !!offer.promo_price
        const promoPriceDisplay = hasPromo
          ? `${fmtPrice(offer.promo_price!)} ${offer.promo_currency ?? offer.currency}`
          : null
        const stdLabel = formatPriceOrLabel(
          offer.standard_price ?? offer.price,
          offer.standard_currency ?? offer.currency,
          offer.price_type,
          offer.price_note,
          tr,
        )
        const promoBadgeDate = offer.promo_valid_until
          ? new Date(offer.promo_valid_until).toLocaleDateString(lang, { day: 'numeric', month: 'short' })
          : null

        return (
          <div key={i} className={`flex items-start justify-between gap-3 py-3 ${i > 0 ? 'border-t border-border' : ''}`}>
            <div className="min-w-0">
              <Link href={localePath(lang as Lang,`/shops/${offer.shop_slug}`)} className="font-medium text-sm text-accent underline truncate hover:opacity-80 block">{offer.shop_name}</Link>
              {offer.shop_address && <p className="text-xs text-text-muted">{offer.shop_address}</p>}
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${offer.is_available ? 'bg-success/10 text-success' : 'bg-surface-alt text-text-muted'}`}>
                  {offer.is_available ? tr.available : tr.unavailable}
                </span>
                <span className="text-xs text-text-light">{tr.last_checked}: {formatCrawledAt(offer.crawled_at, lang)}</span>
              </div>
              {hasCta && (
                <div className="flex gap-2 mt-2 rtl:flex-row-reverse">
                  {offer.shop_phone && (
                    <a
                      href={`tel:${offer.shop_phone}`}
                      aria-label={`${tr.contact_shop}: ${offer.shop_name}`}
                      className="text-xs px-2.5 py-1 rounded-full bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                    >
                      {tr.contact_shop}
                    </a>
                  )}
                  {safeUrl && (
                    <a
                      href={safeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2.5 py-1 rounded-full bg-surface-alt border border-border text-text-muted hover:border-accent hover:text-accent transition-colors"
                    >
                      Website
                    </a>
                  )}
                </div>
              )}
            </div>
            <div className="flex-shrink-0 text-right rtl:text-left">
              {promoPriceDisplay ? (
                <>
                  <p className="font-bold text-accent">{promoPriceDisplay}</p>
                  {stdLabel.isNumeric && (
                    <s className="text-xs text-text-muted">{stdLabel.display}</s>
                  )}
                  {promoBadgeDate && (
                    <p className="text-xs text-red-600 mt-0.5">{tr.promo_badge} {promoBadgeDate}</p>
                  )}
                </>
              ) : (
                <>
                  <p className={`font-bold ${stdLabel.isNumeric ? 'text-accent' : 'text-text-muted'}`}>
                    {stdLabel.display}
                  </p>
                  {stdLabel.note && (
                    <p className="text-xs text-text-light mt-0.5">{stdLabel.note}</p>
                  )}
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
