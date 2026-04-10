'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { SysAdminProductAttribute } from '@/types/system-admin'
import { showToast } from './Toast'
import { ConfirmDialog } from './ConfirmDialog'

interface ProductAttributesTableProps {
  productId: number
  attributes: SysAdminProductAttribute[]
  labels: {
    key: string
    value: string
    source: string
    confidence: string
    add: string
    delete: string
    confirmDelete: string
    cancel: string
    saved: string
    deleted: string
    error: string
  }
}

interface DraftAttribute {
  attribute_key: string
  attribute_value: string
  source: string
  confidence: number
}

const EMPTY_DRAFT: DraftAttribute = {
  attribute_key: '',
  attribute_value: '',
  source: 'manual',
  confidence: 1.0,
}

export function ProductAttributesTable({
  productId,
  attributes: initial,
  labels,
}: ProductAttributesTableProps) {
  const router = useRouter()
  const [attributes, setAttributes] = useState(initial)
  const [draft, setDraft] = useState<DraftAttribute | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    setDraft({ ...EMPTY_DRAFT })
  }

  function handleSaveDraft() {
    if (!draft) return
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/products/${productId}/attributes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        })
        if (!res.ok) {
          showToast(labels.error, 'error')
          return
        }
        const created: SysAdminProductAttribute = await res.json()
        setAttributes((prev) => [...prev, created])
        setDraft(null)
        showToast(labels.saved, 'success')
        router.refresh()
      } catch {
        showToast(labels.error, 'error')
      }
    })
  }

  function handleDelete(id: number) {
    setConfirmDeleteId(id)
  }

  function handleDeleteConfirm() {
    if (confirmDeleteId == null) return
    const id = confirmDeleteId
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/products/${productId}/attributes/${id}`, {
          method: 'DELETE',
        })
        if (!res.ok && res.status !== 204) {
          showToast(labels.error, 'error')
          return
        }
        setAttributes((prev) => prev.filter((a) => a.id !== id))
        showToast(labels.deleted, 'success')
        router.refresh()
      } catch {
        showToast(labels.error, 'error')
      } finally {
        setConfirmDeleteId(null)
      }
    })
  }

  return (
    <>
      <ConfirmDialog
        open={confirmDeleteId != null}
        message={labels.confirmDelete}
        confirmLabel={labels.delete}
        cancelLabel={labels.cancel}
        isPending={isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <div className="flex flex-col gap-2">
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-3 py-2 text-start text-xs font-semibold text-gray-500 uppercase">{labels.key}</th>
                <th className="px-3 py-2 text-start text-xs font-semibold text-gray-500 uppercase">{labels.value}</th>
                <th className="px-3 py-2 text-start text-xs font-semibold text-gray-500 uppercase">{labels.source}</th>
                <th className="px-3 py-2 text-start text-xs font-semibold text-gray-500 uppercase">{labels.confidence}</th>
                <th className="px-3 py-2 w-16" />
              </tr>
            </thead>
            <tbody>
              {attributes.map((attr) => (
                <tr key={attr.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-3 py-2 font-mono text-xs text-gray-700">{attr.attribute_key}</td>
                  <td className="px-3 py-2 text-gray-700">{attr.attribute_value}</td>
                  <td className="px-3 py-2 text-gray-500">{attr.source}</td>
                  <td className="px-3 py-2 text-gray-500">{attr.confidence.toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => handleDelete(attr.id)}
                      disabled={isPending}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      {labels.delete}
                    </button>
                  </td>
                </tr>
              ))}

              {/* Draft row */}
              {draft && (
                <tr className="border-b border-gray-100 bg-blue-50">
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={draft.attribute_key}
                      onChange={(e) => setDraft((d) => d ? { ...d, attribute_key: e.target.value } : d)}
                      placeholder="key"
                      className="w-full rounded border border-gray-300 px-2 py-1 text-xs font-mono
                        focus:outline-none focus:ring-1 focus:ring-slate-600"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={draft.attribute_value}
                      onChange={(e) => setDraft((d) => d ? { ...d, attribute_value: e.target.value } : d)}
                      placeholder="value"
                      className="w-full rounded border border-gray-300 px-2 py-1 text-xs
                        focus:outline-none focus:ring-1 focus:ring-slate-600"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={draft.source}
                      onChange={(e) => setDraft((d) => d ? { ...d, source: e.target.value } : d)}
                      className="w-full rounded border border-gray-300 px-2 py-1 text-xs
                        focus:outline-none focus:ring-1 focus:ring-slate-600"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={draft.confidence}
                      onChange={(e) => setDraft((d) => d ? { ...d, confidence: parseFloat(e.target.value) } : d)}
                      className="w-20 rounded border border-gray-300 px-2 py-1 text-xs
                        focus:outline-none focus:ring-1 focus:ring-slate-600"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={isPending || !draft.attribute_key}
                        className="text-xs text-green-700 hover:text-green-900 disabled:opacity-50 font-medium"
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraft(null)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!draft && (
          <button
            type="button"
            onClick={handleAdd}
            className="self-start text-sm text-slate-600 hover:text-slate-900 font-medium
              flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-gray-300
              rounded-lg hover:border-slate-400 transition-colors"
          >
            <span aria-hidden="true">+</span> {labels.add}
          </button>
        )}
      </div>
    </>
  )
}
