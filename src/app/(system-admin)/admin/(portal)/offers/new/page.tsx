import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { OfferForm } from './OfferForm'

export default async function NewOfferPage() {
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-gray-900">{tr.nav_offers} — {tr.add_new}</h1>
      <OfferForm offer={null} tr={tr} />
    </div>
  )
}
