'use client'
// ─── CRM organisation master data form (F7600, org cut; replaces ContactEditForm) ─────────────────────────────────────
// PATCH /admin/crm/orgs/{id}: master data only (name, legal name, city, region, category) plus "belongs to (head office)".
// The lead block is never sent (the backend rejects unknown fields with 422). Last-write-wins, no lock.
// Head office (one level, Design §6b): the type-ahead offers only organisations without a head office of their own and
// never this organisation; an organisation with branches cannot get one (hint instead of the field). The three refusals of
// the backend (org_parent_self / _has_parent / _has_children) are shown as text under the field as well as in the toast.

import { useCallback, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { showToast } from '@/components/system-admin/Toast'
import { FormField } from '@/components/system-admin/FormField'
import { Combobox } from '@/components/system-admin/Combobox'
import { CRM_ERROR_KEYS, crmPatch } from './crmFetch'
import { crmPath } from './crmPaths'
import { ORG_SEARCH_MIN, searchCrmOrgs, searchErrorText } from './crmSearch'
import type { CrmOrgDetail, CrmOrgUpdateRequest } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

interface OrgEditFormProps {
  org: CrmOrgDetail
  tr: SysAdminTranslations
}

const PARENT_ERRORS = ['org_parent_self', 'org_parent_has_parent', 'org_parent_has_children'] as const

export function OrgEditForm({ org, tr }: OrgEditFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)

  const [name, setName] = useState(org.name)
  const [legalName, setLegalName] = useState(org.legal_name ?? '')
  const [city, setCity] = useState(org.city ?? '')
  const [region, setRegion] = useState(org.region ?? '')
  const [category, setCategory] = useState(org.category ?? '')
  const [parentId, setParentId] = useState(org.parent ? String(org.parent.id) : '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const hasChildren = org.children.count > 0
  const parentItems = org.parent ? [{ value: String(org.parent.id), label: org.parent.name }] : []
  const loadParents = useCallback(
    (query: string) => searchCrmOrgs(query, { parentCandidatesOnly: true, excludeId: org.id }),
    [org.id],
  )
  const errorText = useCallback((error: unknown) => searchErrorText(error, tr), [tr])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setErrors({ name: tr.error_required })
      return
    }
    setErrors({})

    startTransition(async () => {
      const body: CrmOrgUpdateRequest = {
        name: name.trim(),
        legal_name: legalName.trim() || null,
        city: city.trim() || null,
        region: region.trim() || null,
        category: category.trim() || null,
      }
      const nextParent = parentId ? Number(parentId) : null
      // Only send the head office when it changed: an unchanged value would run the one-level checks for nothing.
      if (nextParent !== (org.parent?.id ?? null)) body.parent_org_id = nextParent

      const result = await crmPatch<CrmOrgDetail>(crmPath('orgUpdate', { org_id: org.id }), body, tr)
      if (result.ok) {
        showToast(tr.crm_org_saved, 'success')
        setIsOpen(false)
        router.refresh()
      } else if (result.code && (PARENT_ERRORS as readonly string[]).includes(result.code)) {
        setErrors({ parent: tr[CRM_ERROR_KEYS[result.code as (typeof PARENT_ERRORS)[number]]] })
      }
    })
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="self-start px-3 py-1.5 text-sm font-medium text-indigo-700 border border-indigo-300
          bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
      >
        {tr.edit}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-4 border border-slate-200 rounded-xl p-5 bg-slate-50">
      <h3 className="text-sm font-semibold text-gray-800">{tr.crm_org_edit_title}</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={tr.crm_form_org_name} name="edit_org_name" required value={name}
            onChange={(e) => setName(e.target.value)} error={errors.name} disabled={isPending} />
          <FormField label={tr.crm_detail_legal_name} name="edit_legal_name" value={legalName}
            onChange={(e) => setLegalName(e.target.value)} disabled={isPending} />
          <FormField label={tr.crm_form_city} name="edit_city" value={city}
            onChange={(e) => setCity(e.target.value)} disabled={isPending} />
          <FormField label={tr.crm_detail_region} name="edit_region" value={region}
            onChange={(e) => setRegion(e.target.value)} disabled={isPending} />
          <FormField label={tr.crm_form_category} name="edit_category" value={category}
            onChange={(e) => setCategory(e.target.value)} disabled={isPending} />
        </div>

        <div className="flex flex-col gap-1 text-sm" data-testid="crm-org-parent-field">
          <span className="font-medium text-gray-700">{tr.crm_parent_belongs_to}</span>
          {hasChildren ? (
            <p className="text-xs text-gray-500">{tr.crm_parent_has_children_hint}</p>
          ) : (
            <div className="flex items-start gap-2">
              <div className="w-80">
                <Combobox
                  id="crm-org-parent"
                  items={parentItems}
                  value={parentId}
                  onChange={setParentId}
                  loadItems={loadParents}
                  placeholder={tr.crm_parent_none}
                  searchLabel={tr.crm_parent_belongs_to}
                  noResultsLabel={tr.no_results}
                  minQueryLength={ORG_SEARCH_MIN}
                  minQueryLabel={tr.crm_search_min_chars.replace('{n}', String(ORG_SEARCH_MIN))}
                  loadingLabel={tr.crm_search_loading}
                  errorLabel={errorText}
                  disabled={isPending}
                />
              </div>
              {parentId && (
                <button
                  type="button"
                  onClick={() => setParentId('')}
                  disabled={isPending}
                  className="px-3 py-2 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  {tr.crm_parent_clear}
                </button>
              )}
            </div>
          )}
          {errors.parent && <p role="alert" className="text-xs text-red-600">{errors.parent}</p>}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? tr.crm_edit_saving : tr.save}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {tr.cancel}
          </button>
        </div>
      </form>
    </div>
  )
}
