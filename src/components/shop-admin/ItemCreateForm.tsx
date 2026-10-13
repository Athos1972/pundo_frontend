'use client'
// Clean Boundary: only imports from src/components/ui/, @/lib/shop-admin-*, @/types/shop-admin

import { useState } from 'react'
import { tAdmin } from '@/lib/shop-admin-translations'
import { taxonomyForItemType } from '@/lib/shop-admin-categories'
import { CategoryPicker } from '@/components/shop-admin/CategoryPicker'
import type { ItemSearchResult, ItemType, PickerCategory } from '@/types/shop-admin'

interface ItemCreateFormProps {
  lang: string
  onCreated: (item: ItemSearchResult, shopListingId: number) => void
  onCancel: () => void
  /** pre-filled fuzzy-confirmed name */
  initialName?: string
  confirmed?: boolean
}

const ADMIN_NAME_LANGS = ['en', 'de', 'el', 'ru', 'ar', 'he']

export function ItemCreateForm({ lang, onCreated, onCancel, initialName = '', confirmed = false }: ItemCreateFormProps) {
  const tr = tAdmin(lang)
  const nameLang = ADMIN_NAME_LANGS.includes(lang) ? lang : 'en'
  const [name, setName] = useState(initialName)
  const [itemType, setItemType] = useState<ItemType>('product')
  const [category, setCategory] = useState<PickerCategory | null>(null)
  const [ean, setEan] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFieldErrors({})
    setError(null)

    const errs: Record<string, string> = {}
    if (!name.trim() || name.trim().length < 2) errs.name = tr.required
    if (!category) errs.category = tr.required
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return }

    setLoading(true)
    try {
      // Step 1: create item
      const itemBody: Record<string, unknown> = {
        name: name.trim(),
        name_lang: nameLang,
        item_type: itemType,
        category_id: category!.id,
        ...(ean ? { ean } : {}),
        ...(confirmed ? { confirmed: true } : {}),
      }

      const itemRes = await fetch('/api/shop-admin/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept-Language': lang },
        body: JSON.stringify(itemBody),
      })

      if (!itemRes.ok) {
        const body = await itemRes.json().catch(() => ({}))
        const detail = (body as { detail?: string | { similar_items?: unknown; code?: string } }).detail
        if (itemRes.status === 409 && detail && typeof detail === 'object' && 'similar_items' in detail) {
          setError(tr.fuzzy_match_warning)
        } else if (
          itemRes.status === 422 && detail && typeof detail === 'object' &&
          (detail as { code?: string }).code === 'invalid_category'
        ) {
          setCategory(null)
          setFieldErrors({ category: tr.category_picker_invalid_category })
        } else {
          setError(tr.error_generic)
        }
        setLoading(false)
        return
      }

      const itemData = await itemRes.json() as { id: number; slug: string; item_type: string; names?: Record<string, string>; name?: string; category_id: number; ean?: string | null; photos?: { url: string }[] }

      // Step 2: create shop listing
      const listingRes = await fetch('/api/shop-admin/shop-listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept-Language': lang },
        body: JSON.stringify({ item_id: itemData.id }),
      })

      if (!listingRes.ok) {
        setError(tr.error_generic)
        setLoading(false)
        return
      }

      const listing = await listingRes.json() as { id: number }

      const searchResult: ItemSearchResult = {
        id: itemData.id,
        slug: itemData.slug,
        item_type: (itemData.item_type ?? 'product') as ItemType,
        name: itemData.names ? (itemData.names[lang] ?? itemData.names['en'] ?? Object.values(itemData.names)[0] ?? name) : name,
        category_id: itemData.category_id,
        ean: itemData.ean ?? null,
        photo_url: itemData.photos?.[0]?.url ?? null,
      }

      onCreated(searchResult, listing.id)
    } catch {
      setError(tr.error_generic)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 border border-gray-200 rounded-xl p-4 bg-gray-50">
      <p className="text-sm font-semibold text-gray-800">{tr.item_picker_add_new}</p>

      {/* Name (in current UI language) */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          {tr.product_name} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
          required
          minLength={2}
        />
        {fieldErrors.name && <p className="text-xs text-red-600 mt-1">{fieldErrors.name}</p>}
      </div>

      {/* Item type */}
      <fieldset className="border-0 p-0 m-0">
        <legend className="block text-xs font-medium text-gray-700 mb-1">
          {tr.item_type_label} <span className="text-red-500">*</span>
        </legend>
        <div className="flex gap-4">
          {(['product', 'service'] as const).map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="item_type"
                value={t}
                checked={itemType === t}
                onChange={() => {
                  setItemType(t)
                  if (category && category.taxonomy_type !== taxonomyForItemType(t)) setCategory(null)
                }}
                className="accent-accent"
              />
              {t === 'product' ? tr.item_type_product : tr.item_type_service}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Category */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          {tr.category} <span className="text-red-500">*</span>
        </label>
        <CategoryPicker
          lang={lang}
          itemType={itemType}
          itemName={name}
          value={category}
          onChange={setCategory}
          error={fieldErrors.category}
        />
      </div>

      {/* EAN optional */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          {tr.item_picker_ean_label}
        </label>
        <input
          type="text"
          value={ean}
          onChange={(e) => setEan(e.target.value)}
          className={inputCls}
          pattern="[0-9]{8,14}"
          inputMode="numeric"
          placeholder="e.g. 4006381333931"
        />
      </div>

      {error && <p className="text-xs text-red-600" role="alert">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-accent-dark transition-colors disabled:opacity-50"
        >
          {loading ? tr.saving : tr.save}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
        >
          {tr.cancel}
        </button>
      </div>
    </form>
  )
}
