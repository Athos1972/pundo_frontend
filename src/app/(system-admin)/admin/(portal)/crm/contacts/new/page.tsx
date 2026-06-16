// @seo-allow-default
import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { ContactForm } from '@/components/system-admin/crm/ContactForm'

export default async function NewCrmContactPage() {
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/crm/contacts"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← {tr.crm_title}
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-semibold text-gray-900">{tr.crm_new}</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <ContactForm tr={tr} />
      </div>
    </div>
  )
}
