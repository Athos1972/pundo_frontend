// F5970 — read-only card of the listing being claimed (name, address, website host, logo).
// Only imports from src/components/ui/ and shop-admin code (Clean Boundary).

import type { ClaimShopInfo } from '@/types/shop-admin'
import type { ShopAdminClaimTranslations } from '@/lib/i18n/shop-admin-claim'

interface Props {
  shop: ClaimShopInfo['shop']
  tr: ShopAdminClaimTranslations
}

export function ClaimShopSummary({ shop, tr }: Props) {
  const place = [shop.address, shop.city].filter(Boolean).join(', ')
  return (
    <section className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4" aria-label={tr.claim_shop_summary_title}>
      {shop.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shop.logo_url} alt={shop.name} className="h-12 w-12 shrink-0 rounded-lg border border-gray-200 bg-white object-contain" />
      ) : (
        <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-lg font-bold text-accent">
          {shop.name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <dl className="min-w-0 flex-1 text-sm">
        <dt className="sr-only">{tr.claim_shop_summary_title}</dt>
        <dd className="font-semibold text-gray-900 break-words" data-testid="claim-shop-name">{shop.name}</dd>
        {place && (
          <>
            <dt className="sr-only">{tr.claim_shop_address}</dt>
            <dd className="text-gray-600 break-words">{place}</dd>
          </>
        )}
        {shop.website_host && (
          <>
            <dt className="sr-only">{tr.claim_shop_website}</dt>
            <dd className="text-gray-500 break-all" dir="ltr">{shop.website_host}</dd>
          </>
        )}
      </dl>
    </section>
  )
}
