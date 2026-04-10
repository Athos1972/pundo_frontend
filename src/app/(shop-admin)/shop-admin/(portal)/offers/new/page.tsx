import { getLangServer } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import { OfferForm } from '@/components/shop-admin/OfferForm'
import { getAdminProducts } from '@/lib/shop-admin-api'

export default async function NewOfferPage() {
  const lang = await getLangServer()
  const tr = tAdmin(lang)

  let products: { id: number; name: string }[] = []
  try {
    const data = await getAdminProducts(lang)
    products = data.items.map((p) => ({ id: p.id, name: p.name }))
  } catch {
    // Backend not yet available
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900">{tr.add_offer}</h1>
      <OfferForm products={products} lang={lang} />
    </div>
  )
}
