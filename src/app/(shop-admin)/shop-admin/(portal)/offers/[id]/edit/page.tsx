import { getLangServer } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import { OfferForm } from '@/components/shop-admin/OfferForm'
import { getAdminOffers, getAdminPriceUnits } from '@/lib/shop-admin-api'
import { notFound } from 'next/navigation'
import type { ItemSearchResult } from '@/types/shop-admin'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditOfferPage({ params }: Props) {
  const { id } = await params
  const lang = await getLangServer()
  const tr = tAdmin(lang)

  let offer = null
  let priceUnits: Awaited<ReturnType<typeof getAdminPriceUnits>> = []
  let preloadedItem: ItemSearchResult | null = null

  try {
    const [offerData, units] = await Promise.all([
      getAdminOffers(lang),
      getAdminPriceUnits(lang),
    ])
    offer = offerData.items.find((o) => o.id === Number(id)) ?? null
    priceUnits = units

    // Try to load item info from shop_listing if embedded
    // The backend may embed item info directly in the offer response
    // Cast to extended type to check for embedded item data
    const offerWithItem = offer as (typeof offer & { item?: { id: number; slug: string; item_type: string; name?: string; names?: Record<string, string>; category_id?: number; ean?: string | null; photos?: { url: string }[] } }) | null
    if (offerWithItem?.item) {
      const itm = offerWithItem.item
      preloadedItem = {
        id: itm.id,
        slug: itm.slug,
        item_type: (itm.item_type ?? 'product') as 'product' | 'service',
        name: itm.names ? (itm.names[lang] ?? itm.names['de'] ?? itm.names['en'] ?? `Item #${itm.id}`) : (itm.name ?? `Item #${itm.id}`),
        category_id: itm.category_id ?? 0,
        ean: itm.ean ?? null,
        photo_url: itm.photos?.[0]?.url ?? null,
      }
    }
  } catch {
    // Backend not yet available
  }

  if (offer === null && process.env.NODE_ENV === 'production') notFound()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900">
        {tr.edit} — {offer?.title ?? `#${id}`}
      </h1>
      <OfferForm
        offer={offer ?? undefined}
        preloadedItem={preloadedItem}
        priceUnits={priceUnits}
        lang={lang}
      />
    </div>
  )
}
