import Link from 'next/link'
import { NewPrivacyCaseForm } from '@/components/system-admin/privacy/NewPrivacyCaseForm'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'

export default async function NewPrivacyRequestPage() {
  const tr = tSysAdmin(await getLangServer())
  return <main className="flex flex-col gap-5"><Link className="text-sm underline" href="/admin/privacy-requests">{tr.privacy_requests_title}</Link><h1 className="text-xl font-semibold">{tr.privacy_case_new}</h1><NewPrivacyCaseForm tr={tr} /></main>
}
