import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'

const ENTITIES = [
  { href: '/admin/shops', icon: '🏪', key: 'nav_shops' as const },
  { href: '/admin/shop-types', icon: '🏷', key: 'nav_shop_types' as const },
  { href: '/admin/shop-owners', icon: '👤', key: 'nav_shop_owners' as const },
  { href: '/admin/products', icon: '📦', key: 'nav_products' as const },
  { href: '/admin/categories', icon: '🗂', key: 'nav_categories' as const },
  { href: '/admin/category-attribute-definitions', icon: '📋', key: 'nav_cat_attr_defs' as const },
  { href: '/admin/brands', icon: '✦', key: 'nav_brands' as const },
  { href: '/admin/offers', icon: '💰', key: 'nav_offers' as const },
  { href: '/admin/shop-owner-offers', icon: '🛍', key: 'nav_so_offers' as const },
  { href: '/admin/api-keys', icon: '🔑', key: 'nav_api_keys' as const },
]

export default async function AdminDashboardPage() {
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{tr.dashboard_title}</h1>
        <p className="text-sm text-gray-500 mt-1">{tr.dashboard_subtitle}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {ENTITIES.map((entity) => (
          <Link
            key={entity.href}
            href={entity.href}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-200
              hover:border-slate-400 hover:shadow-sm transition-all text-center"
          >
            <span className="text-2xl" aria-hidden="true">{entity.icon}</span>
            <span className="text-sm font-medium text-gray-700">{tr[entity.key]}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
