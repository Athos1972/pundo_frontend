import { getLangServer } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import { OfferForm } from '@/components/shop-admin/OfferForm'
import { getAdminOffers, getAdminProducts } from '@/lib/shop-admin-api'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditOfferPage({ params }: Props) {
  const { id } = await params
  const lang = await getLangServer()
  const tr = tAdmin(lang)

  let offer = null
  let products: { id: number; name: string }[] = []

  try {
    const [offerData, productData] = await Promise.all([
      getAdminOffers(lang),
      getAdminProducts(lang),
    ])
    offer = offerData.items.find((o) => o.id === Number(id)) ?? null
    products = productData.items.map((p) => ({ id: p.id, name: p.name }))
  } catch {
    // Backend not yet available
  }

  if (offer === null && process.env.NODE_ENV === 'production') notFound()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900">{tr.edit} — {offer?.title ?? `#${id}`}</h1>
      <OfferForm offer={offer ?? undefined} products={products} lang={lang} />
    </div>
  )
}
