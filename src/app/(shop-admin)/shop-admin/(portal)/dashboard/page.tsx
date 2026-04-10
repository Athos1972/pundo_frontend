import { getLangServer } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import { getMe } from '@/lib/shop-admin-api'
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

  const quickLinks = [
    { href: '/shop-admin/profile', label: tr.nav_profile, icon: '🏪' },
    { href: '/shop-admin/hours', label: tr.nav_hours, icon: '🕐' },
    { href: '/shop-admin/products', label: tr.nav_products, icon: '📦' },
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
      </div>
    </div>
  )
}
