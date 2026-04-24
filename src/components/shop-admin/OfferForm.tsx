'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { tAdmin } from '@/lib/shop-admin-translations'
import { FormField } from './FormField'
import { showToast } from './Toast'
import { PriceTierEditor } from './PriceTierEditor'
import { ItemPickerModal } from './ItemPickerModal'
import type { AdminOffer, ItemSearchResult, PriceTier, PriceUnitOption } from '@/types/shop-admin'

interface OfferFormProps {
  offer?: AdminOffer
  /** Pre-resolved item info for edit mode */
  preloadedItem?: ItemSearchResult | null
  priceUnits?: PriceUnitOption[]
  lang: string
}

export function OfferForm({ offer, preloadedItem, priceUnits = [], lang }: OfferFormProps) {
  const tr = tAdmin(lang)
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<1 | 2>(offer ? 2 : 1)
  const [showPicker, setShowPicker] = useState(false)
  const [shopListingId, setShopListingId] = useState<number | null>(offer?.shop_listing_id ?? null)
  const [selectedItem, setSelectedItem] = useState<ItemSearchResult | null>(preloadedItem ?? null)
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>(offer?.price_tiers ?? [])
  const [priceType, setPriceType] = useState<string>(offer?.price_type ?? 'fixed')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEdit = !!offer
  // Scraper offers are shown but not editable in step 1 (item is fixed)
  const isScraperOffer = offer?.source === 'scraper'

  function handleItemSelected(item: ItemSearchResult, listingId?: number) {
    setSelectedItem(item)
    if (listingId) setShopListingId(listingId)
    setShowPicker(false)
    setStep(2)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)

    const newErrors: Record<string, string> = {}
    if (!shopListingId) newErrors.shop_listing_id = tr.required
    if (priceType === 'fixed' || priceType === 'variable') {
      if (priceTiers.length === 0) newErrors.price_tiers = tr.tier_no_steps
      else {
        const hasInvalidStep = priceTiers.some((tier) =>
          tier.steps.some((s) => !s.price || parseFloat(s.price) <= 0)
        )
        if (hasInvalidStep) newErrors.price_tiers = tr.tier_step_error_price
      }
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    setErrors({})

    startTransition(async () => {
      try {
        // Normalize price strings: replace German comma decimal separator with dot
        const normalizedTiers = priceTiers.map((tier) => ({
          ...tier,
          steps: tier.steps.map((s) => ({
            ...s,
            price: s.price.replace(',', '.'),
          })),
        }))

        // on_request and free have no price tiers
        const tiersToSend = (priceType === 'on_request' || priceType === 'free') ? [] : normalizedTiers

        const body: Record<string, unknown> = {
          shop_listing_id: shopListingId,
          price_type: priceType,
          price_tiers: tiersToSend,
          currency: 'EUR',
          title: (data.get('title') as string) || null,
          description: (data.get('description') as string) || null,
          valid_from: (data.get('valid_from') as string) || null,
          valid_until: (data.get('valid_until') as string) || null,
          offer_url: (data.get('offer_url') as string) || null,
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
        } else if (res.status === 422) {
          const json = await res.json().catch(() => null) as { detail?: unknown } | null
          console.error('[OfferForm] 422 detail:', JSON.stringify(json), 'body sent:', JSON.stringify(body))
          const detail = json?.detail
          if (Array.isArray(detail)) {
            const fieldErrors: Record<string, string> = {}
            for (const err of detail as Array<{ loc?: unknown[]; msg?: string }>) {
              const field = Array.isArray(err.loc) ? String(err.loc[err.loc.length - 1]) : null
              if (field && field !== 'body') fieldErrors[field] = err.msg ?? tr.error_generic
            }
            if (Object.keys(fieldErrors).length > 0) {
              setErrors(fieldErrors)
              showToast(tr.error_generic, 'error')
            } else showToast(tr.error_generic, 'error')
          } else {
            showToast(tr.error_generic, 'error')
          }
        } else {
          showToast(tr.error_generic, 'error')
        }
      } catch {
        showToast(tr.error_generic, 'error')
      }
    })
  }

  const sourceLabel = (src?: string) => {
    switch (src) {
      case 'scraper': return tr.source_scraper
      case 'shop_manual': return tr.source_shop_manual
      case 'shop_upload': return tr.source_shop_upload
      case 'spotted': return tr.source_spotted
      case 'admin': return tr.source_admin
      default: return src ?? ''
    }
  }

  return (
    <>
      {/* Step indicator */}
      <div className="flex gap-1 items-center mb-4">
        <button
          type="button"
          onClick={() => !isEdit && setStep(1)}
          className={`text-sm font-medium px-3 py-1 rounded-lg transition-colors
            ${step === 1 ? 'bg-accent text-white' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          {tr.offer_step_item}
        </button>
        <span className="text-gray-300 text-xs">›</span>
        <button
          type="button"
          onClick={() => selectedItem && setStep(2)}
          className={`text-sm font-medium px-3 py-1 rounded-lg transition-colors
            ${step === 2 ? 'bg-accent text-white' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          {tr.offer_step_price}
        </button>
      </div>

      {/* Step 1 — Item selection */}
      {step === 1 && (
        <div className="flex flex-col gap-4 bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
          <p className="text-sm text-gray-700">{tr.offer_step_item}</p>

          {selectedItem ? (
            <div className="flex items-center gap-3 border border-gray-200 rounded-xl p-3 bg-gray-50">
              {selectedItem.photo_url && (
                <div className="relative w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-gray-100">
                  <Image src={selectedItem.photo_url} alt={selectedItem.name} fill className="object-cover" unoptimized />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{selectedItem.name}</p>
                {selectedItem.ean && <p className="text-xs text-gray-400">EAN: {selectedItem.ean}</p>}
              </div>
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className="text-xs text-accent hover:underline shrink-0"
              >
                {tr.edit}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-sm text-gray-500
                hover:border-accent hover:text-accent transition-colors text-center"
            >
              + {tr.item_picker_title}
            </button>
          )}

          {errors.shop_listing_id && (
            <p className="text-xs text-red-600">{errors.shop_listing_id}</p>
          )}

          {selectedItem && (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="bg-accent text-white px-6 py-2 rounded-lg text-sm font-semibold
                hover:bg-accent-dark transition-colors self-start"
            >
              {tr.offer_step_price} →
            </button>
          )}
        </div>
      )}

      {/* Step 2 — Price & details */}
      {step === 2 && (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 bg-white rounded-xl border border-gray-200 p-6 max-w-lg">

          {/* Item summary (readonly in step 2) */}
          {selectedItem && (
            <div className="flex items-center gap-3 border border-gray-100 rounded-xl p-3 bg-gray-50">
              {selectedItem.photo_url && (
                <div className="relative w-10 h-10 shrink-0 rounded-lg overflow-hidden bg-gray-100">
                  <Image src={selectedItem.photo_url} alt={selectedItem.name} fill className="object-cover" unoptimized />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{selectedItem.name}</p>
              </div>
              {offer?.source && (
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                  offer.source === 'scraper' ? 'bg-gray-100 text-gray-500' :
                  offer.source === 'shop_manual' ? 'bg-green-100 text-green-700' :
                  offer.source === 'shop_upload' ? 'bg-blue-100 text-blue-700' :
                  offer.source === 'spotted' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {sourceLabel(offer.source)}
                </span>
              )}
            </div>
          )}

          {/* Price type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{tr.price}</label>
            <select
              value={priceType}
              onChange={(e) => setPriceType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <option value="fixed">{tr.price}</option>
              <option value="on_request">On request</option>
              <option value="free">Free</option>
              <option value="variable">Variable</option>
            </select>
          </div>

          {/* Price tiers for fixed/variable */}
          {(priceType === 'fixed' || priceType === 'variable') && (
            <>
              <PriceTierEditor
                tiers={priceTiers}
                onChange={setPriceTiers}
                priceUnits={priceUnits}
                lang={lang}
              />
              {errors.price_tiers && (
                <p className="text-xs text-red-600">{errors.price_tiers}</p>
              )}
            </>
          )}

          {/* Promotion period */}
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label={tr.valid_from}
              name="valid_from"
              type="date"
              defaultValue={offer?.valid_from?.slice(0, 10) ?? ''}
            />
            <FormField
              label={tr.valid_until}
              name="valid_until"
              type="date"
              defaultValue={offer?.valid_until?.slice(0, 10) ?? ''}
            />
          </div>

          {/* Optional promotion fields */}
          <FormField
            label={tr.offer_action_title}
            name="title"
            type="text"
            defaultValue={offer?.title ?? ''}
          />
          <FormField
            label={tr.offer_action_description}
            name="description"
            as="textarea"
            rows={2}
            defaultValue={offer?.description ?? ''}
          />
          <FormField
            label={tr.offer_url_label}
            name="offer_url"
            type="url"
            defaultValue={offer?.offer_url ?? ''}
          />

          <div className="flex gap-3 pt-2">
            {!isEdit && (
              <button
                type="button"
                onClick={() => !isScraperOffer && setStep(1)}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                ← {tr.offer_step_item}
              </button>
            )}
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
      )}

      {showPicker && (
        <ItemPickerModal
          isOpen={showPicker}
          onClose={() => setShowPicker(false)}
          onSelect={handleItemSelected}
          lang={lang}
        />
      )}
    </>
  )
}
