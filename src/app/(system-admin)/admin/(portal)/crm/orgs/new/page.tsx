// @seo-allow-default
// Create a CRM organisation (F7600, org cut; replaces the former contact form).
import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { OrgForm } from '@/components/system-admin/crm/OrgForm'

export default async function NewCrmOrgPage() {
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/crm/orgs" className="text-sm text-gray-500 hover:text-gray-700">← {tr.crm_orgs_title}</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-semibold text-gray-900">{tr.crm_org_new}</h1>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <OrgForm tr={tr} />
      </div>
    </div>
  )
}
