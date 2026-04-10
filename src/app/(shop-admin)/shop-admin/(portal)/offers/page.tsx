import { getLangServer } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import { getAdminOffers } from '@/lib/shop-admin-api'
import { OfferList } from '@/components/shop-admin/OfferList'
import Link from 'next/link'

export default async function OffersPage() {
  const lang = await getLangServer()
  const tr = tAdmin(lang)

  let activeItems: Awaited<ReturnType<typeof getAdminOffers>>['items'] = []
  let expiredItems: Awaited<ReturnType<typeof getAdminOffers>>['items'] = []

  try {
    const [activeData, expiredData] = await Promise.all([
      getAdminOffers(lang, { archived: false }),
      getAdminOffers(lang, { archived: true }),
    ])
    activeItems = activeData.items
    expiredItems = expiredData.items
  } catch {
    // Backend not yet available
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{tr.offers_title}</h1>
        <Link
          href="/shop-admin/offers/new"
          className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-semibold
            hover:bg-accent-dark transition-colors"
        >
          + {tr.add_offer}
        </Link>
      </div>
      <OfferList activeItems={activeItems} expiredItems={expiredItems} lang={lang} />
    </div>
  )
}
