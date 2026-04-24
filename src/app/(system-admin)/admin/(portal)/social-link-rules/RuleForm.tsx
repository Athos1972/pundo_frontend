'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'
import type { SocialLinkRuleCategory } from '@/types/system-admin'

const CATEGORIES: SocialLinkRuleCategory[] = ['adult', 'gambling', 'hate', 'illegal', 'malware', 'custom']

interface RuleFormProps {
  tr: SysAdminTranslations
}

export function RuleForm({ tr }: RuleFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [hostError, setHostError] = useState<string | null>(null)
  const [generalError, setGeneralError] = useState<string | null>(null)

  const categoryLabel: Record<SocialLinkRuleCategory, string> = {
    adult: tr.slr_cat_adult,
    gambling: tr.slr_cat_gambling,
    hate: tr.slr_cat_hate,
    illegal: tr.slr_cat_illegal,
    malware: tr.slr_cat_malware,
    custom: tr.slr_cat_custom,
  }

  function validateHost(host: string): boolean {
    const trimmed = host.trim()
    if (!trimmed) return false
    if (trimmed.includes('/') || trimmed.includes(' ') || trimmed.startsWith('http')) return false
    const hostRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-\.]{0,251}[a-zA-Z0-9])?$/
    return hostRegex.test(trimmed)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setHostError(null)
    setGeneralError(null)
    const data = new FormData(e.currentTarget)
    const host = (data.get('host') as string).trim().toLowerCase()
    const category = data.get('category') as SocialLinkRuleCategory
    const note = (data.get('note') as string).trim() || null

    if (!validateHost(host)) {
      setHostError(tr.slr_invalid_host)
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/social-link-rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ host, category, note }),
        })
        if (res.ok || res.status === 201) {
          router.push('/admin/social-link-rules')
          router.refresh()
        } else if (res.status === 409) {
          setHostError(tr.slr_duplicate_error)
        } else if (res.status === 422) {
          setHostError(tr.slr_invalid_host)
        } else {
          setGeneralError(tr.error_generic)
        }
      } catch {
        setGeneralError(tr.error_generic)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
      <div className="flex flex-col gap-1">
        <label htmlFor="slr-host" className="text-sm font-medium text-gray-700">
          {tr.slr_host} <span className="text-red-500">*</span>
        </label>
        <input
          id="slr-host"
          name="host"
          type="text"
          placeholder={tr.slr_host_placeholder}
          required
          className={`rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400
            ${hostError ? 'border-red-400' : 'border-gray-300'}`}
        />
        {hostError && <p className="text-xs text-red-500">{hostError}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="slr-category" className="text-sm font-medium text-gray-700">
          {tr.slr_category} <span className="text-red-500">*</span>
        </label>
        <select
          id="slr-category"
          name="category"
          required
          defaultValue="adult"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{categoryLabel[cat]}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="slr-note" className="text-sm font-medium text-gray-700">{tr.slr_note}</label>
        <textarea
          id="slr-note"
          name="note"
          rows={2}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>

      {generalError && <p className="text-xs text-red-500">{generalError}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
        >
          {isPending ? tr.saving : tr.slr_new}
        </button>
        <a
          href="/admin/social-link-rules"
          className="px-5 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          {tr.cancel}
        </a>
      </div>
    </form>
  )
}
