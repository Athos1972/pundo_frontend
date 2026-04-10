'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { SysAdminOffer, SysAdminShop, SysAdminProduct } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { FormField } from '@/components/system-admin/FormField'
import { showToast } from '@/components/system-admin/Toast'

interface OfferFormProps {
  offer: SysAdminOffer | null
  shops: SysAdminShop[]
  products: SysAdminProduct[]
  tr: SysAdminTranslations
}

export function OfferForm({ offer, shops, products, tr }: OfferFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEdit = offer != null

  const [shopId, setShopId] = useState(String(offer?.shop_id ?? ''))
  const [productId, setProductId] = useState(String(offer?.product_id ?? ''))
  const [price, setPrice] = useState(String(offer?.price ?? ''))
  const [currency, setCurrency] = useState(offer?.currency ?? 'EUR')
  const [priceType, setPriceType] = useState<'fixed' | 'on_request' | 'free' | 'variable'>(offer?.price_type ?? 'fixed')
  const [isAvailable, setIsAvailable] = useState(offer?.is_available ?? true)
  const [url, setUrl] = useState(offer?.url ?? '')
  const [sku, setSku] = useState(offer?.sku ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      shop_id: shopId ? Number(shopId) : null,
      product_id: productId ? Number(productId) : null,
      price: price ? Number(price) : 0,
      currency,
      price_type: priceType,
      is_available: isAvailable,
      url: url.trim() || null,
      sku: sku.trim() || null,
    }
    startTransition(async () => {
      try {
        const res = await fetch(isEdit ? `/api/admin/offers/${offer.id}` : '/api/admin/offers', {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) { showToast(tr.error_generic, 'error'); return }
        showToast(tr.saved, 'success')
        router.push('/admin/offers')
      } catch { showToast(tr.error_backend, 'error') }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-lg">
      <FormField as="select" label={tr.shop} name="shop_id" value={shopId} onChange={(e) => setShopId(e.target.value)} disabled={isPending}>
        <option value="">{tr.none}</option>
        {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </FormField>
      <FormField as="select" label={tr.product} name="product_id" value={productId} onChange={(e) => setProductId(e.target.value)} disabled={isPending}>
        <option value="">{tr.none}</option>
        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label={tr.price} name="price" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} disabled={isPending} />
        <FormField label={tr.currency} name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={isPending} />
      </div>
      <FormField as="select" label={tr.price_type} name="price_type" value={priceType} onChange={(e) => setPriceType(e.target.value as 'fixed' | 'on_request' | 'free' | 'variable')} disabled={isPending}>
        <option value="fixed">fixed</option>
        <option value="on_request">on_request</option>
        <option value="free">free</option>
        <option value="variable">variable</option>
      </FormField>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
        <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} className="rounded border-gray-300" />
        {tr.is_available}
      </label>
      <FormField label={tr.url} name="url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} disabled={isPending} />
      <FormField label={tr.sku} name="sku" value={sku} onChange={(e) => setSku(e.target.value)} disabled={isPending} />
      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={isPending} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">{isPending ? tr.saving : tr.save}</button>
        <button type="button" onClick={() => router.push('/admin/offers')} disabled={isPending} className="px-5 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50">{tr.cancel}</button>
      </div>
    </form>
  )
}
