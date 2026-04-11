'use client'
// Only imports from src/components/ui/ and system-admin/ allowed (Clean Boundary)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type {
  SysAdminProduct,
  SysAdminProductAttribute,
  SysAdminCategory,
  SysAdminBrand,
} from '@/types/system-admin'
import { pickName } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { FormField } from './FormField'
import { ProductAttributesTable } from './ProductAttributesTable'
import { showToast } from './Toast'

interface ProductFormProps {
  product: SysAdminProduct | null
  attributes: SysAdminProductAttribute[]
  categories: SysAdminCategory[]
  brands: SysAdminBrand[]
  tr: SysAdminTranslations
}

export function ProductForm({ product, attributes, categories, brands, tr }: ProductFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEdit = product != null

  const [name, setName] = useState(pickName(product?.names, ''))
  const [slug, setSlug] = useState(product?.slug ?? '')
  const [categoryId, setCategoryId] = useState(String(product?.category_id ?? ''))
  const [brandId, setBrandId] = useState(String(product?.brand_id ?? ''))
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Name is required'
    if (!slug.trim()) e.slug = 'Slug is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const payload = {
      names: { en: name.trim() },
      slug: slug.trim(),
      category_id: categoryId ? Number(categoryId) : null,
      brand_id: brandId ? Number(brandId) : null,
    }

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
      <FormField
        label={tr.product_name}
        name="name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        disabled={isPending}
      />

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

      <div className="grid grid-cols-2 gap-4">
        <FormField
          as="select"
          label={tr.category}
          name="category_id"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          disabled={isPending}
        >
          <option value="">{tr.none}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name ?? c.external_id}</option>
          ))}
        </FormField>

        <FormField
          as="select"
          label={tr.brand}
          name="brand_id"
          value={brandId}
          onChange={(e) => setBrandId(e.target.value)}
          disabled={isPending}
        >
          <option value="">{tr.none}</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{pickName(b.names)}</option>
          ))}
        </FormField>
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
          <ProductAttributesTable
            productId={product.id}
            attributes={attributes}
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
