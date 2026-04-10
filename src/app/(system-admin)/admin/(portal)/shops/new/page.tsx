import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getAllShopTypes } from '@/lib/system-admin-api'
import { ShopForm } from '@/components/system-admin/ShopForm'

export default async function NewShopPage() {
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const shopTypes = await getAllShopTypes().catch(() => [])

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-gray-900">{tr.nav_shops} — {tr.add_new}</h1>
      <ShopForm shop={null} shopTypes={shopTypes} tr={tr} />
    </div>
  )
}
