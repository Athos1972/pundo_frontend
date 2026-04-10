'use client'

import Link from 'next/link'
import type { ProductListItem } from '@/types/api'
import { t } from '@/lib/translations'
import { formatCrawledAt, fmtPrice } from '@/lib/utils'

function resolveImgSrc(item: ProductListItem): string | null {
  // Prefer relative path from images[] to avoid localhost URLs that break on mobile
  const firstImg = item.images?.[0]
  if (firstImg && typeof firstImg === 'object' && firstImg !== null && 'url' in firstImg) {
    return String((firstImg as { url: string }).url)
  }
  // Fall back to thumbnail_url but strip absolute localhost origin so Next.js proxy works
  if (item.thumbnail_url) {
    try {
      const u = new URL(item.thumbnail_url)
      if (u.hostname === 'localhost') return u.pathname
    } catch { /* not a valid URL */ }
    return item.thumbnail_url
  }
  return null
}

export function ProductCard({ item, lang }: { item: ProductListItem; lang: string }) {
  const tr = t(lang)
  const offer = item.best_offer
  const imgSrc = resolveImgSrc(item)
  return (
    <div className="relative bg-surface border border-border rounded-xl p-4 hover:border-accent transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 flex-shrink-0 bg-surface-alt rounded-lg flex items-center justify-center overflow-hidden">
          {imgSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgSrc}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
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
              {offer.shop_slug
                ? <Link href={`/shops/${offer.shop_slug}`} className="text-xs text-accent underline truncate hover:opacity-80">{offer.shop_name}</Link>
                : <span className="text-xs text-accent truncate">{offer.shop_name}</span>
              }
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
