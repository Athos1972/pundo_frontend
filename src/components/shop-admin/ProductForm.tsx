'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { tAdmin } from '@/lib/shop-admin-translations'
import { FormField } from './FormField'
import { showToast } from './Toast'
import type { AdminProduct } from '@/types/shop-admin'

interface Category { id: number; name: string }

interface ProductFormProps {
  product?: AdminProduct
  categories: Category[]
  lang: string
}

export function ProductForm({ product, categories, lang }: ProductFormProps) {
  const tr = tAdmin(lang)
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEdit = !!product

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)

    const newErrors: Record<string, string> = {}
    if (!data.get('name')) newErrors.name = tr.required
    if (!data.get('price')) newErrors.price = tr.required
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    setErrors({})

    startTransition(async () => {
      try {
        const body = {
          name: data.get('name'),
          category_id: Number(data.get('category_id')),
          price: data.get('price'),
          currency: data.get('currency') || 'EUR',
          unit: data.get('unit') || 'pcs',
          available: data.get('available') === 'on',
        }
        const url = isEdit ? `/api/shop-admin/products/${product!.id}` : '/api/shop-admin/products'
        const res = await fetch(url, {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.ok) {
          showToast(tr.saved, 'success')
          router.push('/shop-admin/products')
          router.refresh()
        } else {
          showToast(tr.error_generic, 'error')
        }
      } catch {
        showToast(tr.error_generic, 'error')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
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
      <div className="grid grid-cols-2 gap-3">
        <FormField
          label={tr.price}
          name="price"
          type="text"
          inputMode="decimal"
          required
          defaultValue={product?.price ?? ''}
          error={errors.price}
        />
        <FormField
          label={tr.currency}
          name="currency"
          type="text"
          maxLength={3}
          placeholder="EUR"
          defaultValue={product?.currency ?? 'EUR'}
        />
      </div>
      <FormField
        label={tr.unit}
        name="unit"
        type="text"
        placeholder="kg, pcs, l…"
        defaultValue={product?.unit ?? ''}
      />
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
