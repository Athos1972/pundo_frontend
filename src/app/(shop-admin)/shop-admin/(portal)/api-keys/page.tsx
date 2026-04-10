import { getLangServer } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import { getApiKeys } from '@/lib/shop-admin-api'
import { ApiKeyList } from '@/components/shop-admin/ApiKeyList'

export default async function ApiKeysPage() {
  const lang = await getLangServer()
  const tr = tAdmin(lang)

  let keys: Awaited<ReturnType<typeof getApiKeys>> = []
  try {
    keys = await getApiKeys(lang)
  } catch {
    // Backend not yet available
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900">{tr.api_keys_title}</h1>
      <ApiKeyList initialKeys={keys} lang={lang} />
    </div>
  )
}
