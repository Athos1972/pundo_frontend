'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { SysAdminItemDomainMapping } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

interface MappingListProps {
  mappings: SysAdminItemDomainMapping[]
  total: number
  page: number
  limit: number
  tr: SysAdminTranslations
  domain: string
  specialty: string
}

export function MappingList({ mappings, total, page, limit, tr, domain, specialty }: MappingListProps) {
  const router = useRouter()
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDeleteClick(id: number) {
    setConfirmId(id)
  }

  function handleCancel() {
    setConfirmId(null)
  }

  function handleConfirmDelete() {
    if (confirmId === null) return
    const id = confirmId
    setConfirmId(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/item-domain-mappings/${id}`, { method: 'DELETE' })
        if (res.ok || res.status === 204) {
          router.refresh()
        } else {
          alert(tr.error_generic)
        }
      } catch {
        alert(tr.error_generic)
      }
    })
  }

  const totalPages = Math.ceil(total / limit)

  function pageHref(p: number) {
    const params = new URLSearchParams()
    if (domain) params.set('domain', domain)
    if (specialty) params.set('specialty', specialty)
    params.set('page', String(p))
    return `/admin/item-domain-mappings?${params.toString()}`
  }

  return (
    <>
      {confirmId !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 flex flex-col gap-4">
            <p className="text-sm text-gray-700">{tr.idm_delete_confirm}</p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                {tr.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isPending}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
              >
                {isPending ? tr.deleting : tr.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-start font-medium text-gray-600">{tr.id}</th>
              <th className="px-4 py-3 text-start font-medium text-gray-600">{tr.idm_item}</th>
              <th className="px-4 py-3 text-start font-medium text-gray-600">{tr.idm_domain}</th>
              <th className="px-4 py-3 text-start font-medium text-gray-600">{tr.idm_specialty}</th>
              <th className="px-4 py-3 text-start font-medium text-gray-600">{tr.idm_priority}</th>
              <th className="px-4 py-3 text-start font-medium text-gray-600">{tr.idm_auto_assign}</th>
              <th className="px-4 py-3 text-start font-medium text-gray-600">{tr.actions}</th>
            </tr>
          </thead>
          <tbody>
            {mappings.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400 text-sm">
                  {tr.idm_no_mappings}
                </td>
              </tr>
            )}
            {mappings.map((m) => (
              <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500 text-xs font-mono">{m.id}</td>
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-800">{m.item_name ?? '—'}</span>
                  <span className="ms-2 text-xs text-gray-400">#{m.item_id}</span>
                </td>
                <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                  {m.onboarding_domain_slug ?? (m.domain_id != null ? `#${m.domain_id}` : '—')}
                </td>
                <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                  {m.specialty_slug ?? (m.specialty_id != null ? `#${m.specialty_id}` : '—')}
                </td>
                <td className="px-4 py-3 text-gray-600">{m.priority}</td>
                <td className="px-4 py-3">
                  {m.auto_assign ? (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">✓</span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-400">–</span>
                  )}
                </td>
                <td className="px-4 py-3 flex items-center gap-3">
                  <a
                    href={`/admin/item-domain-mappings/${m.id}/edit`}
                    className="text-xs text-slate-600 hover:underline"
                  >
                    {tr.edit}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(m.id)}
                    className="text-xs text-red-600 hover:text-red-800 hover:underline"
                  >
                    {tr.delete}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {page > 1 && (
            <a href={pageHref(page - 1)} className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">
              {tr.prev}
            </a>
          )}
          <span>
            {tr.showing} {(page - 1) * limit + 1}–{Math.min(page * limit, total)} {tr.of} {total}
          </span>
          {page < totalPages && (
            <a href={pageHref(page + 1)} className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">
              {tr.next}
            </a>
          )}
        </div>
      )}
    </>
  )
}
