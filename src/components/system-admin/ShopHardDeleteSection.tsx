'use client'
// Only imports from src/components/ui/ and system-admin/ allowed (Clean Boundary)

import { useState, useTransition, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { showToast } from './Toast'

interface DeletePreview {
  offers: number
  exclusive_items: number
  reviews: number
}

interface ShopHardDeleteSectionProps {
  shopId: number
  shopName: string
  tr: SysAdminTranslations
}

function formatCount(template: string, n: number): string {
  return template.replace('{n}', String(n))
}

export function ShopHardDeleteSection({ shopId, shopName, tr }: ShopHardDeleteSectionProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [preview, setPreview] = useState<DeletePreview | null>(null)
  const [previewError, setPreviewError] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)

  const fetchPreview = useCallback(() => {
    setPreviewLoading(true)
    setPreviewError(false)
    setPreview(null)
    fetch(`/api/admin/shops/${shopId}/delete-preview`)
      .then((res) => {
        if (!res.ok) throw new Error('preview_failed')
        return res.json() as Promise<DeletePreview>
      })
      .then((data) => setPreview(data))
      .catch(() => setPreviewError(true))
      .finally(() => setPreviewLoading(false))
  }, [shopId])

  // Fetch preview counts when dialog opens.
  // startTransition wraps the synchronous setState calls inside fetchPreview to
  // avoid the "setState synchronously in effect" lint warning (same pattern as login page).
  useEffect(() => {
    if (!isOpen) return
    startTransition(fetchPreview)
  }, [isOpen, fetchPreview, startTransition])

  function handleOpen() {
    setNameInput('')
    setIsOpen(true)
  }

  function handleCancel() {
    setIsOpen(false)
    setNameInput('')
  }

  function handleConfirm() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/shops/${shopId}`, { method: 'DELETE' })
        if (!res.ok && res.status !== 204) {
          showToast(tr.error_generic, 'error')
          return
        }
        showToast(tr.shop_deleted, 'success')
        router.push('/admin/shops')
      } catch {
        showToast(tr.error_generic, 'error')
      }
    })
  }

  const canConfirm = nameInput === shopName && !isPending

  return (
    <section className="mt-8 border border-red-200 rounded-xl p-5 bg-red-50/50 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-red-700">{tr.shop_delete_title}</h2>
      <p className="text-sm text-gray-600">{tr.shop_delete_description}</p>
      <div>
        <button
          type="button"
          onClick={handleOpen}
          className="px-4 py-2 rounded-lg border border-red-400 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors"
        >
          {tr.shop_delete_button}
        </button>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="hard-delete-dialog-title"
        >
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 flex flex-col gap-4">
            <h3 id="hard-delete-dialog-title" className="text-base font-semibold text-red-700">
              {tr.shop_delete_title}
            </h3>

            {/* Preview counts */}
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 flex flex-col gap-1">
              {previewLoading && <span className="text-gray-400">…</span>}
              {previewError && <span className="text-gray-400">{tr.shop_delete_preview_error}</span>}
              {preview && (
                <>
                  <span>🏷️ {formatCount(tr.shop_delete_preview_offers, preview.offers)}</span>
                  <span>📦 {formatCount(tr.shop_delete_preview_items, preview.exclusive_items)}</span>
                  <span>⭐ {formatCount(tr.shop_delete_preview_reviews, preview.reviews)}</span>
                </>
              )}
            </div>

            {/* Name confirmation */}
            <div className="flex flex-col gap-1">
              <label htmlFor="shop-delete-confirm-name" className="text-sm text-gray-700">
                {tr.shop_delete_confirm_name}:{' '}
                <span className="font-mono font-semibold">{shopName}</span>
              </label>
              <input
                id="shop-delete-confirm-name"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder={shopName}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                autoComplete="off"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {tr.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!canConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? '…' : tr.shop_delete_button.replace('…', '')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
