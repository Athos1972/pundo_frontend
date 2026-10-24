'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { crmPost } from './crmFetch'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

export function ContactPersonLink({ contactId, personId, canWrite, tr }: { contactId: number; personId: number | null; canWrite: boolean; tr: SysAdminTranslations }) {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [pending, start] = useTransition()
  if (personId) return <Link className="text-sm text-slate-700 underline" href={`/admin/crm/persons/${personId}`}>{tr.crm_person_linked}: #{personId}</Link>
  if (!canWrite) return null
  function submit(event: React.FormEvent) {
    event.preventDefault()
    const target = Number(value)
    if (!Number.isInteger(target) || target < 1) return
    start(async () => { const result = await crmPost(`crm/persons/${target}/contacts/${contactId}`, {}, tr); if (result.ok) router.refresh() })
  }
  return <form onSubmit={submit} className="flex items-end gap-2"><label className="flex flex-col gap-1 text-xs text-gray-600" htmlFor="crm-person-id">{tr.crm_person_id}<input id="crm-person-id" className="w-28 rounded border px-2 py-1" inputMode="numeric" value={value} onChange={(event) => setValue(event.target.value)} required /></label><button type="submit" disabled={pending} className="rounded bg-slate-800 px-3 py-1 text-sm text-white">{tr.crm_person_link}</button></form>
}
