import { getLangServer } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import { getAdminShop } from '@/lib/shop-admin-api'
import { ShopDangerZone } from '@/components/shop-admin/ShopDangerZone'

export default async function SettingsPage() {
  const lang = await getLangServer()
  const tr = tAdmin(lang)

  try {
    await getAdminShop(lang)
  } catch {
    // Shop not accessible — ShopDangerZone still renders
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900">{tr.settings_title}</h1>
      <ShopDangerZone tr={tr} />
    </div>
  )
}
