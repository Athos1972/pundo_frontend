import { PersonForm } from '@/components/system-admin/crm/PersonForm'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'

export default async function NewCrmPersonPage() {
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{tr.crm_person_new}</h1>
      <PersonForm tr={tr} lang={lang} />
    </div>
  )
}
