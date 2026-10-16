import { getLangServer } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import { getMe, getShopReviewSummary } from '@/lib/shop-admin-api'
import type { ShopOwnerReviewSummary } from '@/types/shop-admin'
import Link from 'next/link'

export default async function DashboardPage() {
  const lang = await getLangServer()
  const tr = tAdmin(lang)

  let name = ''
  try {
    const me = await getMe(lang)
    name = me.name
  } catch {
    // Backend not yet available — show generic welcome
  }

  let reviews: ShopOwnerReviewSummary | null = null
  try {
    reviews = (await getShopReviewSummary(lang)) ?? null
  } catch {
    // tile still links to the reviews page, just without numbers
  }

  const quickLinks = [
    { href: '/shop-admin/profile', label: tr.nav_profile, icon: '🏪' },
    { href: '/shop-admin/hours', label: tr.nav_hours, icon: '🕐' },
    { href: '/shop-admin/offers', label: tr.nav_offers, icon: '🏷️' },
    { href: '/shop-admin/import', label: tr.nav_import, icon: '⬆' },
    { href: '/shop-admin/api-keys', label: tr.nav_api_keys, icon: '🔑' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{tr.dashboard_title}</h1>
        {name && <p className="text-gray-500 mt-1">{tr.dashboard_welcome}, {name}</p>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 hover:border-accent hover:shadow-sm transition-all group"
          >
            <span className="text-2xl" aria-hidden="true">{link.icon}</span>
            <span className="text-sm font-medium text-gray-700 group-hover:text-accent transition-colors">
              {link.label}
            </span>
          </Link>
        ))}
        <Link
          href="/shop-admin/reviews"
          className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-2 hover:border-accent hover:shadow-sm transition-all group"
        >
          <span className="text-2xl" aria-hidden="true">★</span>
          <span className="text-sm font-medium text-gray-700 group-hover:text-accent transition-colors">
            {tr.shop_reviews_tile_title}
          </span>
          {reviews && (
            <>
              <span className={`text-xs ${reviews.new_count > 0 ? 'font-semibold text-red-600' : 'text-gray-500'}`}>
                {reviews.new_count > 0
                  ? tr.shop_reviews_tile_new.replace('{n}', String(reviews.new_count))
                  : tr.shop_reviews_tile_none_new}
              </span>
              <span className="text-xs text-gray-500">
                {reviews.shop_total > 0
                  ? tr.shop_reviews_tile_average
                      .replace('{avg}', reviews.shop_average_stars.toFixed(1))
                      .replace('{total}', String(reviews.shop_total))
                  : tr.shop_reviews_tile_no_reviews}
              </span>
            </>
          )}
        </Link>
      </div>
    </div>
  )
}
