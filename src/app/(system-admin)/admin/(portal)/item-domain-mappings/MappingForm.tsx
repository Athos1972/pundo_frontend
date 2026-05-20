'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import type { SysAdminItemDomainMapping } from '@/types/system-admin'

interface MappingFormProps {
  tr: SysAdminTranslations
  mode: 'create' | 'edit'
  mapping?: SysAdminItemDomainMapping
}

export function MappingForm({ tr, mode, mapping }: MappingFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const fd = new FormData(e.currentTarget)
    const itemIdRaw = (fd.get('item_id') as string).trim()
    const domainIdRaw = (fd.get('domain_id') as string).trim()
    const specialtyIdRaw = (fd.get('specialty_id') as string).trim()
    const priorityRaw = (fd.get('priority') as string).trim()
    const autoAssign = (fd.get('auto_assign') as string) === 'true'

    const itemId = Number(itemIdRaw)
    if (!itemId || isNaN(itemId)) {
      setError(tr.error_required)
      return
    }

    const payload: Record<string, unknown> = {
      item_id: itemId,
      auto_assign: autoAssign,
      priority: priorityRaw ? Number(priorityRaw) : 0,
    }
    if (domainIdRaw) payload.domain_id = Number(domainIdRaw)
    if (specialtyIdRaw) payload.specialty_id = Number(specialtyIdRaw)

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
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
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
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
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
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
        {mapping?.specialty_slug && (
          <p className="text-xs text-gray-500 font-mono">{mapping.specialty_slug}</p>
        )}
      </div>

      {/* Priority */}
      <div className="flex flex-col gap-1">
        <label htmlFor="idm-priority" className="text-sm font-medium text-gray-700">
          {tr.idm_priority}
        </label>
        <input
          id="idm-priority"
          name="priority"
          type="number"
          min={0}
          defaultValue={mapping?.priority ?? 0}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 w-32"
        />
        <p className="text-xs text-gray-400">{tr.idm_priority_hint}</p>
      </div>

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
