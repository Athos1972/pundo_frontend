// CharityShopCarousel — F3800 Phase 2
// Server Component: CSS scroll-snap carousel of charity-supporter ShopCards.
// Pattern from GuidesTeaser.tsx (flex gap-3 overflow-x-auto pb-2 no-scrollbar).

import type { ShopListItem } from '@/types/api'
import { ShopCard } from '@/components/shop/ShopCard'

interface Props {
  shops: ShopListItem[]
  lang: string
}

export function CharityShopCarousel({ shops, lang }: Props) {
  if (shops.length === 0) return null

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
      {shops.map((shop) => (
        <div key={shop.id} className="min-w-[260px] snap-start shrink-0">
          <ShopCard shop={shop} lang={lang} />
        </div>
      ))}
    </div>
  )
}
