'use client'
// Consent checkbox for the onboarding wizard (F5980 AC1). Controlled, never pre-checked.
// Short label + collapsible full text. Logical spacing only (RTL-safe).

import { useId, useState } from 'react'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'
import { CatalogConsentText } from './CatalogConsentText'

interface Props {
  tr: ShopAdminTranslations
  lang: string
  checked: boolean
  onChange: (checked: boolean) => void
  /** Localized server-side error (e.g. consent text version outdated). */
  error?: string | null
}

export function CatalogConsentCheckbox({ tr, lang, checked, onChange, error }: Props) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const detailsId = `${id}-details`

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex flex-col gap-2">
      <label htmlFor={id} className="flex items-start gap-3 cursor-pointer">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-accent"
        />
        <span className="text-sm font-medium text-gray-800">{tr.catalog_consent_checkbox_label}</span>
      </label>

      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={detailsId}
        className="self-start ms-7 text-xs text-accent underline"
      >
        {open ? tr.catalog_consent_hide_details : tr.catalog_consent_show_details}
      </button>
      <div id={detailsId} hidden={!open} className="ms-7">
        {open && <CatalogConsentText tr={tr} lang={lang} />}
      </div>

      {error && <p role="alert" className="ms-7 text-xs text-red-600">{error}</p>}
    </div>
  )
}
