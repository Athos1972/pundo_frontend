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
  /**
   * Serializable rendering options — use instead of a render function so that
   * columns can be defined in Server Components without crossing the SC→CC boundary.
   */
  /** Render value as a colored badge. Map value string → Tailwind class string. */
  badgeColors?: Record<string, string>
  /** Render boolean value with custom labels and colors. */
  boolDisplay?: {
    trueLabel: string
    falseLabel: string
    trueClass: string
    falseClass: string
  }
  /** Render string value as <img src={value}> thumbnail. */
  isImage?: boolean
}

interface EntityTableProps {
  columns: Column[]
  rows: Array<Record<string, unknown> & { id: number }>
  /**
   * URL template for edit links. Use `{id}` as placeholder.
   * Example: "/admin/shops/{id}/edit"
   */
  editHref?: string
  /**
   * URL template for DELETE requests. Use `{id}` as placeholder.
   * Example: "/api/admin/shops/{id}"
   */
  deleteUrl?: string
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

function resolveTemplate(template: string, id: number): string {
  return template.replace('{id}', String(id))
}

function renderCell(col: Column, value: unknown): React.ReactNode {
  if (col.isImage) {
    return value
      ? <img src={String(value)} alt="" className="w-8 h-8 object-contain rounded bg-gray-50 border border-gray-200 p-0.5" />
      : <span className="text-gray-400">—</span>
  }
  if (col.badgeColors) {
    const val = String(value ?? '')
    return (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${col.badgeColors[val] ?? 'bg-gray-100 text-gray-600'}`}>
        {val}
      </span>
    )
  }
  if (col.boolDisplay) {
    const isTrue = Boolean(value)
    return (
      <span className={`text-xs font-medium ${isTrue ? col.boolDisplay.trueClass : col.boolDisplay.falseClass}`}>
        {isTrue ? col.boolDisplay.trueLabel : col.boolDisplay.falseLabel}
      </span>
    )
  }
  return String(value ?? '—')
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

  function handleDeleteConfirm() {
    if (confirmId == null || !deleteUrl) return
    const url = resolveTemplate(deleteUrl, confirmId)
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
                {columns.map((col, i) => (
                  <th
                    key={`${col.key}-${i}`}
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
                  {columns.map((col, i) => (
                    <td key={`${col.key}-${i}`} className="px-4 py-3 text-gray-700">
                      {renderCell(col, row[col.key])}
                    </td>
                  ))}
                  {hasActions && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {editHref && (
                          <Link
                            href={resolveTemplate(editHref, row.id)}
                            className="text-xs font-medium text-slate-600 hover:text-slate-900 underline-offset-2 hover:underline"
                          >
                            {editLabel}
                          </Link>
                        )}
                        {deleteUrl && (
                          <button
                            type="button"
                            onClick={() => setConfirmId(row.id)}
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
