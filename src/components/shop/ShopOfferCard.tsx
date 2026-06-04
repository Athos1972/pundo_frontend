// Server Component — no 'use client' needed
import Link from 'next/link'
import { t } from '@/lib/translations'
import { localePath } from '@/lib/routing'
import type { Lang } from '@/lib/lang'
import { fmtPrice, formatPriceOrLabel } from '@/lib/utils'
import { absolutizeImageUrl } from '@/lib/seo/absolutize'
import { getSiteUrl } from '@/lib/seo'
import type { ShopOffer } from '@/types/api'
import { ProductCardImage } from '@/components/product/ProductCardImage'

interface ShopOfferCardProps {
  offer: ShopOffer
  lang: string
}

export function ShopOfferCard({ offer, lang }: ShopOfferCardProps) {
  const tr = t(lang)
  const siteUrl = getSiteUrl()
  const imgSrc = absolutizeImageUrl(offer.item_photo_url, siteUrl)

  // Format promo date for badge: DD.MM.
  const promoBadgeDate = offer.promo_valid_until
    ? new Date(offer.promo_valid_until).toLocaleDateString(lang, { day: 'numeric', month: 'short' })
    : null

  // Promo price display (already "active" — backend guarantees this)
  const promoPriceDisplay = offer.promo_price
    ? `${fmtPrice(offer.promo_price)} ${offer.promo_currency ?? offer.standard_currency}`
    : null

  // Standard price display via formatPriceOrLabel for proper "on request" / "free" handling
  const stdLabel = formatPriceOrLabel(
    offer.standard_price,
    offer.standard_currency,
    offer.standard_price_type,
    null,
    tr,
  )

  return (
    <div className="relative bg-surface border border-border rounded-xl overflow-hidden hover:border-accent transition-colors flex rtl:flex-row-reverse">
      {/* Image — fixed 120×120px left */}
      <div className="w-[120px] h-[120px] shrink-0 overflow-hidden">
        <ProductCardImage src={imgSrc} alt={offer.item_name} className="w-full h-full object-cover" />
      </div>

      {/* Text content right of image */}
      <div className="p-3 flex flex-col justify-center min-w-0 flex-1">
        {/* Item name — link to product page if slug exists */}
        <p className="font-bold text-text text-sm leading-snug line-clamp-2 font-heading">
          {offer.item_slug ? (
            <Link href={localePath(lang as Lang,`/products/${offer.item_slug}`)} className="after:absolute after:inset-0">
              {offer.item_name}
            </Link>
          ) : (
            offer.item_name
          )}
        </p>

        {/* Brand */}
        {offer.item_brand && (
          <p className="text-xs text-text-muted mt-0.5">{offer.item_brand}</p>
        )}

        {/* Description */}
        {offer.item_description && (
          <p className="text-xs text-text-light mt-0.5 line-clamp-1">{offer.item_description}</p>
        )}

        {/* Price row */}
        <div className="relative z-10 flex items-center gap-2 mt-1.5 flex-wrap">
          {promoPriceDisplay ? (
            <>
              {/* Aktionspreis prominent */}
              <span className="font-bold text-sm text-accent">{promoPriceDisplay}</span>
              {/* Standardpreis durchgestrichen */}
              {stdLabel.isNumeric && (
                <s className="text-xs text-text-muted">{stdLabel.display}</s>
              )}
              {/* Aktions-Badge */}
              {promoBadgeDate && (
                <span className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 rounded-full font-medium shrink-0">
                  {tr.promo_badge} {promoBadgeDate}
                </span>
              )}
            </>
          ) : (
            <span className={`font-bold text-sm ${stdLabel.isNumeric ? 'text-accent' : 'text-text-muted'}`}>
              {stdLabel.display}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
