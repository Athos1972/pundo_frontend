import { getLangServer } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import { OfferForm } from '@/components/shop-admin/OfferForm'
import { OfferItemHeader, resolveLocalizedName } from '@/components/shop-admin/OfferItemHeader'
import { getAdminOffer, getAdminPriceUnits } from '@/lib/shop-admin-api'
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
    const [fetchedOffer, units] = await Promise.all([
      getAdminOffer(Number(id), lang).catch(() => null),
      getAdminPriceUnits(lang),
    ])
    offer = fetchedOffer
    priceUnits = units

    if (offer?.item) {
      const itm = offer.item
      preloadedItem = {
        id: itm.id,
        slug: itm.slug,
        item_type: itm.item_type,
        name: resolveLocalizedName(itm.names, lang) ?? `Item #${itm.id}`,
        category_id: itm.category_id ?? 0,
        ean: itm.ean ?? null,
        photo_url: itm.photos[0]?.thumbnail_url ?? itm.photos[0]?.url ?? null,
      }
    }
  } catch {
    // Backend not yet available
  }

  if (offer === null && process.env.NODE_ENV === 'production') notFound()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900">
        {tr.edit} — {offer?.item ? (resolveLocalizedName(offer.item.names, lang) ?? offer?.title ?? `#${id}`) : (offer?.title ?? `#${id}`)}
      </h1>
      {offer?.item && <OfferItemHeader item={offer.item} lang={lang} offerId={Number(id)} />}
      <OfferForm
        offer={offer ?? undefined}
        preloadedItem={preloadedItem}
        priceUnits={priceUnits}
        lang={lang}
      />
    </div>
  )
}
