'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { tAdmin } from '@/lib/shop-admin-translations'
import { FormField } from './FormField'
import { showToast } from './Toast'
import type { AdminOffer, AdminProduct } from '@/types/shop-admin'

interface OfferFormProps {
  offer?: AdminOffer
  products: Pick<AdminProduct, 'id' | 'name'>[]
  lang: string
}

export function OfferForm({ offer, products, lang }: OfferFormProps) {
  const tr = tAdmin(lang)
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEdit = !!offer

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)

    const newErrors: Record<string, string> = {}
    if (!data.get('title')) newErrors.title = tr.required
    if (!data.get('valid_from')) newErrors.valid_from = tr.required
    if (!data.get('valid_until')) newErrors.valid_until = tr.required
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    setErrors({})

    startTransition(async () => {
      try {
        const productId = data.get('product_id')
        const body = {
          title: data.get('title'),
          description: data.get('description') || '',
          price: data.get('price') || '',
          valid_from: data.get('valid_from'),
          valid_until: data.get('valid_until'),
          ...(productId ? { product_id: Number(productId) } : {}),
        }
        const url = isEdit ? `/api/shop-admin/offers/${offer!.id}` : '/api/shop-admin/offers'
        const res = await fetch(url, {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.ok) {
          showToast(tr.saved, 'success')
          router.push('/shop-admin/offers')
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
        label={tr.offer_title}
        name="title"
        type="text"
        required
        defaultValue={offer?.title ?? ''}
        error={errors.title}
      />
      <FormField
        label={tr.offer_desc}
        name="description"
        as="textarea"
        rows={3}
        defaultValue={offer?.description ?? ''}
      />
      <FormField
        label={tr.price}
        name="price"
        type="text"
        inputMode="decimal"
        placeholder="9.99"
        defaultValue={offer?.price ?? ''}
      />
      <div className="grid grid-cols-2 gap-3">
        <FormField
          label={tr.valid_from}
          name="valid_from"
          type="date"
          required
          defaultValue={offer?.valid_from?.slice(0, 10) ?? ''}
          error={errors.valid_from}
        />
        <FormField
          label={tr.valid_until}
          name="valid_until"
          type="date"
          required
          defaultValue={offer?.valid_until?.slice(0, 10) ?? ''}
          error={errors.valid_until}
        />
      </div>
      {products.length > 0 && (
        <FormField
          label={tr.product_link}
          name="product_id"
          as="select"
          defaultValue={String(offer?.product_id ?? '')}
        >
          <option value="">— {tr.product_link}</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </FormField>
      )}
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
