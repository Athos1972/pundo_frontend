import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { MappingForm } from '../MappingForm'

export default async function NewItemDomainMappingPage() {
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/item-domain-mappings"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← {tr.idm_title}
        </Link>
      </div>
      <h1 className="text-xl font-semibold text-gray-900">{tr.idm_new}</h1>
      <MappingForm tr={tr} mode="create" />
    </div>
  )
}
