'use client'
// Only imports from src/components/ui/ and system-admin/ allowed (Clean Boundary)

import { useCallback, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type {
  SysAdminProduct,
  SysAdminProductAttribute,
  SysAdminCategory,
  SysAdminBrand,
} from '@/types/system-admin'
import { pickName } from '@/types/system-admin'
import { LANGS, LANG_NATIVE_NAMES, isRTL } from '@/lib/lang'
import type { Lang } from '@/lib/lang'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { FormField } from './FormField'
import { ProductAttributesTable } from './ProductAttributesTable'
import { showToast } from './Toast'
import { Combobox } from './Combobox'
import type { ComboboxItem } from './Combobox'

interface ProductFormProps {
  product: SysAdminProduct | null
  attributes: SysAdminProductAttribute[]
  /** Only the currently selected category / brand (to show its label); the choices are searched on the server. */
  categories: SysAdminCategory[]
  brands: SysAdminBrand[]
  tr: SysAdminTranslations
}

const SEARCH_LIMIT = 50

function categoryItem(c: SysAdminCategory): ComboboxItem {
  return { value: String(c.id), label: c.name ?? c.external_id, subLabel: c.path ?? c.external_id }
}

function brandItem(b: SysAdminBrand): ComboboxItem {
  return { value: String(b.id), label: pickName(b.names) }
}

/** Server-side search of an admin list endpoint (B8200-004): no list of thousands is loaded into the page. */
async function searchAdmin<T extends { id: number }>(path: string, query: string): Promise<T[]> {
  const qs = new URLSearchParams({ limit: String(SEARCH_LIMIT) })
  if (query) qs.set('q', query)
  const res = await fetch(`/api/admin/${path}?${qs}`)
  if (!res.ok) return []
  const data = (await res.json()) as { items?: T[] }
  const seen = new Set<number>() // the category search joins translations: one row per matching translation
  return (data.items ?? []).filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
}

/** Trimmed non-empty values; languages that existed before but are now empty go out as '' (backend removes them). */
function collect(current: Record<string, string>, original?: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const l of LANGS) {
    const v = current[l]?.trim() ?? ''
    if (v) out[l] = v
    else if (original?.[l]) out[l] = ''
  }
  return out
}

