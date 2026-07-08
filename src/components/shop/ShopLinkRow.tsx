import Link from 'next/link'
import type { ShopListItem } from '@/types/api'
import type { Lang } from '@/lib/lang'
import { localePath } from '@/lib/routing'

/**
 * B5900-007 — Lightweight, server-rendered shop link row.
 *
 * `ShopCard` (src/components/shop/ShopCard.tsx) is `'use client'` (Tooltip +
 * ReviewsPopover) and pulls in `ShopAvatar`, which is also client-only. For the
 * city index pages we need a plain `<a href>` per shop in the initial SSR HTML
 * (that's the entire point of this feature — crawlable inlinks), without
 * paying for hundreds of client-hydrated cards on pages like /shops/city/nicosia
 * (~1300 shops). This component renders name + address only, no client JS.
 *
 * See 02-architecture.md R6.
 */
export function ShopLinkRow({ shop, lang }: { shop: ShopListItem; lang: Lang }) {
  const name = shop.name?.trim() || shop.slug
  return (
    <Link
      href={localePath(lang, `/shops/${shop.slug}`)}
      className="block bg-surface border border-border rounded-xl px-4 py-3 hover:border-accent transition-colors"
    >
      <p className="font-semibold text-text truncate font-heading">{name}</p>
      {shop.address_raw && (
        <p className="text-sm text-text-muted truncate mt-0.5">{shop.address_raw}</p>
      )}
    </Link>
  )
}
