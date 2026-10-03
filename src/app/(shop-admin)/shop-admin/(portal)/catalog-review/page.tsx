import { getLangServer } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import { getCatalogCases } from '@/lib/shop-admin-api'
import { CatalogReviewOverview } from '@/components/shop-admin/catalog-review/CatalogReviewOverview'
import type { CatalogCaseListItem } from '@/types/shop-admin'

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

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900">{tr.catalog_review_title}</h1>
      <CatalogReviewOverview initialCases={cases} lang={lang} tr={tr} />
    </div>
  )
}
