// Presentation of the catalogue-onboarding consent wording (F5980 AC1). Server-compatible,
// no state. The wording is versioned — see src/lib/i18n/shop-admin-catalog-consent.ts.
// Only generic helpers from src/lib (Clean Boundary: no customer component imports).

import { localePath } from '@/lib/routing'
import type { Lang } from '@/lib/lang'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'

interface Props {
  tr: ShopAdminTranslations
  lang: string
  className?: string
}

export function CatalogConsentText({ tr, lang, className }: Props) {
  const privacyHref = localePath(lang as Lang, '/legal/privacy')
  const termsHref = localePath(lang as Lang, '/legal/terms')
  return (
    <div className={className}>
      <p className="text-sm leading-relaxed text-gray-600">{tr.catalog_consent_text}</p>
      <p className="mt-2 text-sm text-gray-600">
        <span>{tr.catalog_consent_details_prefix}</span>{' '}
        <a href={privacyHref} target="_blank" rel="noopener noreferrer" className="underline text-accent">
          {tr.catalog_consent_link_privacy}
        </a>
        {' · '}
        <a href={termsHref} target="_blank" rel="noopener noreferrer" className="underline text-accent">
          {tr.catalog_consent_link_terms}
        </a>
      </p>
    </div>
  )
}
