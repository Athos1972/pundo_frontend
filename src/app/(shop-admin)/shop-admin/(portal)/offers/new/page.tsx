import { getLangServer } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import { OfferForm } from '@/components/shop-admin/OfferForm'
import { getAdminPriceUnits } from '@/lib/shop-admin-api'

export default async function NewOfferPage() {
  const lang = await getLangServer()
  const tr = tAdmin(lang)

  let priceUnits: Awaited<ReturnType<typeof getAdminPriceUnits>> = []
  try {
    priceUnits = await getAdminPriceUnits(lang)
  } catch {
    // Backend not yet available
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900">{tr.add_offer}</h1>
      <OfferForm priceUnits={priceUnits} lang={lang} />
    </div>
  )
}
