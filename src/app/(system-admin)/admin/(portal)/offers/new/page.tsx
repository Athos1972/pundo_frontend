import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'

// The backend has no POST /admin/offers (offers come from shop owners and crawlers); this route only explains that.
export default async function NewOfferPage() {
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-gray-900">{tr.nav_offers}</h1>
      <p className="text-sm text-gray-600">{tr.offers_created_elsewhere}</p>
    </div>
  )
}
