'use client'

import { useCallback, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import type { SysAdminItemDomainMapping, SysAdminMappingLookupOption } from '@/types/system-admin'
import { Combobox, type ComboboxItem } from '@/components/system-admin/Combobox'

type LookupKind = 'item' | 'domain' | 'specialty'

/** Search items, domains or specialties by name or slug (backend: GET /item-domain-mappings/lookup, B8820-003). */
async function lookup(kind: LookupKind, q: string): Promise<ComboboxItem[]> {
  const qs = new URLSearchParams({ kind, limit: '20' })
  if (q) qs.set('q', q)
  const res = await fetch(`/api/admin/item-domain-mappings/lookup?${qs}`)
  if (!res.ok) return []
  const rows = (await res.json()) as SysAdminMappingLookupOption[]
  return rows.map((r) => ({ value: String(r.id), label: r.label, subLabel: r.parent_slug ? `${r.parent_slug} / ${r.slug}` : r.slug }))
}

interface MappingFormProps {
  tr: SysAdminTranslations
  mode: 'create' | 'edit'
  mapping?: SysAdminItemDomainMapping
}

export function MappingForm({ tr, mode, mapping }: MappingFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  // Create mode picks by name; edit mode shows the fixed references read-only.
  const [pickedItem, setPickedItem] = useState('')
  const [pickedDomain, setPickedDomain] = useState('')
  const [pickedSpecialty, setPickedSpecialty] = useState('')
  const loadItems = useCallback((q: string) => lookup('item', q), [])
  const loadDomains = useCallback(async (q: string) => [{ value: '', label: tr.none }, ...(await lookup('domain', q))], [tr.none])
  const loadSpecialties = useCallback(async (q: string) => [{ value: '', label: tr.none }, ...(await lookup('specialty', q))], [tr.none])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const fd = new FormData(e.currentTarget)
    const itemIdRaw = mode === 'create' ? pickedItem : (fd.get('item_id') as string).trim()
    const domainIdRaw = mode === 'create' ? pickedDomain : (fd.get('domain_id') as string).trim()
    const specialtyIdRaw = mode === 'create' ? pickedSpecialty : (fd.get('specialty_id') as string).trim()
    const autoAssign = (fd.get('auto_assign') as string) === 'true'

    const itemId = Number(itemIdRaw)
    if (!itemId || isNaN(itemId)) {
      setError(tr.error_required)
      return
    }

    const payload: Record<string, unknown> = {
      auto_assign: autoAssign,
    }
    // The references are fixed once created (the backend PATCH ignores them): only a new mapping sends them.
    if (mode === 'create') {
      payload.item_id = itemId
      if (domainIdRaw) payload.domain_id = Number(domainIdRaw)
      if (specialtyIdRaw) payload.specialty_id = Number(specialtyIdRaw)
    }

    startTransition(async () => {
      try {
        const url = mode === 'create'
          ? '/api/admin/item-domain-mappings'
          : `/api/admin/item-domain-mappings/${mapping!.id}`
        const method = mode === 'create' ? 'POST' : 'PATCH'

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (res.ok || res.status === 201) {
          router.push('/admin/item-domain-mappings')
          router.refresh()
        } else {
          setError(tr.error_generic)
        }
      } catch {
        setError(tr.error_generic)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
      {mode === 'edit' && <p className="text-xs text-gray-500">{tr.idm_edit_readonly_hint}</p>}

      {mode === 'create' ? (
        <>
          {/* Pick by name or slug instead of typing numeric IDs (B8820-003) */}
          <div className="flex flex-col gap-1">
            <label htmlFor="idm-item-pick" className="text-sm font-medium text-gray-700">
              {tr.idm_item} <span className="text-red-500">*</span>
            </label>
            <Combobox
              id="idm-item-pick"
              items={[]}
              loadItems={loadItems}
              value={pickedItem}
              onChange={setPickedItem}
              placeholder={tr.idm_item}
              noResultsLabel={tr.no_results}
              disabled={isPending}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="idm-domain-pick" className="text-sm font-medium text-gray-700">{tr.idm_domain}</label>
            <Combobox
              id="idm-domain-pick"
              items={[{ value: '', label: tr.none }]}
              loadItems={loadDomains}
              value={pickedDomain}
              onChange={setPickedDomain}
              placeholder={tr.idm_domain}
              noResultsLabel={tr.no_results}
              disabled={isPending}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="idm-specialty-pick" className="text-sm font-medium text-gray-700">{tr.idm_specialty}</label>
            <Combobox
              id="idm-specialty-pick"
              items={[{ value: '', label: tr.none }]}
              loadItems={loadSpecialties}
              value={pickedSpecialty}
              onChange={setPickedSpecialty}
              placeholder={tr.idm_specialty}
              noResultsLabel={tr.no_results}
              disabled={isPending}
            />
          </div>
        </>
      ) : (
        <>
      {/* Item ID */}
      <div className="flex flex-col gap-1">
        <label htmlFor="idm-item-id" className="text-sm font-medium text-gray-700">
          {tr.idm_item_id} <span className="text-red-500">*</span>
        </label>
        <input
          id="idm-item-id"
          name="item_id"
          type="number"
          min={1}
          defaultValue={mapping?.item_id ?? ''}
          required
          readOnly={mode === 'edit'}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 read-only:bg-gray-100 read-only:text-gray-500"
        />
        {mapping?.item_name && (
          <p className="text-xs text-gray-500">{mapping.item_name}</p>
        )}
      </div>

      {/* Domain ID (optional) */}
      <div className="flex flex-col gap-1">
        <label htmlFor="idm-domain-id" className="text-sm font-medium text-gray-700">
          {tr.idm_domain_id}
        </label>
        <input
          id="idm-domain-id"
          name="domain_id"
          type="number"
          min={1}
          defaultValue={mapping?.domain_id ?? mapping?.onboarding_domain_id ?? ''}
          readOnly={mode === 'edit'}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 read-only:bg-gray-100 read-only:text-gray-500"
        />
        {mapping?.onboarding_domain_slug && (
          <p className="text-xs text-gray-500 font-mono">{mapping.onboarding_domain_slug}</p>
        )}
      </div>

      {/* Specialty ID (optional) */}
      <div className="flex flex-col gap-1">
        <label htmlFor="idm-specialty-id" className="text-sm font-medium text-gray-700">
          {tr.idm_specialty_id}
        </label>
        <input
          id="idm-specialty-id"
          name="specialty_id"
          type="number"
          min={1}
          defaultValue={mapping?.specialty_id ?? ''}
          readOnly={mode === 'edit'}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 read-only:bg-gray-100 read-only:text-gray-500"
        />
        {mapping?.specialty_slug && (
          <p className="text-xs text-gray-500 font-mono">{mapping.specialty_slug}</p>
        )}
      </div>

        </>
      )}

      {/* Auto-assign toggle */}
      <div className="flex flex-col gap-1">
        <label htmlFor="idm-auto-assign" className="text-sm font-medium text-gray-700">
          {tr.idm_auto_assign}
        </label>
        <select
          id="idm-auto-assign"
          name="auto_assign"
          defaultValue={mapping?.auto_assign === false ? 'false' : 'true'}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 w-40"
        >
          <option value="true">✓ {tr.idm_auto_assign}</option>
          <option value="false">– {tr.none}</option>
        </select>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
        >
          {isPending ? tr.saving : tr.save}
        </button>
        <Link
          href="/admin/item-domain-mappings"
          className="px-5 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          {tr.cancel}
        </Link>
      </div>
    </form>
  )
}
