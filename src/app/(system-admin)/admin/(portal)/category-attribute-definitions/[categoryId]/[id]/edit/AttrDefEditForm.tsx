'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { SysAdminCategoryAttributeDef } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { AttributeDefinitionEditor } from '@/components/system-admin/AttributeDefinitionEditor'
import { showToast } from '@/components/system-admin/Toast'

interface Props {
  def: SysAdminCategoryAttributeDef
  categoryId: string
  tr: SysAdminTranslations
}

type AttrType = 'text' | 'number' | 'bool' | 'select'

export function AttrDefEditForm({ def, categoryId, tr }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [value, setValue] = useState({
    key: def.key,
    label: def.label,
    type: def.type as AttrType,
    options: def.options,
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/categories/${categoryId}/attribute-definitions/${def.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(value),
        })
        if (!res.ok) { showToast(tr.error_generic, 'error'); return }
        showToast(tr.saved, 'success')
        router.push(`/admin/category-attribute-definitions/${categoryId}`)
      } catch { showToast(tr.error_backend, 'error') }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <AttributeDefinitionEditor
        value={value}
        onChange={setValue}
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
  )
}
