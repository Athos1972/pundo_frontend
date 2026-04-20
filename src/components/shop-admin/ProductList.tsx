'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { tAdmin } from '@/lib/shop-admin-translations'
import { showToast } from './Toast'
import type { AdminProduct } from '@/types/shop-admin'

interface ProductListProps {
  initialItems: AdminProduct[]
  lang: string
}

export function ProductList({ initialItems, lang }: ProductListProps) {
  const tr = tAdmin(lang)
  const [items, setItems] = useState<AdminProduct[]>(initialItems)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete(id: number) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/shop-admin/products/${id}`, { method: 'DELETE' })
        if (res.ok) {
          setItems((prev) => prev.filter((p) => p.id !== id))
          showToast('Deleted', 'success')
        } else {
          showToast(tr.error_generic, 'error')
        }
      } catch {
        showToast(tr.error_generic, 'error')
      }
      setConfirmId(null)
    })
  }

  if (items.length === 0) {
    return <p className="text-gray-400 text-sm py-8 text-center">{tr.no_results}</p>
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
        {items.map((product) => (
          <div key={product.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
              <p className="text-xs text-gray-400">
                {product.price_tiers.length > 0
                  ? (() => {
                      const firstTier = product.price_tiers[0]
                      const lowestStep = firstTier.steps.reduce(
                        (min, s) => (parseFloat(s.price) < parseFloat(min.price) ? s : min),
                        firstTier.steps[0],
                      )
                      const unitLabel = firstTier.unit === 'custom'
                        ? (firstTier.unit_label_custom ?? firstTier.unit)
                        : firstTier.unit
                      return `ab ${lowestStep.price} ${lowestStep.currency}/${unitLabel}`
                    })()
                  : '—'}
                {' · '}
                <span className={product.available ? 'text-green-600' : 'text-gray-400'}>
                  {product.available ? tr.available : 'unavailable'}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/shop-admin/products/${product.id}/edit`}
                className="text-xs text-accent hover:underline"
              >
                {tr.edit}
              </Link>
              {confirmId === product.id ? (
                <span className="flex items-center gap-1">
                  <button
                    onClick={() => handleDelete(product.id)}
                    disabled={isPending}
                    className="text-xs text-white bg-red-500 px-2 py-0.5 rounded hover:bg-red-600 disabled:opacity-50"
                  >
                    {tr.delete}
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    {tr.cancel}
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmId(product.id)}
                  className="text-xs text-gray-400 hover:text-red-500"
                >
                  {tr.delete}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
