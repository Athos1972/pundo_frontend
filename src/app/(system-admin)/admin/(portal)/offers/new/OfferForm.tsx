'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { SysAdminOffer } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { FormField } from '@/components/system-admin/FormField'
import { showToast } from '@/components/system-admin/Toast'

type PriceType = 'fixed' | 'on_request' | 'free' | 'variable'

interface OfferFormProps {
  offer: SysAdminOffer
  tr: SysAdminTranslations
}

/** Edit form for an existing offer (the backend has no POST /admin/offers). Only fields known to AdminOfferUpdate are sent. */
export function OfferForm({ offer, tr }: OfferFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [currency, setCurrency] = useState(offer.currency ?? 'EUR')
  const [priceType, setPriceType] = useState<PriceType>((offer.price_type as PriceType) ?? 'fixed')
  const [title, setTitle] = useState(offer.title ?? '')
  const [description, setDescription] = useState(offer.description ?? '')
  const [offerUrl, setOfferUrl] = useState(offer.offer_url ?? '')
  const [sku, setSku] = useState(offer.sku ?? '')
  const [skuError, setSkuError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSkuError('')
    const payload: Record<string, unknown> = {
      currency,
      price_type: priceType,
      title: title.trim() || null,
      description: description.trim() || null,
      offer_url: offerUrl.trim() || null,
    }
    const newSku = sku.trim()
    if (newSku !== (offer.sku ?? '')) payload.sku = newSku || null
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/offers/${offer.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => null) as { detail?: { code?: string } | unknown } | null
          const code = (body?.detail as { code?: string } | undefined)?.code
          if (res.status === 409 && code === 'sku_conflict') setSkuError(tr.sku_conflict)
          else if (res.status === 422 && code === 'invalid_sku') setSkuError(tr.sku_invalid)
          showToast(tr.error_generic, 'error')
          return
        }
        showToast(tr.saved, 'success')
        router.push('/admin/offers')
      } catch { showToast(tr.error_backend, 'error') }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-lg">
      <div className="grid grid-cols-2 gap-4">
        <FormField label={tr.shop_id} name="shop_id" value={String(offer.shop_id)} readOnly disabled />
        <FormField label={tr.shop_listing_id} name="shop_listing_id" value={String(offer.shop_listing_id)} readOnly disabled />
      </div>
      <FormField
        label={tr.sku}
        id="admin-offer-sku"
        name="sku"
        dir="ltr"
        maxLength={128}
        value={sku}
        onChange={(e) => setSku(e.target.value)}
        disabled={isPending}
        error={skuError}
        hint={tr.sku_hint}
      />
      <FormField label={tr.offer_title} name="title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isPending} />
      <FormField label={tr.offer_desc} name="description" as="textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} disabled={isPending} />
      <div className="grid grid-cols-2 gap-4">
        <FormField as="select" label={tr.price_type} name="price_type" value={priceType} onChange={(e) => setPriceType(e.target.value as PriceType)} disabled={isPending}>
          <option value="fixed">{tr.price_type_fixed}</option>
          <option value="on_request">{tr.price_type_on_request}</option>
          <option value="free">{tr.price_type_free}</option>
          <option value="variable">{tr.price_type_variable}</option>
        </FormField>
        <FormField label={tr.currency} name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={isPending} />
      </div>
      <FormField label={tr.url} name="offer_url" type="url" value={offerUrl} onChange={(e) => setOfferUrl(e.target.value)} disabled={isPending} />
      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={isPending} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">{isPending ? tr.saving : tr.save}</button>
        <button type="button" onClick={() => router.push('/admin/offers')} disabled={isPending} className="px-5 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50">{tr.cancel}</button>
      </div>
    </form>
  )
}
