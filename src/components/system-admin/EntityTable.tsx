'use client'
// Only imports from src/components/ui/ and system-admin/ allowed (Clean Boundary)

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ConfirmDialog } from './ConfirmDialog'
import { showToast } from './Toast'

export interface Column {
  key: string
  label: string
  render?: (value: unknown, row: Record<string, unknown> & { id: number }) => React.ReactNode
}

interface EntityTableProps {
  columns: Column[]
  rows: Array<Record<string, unknown> & { id: number }>
  editHref?: (id: number) => string
  deleteUrl?: (id: number) => string
  /** Use for non-standard delete labels like "Revoke" */
  deleteLabel: string
  editLabel: string
  confirmMessage: string
  cancelLabel: string
  deletedMessage: string
  errorMessage: string
  noItemsLabel: string
  // Server-side pagination
  total: number
  page: number
  limit: number
  /** Base URL without query params, used to build pagination links */
  baseHref: string
  searchQ?: string
}

export function EntityTable({
  columns,
  rows,
  editHref,
  deleteUrl,
  deleteLabel,
  editLabel,
  confirmMessage,
  cancelLabel,
  deletedMessage,
  errorMessage,
  noItemsLabel,
  total,
  page,
  limit,
  baseHref,
  searchQ,
}: EntityTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const totalPages = Math.ceil(total / limit)
  const hasActions = !!(editHref || deleteUrl)

  function buildPageHref(p: number) {
    const qs = new URLSearchParams()
    qs.set('page', String(p))
    if (searchQ) qs.set('q', searchQ)
    return `${baseHref}?${qs.toString()}`
  }

  function handleDeleteClick(id: number) {
    setConfirmId(id)
  }

  function handleDeleteConfirm() {
    if (confirmId == null || !deleteUrl) return
    const url = deleteUrl(confirmId)
    startTransition(async () => {
      try {
        const res = await fetch(url, { method: 'DELETE' })
        if (!res.ok && res.status !== 204) {
          showToast(errorMessage, 'error')
        } else {
          showToast(deletedMessage, 'success')
          router.refresh()
        }
      } catch {
        showToast(errorMessage, 'error')
      } finally {
        setConfirmId(null)
      }
    })
  }

  return (
    <>
      <ConfirmDialog
        open={confirmId != null}
        message={confirmMessage}
        confirmLabel={deleteLabel}
        cancelLabel={cancelLabel}
        isPending={isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmId(null)}
      />

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">{noItemsLabel}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    {col.label}
                  </th>
                ))}
                {hasActions && (
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-gray-700">
                      {col.render
                        ? col.render(row[col.key], row)
                        : String(row[col.key] ?? '—')}
                    </td>
                  ))}
                  {hasActions && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {editHref && (
                          <Link
                            href={editHref(row.id)}
                            className="text-xs font-medium text-slate-600 hover:text-slate-900 underline-offset-2 hover:underline"
                          >
                            {editLabel}
                          </Link>
                        )}
                        {deleteUrl && (
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(row.id)}
                            disabled={isPending}
                            className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
                          >
                            {deleteLabel}
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-gray-500">
            {(page - 1) * limit + 1}–{Math.min(page * limit, total)} / {total}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildPageHref(page - 1)}
                className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                ←
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildPageHref(page + 1)}
                className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                →
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  )
}
