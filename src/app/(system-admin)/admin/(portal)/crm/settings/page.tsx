// @seo-allow-default
import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getAdminMe, getCrmConfig } from '@/lib/system-admin-api'
import { SafetyPanel } from '@/components/system-admin/crm/SafetyPanel'

export default async function CrmSettingsPage() {
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const [config, me] = await Promise.all([getCrmConfig(), getAdminMe()])
  const canWrite =
    me.role === 'superadmin' || me.permissions == null || me.permissions.includes('crm:config:write')

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-gray-900">{tr.crm_safety_title}</h1>
        <Link href="/admin/crm/orgs" className="text-sm text-gray-500 hover:text-gray-700">
          ← {tr.crm_orgs_title}
        </Link>
      </div>
      <SafetyPanel config={config} canWrite={canWrite} tr={tr} />
    </div>
  )
}
