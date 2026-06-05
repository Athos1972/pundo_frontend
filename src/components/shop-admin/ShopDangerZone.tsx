'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'

interface ShopDangerZoneProps {
  tr: ShopAdminTranslations
}

export function ShopDangerZone({ tr }: ShopDangerZoneProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpen() {
    setError(null)
    setIsOpen(true)
  }

  function handleCancel() {
    setIsOpen(false)
    setError(null)
  }

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/shop-admin/shop/deactivate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })

        if (!res.ok) {
          setError(tr.deactivate_error)
          return
        }

        // Log out and redirect with deactivated flag
        await fetch('/api/shop-admin/logout', { method: 'POST' }).catch(() => {})
        router.push('/shop-admin/login?deactivated=1')
      } catch {
        setError(tr.deactivate_error)
      }
    })
  }

  return (
    <section className="border border-red-200 rounded-xl p-5 bg-red-50/50 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-red-700">{tr.danger_zone_title}</h2>
      <p className="text-sm text-gray-600">{tr.danger_zone_description}</p>
      <div>
        <button
          type="button"
          onClick={handleOpen}
          className="px-4 py-2 rounded-lg border border-red-400 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors"
        >
          {tr.deactivate_shop_button}
        </button>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="deactivate-dialog-title"
        >
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 flex flex-col gap-4">
            <h3 id="deactivate-dialog-title" className="text-base font-semibold text-red-700">
              {tr.deactivate_confirm_title}
            </h3>
            <p className="text-sm text-gray-600">{tr.deactivate_confirm_description}</p>

            {error && (
              <p role="alert" className="text-sm text-red-600 font-medium">
                {error}
              </p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {tr.deactivate_cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? '…' : tr.deactivate_confirm_button}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
