'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { crmPost } from './crmFetch'
import type { CrmPerson, CrmPersonCreateRequest } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

const INPUT = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm'

export function PersonForm({ tr }: { tr: SysAdminTranslations }) {
  const router = useRouter(); const [pending, start] = useTransition()
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [phone, setPhone] = useState('')
  const [addressLine, setAddressLine] = useState(''); const [city, setCity] = useState(''); const [postalCode, setPostalCode] = useState('')
  function submit(event: React.FormEvent) {
    event.preventDefault()
    const identifiers: CrmPersonCreateRequest['identifiers'] = []
    if (email.trim()) identifiers.push({ kind: 'email', value: email.trim() })
    if (phone.trim()) identifiers.push({ kind: 'phone', value: phone.trim() })
    const address = addressLine.trim() || city.trim() || postalCode.trim() ? { address_line1: addressLine.trim() || undefined, city: city.trim() || undefined, postal_code: postalCode.trim() || undefined, country_code: 'CY' } : undefined
    start(async () => { const result = await crmPost<CrmPerson>('crm/persons', { display_name: name.trim() || undefined, identifiers, address }, tr); if (result.ok && result.data) router.push(`/admin/crm/persons/${result.data.id}`) })
  }
  return <form onSubmit={submit} className="flex max-w-xl flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5">
    <label className="flex flex-col gap-1 text-sm text-gray-700">{tr.crm_form_display_name}<input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} /></label>
    <label className="flex flex-col gap-1 text-sm text-gray-700">{tr.crm_form_email}<input className={INPUT} type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
    <label className="flex flex-col gap-1 text-sm text-gray-700">{tr.crm_form_phone}<input className={INPUT} value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
    <label className="flex flex-col gap-1 text-sm text-gray-700">{tr.address}<input className={INPUT} value={addressLine} onChange={(e) => setAddressLine(e.target.value)} /></label>
    <div className="grid grid-cols-2 gap-3"><label className="flex flex-col gap-1 text-sm text-gray-700">{tr.crm_form_city}<input className={INPUT} value={city} onChange={(e) => setCity(e.target.value)} /></label><label className="flex flex-col gap-1 text-sm text-gray-700">{tr.postal_code}<input className={INPUT} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} /></label></div>
    <button type="submit" disabled={pending || (!email.trim() && !phone.trim())} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{tr.crm_person_new}</button>
  </form>
}
