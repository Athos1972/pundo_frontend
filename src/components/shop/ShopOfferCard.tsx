// Server Component — no 'use client' needed
import Link from 'next/link'
import { t } from '@/lib/translations'
import { localePath } from '@/lib/routing'
import type { Lang } from '@/lib/lang'
import { formatAmount, formatPriceOrLabel } from '@/lib/utils'
import type { ShopOffer } from '@/types/api'
import { ProductCardImage } from '@/components/product/ProductCardImage'
import { buildOfferPriceView, formatTierRow } from '@/lib/price-tiers'

interface ShopOfferCardProps {
  offer: ShopOffer
  lang: string
}

export function ShopOfferCard({ offer, lang }: ShopOfferCardProps) {
  const tr = t(lang)
  // Keep image URLs relative for <img>: an absolute site URL (https://pundo.cy/…) is blocked
  // by the CSP img-src on any other origin (naidivse, test 3500). Absolute URLs are only
  // needed for crawler metadata (OG/JSON-LD), not for rendered images.
  const imgSrc = offer.item_photo_url ?? null

  // Format promo date for badge: DD.MM.
  const promoBadgeDate = offer.promo_valid_until
    ? new Date(offer.promo_valid_until).toLocaleDateString(lang, { day: 'numeric', month: 'short' })
    : null

  // Promo price display (already "active" — backend guarantees this)
  const promoPriceDisplay = formatAmount(
    offer.promo_price,
    offer.promo_currency ?? offer.standard_currency,
  )

  // Standard price display via formatPriceOrLabel for proper "on request" / "free" handling
  const stdLabel = formatPriceOrLabel(
    offer.standard_price,
    offer.standard_currency,
    offer.standard_price_type,
    null,
    tr,
  )

  const view = buildOfferPriceView({
    priceType: promoPriceDisplay ? (offer.promo_price_type ?? offer.standard_price_type) : offer.standard_price_type,
    isPromo: promoPriceDisplay !== null,
    priceTiers: offer.price_tiers,
    promoPriceTiers: offer.promo_price_tiers,
  })
  const main = view.hasTiers ? view.main : null
  const suffix = main?.unitSuffix ?? null
  const fromPrefix = main && view.mainShowMinQty ? tr.tier_from(main.minQty) : null
  // A2: Durchstreichen nur bei gleicher Einheit; ohne Tier-Daten wie bisher
  const showStrike =
    view.compareStrike === 'same-unit' ? true
      : view.compareStrike === 'different-unit' || view.compareStrike === 'none' ? false
      : stdLabel.isNumeric
  const strikeText = view.compareStrike === 'same-unit' && view.compareAmount ? view.compareAmount : stdLabel.display
  const extra = view.hasTiers && view.extraRows.length > 0 ? formatTierRow(view.extraRows[0], tr) : null
  const hasMore = view.hasTiers && view.extraRows.length > 1

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
        {offer.item_description && !extra && (
          <p className="text-xs text-text-light mt-0.5 line-clamp-1">{offer.item_description}</p>
        )}

        {/* Price row */}
        <div className="relative z-10 flex items-center gap-2 mt-1.5 flex-wrap">
          {promoPriceDisplay ? (
            <>
              {/* Aktionspreis prominent */}
              <span className="font-bold text-sm text-accent">
                {fromPrefix && <span className="text-xs font-normal text-text-muted">{fromPrefix} · </span>}
                <bdi>{main?.amount ?? promoPriceDisplay}</bdi>
              </span>
              {suffix && <span className="text-xs text-text-muted">/ {suffix}</span>}
              {/* Standardpreis durchgestrichen */}
              {showStrike && (
                <s className="text-xs text-text-muted"><bdi>{strikeText}</bdi></s>
              )}
              {/* Aktions-Badge */}
              {promoBadgeDate && (
                <span className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 rounded-full font-medium shrink-0">
                  {tr.promo_badge} {promoBadgeDate}
                </span>
              )}
            </>
          ) : (
            <>
              <span className={`font-bold text-sm ${stdLabel.isNumeric ? 'text-accent' : 'text-text-muted'}`}>
                {fromPrefix && <span className="text-xs font-normal text-text-muted">{fromPrefix} · </span>}
                <bdi>{main?.amount ?? stdLabel.display}</bdi>
              </span>
              {suffix && <span className="text-xs text-text-muted">/ {suffix}</span>}
            </>
          )}
        </div>

        {/* Staffel-Hinweis: max. eine Zeile (Karte ist komplett verlinkt, daher nur Text) */}
        {extra && (
          <p className="text-xs text-text-muted mt-0.5 truncate">
            {extra.prefix && (<><bdi>{extra.prefix}</bdi>{': '}</>)}
            <bdi>{extra.amount}</bdi>
            {extra.suffix && <span>{' / '}{extra.suffix}</span>}
            {hasMore && <span className="ms-2">{tr.tier_more_prices}</span>}
          </p>
        )}
      </div>
    </div>
  )
}
