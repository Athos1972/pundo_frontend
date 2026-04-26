'use client'
// Only imports from src/components/ui/ and system-admin/ allowed (Clean Boundary)

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type {
  SysAdminCategory,
  SysAdminCategoryTranslation,
  SysAdminCategoryAttributeDef,
} from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { FormField } from './FormField'
import { showToast } from './Toast'
import { AttributeDefinitionEditor } from './AttributeDefinitionEditor'
import type { AttrDefDraft } from './AttributeDefinitionEditor'

const LANGUAGES = ['en', 'de', 'el', 'ru', 'ar', 'he']

interface CategoryFormProps {
  category: SysAdminCategory | null
  allCategories: SysAdminCategory[]
  translations: SysAdminCategoryTranslation[]
  attrDefs: SysAdminCategoryAttributeDef[]
  tr: SysAdminTranslations
}

export function CategoryForm({ category, allCategories, translations: initTr, attrDefs: initAttrDefs, tr }: CategoryFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEdit = category != null

  // external_id is the human-editable key for categories
  const [externalId, setExternalId] = useState(category?.external_id ?? '')
  const [parentId, setParentId] = useState(String(category?.parent_id ?? ''))
  const [taxonomyType, setTaxonomyType] = useState(category?.taxonomy_type ?? '')
  const [translations, setTranslations] = useState<SysAdminCategoryTranslation[]>(initTr)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [attrDefs, setAttrDefs] = useState<SysAdminCategoryAttributeDef[]>(initAttrDefs)
  const [attrDefDraft, setAttrDefDraft] = useState<AttrDefDraft | null>(null)

  const VALID_TAXONOMY_TYPES = ['google', 'unspsc']

  function validate() {
    const e: Record<string, string> = {}
    if (!externalId.trim()) e.external_id = 'External ID is required'
    if (!taxonomyType.trim()) e.taxonomy_type = tr.error_required
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function updateTranslation(lang: string, name: string) {
    setTranslations((prev) => {
      const existing = prev.find((t) => t.lang === lang)
      if (existing) {
        return prev.map((t) => t.lang === lang ? { ...t, name } : t)
      }
      return [...prev, {
        id: -Date.now(),
        category_id: category?.id ?? 0,
        lang,
        name,
        rtl: false,
      }]
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const payload = {
      external_id: externalId.trim(),
      parent_id: parentId ? Number(parentId) : null,
      taxonomy_type: taxonomyType,
    }

    startTransition(async () => {
      try {
        const url = isEdit ? `/api/admin/categories/${category.id}` : '/api/admin/categories'
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

        // Save translations if editing
        if (isEdit) {
          const RTL_LANGS = new Set(['ar', 'he'])
          const trPayload = translations
            .filter((t) => t.name.trim())
            .map(({ lang, name: tName }) => ({ lang, name: tName, rtl: RTL_LANGS.has(lang) }))

          await fetch(`/api/admin/categories/${category.id}/translations`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(trPayload),
          }).catch(() => {})
        }

        showToast(tr.saved, 'success')
        router.push('/admin/categories')
      } catch {
        showToast(tr.error_backend, 'error')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">
      <FormField
        label="External ID"
        name="external_id"
        required
        value={externalId}
        onChange={(e) => setExternalId(e.target.value)}
        error={errors.external_id}
        disabled={isPending}
        hint="Unique identifier, e.g. Google taxonomy ID or UNSPSC code"
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          as="select"
          label={tr.parent_category}
          name="parent_id"
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          disabled={isPending}
        >
          <option value="">{tr.none}</option>
          {allCategories
            .filter((c) => c.id !== category?.id)
            .map((c) => (
              <option key={c.id} value={c.id}>{c.name ?? c.external_id} ({c.level})</option>
            ))}
        </FormField>

        <FormField
          as="select"
          label={tr.taxonomy_type}
          name="taxonomy_type"
          value={taxonomyType}
          onChange={(e) => setTaxonomyType(e.target.value)}
          disabled={isPending}
          required
          error={errors.taxonomy_type}
        >
          <option value="">— select —</option>
          <option value="google">Google</option>
          <option value="unspsc">UNSPSC</option>
          {taxonomyType && !VALID_TAXONOMY_TYPES.includes(taxonomyType) && (
            <option value={taxonomyType}>{taxonomyType} (legacy)</option>
          )}
        </FormField>
      </div>

      {isEdit && (
        <div className="flex flex-col gap-3 pt-2 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">{tr.translations_tab}</h3>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-3 py-2 text-start text-xs font-semibold text-gray-500 uppercase w-16">{tr.language}</th>
                  <th className="px-3 py-2 text-start text-xs font-semibold text-gray-500 uppercase">{tr.name}</th>
                </tr>
              </thead>
              <tbody>
                {LANGUAGES.map((lang) => {
                  const t = translations.find((x) => x.lang === lang)
                  return (
                    <tr key={lang} className="border-b border-gray-100 last:border-0">
                      <td className="px-3 py-2 font-mono text-xs text-gray-500 uppercase">{lang}</td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={t?.name ?? ''}
                          onChange={(e) => updateTranslation(lang, e.target.value)}
                          disabled={isPending}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm
                            focus:outline-none focus:ring-1 focus:ring-slate-600 disabled:opacity-50"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isEdit && (
        <div className="flex flex-col gap-3 pt-2 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">{tr.attr_defs_section}</h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-3 py-2 text-start text-xs font-semibold text-gray-500 uppercase">{tr.attribute_key}</th>
                  <th className="px-3 py-2 text-start text-xs font-semibold text-gray-500 uppercase">{tr.type}</th>
                  <th className="px-3 py-2 text-start text-xs font-semibold text-gray-500 uppercase">{tr.label}</th>
                  <th className="px-3 py-2 w-16" />
                </tr>
              </thead>
              <tbody>
                {attrDefs.map((def) => (
                  <tr key={def.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{def.attribute_key}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{def.attribute_type}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {(def.labels as Record<string, string>)?.['en'] ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await fetch(`/api/admin/categories/${category!.id}/attribute-definitions/${def.id}`, { method: 'DELETE' })
                          if (res.ok || res.status === 204) {
                            setAttrDefs((prev) => prev.filter((d) => d.id !== def.id))
                          }
                        }}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        {tr.delete}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {attrDefDraft ? (
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
              <AttributeDefinitionEditor
                value={attrDefDraft}
                onChange={setAttrDefDraft}
                keyLabel={tr.attribute_key}
                labelLabel={tr.label}
                typeLabel={tr.type}
                optionsLabel={tr.options}
                optionsHint="Comma-separated values"
              />
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={async () => {
                    if (!attrDefDraft) return
                    const payload = {
                      category_id: category!.id,
                      attribute_key: attrDefDraft.attribute_key,
                      attribute_type: attrDefDraft.attribute_type,
                      allowed_values: attrDefDraft.allowed_values,
                      unit: attrDefDraft.unit,
                      is_filterable: attrDefDraft.is_filterable,
                      display_order: attrDefDraft.display_order,
                      override_mode: attrDefDraft.override_mode || 'inherit',
                      labels: attrDefDraft.labels,
                      value_labels: attrDefDraft.value_labels,
                    }
                    const res = await fetch(`/api/admin/category-attribute-definitions`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload),
                    })
                    if (res.ok) {
                      const created: SysAdminCategoryAttributeDef = await res.json()
                      setAttrDefs((prev) => [...prev, created])
                      setAttrDefDraft(null)
                      showToast(tr.saved, 'success')
                    } else {
                      showToast(tr.error_generic, 'error')
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg"
                >
                  {tr.save}
                </button>
                <button
                  type="button"
                  onClick={() => setAttrDefDraft(null)}
                  className="px-3 py-1.5 border border-gray-300 text-xs font-medium text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  {tr.cancel}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAttrDefDraft({
                attribute_key: '',
                attribute_type: 'text',
                allowed_values: null,
                unit: null,
                is_filterable: true,
                display_order: attrDefs.length,
                override_mode: 'inherit',
                labels: {},
                value_labels: null,
                created_at: '',
                updated_at: '',
              })}
              className="self-start text-sm text-slate-600 hover:text-slate-900 font-medium
                flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-gray-300
                rounded-lg hover:border-slate-400 transition-colors"
            >
              + {tr.add_attr_def}
            </button>
          )}
        </div>
      )}

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
          onClick={() => router.push('/admin/categories')}
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
