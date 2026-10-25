// @seo-allow-default
// CRM review list (F7600, org cut): legacy cases of the migration, "check channel assignment", relations without role,
// persons without name parts. One tab per category (`?category=`), 50 entries per page.
import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getAdminMe, getCrmReview } from '@/lib/system-admin-api'
import { ReviewList } from '@/components/system-admin/crm/ReviewList'
import { REVIEW_CATEGORIES, reviewCategoryLabel } from '@/components/system-admin/crm/crmLabels'
import { crmCan } from '@/components/system-admin/crm/crmAccess'
import type { CrmReviewCategory, CrmReviewItemOut } from '@/types/system-admin'

const LIMIT = 50

interface PageProps {
  searchParams: Promise<{ category?: string; page?: string }>
}

const href = (category: CrmReviewCategory, page?: number) =>
  `/admin/crm/review?category=${category}${page && page > 1 ? `&page=${page}` : ''}`

export default async function CrmReviewPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const tr = tSysAdmin(await getLangServer())
  const category: CrmReviewCategory = REVIEW_CATEGORIES.includes(sp.category as CrmReviewCategory)
    ? (sp.category as CrmReviewCategory)
    : 'legacy'
  const page = Math.max(1, Number(sp.page ?? 1) || 1)

  const [data, me] = await Promise.all([
    getCrmReview({ category, limit: LIMIT, offset: (page - 1) * LIMIT })
      .catch(() => ({ items: [] as CrmReviewItemOut[], total: 0, limit: LIMIT, offset: 0 })),
    getAdminMe(),
  ])
  const totalPages = Math.ceil(data.total / LIMIT)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-gray-900">{tr.crm_review_title}</h1>
        <Link href="/admin/crm/orgs" className="text-sm text-gray-500 hover:text-gray-700">← {tr.crm_orgs_title}</Link>
      </div>

      <nav aria-label={tr.crm_review_title} className="flex flex-wrap gap-2">
        {REVIEW_CATEGORIES.map((c) => (
          <Link
            key={c}
            href={href(c)}
            aria-current={c === category ? 'page' : undefined}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              c === category ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {reviewCategoryLabel(tr, c)}
          </Link>
        ))}
      </nav>

      <ReviewList items={data.items} tr={tr} canWrite={crmCan(me, 'crm:contacts:write')} />

      {totalPages > 1 && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {page > 1 && <a href={href(category, page - 1)} className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">{tr.prev}</a>}
          <span>{tr.showing} {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, data.total)} {tr.of} {data.total}</span>
          {page < totalPages && <a href={href(category, page + 1)} className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">{tr.next}</a>}
        </div>
      )}
    </div>
  )
}
