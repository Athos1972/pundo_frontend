'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import type { CatalogCaseListItem } from '@/types/shop-admin'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'
import { CatalogCaseStatusBadge } from './CatalogCaseStatusBadge'
import { EnrichmentProgress } from './EnrichmentProgress'
import { SlaCountdown } from './SlaCountdown'

interface Props {
  initialCases: CatalogCaseListItem[]
  lang: string
  tr: ShopAdminTranslations
}

// Statuses that are still running an automatic chain and therefore worth polling
// (Design §4 / 02-architecture.md §5). No polling for static end-states.
const IN_PROGRESS_STATUSES = new Set(['enrichment_in_progress', 'rework_in_progress'])

// 10s is deliberately conservative — the enrichment chain runs over minutes (24h SLA),
// sub-10s resolution brings no value and avoids unnecessary backend load
// (02-architecture.md §5 — documented so this isn't "optimized" away later).
const POLL_INTERVAL_MS = 10_000

export function CatalogReviewOverview({ initialCases, lang, tr }: Props) {
  const [cases, setCases] = useState<CatalogCaseListItem[]>(initialCases)
  const [isPending, startTransition] = useTransition()

  async function refresh() {
    try {
      const res = await fetch('/api/shop-admin/catalog-cases')
      if (res.ok) {
        const data: { cases: CatalogCaseListItem[] } = await res.json()
        setCases(data.cases)
      }
    } catch {
      // Keep last known state — backend hiccups shouldn't blank the list.
    }
  }

  useEffect(() => {
    const hasInProgress = cases.some((c) => IN_PROGRESS_STATUSES.has(c.status))
    if (!hasInProgress) return

    const interval = setInterval(refresh, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [cases])

  function handleManualRefresh() {
    startTransition(refresh)
  }

  if (cases.length === 0) {
    return <p className="text-sm text-gray-500">{tr.catalog_review_empty}</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={isPending}
          className="text-sm bg-gray-100 hover:bg-gray-200 px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {isPending ? '…' : tr.catalog_review_refresh}
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {cases.map((c) => (
          <CatalogCaseCard key={c.id} caseItem={c} lang={lang} tr={tr} />
        ))}
      </div>
    </div>
  )
}

function CatalogCaseCard({ caseItem, lang, tr }: { caseItem: CatalogCaseListItem; lang: string; tr: ShopAdminTranslations }) {
  const date = new Date(caseItem.consent_given_at ?? caseItem.created_at).toLocaleDateString(lang)

  return (
    <article className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-gray-900">
            {tr.catalog_review_col_date}: {date}
          </p>
          <p className="text-xs text-gray-500">
            {tr.catalog_review_col_items}: {caseItem.item_count} · {tr.catalog_review_col_completeness}: {Math.round(caseItem.completeness_pct * 100)}%
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <CatalogCaseStatusBadge status={caseItem.status} tr={tr} />
          <SlaCountdown deadline={caseItem.sla_deadline_at} tr={tr} />
          {caseItem.rework_cycle_count > 0 && (
            <span className="text-xs text-indigo-700">
              {tr.catalog_review_rework_badge.replace('{n}', String(caseItem.rework_cycle_count))}
            </span>
          )}
        </div>
      </div>

      {(caseItem.status === 'enrichment_in_progress' || caseItem.status === 'rework_in_progress' || caseItem.status === 'rejected') && (
        <EnrichmentProgress
          completed={caseItem.completed_item_count}
          total={caseItem.item_count}
          status={caseItem.status === 'rejected' ? 'rework_in_progress' : caseItem.status}
          tr={tr}
        />
      )}

      {caseItem.status === 'awaiting_owner_review' && (
        <div className="flex justify-end">
          <Link
            href={`/shop-admin/catalog-review/${caseItem.id}`}
            className="text-sm bg-accent text-white px-4 py-2 rounded-lg font-semibold hover:bg-accent-dark transition-colors"
          >
            {tr.catalog_review_open_review}
          </Link>
        </div>
      )}

      {caseItem.status === 'published' && (
        <div className="flex justify-end">
          <Link
            href={`/shop-admin/catalog-review/${caseItem.id}`}
            className="text-sm text-gray-500 hover:underline"
          >
            {tr.catalog_review_view}
          </Link>
        </div>
      )}

      {caseItem.status === 'failed' && (
        <p className="text-xs text-red-600">{tr.catalog_review_failed_notice}</p>
      )}
    </article>
  )
}
