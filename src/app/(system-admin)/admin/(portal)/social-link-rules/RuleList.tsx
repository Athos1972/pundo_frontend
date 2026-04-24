'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { SysAdminSocialLinkRule } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

interface RuleListProps {
  rules: SysAdminSocialLinkRule[]
  total: number
  page: number
  limit: number
  tr: SysAdminTranslations
  q: string
  category: string
}

export function RuleList({ rules, total, page, limit, tr, q, category }: RuleListProps) {
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
        const res = await fetch(`/api/admin/social-link-rules/${id}`, { method: 'DELETE' })
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
    if (q) params.set('q', q)
    if (category) params.set('category', category)
    params.set('page', String(p))
    return `/admin/social-link-rules?${params.toString()}`
  }

  const categoryLabel: Record<string, string> = {
    adult: tr.slr_cat_adult,
    gambling: tr.slr_cat_gambling,
    hate: tr.slr_cat_hate,
    illegal: tr.slr_cat_illegal,
    malware: tr.slr_cat_malware,
    custom: tr.slr_cat_custom,
  }

  return (
    <>
      {confirmId !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 flex flex-col gap-4">
            <p className="text-sm text-gray-700">{tr.slr_delete_confirm}</p>
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
              <th className="px-4 py-3 text-start font-medium text-gray-600">{tr.slr_host}</th>
              <th className="px-4 py-3 text-start font-medium text-gray-600">{tr.slr_category}</th>
              <th className="px-4 py-3 text-start font-medium text-gray-600">{tr.slr_source}</th>
              <th className="px-4 py-3 text-start font-medium text-gray-600">{tr.slr_note}</th>
              <th className="px-4 py-3 text-start font-medium text-gray-600">{tr.slr_created_at}</th>
              <th className="px-4 py-3 text-start font-medium text-gray-600">{tr.actions}</th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400 text-sm">
                  {tr.no_items}
                </td>
              </tr>
            )}
            {rules.map((rule) => (
              <tr key={rule.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-800">{rule.host}</td>
                <td className="px-4 py-3">
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
                    {categoryLabel[rule.category] ?? rule.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {rule.source === 'admin' ? tr.slr_source_admin : tr.slr_source_external}
                  {rule.source === 'external' && (
                    <span className="ms-1 text-xs text-gray-400" title={tr.slr_readonly_external}>
                      (read-only)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{rule.note ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(rule.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {rule.source === 'admin' ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(rule.id)}
                      className="text-xs text-red-600 hover:text-red-800 hover:underline"
                    >
                      {tr.delete}
                    </button>
                  ) : (
                    <span className="text-xs text-gray-300">{tr.delete}</span>
                  )}
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