export function ProductForm({ product, attributes, categories, brands, tr }: ProductFormProps) {
  const router = useRouter()
  const loadCategories = useCallback(
    async (q: string) => [
      { value: '', label: tr.none } as ComboboxItem,
      ...(await searchAdmin<SysAdminCategory>('categories', q)).map(categoryItem),
    ],
    [tr.none],
  )
  const loadBrands = useCallback(
    async (q: string) => [
      { value: '', label: tr.none } as ComboboxItem,
      ...(await searchAdmin<SysAdminBrand>('brands', q)).map(brandItem),
    ],
    [tr.none],
  )
  const [isPending, startTransition] = useTransition()
  const isEdit = product != null

  // One name + description per language (B8000-004). Saving merges per language in the backend (B8000-003);
  // an empty value of a language that existed before removes it.
  const [names, setNames] = useState<Record<string, string>>(() => ({ ...(product?.names ?? {}) }))
  const [descriptions, setDescriptions] = useState<Record<string, string>>(() => ({ ...(product?.descriptions ?? {}) }))
  const [ean, setEan] = useState(product?.ean ?? '')
  const [slug, setSlug] = useState(product?.slug ?? '')
  const [categoryId, setCategoryId] = useState(String(product?.category_id ?? ''))
  const [brandId, setBrandId] = useState(String(product?.brand_id ?? ''))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [attrFilter, setAttrFilter] = useState('')

  function validate() {
    const e: Record<string, string> = {}
    if (!LANGS.some((l) => names[l]?.trim())) e.name = tr.error_name_required
    if (ean.trim() && !/^\d{8,14}$/.test(ean.replace(/\s/g, ''))) e.ean = tr.error_barcode_invalid
    if (!slug.trim()) e.slug = tr.error_slug_required
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const payload: Record<string, unknown> = {
      names: collect(names, product?.names),
      slug: slug.trim(),
      category_id: categoryId ? Number(categoryId) : null,
      brand_id: brandId ? Number(brandId) : null,
    }
    const descs = collect(descriptions, product?.descriptions ?? undefined)
    if (Object.keys(descs).length > 0) payload.descriptions = descs
    const eanValue = ean.replace(/\s/g, '')
    if (eanValue) payload.ean = eanValue
    else if (isEdit) payload.ean = null

    startTransition(async () => {
      try {
        const url = isEdit ? `/api/admin/products/${product.id}` : '/api/admin/products'
        const method = isEdit ? 'PATCH' : 'POST'
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          showToast(tr.error_generic, 'error')
          return
        }
        showToast(tr.saved, 'success')
        router.push('/admin/products')
      } catch {
        showToast(tr.error_backend, 'error')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">
      <fieldset className="flex flex-col gap-4" disabled={isPending}>
        <legend className="text-xs text-gray-500 mb-1">{tr.product_translations}</legend>
        {LANGS.map((l: Lang) => (
          <div key={l} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
            <FormField
              label={`${tr.product_name} — ${LANG_NATIVE_NAMES[l]}`}
              name={`name_${l}`}
              dir={isRTL(l) ? 'rtl' : 'ltr'}
              value={names[l] ?? ''}
              onChange={(e) => setNames((n) => ({ ...n, [l]: e.target.value }))}
              error={l === 'en' ? errors.name : undefined}
              disabled={isPending}
            />
            <FormField
              as="textarea"
              rows={2}
              label={`${tr.description} — ${LANG_NATIVE_NAMES[l]}`}
              name={`description_${l}`}
              value={descriptions[l] ?? ''}
              onChange={(e) => setDescriptions((d) => ({ ...d, [l]: e.target.value }))}
              disabled={isPending}
            />
          </div>
        ))}
      </fieldset>

      <FormField
        label={tr.slug}
        name="slug"
        required
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        error={errors.slug}
        disabled={isPending}
        hint="URL-safe identifier, e.g. royal-canin-adult"
      />

      <FormField
        label={tr.barcode}
        name="ean"
        inputMode="numeric"
        value={ean}
        onChange={(e) => setEan(e.target.value)}
        error={errors.ean}
        disabled={isPending}
        hint={tr.barcode_hint}
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">{tr.category}</label>
          <Combobox
            items={[
              { value: '', label: tr.none },
              ...categories.map((c): ComboboxItem => categoryItem(c)),
            ]}
            loadItems={loadCategories}
            value={categoryId}
            onChange={setCategoryId}
            placeholder={tr.category}
            noResultsLabel={tr.no_results}
            disabled={isPending}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="brand_id" className="text-sm font-medium text-gray-700">{tr.brand}</label>
          <Combobox
            id="brand_id"
            items={[
              { value: '', label: tr.none },
              ...brands.map((b): ComboboxItem => brandItem(b)),
            ]}
            loadItems={loadBrands}
            value={brandId}
            onChange={setBrandId}
            placeholder={tr.brand}
            noResultsLabel={tr.no_results}
            disabled={isPending}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium
            rounded-lg disabled:opacity-50 transition-colors"
        >
          {isPending ? tr.saving : tr.save}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/products')}
          disabled={isPending}
          className="px-5 py-2 border border-gray-300 text-sm font-medium text-gray-700
            rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {tr.cancel}
        </button>
      </div>

      {isEdit && (
        <div className="flex flex-col gap-2 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">{tr.attribute_key} / {tr.attribute_value}</h3>
          <div className="relative">
            <input
              type="text"
              placeholder={`${tr.search} ${tr.attribute_key}…`}
              value={attrFilter}
              onChange={(e) => setAttrFilter(e.target.value)}
              className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-1.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-slate-600"
            />
          </div>
          <ProductAttributesTable
            productId={product.id}
            attributes={attributes}
            filter={attrFilter}
            labels={{
              key: tr.attribute_key,
              value: tr.attribute_value,
              source: tr.source,
              confidence: tr.confidence,
              add: tr.add_attribute,
              delete: tr.delete,
              confirmDelete: tr.confirm_delete,
              cancel: tr.cancel,
              saved: tr.saved,
              deleted: tr.deleted,
              error: tr.error_generic,
            }}
          />
        </div>
      )}
    </form>
  )
}
