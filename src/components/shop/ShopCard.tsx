import Link from 'next/link'
import type { ShopListItem } from '@/types/api'
import { t } from '@/lib/translations'

export function ShopCard({ shop, lang }: { shop: ShopListItem; lang: string }) {
  const tr = t(lang)
  return (
    <Link href={`/shops/${shop.slug}`} className="block bg-surface border border-border rounded-xl p-4 hover:border-accent transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-text truncate" style={{ fontFamily: 'var(--font-heading), system-ui, sans-serif' }}>{shop.name ?? 'Shop'}</p>
          {shop.address_raw && <p className="text-sm text-text-muted truncate mt-0.5">{shop.address_raw}</p>}
        </div>
        <div className="flex-shrink-0 text-right">
          {shop.dist_km != null && (
            <p className="text-sm font-medium text-accent">{shop.dist_km < 1 ? `${Math.round(shop.dist_km * 1000)}m` : `${shop.dist_km.toFixed(1)}km`}</p>
          )}
          <p className="text-xs text-text-light mt-0.5">{shop.product_count} {tr.products}</p>
        </div>
      </div>
    </Link>
  )
}
