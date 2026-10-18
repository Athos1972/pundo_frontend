'use client'
// F5970 — proof method choice. Shows only what the backend offered for this shop (maskierte Werte), and the
// e-mail-domain method only while the entered account e-mail really ends with the shop's website domain (AC 4/6).
// Only imports from src/components/ui/ and shop-admin code (Clean Boundary).

import type { ClaimMethod, ClaimProofMethod } from '@/types/shop-admin'
import type { ShopAdminClaimTranslations } from '@/lib/i18n/shop-admin-claim'

/** Exact host comparison of the e-mail domain (no subdomain rule, like the backend: AR10). */
export function emailMatchesDomain(email: string, domain: string): boolean {
  const at = email.trim().lastIndexOf('@')
  if (at < 1) return false
  return email.trim().slice(at + 1).toLowerCase() === domain.toLowerCase()
}

/** The methods that may be shown for the current account e-mail. */
export function selectableMethods(methods: ClaimMethod[], accountEmail: string): ClaimMethod[] {
  return methods.filter((m) => m.method !== 'email_domain' || emailMatchesDomain(accountEmail, m.requires_domain))
}

interface Props {
  tr: ShopAdminClaimTranslations
  methods: ClaimMethod[]
  accountEmail: string
  selected: ClaimProofMethod | null
  onSelect: (method: ClaimProofMethod) => void
}

function label(tr: ShopAdminClaimTranslations, m: ClaimMethod): { title: string; desc: string } {
  switch (m.method) {
    case 'email_domain':
      return { title: tr.claim_method_email_domain, desc: tr.claim_method_email_domain_desc.replace('{domain}', m.requires_domain) }
    case 'shop_email_code':
      return { title: tr.claim_method_shop_email_code, desc: tr.claim_method_shop_email_code_desc.replace('{email}', m.masked_email) }
    case 'phone_callback':
      return { title: tr.claim_method_phone_callback, desc: tr.claim_method_phone_callback_desc.replace('{phone}', m.masked_phone) }
    case 'document':
      return { title: tr.claim_method_document, desc: tr.claim_method_document_desc }
  }
}

export function ClaimProofMethodPicker({ tr, methods, accountEmail, selected, onSelect }: Props) {
  const visible = selectableMethods(methods, accountEmail)
  const hiddenDomain = methods.find(
    (m): m is Extract<ClaimMethod, { method: 'email_domain' }> =>
      m.method === 'email_domain' && !visible.includes(m),
  )

  if (visible.length === 0) {
    return <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">{tr.claim_methods_none}</p>
  }

  return (
    <fieldset className="flex flex-col gap-2" data-testid="claim-method-picker">
      <legend className="mb-1 text-sm font-semibold text-gray-900">{tr.claim_method_title}</legend>
      {visible.map((m) => {
        const { title, desc } = label(tr, m)
        const checked = selected === m.method
        return (
          <label
            key={m.method}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors ${
              checked ? 'border-accent bg-accent/5' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="proof_method"
              value={m.method}
              checked={checked}
              onChange={() => onSelect(m.method)}
              className="mt-1 accent-[var(--color-accent,#D4622A)]"
            />
            <span className="min-w-0">
              <span className="block font-medium text-gray-900">{title}</span>
              <span className="block text-gray-500 break-words">{desc}</span>
            </span>
          </label>
        )
      })}
      {hiddenDomain && (
        <p className="text-xs text-gray-500">{tr.claim_method_email_domain_tip.replace('{domain}', hiddenDomain.requires_domain)}</p>
      )}
    </fieldset>
  )
}
