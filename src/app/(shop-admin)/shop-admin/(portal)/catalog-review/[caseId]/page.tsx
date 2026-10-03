import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { tAdmin } from '@/lib/shop-admin-translations'
import { getCatalogCases, getCatalogCaseSample } from '@/lib/shop-admin-api'
import { EnrichmentProgress } from '@/components/shop-admin/catalog-review/EnrichmentProgress'
import { SampleComparison } from '@/components/shop-admin/catalog-review/SampleComparison'
import { ReviewActionBar } from '@/components/shop-admin/catalog-review/ReviewActionBar'
import type { CatalogCaseListItem, CatalogCaseSampleResponse } from '@/types/shop-admin'

interface Props {
  params: Promise<{ caseId: string }>
}

export default async function CatalogReviewDetailPage({ params }: Props) {
  const { caseId } = await params
  const id = Number(caseId)
  const lang = await getLangServer()
  const tr = tAdmin(lang)

  // No single-case GET endpoint (02-architecture.md §0.2) — the list endpoint doubles
  // as the source of Case-Meta/Status for the detail page. MVP volume (typically one
  // active case per shop) makes this unproblematic.
  let caseItem: CatalogCaseListItem | null = null
  let sample: CatalogCaseSampleResponse | null = null

  try {
    const [listData, sampleData] = await Promise.all([
      getCatalogCases(lang),
      getCatalogCaseSample(lang, id, 10).catch(() => null),
    ])
    caseItem = listData.cases.find((c) => c.id === id) ?? null
    sample = sampleData
  } catch {
    // Backend not yet available — fall through to not-found state below.
  }

  if (caseItem === null) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-500">{tr.catalog_review_not_found}</p>
        <Link href="/shop-admin/catalog-review" className="text-sm text-accent hover:underline">
          {tr.catalog_review_back}
        </Link>
      </div>
    )
  }

  const isReviewable = caseItem.status === 'awaiting_owner_review' || caseItem.status === 'published'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900">{tr.catalog_review_title}</h1>
        <Link href="/shop-admin/catalog-review" className="text-sm text-gray-500 hover:underline">
          {tr.catalog_review_back}
        </Link>
      </div>

      {!isReviewable && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-600">{tr.catalog_review_in_progress_notice}</p>
          <EnrichmentProgress
            completed={caseItem.completed_item_count}
            total={caseItem.item_count}
            status={caseItem.status === 'rejected' ? 'rework_in_progress' : caseItem.status}
            tr={tr}
          />
        </div>
      )}

      {isReviewable && sample && (
        <>
          <SampleComparison sample={sample} tr={tr} />
          {caseItem.status === 'awaiting_owner_review' && (
            <ReviewActionBar caseId={caseItem.id} tr={tr} />
          )}
        </>
      )}

      {isReviewable && !sample && (
        <p className="text-sm text-gray-500">{tr.catalog_review_action_failed}</p>
      )}
    </div>
  )
}
