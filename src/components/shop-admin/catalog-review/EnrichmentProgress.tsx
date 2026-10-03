// Only imports from src/components/ui/ allowed (Clean Boundary)
// Pure/read-only — reused for both enrichment_in_progress and rework_in_progress (Design §4).
// No actions here: the approve/reject gate only opens once the case reaches
// awaiting_owner_review (AC 13, 14).

import type { CatalogCaseStatus } from '@/types/shop-admin'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'

interface Props {
  completed: number
  total: number
  status: CatalogCaseStatus
  tr: ShopAdminTranslations
}

export function EnrichmentProgress({ completed, total, status, tr }: Props) {
  const ratio = total > 0 ? Math.min(1, completed / total) : 0
  const percent = Math.round(ratio * 100)

  const statusLabel = status === 'rework_in_progress'
    ? tr.catalog_review_status_rework_in_progress
    : tr.catalog_review_status_enrichment_in_progress

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-gray-500">{statusLabel}</p>
      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="h-full bg-accent transition-all"
          // @csp-allow-inline-style — dynamic progress width, not expressible via Tailwind classes
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">
        {tr.catalog_review_progress_text.replace('{done}', String(completed)).replace('{total}', String(total))}
      </p>
    </div>
  )
}
