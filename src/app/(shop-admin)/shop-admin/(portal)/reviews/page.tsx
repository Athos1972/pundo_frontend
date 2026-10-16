import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import { getShopReviews, getShopReviewSummary } from '@/lib/shop-admin-api'
import { ShopReviewList } from '@/components/shop-admin/reviews/ShopReviewList'
import type { ShopOwnerReviewPage, ShopOwnerReviewSummary, ShopReviewScope } from '@/types/shop-admin'

interface PageProps {
  searchParams: Promise<{ scope?: string }>
}

export default async function ReviewsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const lang = await getLangServer()
  const tr = tAdmin(lang)
  const scope: ShopReviewScope = sp.scope === 'products' ? 'products' : 'shop'

  let page: ShopOwnerReviewPage | null = null
  let summary: ShopOwnerReviewSummary | null = null
  try {
    ;[page, summary] = await Promise.all([
      getShopReviews({ scope, limit: 20, offset: 0 }, lang),
      getShopReviewSummary(lang),
    ])
  } catch {
    // shown below as an error state
  }

  const tabs: { scope: ShopReviewScope; label: string; href: string }[] = [
    { scope: 'shop', label: tr.shop_reviews_tab_shop, href: '/shop-admin/reviews?scope=shop' },
    { scope: 'products', label: tr.shop_reviews_tab_products, href: '/shop-admin/reviews?scope=products' },
  ]

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold text-gray-900">{tr.shop_reviews_title}</h1>

      <nav aria-label={tr.shop_reviews_tabs_aria} className="flex gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.scope}
            href={tab.href}
            aria-current={tab.scope === scope ? 'page' : undefined}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
              tab.scope === scope ? 'bg-accent text-white border-accent' : 'text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {page && summary ? (
        <ShopReviewList key={scope} initial={page} shopSlug={summary.shop_slug} lang={lang} tr={tr} />
      ) : (
        <p role="alert" className="text-sm text-gray-500">{tr.shop_reviews_load_error}</p>
      )}
    </div>
  )
}
