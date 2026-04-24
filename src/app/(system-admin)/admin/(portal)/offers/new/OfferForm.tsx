'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { SysAdminOffer } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { FormField } from '@/components/system-admin/FormField'
import { showToast } from '@/components/system-admin/Toast'

type PriceType = 'fixed' | 'on_request' | 'free' | 'variable'

interface OfferFormProps {
  offer: SysAdminOffer | null
  tr: SysAdminTranslations
}

export function OfferForm({ offer, tr }: OfferFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEdit = offer != null

  const [shopListingId, setShopListingId] = useState(String(offer?.shop_listing_id ?? ''))
  const [currency, setCurrency] = useState(offer?.currency ?? 'EUR')
  const [priceType, setPriceType] = useState<PriceType>((offer?.price_type as PriceType) ?? 'fixed')
  const [title, setTitle] = useState(offer?.title ?? '')
  const [description, setDescription] = useState(offer?.description ?? '')
  const [offerUrl, setOfferUrl] = useState(offer?.offer_url ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      shop_listing_id: shopListingId ? Number(shopListingId) : null,
      currency,
      price_type: priceType,
      title: title.trim() || null,
      description: description.trim() || null,
      offer_url: offerUrl.trim() || null,
      price_tiers: [],
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
      <FormField label="Shop Listing ID" name="shop_listing_id" type="number" value={shopListingId} onChange={(e) => setShopListingId(e.target.value)} disabled={isPending} />
      <FormField label={tr.offer_title} name="title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isPending} />
      <FormField label={tr.offer_desc} name="description" as="textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} disabled={isPending} />
      <div className="grid grid-cols-2 gap-4">
        <FormField as="select" label={tr.price_type} name="price_type" value={priceType} onChange={(e) => setPriceType(e.target.value as PriceType)} disabled={isPending}>
          <option value="fixed">fixed</option>
          <option value="on_request">on_request</option>
          <option value="free">free</option>
          <option value="variable">variable</option>
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
