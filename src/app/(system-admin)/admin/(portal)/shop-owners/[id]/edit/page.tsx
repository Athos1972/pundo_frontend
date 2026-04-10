import { notFound } from 'next/navigation'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getShopOwner } from '@/lib/system-admin-api'
import { ShopOwnerEditForm } from './ShopOwnerEditForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditShopOwnerPage({ params }: PageProps) {
  const { id } = await params
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const owner = await getShopOwner(Number(id)).catch(() => null)
  if (!owner) notFound()

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-gray-900">{tr.nav_shop_owners} — {owner.name}</h1>
      <ShopOwnerEditForm owner={owner} tr={tr} />
    </div>
  )
}
