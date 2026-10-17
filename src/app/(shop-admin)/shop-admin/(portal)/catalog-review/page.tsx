import { getLangServer } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import { getCatalogCases, getCatalogConsent } from '@/lib/shop-admin-api'
import { CatalogReviewOverview } from '@/components/shop-admin/catalog-review/CatalogReviewOverview'
import { CatalogConsentCard } from '@/components/shop-admin/catalog-consent/CatalogConsentCard'
import type { CatalogCaseListItem, CatalogConsentStatus } from '@/types/shop-admin'

export default async function CatalogReviewPage() {
  const lang = await getLangServer()
  const tr = tAdmin(lang)

  let cases: CatalogCaseListItem[] = []
  try {
    const data = await getCatalogCases(lang)
    cases = data.cases
  } catch {
    // Backend not yet available — render an empty overview instead of crashing (offers/page.tsx pattern).
  }

  // F5980 AC1: consent card. Load failure (e.g. backend older than the frontend) hides the card,
  // the case list below stays as before.
  let consent: CatalogConsentStatus | null = null
  try {
    consent = await getCatalogConsent(lang)
  } catch {
    consent = null
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900">{tr.catalog_review_title}</h1>
      {consent && <CatalogConsentCard status={consent} lang={lang} tr={tr} />}
      {/* key: the overview keeps `initialCases` in state — remount when a refresh (e.g. after giving consent) brings a new case */}
      <CatalogReviewOverview key={cases.map((c) => c.id).join(',')} initialCases={cases} lang={lang} tr={tr} />
    </div>
  )
}
