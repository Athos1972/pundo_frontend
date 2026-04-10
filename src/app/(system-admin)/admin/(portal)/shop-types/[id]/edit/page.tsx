import { notFound } from 'next/navigation'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getShopType } from '@/lib/system-admin-api'
import { ShopTypeEditForm } from './ShopTypeEditForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditShopTypePage({ params }: PageProps) {
  const { id } = await params
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const shopType = await getShopType(Number(id)).catch(() => null)
  if (!shopType) notFound()

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-gray-900">{tr.nav_shop_types} — {shopType.name}</h1>
      <ShopTypeEditForm shopType={shopType} tr={tr} />
    </div>
  )
}
