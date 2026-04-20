'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { tAdmin } from '@/lib/shop-admin-translations'
import { FormField } from './FormField'
import { showToast } from './Toast'
import { PriceTierEditor } from './PriceTierEditor'
import type { AdminProduct, PriceTier, PriceUnitOption } from '@/types/shop-admin'

interface Category { id: number; name: string }

interface ProductFormProps {
  product?: AdminProduct
  categories: Category[]
  priceUnits: PriceUnitOption[]
  lang: string
}

async function saveTiers(productId: number, originalTiers: PriceTier[], draftTiers: PriceTier[]) {
  const originalIds = new Set(originalTiers.map((t) => t.id).filter(Boolean))
  const draftIds = new Set(draftTiers.map((t) => t.id).filter(Boolean))

  // Delete tiers that were removed
  for (const id of originalIds) {
    if (!draftIds.has(id)) {
      await fetch(`/api/shop-admin/products/${productId}/price-tiers/${id}`, { method: 'DELETE' })
    }
  }

  for (const tier of draftTiers) {
    const body = {
      unit: tier.unit,
      unit_label_custom: tier.unit === 'custom' ? (tier.unit_label_custom ?? null) : null,
      steps: tier.steps.map((s) => ({
        min_quantity: s.min_quantity,
        max_quantity: s.max_quantity ?? null,
        price: s.price,
        currency: s.currency,
      })),
    }

    if (tier.id) {
      // Update existing tier
      await fetch(`/api/shop-admin/products/${productId}/price-tiers/${tier.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } else {
      // Create new tier
      await fetch(`/api/shop-admin/products/${productId}/price-tiers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }
  }
}

function tiersAreValid(tiers: PriceTier[]): boolean {
  for (const tier of tiers) {
    if (!tier.unit) return false
    if (tier.unit === 'custom' && !tier.unit_label_custom?.trim()) return false
    if (tier.steps.length === 0) return false
    for (const step of tier.steps) {
      if (!step.price || parseFloat(step.price) <= 0) return false
      if (step.max_quantity !== undefined && step.max_quantity < step.min_quantity) return false
    }
  }
  return true
}

export function ProductForm({ product, categories, priceUnits, lang }: ProductFormProps) {
  const tr = tAdmin(lang)
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tiers, setTiers] = useState<PriceTier[]>(product?.price_tiers ?? [])

  const isEdit = !!product

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)

    const newErrors: Record<string, string> = {}
    if (!data.get('name')) newErrors.name = tr.required
    if (tiers.length > 0 && !tiersAreValid(tiers)) newErrors.tiers = tr.error_generic
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    setErrors({})

    startTransition(async () => {
      try {
        const productBody = {
          name: data.get('name'),
          category_id: data.get('category_id') ? Number(data.get('category_id')) : null,
          available: data.get('available') === 'on',
        }

        const url = isEdit ? `/api/shop-admin/products/${product!.id}` : '/api/shop-admin/products'
        const res = await fetch(url, {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productBody),
        })

        if (!res.ok) { showToast(tr.error_generic, 'error'); return }

        const saved = await res.json() as { id: number }
        const productId = saved.id

        await saveTiers(productId, product?.price_tiers ?? [], tiers)

        showToast(tr.saved, 'success')
        router.push('/shop-admin/products')
        router.refresh()
      } catch {
        showToast(tr.error_generic, 'error')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 bg-white rounded-xl border border-gray-200 p-6 max-w-2xl">
      <FormField
        label={tr.product_name}
        name="name"
        type="text"
        required
        defaultValue={product?.name ?? ''}
        error={errors.name}
      />
      <FormField
        label={tr.category}
        name="category_id"
        as="select"
        defaultValue={String(product?.category_id ?? '')}
      >
        <option value="">—</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </FormField>

      <PriceTierEditor
        tiers={tiers}
        onChange={setTiers}
        priceUnits={priceUnits}
        lang={lang}
      />
      {errors.tiers && <p className="text-xs text-red-500">{errors.tiers}</p>}

      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          name="available"
          defaultChecked={product?.available ?? true}
          className="w-4 h-4 rounded accent-accent"
        />
        <span className="text-sm text-gray-700">{tr.available}</span>
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="bg-accent text-white px-6 py-2 rounded-lg text-sm font-semibold
            hover:bg-accent-dark transition-colors disabled:opacity-50"
        >
          {isPending ? tr.saving : tr.save}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
        >
          {tr.cancel}
        </button>
      </div>
    </form>
  )
}
