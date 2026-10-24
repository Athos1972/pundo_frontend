'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { crmPatch } from './crmFetch'
import type { CrmPerson } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

const INPUT = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm'

export function PersonEditForm({ person, tr }: { person: CrmPerson; tr: SysAdminTranslations }) {
  const router = useRouter(); const [pending, start] = useTransition()
  const [name, setName] = useState(person.display_name ?? '')
  const [line, setLine] = useState(person.address?.address_line1 ?? '')
  const [city, setCity] = useState(person.address?.city ?? '')
  const [postalCode, setPostalCode] = useState(person.address?.postal_code ?? '')
  function submit(event: React.FormEvent) {
    event.preventDefault()
    const address = line.trim() || city.trim() || postalCode.trim() ? { address_line1: line.trim() || undefined, city: city.trim() || undefined, postal_code: postalCode.trim() || undefined, country_code: person.address?.country_code ?? 'CY' } : undefined
    start(async () => { const result = await crmPatch<CrmPerson>(`crm/persons/${person.id}`, { display_name: name.trim() || null, address }, tr); if (result.ok) router.refresh() })
  }
  return <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5"><label className="flex flex-col gap-1 text-sm text-gray-700">{tr.crm_form_display_name}<input className={INPUT} value={name} onChange={(event) => setName(event.target.value)} /></label><label className="flex flex-col gap-1 text-sm text-gray-700">{tr.address}<input className={INPUT} value={line} onChange={(event) => setLine(event.target.value)} /></label><div className="grid grid-cols-2 gap-3"><label className="flex flex-col gap-1 text-sm text-gray-700">{tr.crm_form_city}<input className={INPUT} value={city} onChange={(event) => setCity(event.target.value)} /></label><label className="flex flex-col gap-1 text-sm text-gray-700">{tr.postal_code}<input className={INPUT} value={postalCode} onChange={(event) => setPostalCode(event.target.value)} /></label></div><button type="submit" disabled={pending} className="self-start rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{tr.save}</button></form>
}
