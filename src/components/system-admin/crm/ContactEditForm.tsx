'use client'
// ─── CRM Contact Edit Form (F7600 Stufe 1) ────────────────────────────────────
// Inline edit of org + contact fields via PATCH /api/admin/crm/contacts/{id}.
// No optimistic lock — last-write-wins (see design §2d).
// Clean Boundary: no imports from customer-facing code.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { showToast } from '@/components/system-admin/Toast'
import { FormField } from '@/components/system-admin/FormField'
import { crmPatch } from './crmFetch'
import type { CrmContactDetail, CrmContactUpdateRequest } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

interface ContactEditFormProps {
  contact: CrmContactDetail
  tr: SysAdminTranslations
}

export function ContactEditForm({ contact, tr }: ContactEditFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)

  // Org fields
  const [orgName, setOrgName]       = useState(contact.org.name)
  const [orgCity, setOrgCity]       = useState(contact.org.city ?? '')
  const [orgCategory, setOrgCategory] = useState(contact.org.category ?? '')

  // Contact fields
  const [displayName, setDisplayName] = useState(contact.display_name ?? '')
  const [roleTitle, setRoleTitle]     = useState(contact.role_title ?? '')

  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!orgName.trim()) errs.org_name = tr.error_required
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    startTransition(async () => {
      const body: CrmContactUpdateRequest = {
        org: {
          name: orgName.trim(),
          city: orgCity.trim() || null,
          category: orgCategory.trim() || null,
        },
        display_name: displayName.trim() || null,
        role_title: roleTitle.trim() || null,
      }

      const result = await crmPatch<CrmContactDetail>(
        `crm/contacts/${contact.id}`,
        body,
        tr,
      )
      if (result.ok) {
        showToast(tr.crm_edit_saved, 'success')
        setIsOpen(false)
        router.refresh()
      }
    })
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 text-sm font-medium text-indigo-700 border border-indigo-300
          bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
      >
        {tr.edit}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-4 border border-slate-200 rounded-xl p-5 bg-slate-50">
      <h3 className="text-sm font-semibold text-gray-800">{tr.crm_edit_title}</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label={tr.crm_form_org_name}
            name="edit_org_name"
            required
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            error={errors.org_name}
            disabled={isPending}
          />
          <FormField
            label={tr.crm_form_city}
            name="edit_city"
            value={orgCity}
            onChange={(e) => setOrgCity(e.target.value)}
            disabled={isPending}
          />
          <FormField
            label={tr.crm_form_category}
            name="edit_category"
            value={orgCategory}
            onChange={(e) => setOrgCategory(e.target.value)}
            disabled={isPending}
          />
          <FormField
            label={tr.crm_form_display_name}
            name="edit_display_name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={isPending}
          />
          <FormField
            label={tr.crm_form_role}
            name="edit_role_title"
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.target.value)}
            disabled={isPending}
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium
              rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? tr.crm_edit_saving : tr.save}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300
              rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {tr.cancel}
          </button>
        </div>
      </form>
    </div>
  )
}
