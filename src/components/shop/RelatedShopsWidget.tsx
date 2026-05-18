import Link from 'next/link'
import Image from 'next/image'
import { t } from '@/lib/translations'
import { ShopAvatar } from '@/components/shop/ShopAvatar'
import type { RelatedShopItem } from '@/lib/api'

interface Props {
  items: RelatedShopItem[]
  lang: string
}

/**
 * Server Component — renders a list of related shops with SEO-friendly <a> links.
 * Returns null when there are no related shops (AC-12).
 * No 'use client' directive — API call happens in the parent page (AC-19).
 */
export function RelatedShopsWidget({ items, lang }: Props) {
  if (items.length === 0) return null

  const tr = t(lang)

  return (
    <section>
      <h2 className="font-bold text-sm text-text font-heading mb-3">
        {tr.related_shops}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((item) => {
          const imageUrl = item.images?.[0]?.url ?? null
          const shopTypeName = item.shop_type?.name ?? null

          return (
            <Link
              key={item.id}
              href={`/shops/${item.slug}`}
              className="flex flex-col items-center gap-2 bg-surface border border-border rounded-xl p-3 hover:border-accent transition-colors text-center"
            >
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={item.name ?? ''}
                  width={48}
                  height={48}
                  className="rounded-full object-cover bg-surface border border-border w-12 h-12 flex-shrink-0"
                />
              ) : (
                <ShopAvatar name={item.name} shopId={item.id} size="md" />
              )}
              <div className="min-w-0 w-full">
                <p className="font-semibold text-text text-xs truncate font-heading">
                  {item.name ?? 'Shop'}
                </p>
                {item.city && (
                  <p className="text-xs text-text-muted truncate mt-0.5">{item.city}</p>
                )}
                {shopTypeName && (
                  <span className="inline-block text-xs bg-surface-alt border border-border text-text-muted px-1.5 py-0.5 rounded-full mt-1 truncate max-w-full">
                    {shopTypeName}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
