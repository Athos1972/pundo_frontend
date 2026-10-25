'use client'
// ─── Edit the master data of a CRM person (F7600 CRM-Backbone, org cut, T16) ──────────────────────────────────────
// Name rule (Design §6a): with a first or last name the name is derived and read-only; the derivation replaces a free
// name, so before saving the admin confirms "‹old› will be replaced by ‹new›" (AC 32). Clearing both parts keeps the
// last name as free, editable text again. Only changed fields are sent (PATCH semantics); `display_name` is never sent
// while a name part is set (422 `person_display_name_derived`).
// Clean Boundary: only system-admin components, types and translations.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmDialog } from '@/components/system-admin/ConfirmDialog'
import { crmPatch } from './crmFetch'
import { crmPath } from './crmPaths'
import { BirthDateField } from './BirthDateField'
import { birthDateInputFrom, birthDateRequest, type BirthDateInput } from './crmBirthDate'
import { SALUTATIONS, deriveDisplayName, nameReplacement, salutationLabel } from './crmPersonName'
import type { CrmAddressIn, CrmPerson, CrmPersonWriteRequest, CrmSalutation } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

const INPUT = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm'
const LABEL = 'flex flex-col gap-1 text-sm text-gray-700'

const orNull = (value: string) => value.trim() || null

interface PersonEditFormProps {
  person: CrmPerson
  tr: SysAdminTranslations
  lang: string
}

/** The PATCH body of the form: only fields that differ from the loaded person. `null` = nothing to save. */
export function personPatch(
  person: CrmPerson,
  form: { firstName: string; lastName: string; freeName: string; salutation: CrmSalutation | ''; birth: BirthDateInput; address: { line: string; city: string; postalCode: string } },
): CrmPersonWriteRequest | null {
  const patch: CrmPersonWriteRequest = {}
  const first = orNull(form.firstName)
  const last = orNull(form.lastName)
  if (first !== person.first_name) patch.first_name = first
  if (last !== person.last_name) patch.last_name = last
  if (deriveDisplayName(first, last) === null && orNull(form.freeName) !== person.display_name) {
    patch.display_name = orNull(form.freeName)
  }
  const salutation = form.salutation || null
  if (salutation !== person.salutation) patch.salutation = salutation
  const birth = birthDateRequest(form.birth)
  if (birth !== 'invalid' && (birth.birth_date !== person.birth_date || birth.birth_year_unknown !== person.birth_year_unknown)) {
    patch.birth_date = birth.birth_date
    patch.birth_year_unknown = birth.birth_year_unknown
  }
  const old = person.address
  const address: CrmAddressIn = { address_line1: orNull(form.address.line), city: orNull(form.address.city), postal_code: orNull(form.address.postalCode) }
  const hasAddress = Boolean(address.address_line1 || address.city || address.postal_code)
  const addressChanged = old
    ? address.address_line1 !== old.address_line1 || address.city !== old.city || address.postal_code !== old.postal_code
    : hasAddress
  if (addressChanged && hasAddress) patch.address = { ...address, country_code: old?.country_code ?? 'CY' }
  return Object.keys(patch).length ? patch : null
}

export function PersonEditForm({ person, tr, lang }: PersonEditFormProps) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [firstName, setFirstName] = useState(person.first_name ?? '')
  const [lastName, setLastName] = useState(person.last_name ?? '')
  const [freeName, setFreeName] = useState(person.display_name ?? '')
  const [salutation, setSalutation] = useState<CrmSalutation | ''>(person.salutation ?? '')
  const [birth, setBirth] = useState<BirthDateInput>(birthDateInputFrom(person.birth_date, person.birth_year_unknown))
  const [line, setLine] = useState(person.address?.address_line1 ?? '')
  const [city, setCity] = useState(person.address?.city ?? '')
  const [postalCode, setPostalCode] = useState(person.address?.postal_code ?? '')
  const [confirming, setConfirming] = useState(false)

  const derived = deriveDisplayName(firstName, lastName)
  const replacement = nameReplacement(person, firstName, lastName)
  const birthInvalid = birthDateRequest(birth) === 'invalid'
  const patch = personPatch(person, { firstName, lastName, freeName, salutation, birth, address: { line, city, postalCode } })

  function send() {
    if (!patch) return
    start(async () => {
      const result = await crmPatch<CrmPerson>(crmPath('personUpdate', { person_id: person.id }), patch, tr)
      setConfirming(false)
      if (result.ok) router.refresh()
    })
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!patch || birthInvalid) return
    if (replacement) setConfirming(true)
    else send()
  }

  function removeAddress() {
    start(async () => {
      const result = await crmPatch<CrmPerson>(crmPath('personUpdate', { person_id: person.id }), { address: null } satisfies CrmPersonWriteRequest, tr)
      if (result.ok) router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-gray-800">{tr.crm_master_data}</h2>
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
          aria-describedby="person-edit-name-hint"
          onChange={(e) => setFreeName(e.target.value)}
        />
      </label>
      <p id="person-edit-name-hint" className="-mt-2 text-xs text-gray-500">{derived !== null ? tr.crm_person_name_derived_hint : tr.crm_person_name_free_hint}</p>
      {replacement && (
        <p className="text-xs text-amber-800">
          {tr.crm_person_name_replace_notice.replace('{from}', replacement.from).replace('{to}', replacement.to)}
        </p>
      )}
      <label className={LABEL}>
        {tr.crm_person_salutation}
        <select className={INPUT} value={salutation} onChange={(e) => setSalutation(e.target.value as CrmSalutation | '')}>
          <option value="">{tr.crm_salutation_unset}</option>
          {SALUTATIONS.map((value) => <option key={value} value={value}>{salutationLabel(tr, value)}</option>)}
        </select>
      </label>
      <p className="-mt-2 text-xs text-gray-500">{tr.crm_person_salutation_hint}</p>
      <BirthDateField value={birth} onChange={setBirth} lang={lang} tr={tr} />
      <label className={LABEL}>{tr.address}<input className={INPUT} value={line} onChange={(event) => setLine(event.target.value)} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className={LABEL}>{tr.crm_form_city}<input className={INPUT} value={city} onChange={(event) => setCity(event.target.value)} /></label>
        <label className={LABEL}>{tr.postal_code}<input className={INPUT} value={postalCode} onChange={(event) => setPostalCode(event.target.value)} /></label>
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={pending || !patch || birthInvalid} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{tr.save}</button>
        {person.address && <button type="button" onClick={removeAddress} disabled={pending} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50">{tr.crm_person_remove_address}</button>}
      </div>
      <ConfirmDialog
        open={confirming && replacement !== null}
        message={replacement ? tr.crm_person_name_replace_confirm.replace('{from}', replacement.from).replace('{to}', replacement.to) : ''}
        confirmLabel={tr.crm_person_name_replace_ok}
        cancelLabel={tr.cancel}
        isPending={pending}
        onConfirm={send}
        onCancel={() => setConfirming(false)}
      />
    </form>
  )
}
