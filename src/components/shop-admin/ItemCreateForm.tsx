'use client'
// Clean Boundary: only imports from src/components/ui/, @/lib/shop-admin-*, @/types/shop-admin

import { useState, useEffect } from 'react'
import { tAdmin } from '@/lib/shop-admin-translations'
import type { ItemSearchResult, ItemType } from '@/types/shop-admin'

interface Category {
  id: number
  name: string
}

interface ItemCreateFormProps {
  lang: string
  onCreated: (item: ItemSearchResult, shopListingId: number) => void
  onCancel: () => void
  /** pre-filled fuzzy-confirmed name */
  initialName?: string
  confirmed?: boolean
}

export function ItemCreateForm({ lang, onCreated, onCancel, initialName = '', confirmed = false }: ItemCreateFormProps) {
  const tr = tAdmin(lang)
  const [name, setName] = useState(initialName)
  const [itemType, setItemType] = useState<ItemType>('product')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [ean, setEan] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/v1/categories?limit=200')
      .then((r) => r.json())
      .then((d: unknown) => {
        const data = d as { items?: { id: number; name?: string | null }[] }
        setCategories((data.items ?? []).map((c) => ({ id: c.id, name: c.name ?? '' })))
      })
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFieldErrors({})
    setError(null)

    const errs: Record<string, string> = {}
    if (!name.trim() || name.trim().length < 2) errs.name = tr.required
    if (!categoryId) errs.category = tr.required
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return }

    setLoading(true)
    try {
      // Step 1: create item
      const itemBody: Record<string, unknown> = {
        name_de: name.trim(),
        item_type: itemType,
        category_id: Number(categoryId),
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
        const detail = (body as { detail?: string | { similar_items?: unknown } }).detail
        if (itemRes.status === 409 && detail && typeof detail === 'object' && 'similar_items' in detail) {
          setError(tr.fuzzy_match_warning)
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
        name: itemData.names ? (itemData.names[lang] ?? itemData.names['de'] ?? itemData.names['en'] ?? name) : name,
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

      {/* Name DE */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          {tr.product_name} (DE) <span className="text-red-500">*</span>
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
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          {tr.category} <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-4">
          {(['product', 'service'] as const).map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="item_type"
                value={t}
                checked={itemType === t}
                onChange={() => setItemType(t)}
                className="accent-accent"
              />
              {t === 'product' ? tr.item_type_product : tr.item_type_service}
            </label>
          ))}
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          {tr.category} <span className="text-red-500">*</span>
        </label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
          className={inputCls}
          required
        >
          <option value="">— {tr.category}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {fieldErrors.category && <p className="text-xs text-red-600 mt-1">{fieldErrors.category}</p>}
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
