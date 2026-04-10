import { getLangServer } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import { getAdminShop } from '@/lib/shop-admin-api'
import { ProfileForm } from './ProfileForm'

export default async function ProfilePage() {
  const lang = await getLangServer()
  const tr = tAdmin(lang)

  let shop = null
  try {
    shop = await getAdminShop(lang)
  } catch {
    // Backend not yet available
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900">{tr.profile_title}</h1>
      <ProfileForm shop={shop} lang={lang} />
    </div>
  )
}
