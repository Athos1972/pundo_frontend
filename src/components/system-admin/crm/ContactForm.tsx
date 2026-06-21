'use client'
// ─── CRM Contact Form (F7600) ─────────────────────────────────────────────────
// Creates a new CRM contact via POST /api/admin/crm/contacts/ingest.
// Stufe 1: Source dropdown added (default: business_card).

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FormField } from '@/components/system-admin/FormField'
import { crmPost } from './crmFetch'
import type { CrmIngestRequest, CrmContactDetail, CrmSource } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

interface ContactFormProps {
  tr: SysAdminTranslations
}

const CRM_SOURCES: Array<{ value: CrmSource; labelKey: keyof SysAdminTranslations }> = [
  { value: 'business_card', labelKey: 'crm_source_business_card' },
  { value: 'manual',        labelKey: 'crm_source_manual' },
  { value: 'referral',      labelKey: 'crm_source_referral' },
  { value: 'event',         labelKey: 'crm_source_event' },
]

export function ContactForm({ tr }: ContactFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [displayName, setDisplayName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [category, setCategory] = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [source, setSource] = useState<CrmSource>('business_card')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!orgName.trim()) errs.org_name = tr.error_required
    if (!email.trim() && !phone.trim()) errs.contact = tr.crm_form_contact_required
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    startTransition(async () => {
      const channels: CrmIngestRequest['channels'] = []
      if (email.trim()) channels.push({ kind: 'email', value: email.trim() })
      if (phone.trim()) channels.push({ kind: 'phone', value: phone.trim() })

      const body: CrmIngestRequest = {
        org: {
          name: orgName.trim(),
          city: city.trim() || null,
          category: category.trim() || null,
        },
        contact: {
          display_name: displayName.trim() || null,
          role_title: roleTitle.trim() || null,
        },
        channels,
        source: { source },
      }

      const result = await crmPost<CrmContactDetail>('crm/contacts/ingest', body, tr)
      if (result.ok && result.data) {
        router.push(`/admin/crm/contacts/${result.data.id}`)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-lg">
      <FormField
        label={tr.crm_form_org_name}
        name="org_name"
        required
        value={orgName}
        onChange={(e) => setOrgName(e.target.value)}
        error={errors.org_name}
        disabled={isPending}
      />
      <FormField
        label={tr.crm_form_display_name}
        name="display_name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
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
        error={errors.contact}
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
        label={tr.crm_form_role}
        name="role_title"
        value={roleTitle}
        onChange={(e) => setRoleTitle(e.target.value)}
        disabled={isPending}
      />

      {/* Source dropdown */}
      <div className="flex flex-col gap-1">
        <label htmlFor="source_select" className="text-sm font-medium text-gray-700">
          {tr.crm_form_source}
        </label>
        <select
          id="source_select"
          value={source}
          onChange={(e) => setSource(e.target.value as CrmSource)}
          disabled={isPending}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none
            focus:ring-2 focus:ring-slate-600 disabled:opacity-50 bg-white"
        >
          {CRM_SOURCES.map(({ value, labelKey }) => (
            <option key={value} value={value}>
              {String(tr[labelKey])}
            </option>
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
          {isPending ? tr.crm_form_submitting : tr.crm_form_submit}
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
