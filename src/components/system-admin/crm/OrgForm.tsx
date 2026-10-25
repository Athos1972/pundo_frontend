'use client'
// ─── CRM organisation form (F7600, org cut; replaces ContactForm) ─────────────────────────────────────────────────────
// Creates an organisation via POST /admin/crm/orgs, optionally as acquisition target (lead status SOURCED) or as plain
// master data (lead status empty, e.g. the employer of a contact person). Contact persons are no free text any more: they
// are added as relations on the detail page. 201 = new organisation, 200 = an existing one was found by a channel value
// and enriched (the toast says so); both open the organisation.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FormField } from '@/components/system-admin/FormField'
import { showToast } from '@/components/system-admin/Toast'
import { crmPost } from './crmFetch'
import { crmPath } from './crmPaths'
import type { CrmOrgCreateRequest, CrmOrgDetail, CrmSource } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

interface OrgFormProps {
  tr: SysAdminTranslations
}

const CRM_SOURCES: Array<{ value: CrmSource; labelKey: keyof SysAdminTranslations }> = [
  { value: 'business_card', labelKey: 'crm_source_business_card' },
  { value: 'manual',        labelKey: 'crm_source_manual' },
  { value: 'referral',      labelKey: 'crm_source_referral' },
  { value: 'event',         labelKey: 'crm_source_event' },
]

export function OrgForm({ tr }: OrgFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState('')
  const [legalName, setLegalName] = useState('')
  const [city, setCity] = useState('')
  const [category, setCategory] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [asLead, setAsLead] = useState(true)
  const [source, setSource] = useState<CrmSource>('business_card')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = tr.error_required
    // An acquisition target without any channel could never be contacted; plain master data may have none.
    if (asLead && !email.trim() && !phone.trim()) errs.channel = tr.crm_form_contact_required
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    startTransition(async () => {
      const channels: NonNullable<CrmOrgCreateRequest['channels']> = []
      if (email.trim()) channels.push({ kind: 'email', value: email.trim() })
      if (phone.trim()) channels.push({ kind: 'phone', value: phone.trim() })
      const body: CrmOrgCreateRequest = {
        name: name.trim(),
        legal_name: legalName.trim() || null,
        city: city.trim() || null,
        category: category.trim() || null,
        as_lead: asLead,
        channels,
        source: { source },
      }
      const result = await crmPost<CrmOrgDetail>(crmPath('orgCreate'), body, tr)
      if (result.ok && result.data) {
        if (result.status === 200) showToast(tr.crm_org_enriched, 'info')
        router.push(`/admin/crm/orgs/${result.data.id}`)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-lg">
      <FormField
        label={tr.crm_form_org_name}
        name="name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        disabled={isPending}
      />
      <FormField
        label={tr.crm_detail_legal_name}
        name="legal_name"
        value={legalName}
        onChange={(e) => setLegalName(e.target.value)}
        disabled={isPending}
      />
      <FormField
        label={tr.crm_form_city}
        name="city"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        disabled={isPending}
      />
      <FormField
        label={tr.crm_form_category}
        name="category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        disabled={isPending}
      />
      <FormField
        label={tr.crm_form_email}
        name="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={isPending}
      />
      <FormField
        label={tr.crm_form_phone}
        name="phone"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        error={errors.channel}
        disabled={isPending}
      />

      <label className="flex items-start gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={asLead}
          onChange={(e) => setAsLead(e.target.checked)}
          disabled={isPending}
          className="mt-0.5"
        />
        <span className="flex flex-col gap-0.5">
          <span className="font-medium">{tr.crm_org_form_as_lead}</span>
          <span className="text-xs text-gray-500">{tr.crm_org_form_as_lead_hint}</span>
        </span>
      </label>

      <div className="flex flex-col gap-1">
        <label htmlFor="org_source_select" className="text-sm font-medium text-gray-700">
          {tr.crm_form_source}
        </label>
        <select
          id="org_source_select"
          value={source}
          onChange={(e) => setSource(e.target.value as CrmSource)}
          disabled={isPending}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none
            focus:ring-2 focus:ring-slate-600 disabled:opacity-50 bg-white"
        >
          {CRM_SOURCES.map(({ value, labelKey }) => (
            <option key={value} value={value}>{String(tr[labelKey])}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium
            rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? tr.crm_form_submitting : tr.crm_org_form_submit}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isPending}
          className="px-5 py-2.5 text-sm font-medium text-gray-700 border border-gray-300
            rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {tr.cancel}
        </button>
      </div>
    </form>
  )
}
