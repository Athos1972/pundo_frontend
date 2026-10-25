'use client'
// ─── Add a CRM person (F7600 CRM-Backbone, org cut, T16) ──────────────────────────────────────────────────────────
// First name, last name and "Name": as soon as a name part is filled, the name is derived (read-only preview of the
// backend rule); without parts the name is free (foreign-language cards). Salutation only as an explicit choice,
// birthday with "year unknown", optional personal channels (a person without a channel is allowed, EA5).
// Clean Boundary: only system-admin components, types and translations.

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { crmPost } from './crmFetch'
import { crmPath } from './crmPaths'
import { BirthDateField } from './BirthDateField'
import { EMPTY_BIRTH_DATE, birthDateRequest, type BirthDateInput } from './crmBirthDate'
import { SALUTATIONS, deriveDisplayName, salutationLabel } from './crmPersonName'
import type { CrmChannelKindIn, CrmPerson, CrmPersonCreateRequest, CrmSalutation } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

const INPUT = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm'
const LABEL = 'flex flex-col gap-1 text-sm text-gray-700'

export function PersonForm({ tr, lang }: { tr: SysAdminTranslations; lang: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [freeName, setFreeName] = useState('')
  const [salutation, setSalutation] = useState<CrmSalutation | ''>('')
  const [birth, setBirth] = useState<BirthDateInput>(EMPTY_BIRTH_DATE)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [addressLine, setAddressLine] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [existingPersonId, setExistingPersonId] = useState<number | null>(null)

  const derived = deriveDisplayName(firstName, lastName)
  const birthRequest = birthDateRequest(birth)
  const hasName = derived !== null || freeName.trim() !== ''

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!hasName || birthRequest === 'invalid') return
    const channels: Array<{ kind: CrmChannelKindIn; value: string }> = []
    if (email.trim()) channels.push({ kind: 'email', value: email.trim() })
    if (phone.trim()) channels.push({ kind: 'phone', value: phone.trim() })
    const body: CrmPersonCreateRequest = {
      // the backend derives the name from the parts; sending `display_name` as well would be refused (422)
      ...(derived !== null
        ? { first_name: firstName.trim() || null, last_name: lastName.trim() || null }
        : { display_name: freeName.trim() }),
      salutation: salutation || null,
      ...(birthRequest.birth_date ? birthRequest : {}),
      channels,
      address: addressLine.trim() || city.trim() || postalCode.trim()
        ? { address_line1: addressLine.trim() || null, city: city.trim() || null, postal_code: postalCode.trim() || null, country_code: 'CY' }
        : null,
    }
    setExistingPersonId(null)
    start(async () => {
      const result = await crmPost<CrmPerson>(crmPath('personCreate'), body, tr)
      if (result.ok && result.data) router.push(`/admin/crm/persons/${result.data.id}`)
      else if (result.code === 'person_channel_exists' && result.extras?.person_id) setExistingPersonId(result.extras.person_id)
    })
  }

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5">
      <div className="grid grid-cols-2 gap-3">
        <label className={LABEL}>{tr.crm_person_first_name}<input className={INPUT} value={firstName} onChange={(e) => setFirstName(e.target.value)} /></label>
        <label className={LABEL}>{tr.crm_person_last_name}<input className={INPUT} value={lastName} onChange={(e) => setLastName(e.target.value)} /></label>
      </div>
      <label className={LABEL}>
        {tr.crm_person_name}
        <input
          className={`${INPUT} read-only:bg-gray-50 read-only:text-gray-600`}
          value={derived ?? freeName}
          readOnly={derived !== null}
          aria-describedby="person-name-hint"
          onChange={(e) => setFreeName(e.target.value)}
        />
      </label>
      <p id="person-name-hint" className="-mt-2 text-xs text-gray-500">{derived !== null ? tr.crm_person_name_derived_hint : tr.crm_person_name_free_hint}</p>
      <label className={LABEL}>
        {tr.crm_person_salutation}
        <select className={INPUT} value={salutation} onChange={(e) => setSalutation(e.target.value as CrmSalutation | '')}>
          <option value="">{tr.crm_salutation_unset}</option>
          {SALUTATIONS.map((value) => <option key={value} value={value}>{salutationLabel(tr, value)}</option>)}
        </select>
      </label>
      <p className="-mt-2 text-xs text-gray-500">{tr.crm_person_salutation_hint}</p>
      <BirthDateField value={birth} onChange={setBirth} lang={lang} tr={tr} />
      <h2 className="mt-2 text-sm font-semibold text-gray-800">{tr.crm_person_channels_title}</h2>
      <label className={LABEL}>{tr.crm_form_email}<input className={INPUT} type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label className={LABEL}>{tr.crm_form_phone}<input className={INPUT} value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
      <p className="-mt-2 text-xs text-gray-500">{tr.crm_person_channels_hint}</p>
      <label className={LABEL}>{tr.address}<input className={INPUT} value={addressLine} onChange={(e) => setAddressLine(e.target.value)} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className={LABEL}>{tr.crm_form_city}<input className={INPUT} value={city} onChange={(e) => setCity(e.target.value)} /></label>
        <label className={LABEL}>{tr.postal_code}<input className={INPUT} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} /></label>
      </div>
      {existingPersonId !== null && (
        <p className="text-sm text-amber-800">
          {tr.crm_person_channel_exists_hint}{' '}
          <Link className="underline" href={`/admin/crm/persons/${existingPersonId}`}>{tr.crm_person_open_existing}</Link>
        </p>
      )}
      {!hasName && <p className="text-xs text-gray-500">{tr.crm_person_name_required}</p>}
      <button type="submit" disabled={pending || !hasName || birthRequest === 'invalid'} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{tr.crm_person_new}</button>
    </form>
  )
}
