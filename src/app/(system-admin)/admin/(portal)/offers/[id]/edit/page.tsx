import { notFound } from 'next/navigation'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getOffer, getAllShops, getAllProducts } from '@/lib/system-admin-api'
import { OfferForm } from '../../new/OfferForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditOfferPage({ params }: PageProps) {
  const { id } = await params
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)

  const [offer, shops, products] = await Promise.all([
    getOffer(Number(id)).catch(() => null),
    getAllShops().catch(() => []),
    getAllProducts().catch(() => []),
  ])

  if (!offer) notFound()

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-gray-900">{tr.nav_offers} — #{offer.id}</h1>
      <OfferForm offer={offer} shops={shops} products={products} tr={tr} />
    </div>
  )
}
