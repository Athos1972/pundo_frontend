import { notFound } from 'next/navigation'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getOffer } from '@/lib/system-admin-api'
import { OfferForm } from '../../new/OfferForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditOfferPage({ params }: PageProps) {
  const { id } = await params
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)

  const offer = await getOffer(Number(id)).catch(() => null)

  if (!offer) notFound()

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-gray-900">{tr.nav_offers} — #{offer.id}</h1>
      <OfferForm offer={offer} tr={tr} />
    </div>
  )
}
