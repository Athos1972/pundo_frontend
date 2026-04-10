'use client'
// Only imports from src/components/ui/ and system-admin/ allowed (Clean Boundary)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { SysAdminBrand } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { FormField } from './FormField'
import { BrandLogoInput } from './BrandLogoInput'
import { showToast } from './Toast'

interface BrandFormProps {
  brand: SysAdminBrand | null
  tr: SysAdminTranslations
}

export function BrandForm({ brand, tr }: BrandFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEdit = brand != null

  const [name, setName] = useState(brand?.name ?? '')
  const [logoUrl, setLogoUrl] = useState(brand?.logo_url ?? '')
  const [website, setWebsite] = useState(brand?.website ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Name is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const payload = {
      name: name.trim(),
      logo_url: logoUrl.trim() || null,
      website: website.trim() || null,
    }

    startTransition(async () => {
      try {
        const url = isEdit ? `/api/admin/brands/${brand.id}` : '/api/admin/brands'
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
        router.push('/admin/brands')
      } catch {
        showToast(tr.error_backend, 'error')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">
      <FormField
        label={tr.name}
        name="name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        disabled={isPending}
      />

      <FormField
        label={tr.website}
        name="website"
        type="url"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        disabled={isPending}
      />

      <div className="flex flex-col gap-2">
        <BrandLogoInput
          brandId={brand?.id ?? null}
          value={logoUrl}
          onChange={setLogoUrl}
          urlTabLabel={tr.logo_url_tab}
          uploadTabLabel={tr.logo_upload_tab}
          logoUrlLabel={tr.logo_url}
          logoPreviewLabel={tr.logo_preview}
          uploadLabel={tr.upload_logo}
          uploadingLabel={tr.uploading}
          errorMessage={tr.error_generic}
        />
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
          onClick={() => router.push('/admin/brands')}
          disabled={isPending}
          className="px-5 py-2 border border-gray-300 text-sm font-medium text-gray-700
            rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {tr.cancel}
        </button>
      </div>
    </form>
  )
}
