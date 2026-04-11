'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { SysAdminShopType } from '@/types/system-admin'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import { FormField } from '@/components/system-admin/FormField'
import { showToast } from '@/components/system-admin/Toast'

const LANGUAGES = ['en', 'de', 'el', 'ru', 'ar', 'he']

interface Props {
  shopType: SysAdminShopType
  tr: SysAdminTranslations
}

export function ShopTypeEditForm({ shopType, tr }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [canonical, setCanonical] = useState(shopType.canonical)
  const [translations, setTranslations] = useState<Record<string, string>>(shopType.translations)

  function setTranslation(lang: string, value: string) {
    setTranslations((prev) => ({ ...prev, [lang]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/shop-types/${shopType.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ canonical, translations }),
        })
        if (!res.ok) { showToast(tr.error_generic, 'error'); return }
        showToast(tr.saved, 'success')
        router.push('/admin/shop-types')
      } catch {
        showToast(tr.error_backend, 'error')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">
      <FormField
        label="Canonical"
        name="canonical"
        required
        value={canonical}
        onChange={(e) => setCanonical(e.target.value)}
        disabled={isPending}
        hint="Machine-readable key, e.g. pet_store"
      />

      <div className="flex flex-col gap-3">
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
              {LANGUAGES.map((lang) => (
                <tr key={lang} className="border-b border-gray-100 last:border-0">
                  <td className="px-3 py-2 font-mono text-xs text-gray-500 uppercase">{lang}</td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={translations[lang] ?? ''}
                      onChange={(e) => setTranslation(lang, e.target.value)}
                      disabled={isPending}
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm
                        focus:outline-none focus:ring-1 focus:ring-slate-600 disabled:opacity-50"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isPending}
          className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
          {isPending ? tr.saving : tr.save}
        </button>
        <button type="button" onClick={() => router.push('/admin/shop-types')} disabled={isPending}
          className="px-5 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50">
          {tr.cancel}
        </button>
      </div>
    </form>
  )
}
