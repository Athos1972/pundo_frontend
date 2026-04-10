import { notFound } from 'next/navigation'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getShopOwnerOffer } from '@/lib/system-admin-api'
import { ShopOwnerOfferEditForm } from './ShopOwnerOfferEditForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditShopOwnerOfferPage({ params }: PageProps) {
  const { id } = await params
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const offer = await getShopOwnerOffer(Number(id)).catch(() => null)
  if (!offer) notFound()

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-gray-900">{tr.nav_so_offers} — {offer.title}</h1>
      <ShopOwnerOfferEditForm offer={offer} tr={tr} />
    </div>
  )
}
