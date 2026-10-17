'use client'
// Portal card for the catalogue-onboarding consent (F5980 AC1, "claim flow" — ANNAHME A1).
// States: 1 none+source -> checkbox+button; 2 none, no source -> hint+link; 3 given -> compact line;
// 4 error -> message with retry. Clean Boundary: only src/lib helpers and shop-admin parts.

import { useId, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { isRTL } from '@/lib/lang'
import type { Lang } from '@/lib/lang'
import { CATALOG_CONSENT_TEXT_VERSION } from '@/lib/onboarding/catalogConsent'
import type { CatalogConsentStatus } from '@/types/shop-admin'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'
import { CatalogConsentText } from './CatalogConsentText'

interface Props {
  status: CatalogConsentStatus
  lang: string
  tr: ShopAdminTranslations
}

function formatDate(iso: string, lang: string): string {
  try {
    return new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeZone: 'Asia/Nicosia' }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

export function CatalogConsentCard({ status, lang, tr }: Props) {
  const router = useRouter()
  const checkboxId = useId()
  const [checked, setChecked] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<'generic' | 'version' | null>(null)
  const dir = isRTL(lang as Lang) ? 'rtl' : 'ltr'

  async function submit() {
    if (!checked || saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/shop-admin/catalog-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept-Language': lang },
        body: JSON.stringify({ accepted: true, text_version: CATALOG_CONSENT_TEXT_VERSION }),
      })
      if (res.ok) {
        router.refresh()
        return
      }
      const body = await res.json().catch(() => ({})) as { detail?: unknown }
      setError(body.detail === 'catalog_consent_invalid_version' ? 'version' : 'generic')
    } catch {
      setError('generic')
    } finally {
      setSaving(false)
    }
  }

  // State 3: consent given -> compact line
  if (status.status === 'given' && status.given_at) {
    const line = tr.catalog_consent_given
      .replace('{date}', formatDate(status.given_at, lang))
      .replace('{version}', status.text_version ?? '')
    return (
      <div dir={dir} className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800" data-testid="catalog-consent-given">
        <span className="font-semibold">{tr.catalog_consent_card_title}:</span> {line}
      </div>
    )
  }

  // State 2: nothing to import from
  if (!status.has_catalog_source) {
    return (
      <div dir={dir} className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-2" data-testid="catalog-consent-no-source">
        <h2 className="text-base font-semibold text-gray-900">{tr.catalog_consent_card_title}</h2>
        <p className="text-sm text-gray-600">{tr.catalog_consent_no_source}</p>
        <Link href="/shop-admin/profile" className="self-start text-sm text-accent underline">
          {tr.catalog_consent_no_source_link}
        </Link>
      </div>
    )
  }

  // State 1 / 4
  return (
    <div dir={dir} className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-3" data-testid="catalog-consent-form">
      <h2 className="text-base font-semibold text-gray-900">{tr.catalog_consent_card_title}</h2>
      <CatalogConsentText tr={tr} lang={lang} />
      <label htmlFor={checkboxId} className="flex items-start gap-3 cursor-pointer">
        <input
          id={checkboxId}
          type="checkbox"
          checked={checked}
          onChange={e => setChecked(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-accent"
        />
        <span className="text-sm font-medium text-gray-800">{tr.catalog_consent_checkbox_label}</span>
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error === 'version' ? tr.catalog_consent_version_error : tr.catalog_consent_error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!checked || saving}
        className="self-start rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saving ? tr.catalog_consent_saving : error === 'generic' ? tr.catalog_consent_retry : tr.catalog_consent_submit}
      </button>
    </div>
  )
}
