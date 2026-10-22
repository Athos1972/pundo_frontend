import Link from 'next/link'
import { getLangServer } from '@/lib/lang'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { getCategoryReviewQueue } from '@/lib/system-admin-api'
import { CategoryReviewList } from '@/components/system-admin/CategoryReviewList'
import type { SysAdminCategoryReviewItem } from '@/types/system-admin'

const LIMIT = 50

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

// B5982-001: borderline backfill categorisations waiting for an admin decision.
export default async function AdminCategoryReviewPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const lang = await getLangServer()
  const tr = tSysAdmin(lang)
  const page = Math.max(1, Number(sp.page ?? 1) || 1)

  let items: SysAdminCategoryReviewItem[] = []
  let total = 0
  let failed = false
  try {
    const res = await getCategoryReviewQueue({ limit: LIMIT, offset: (page - 1) * LIMIT })
    items = res.items
    total = res.total
  } catch {
    failed = true
  }

  const pages = Math.max(1, Math.ceil(total / LIMIT))

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{tr.crv_title}</h1>
        <p className="text-sm text-gray-600 mt-1 max-w-3xl">{tr.crv_intro}</p>
        {!failed && <p className="text-xs text-gray-500 mt-1">{tr.crv_total.replace('{count}', String(total))}</p>}
      </div>

      {failed ? (
        <p role="alert" className="text-sm text-red-600">{tr.crv_load_error}</p>
      ) : (
        <CategoryReviewList key={page} items={items} tr={tr} />
      )}

      {pages > 1 && (
        <nav className="flex gap-2 text-sm" aria-label={tr.crv_title}>
          {page > 1 && <Link href={`/admin/category-review?page=${page - 1}`} className="px-3 py-1.5 border rounded-lg">←</Link>}
          <span className="px-3 py-1.5 text-gray-600">{page} / {pages}</span>
          {page < pages && <Link href={`/admin/category-review?page=${page + 1}`} className="px-3 py-1.5 border rounded-lg">→</Link>}
        </nav>
      )}
    </div>
  )
}
