import { notFound } from 'next/navigation'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getShop, getAllShopTypes } from '@/lib/system-admin-api'
import { ShopForm } from '@/components/system-admin/ShopForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditShopPage({ params }: PageProps) {
  const { id } = await params
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)

  const [shop, shopTypes] = await Promise.all([
    getShop(Number(id)).catch(() => null),
    getAllShopTypes().catch(() => []),
  ])

  if (!shop) notFound()

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-gray-900">{tr.nav_shops} — {shop.names?.['en'] ?? shop.slug}</h1>
      <ShopForm shop={shop} shopTypes={shopTypes} tr={tr} />
    </div>
  )
}
