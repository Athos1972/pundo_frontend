'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getLangFromCookie } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { AttributeDefinitionEditor } from '@/components/system-admin/AttributeDefinitionEditor'
import { showToast } from '@/components/system-admin/Toast'
import { useTransition } from 'react'

export default function NewCategoryAttrDefPage() {
  const params = useParams()
  const categoryId = params.categoryId as string
  const router = useRouter()
  const tr = tSysAdmin(getLangFromCookie())
  const [isPending, startTransition] = useTransition()
  const [def, setDef] = useState<import('@/components/system-admin/AttributeDefinitionEditor').AttrDefDraft>({
    attribute_key: '',
    attribute_type: 'text',
    allowed_values: null,
    unit: null,
    is_filterable: false,
    display_order: 0,
    override_mode: 'merge',
    labels: {},
    value_labels: null,
    created_at: '',
    updated_at: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/categories/${categoryId}/attribute-definitions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(def),
        })
        if (!res.ok) { showToast(tr.error_generic, 'error'); return }
        showToast(tr.saved, 'success')
        router.push(`/admin/category-attribute-definitions/${categoryId}`)
      } catch { showToast(tr.error_backend, 'error') }
    })
  }

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <h1 className="text-xl font-semibold text-gray-900">{tr.nav_cat_attr_defs} — {tr.add_new}</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <AttributeDefinitionEditor
          value={def}
          onChange={setDef}
          keyLabel={tr.key}
          labelLabel={tr.label}
          typeLabel={tr.type}
          optionsLabel={tr.options}
          optionsHint="Comma-separated values"
        />
        <div className="flex gap-3">
          <button type="submit" disabled={isPending}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
            {isPending ? tr.saving : tr.save}
          </button>
          <button type="button" onClick={() => router.push(`/admin/category-attribute-definitions/${categoryId}`)}
            className="px-5 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50">
            {tr.cancel}
          </button>
        </div>
      </form>
    </div>
  )
}
