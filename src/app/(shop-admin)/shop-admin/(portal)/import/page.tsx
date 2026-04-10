import { getLangServer } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import { getImportStatus } from '@/lib/shop-admin-api'
import { ImportPanel } from '@/components/shop-admin/ImportPanel'
import type { ImportStatus } from '@/types/shop-admin'

export default async function ImportPage() {
  const lang = await getLangServer()
  const tr = tAdmin(lang)

  let status: ImportStatus = {}
  try {
    status = await getImportStatus(lang)
  } catch {
    // Backend not yet available
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900">{tr.import_title}</h1>
      <ImportPanel initialStatus={status} lang={lang} />
    </div>
  )
}
