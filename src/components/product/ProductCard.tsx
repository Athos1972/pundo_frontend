'use client'

import Link from 'next/link'
import type { ProductListItem } from '@/types/api'
import { t } from '@/lib/translations'
import { formatPriceOrLabel, pickImg } from '@/lib/utils'
import { FavoriteButton } from '@/components/product/FavoriteButton'

export function ProductCard({ item, lang, variant = 'vertical' }: { item: ProductListItem; lang: string; variant?: 'vertical' | 'horizontal' }) {
  const tr = t(lang)
  const offer = item.best_offer
  const imgSrc = pickImg(item.images, 'card', item.thumbnail_url)
  const productName = item.names[lang] ?? item.names.en ?? '—'
  const priceLabel = offer
    ? formatPriceOrLabel(offer.price, offer.currency, offer.price_type, offer.price_note, tr)
    : null

  if (variant === 'horizontal') {
    return (
      <div className="relative bg-surface border border-border rounded-xl overflow-hidden hover:border-accent transition-colors flex">
        {/* Image — fixed 120×120px square on the left */}
        <div className="w-[120px] h-[120px] shrink-0 bg-surface-alt flex items-center justify-center overflow-hidden relative">
          {imgSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgSrc}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          )}
          <div className="absolute top-1 right-1 rtl:right-auto rtl:left-1">
            <FavoriteButton productId={item.id} lang={lang} size="sm" />
          </div>
        </div>

        {/* Text content to the right of the image */}
        <div className="p-3 flex flex-col justify-center min-w-0">
          <p className="font-bold text-text text-sm leading-snug line-clamp-2" style={{ fontFamily: 'var(--font-heading), system-ui, sans-serif' }}>
            <Link href={`/products/${item.slug}`} className="after:absolute after:inset-0">
              {productName}
            </Link>
          </p>
          {item.brand && <p className="text-xs text-text-muted mt-0.5">{item.brand}</p>}
          {offer && priceLabel && (
            <div className="relative z-10 flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`font-bold text-sm ${priceLabel.isNumeric ? 'text-accent' : 'text-text-muted'}`}>
                {priceLabel.display}
              </span>
              {offer.shop_slug
                ? <Link href={`/shops/${offer.shop_slug}`} className="text-xs text-accent underline truncate hover:opacity-80">{offer.shop_name}</Link>
                : <span className="text-xs text-accent truncate">{offer.shop_name}</span>
              }
              {offer.delivery_available && (
                <span className="text-xs px-1.5 py-0.5 bg-accent/10 text-accent rounded-full rtl:mr-0 rtl:ml-1">{tr.delivery_available}</span>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="relative bg-surface border border-border rounded-xl overflow-hidden hover:border-accent transition-colors">
      {/* Image — primary visual element, full card width */}
      <div className="w-full h-40 bg-surface-alt flex items-center justify-center overflow-hidden relative">
        {imgSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        )}
        <div className="absolute top-2 right-2 rtl:right-auto rtl:left-2">
          <FavoriteButton productId={item.id} lang={lang} size="sm" />
        </div>
      </div>

      {/* Text content below the image */}
      <div className="p-3">
        <p className="font-bold text-text text-sm leading-snug line-clamp-2" style={{ fontFamily: 'var(--font-heading), system-ui, sans-serif' }}>
          {/* Stretched link covers the whole card */}
          <Link href={`/products/${item.slug}`} className="after:absolute after:inset-0">
            {productName}
          </Link>
        </p>
        {item.brand && <p className="text-xs text-text-muted mt-0.5">{item.brand}</p>}
        {offer && priceLabel && (
          <div className="relative z-10 flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`font-bold text-sm ${priceLabel.isNumeric ? 'text-accent' : 'text-text-muted'}`}>
              {priceLabel.display}
            </span>
            {offer.shop_slug
              ? <Link href={`/shops/${offer.shop_slug}`} className="text-xs text-accent underline truncate hover:opacity-80">{offer.shop_name}</Link>
              : <span className="text-xs text-accent truncate">{offer.shop_name}</span>
            }
            {offer.delivery_available && (
              <span className="text-xs px-1.5 py-0.5 bg-accent/10 text-accent rounded-full rtl:mr-0 rtl:ml-1">{tr.delivery_available}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
