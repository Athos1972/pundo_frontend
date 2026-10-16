import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getReviews, type ReviewListParams } from '@/lib/system-admin-api'
import { ReviewModerationList } from '@/components/system-admin/ReviewModerationList'
import type { SysAdminReview } from '@/types/system-admin'

const LIMIT = 50
const FILTERS = ['reported', 'owner_reported', 'hidden', 'all'] as const
type Filter = (typeof FILTERS)[number]

interface PageProps {
  searchParams: Promise<{ filter?: string; page?: string }>
}

function queryFor(filter: Filter): ReviewListParams {
  if (filter === 'reported') return { has_reports: true }
  if (filter === 'owner_reported') return { report_source: 'shop_owner' }
  if (filter === 'hidden') return { is_visible: false }
  return {}
}

export default async function AdminReviewsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const filter: Filter = (FILTERS as readonly string[]).includes(sp.filter ?? '') ? (sp.filter as Filter) : 'reported'
  const page = Math.max(1, Number(sp.page ?? 1) || 1)

  let reviews: SysAdminReview[] = []
  let failed = false
  try {
    reviews = await getReviews({ ...queryFor(filter), limit: LIMIT, offset: (page - 1) * LIMIT }, lang)
  } catch {
    failed = true
  }

  const labels: Record<Filter, string> = {
    reported: tr.rev_filter_reported,
    owner_reported: tr.rev_filter_owner_reported,
    hidden: tr.rev_filter_hidden,
    all: tr.rev_filter_all,
  }
  const href = (f: Filter, p: number) => `/admin/reviews?filter=${f}${p > 1 ? `&page=${p}` : ''}`

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-gray-900">{tr.rev_title}</h1>

      <nav aria-label={tr.rev_filter_aria} className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={href(f, 1)}
            aria-current={f === filter ? 'page' : undefined}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
              f === filter ? 'bg-slate-800 text-white border-slate-800' : 'text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
          >
            {labels[f]}
          </Link>
        ))}
      </nav>

      {failed ? (
        <p role="alert" className="text-sm text-red-600">{tr.rev_load_error}</p>
      ) : (
        <ReviewModerationList key={`${filter}-${page}`} reviews={reviews} tr={tr} />
      )}

      {(page > 1 || reviews.length === LIMIT) && (
        <div className="flex gap-4 text-sm">
          {page > 1 && <Link href={href(filter, page - 1)} className="text-slate-700 underline">{tr.rev_prev}</Link>}
          {reviews.length === LIMIT && <Link href={href(filter, page + 1)} className="text-slate-700 underline">{tr.rev_next}</Link>}
        </div>
      )}
    </div>
  )
}
