// Server Component — no 'use client' needed
import Link from 'next/link'
import { t } from '@/lib/translations'
import { fmtPrice, formatPriceOrLabel } from '@/lib/utils'
import { absolutizeImageUrl } from '@/lib/seo/absolutize'
import { getSiteUrl } from '@/lib/seo'
import type { ShopOffer } from '@/types/api'

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
      <div className="w-[120px] h-[120px] shrink-0 bg-surface-alt flex items-center justify-center overflow-hidden">
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={offer.item_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-light">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Text content right of image */}
      <div className="p-3 flex flex-col justify-center min-w-0 flex-1">
        {/* Item name — link to product page if slug exists */}
        <p className="font-bold text-text text-sm leading-snug line-clamp-2 font-heading">
          {offer.item_slug ? (
            <Link href={`/products/${offer.item_slug}`} className="after:absolute after:inset-0">
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
