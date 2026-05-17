import { getLangServer } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import { getAdminShop, getWebsiteStatus } from '@/lib/shop-admin-api'
import { ProfileForm } from './ProfileForm'
import { WebsiteStatusBanner } from '@/components/shop-admin/WebsiteStatusBanner'

export default async function ProfilePage() {
  const lang = await getLangServer()
  const tr = tAdmin(lang)

  let shop = null
  try {
    shop = await getAdminShop(lang)
  } catch {
    // Backend not yet available
  }

  const websiteStatus = await getWebsiteStatus()

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900">{tr.profile_title}</h1>
      <WebsiteStatusBanner status={websiteStatus} />
      <ProfileForm shop={shop} lang={lang} />
    </div>
  )
}
