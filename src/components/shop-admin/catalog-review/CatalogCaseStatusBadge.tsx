// Only imports from src/components/ui/ allowed (Clean Boundary)
// Pure/server-safe — no hooks, no client-only APIs.

import type { CatalogCaseStatus } from '@/types/shop-admin'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'

interface Props {
  status: CatalogCaseStatus
  tr: ShopAdminTranslations
}

// R4 (02-architecture.md): a complete Record over CatalogCaseStatus so a new/renamed
// status fails the TS build here instead of silently rendering nothing.
const STATUS_CLASSNAMES: Record<CatalogCaseStatus, string> = {
  consent_given: 'bg-blue-100 text-blue-800',
  intake_submitted: 'bg-blue-100 text-blue-800',
  enrichment_in_progress: 'bg-blue-100 text-blue-800',
  enrichment_done: 'bg-blue-100 text-blue-800',
  rework_in_progress: 'bg-indigo-100 text-indigo-800',
  awaiting_owner_review: 'bg-amber-100 text-amber-800',
  published: 'bg-green-100 text-green-800',
  rejected: 'bg-indigo-100 text-indigo-800',
  failed: 'bg-red-100 text-red-800',
}

const STATUS_LABEL_KEYS: Record<CatalogCaseStatus, keyof ShopAdminTranslations> = {
  consent_given: 'catalog_review_status_consent_given',
  intake_submitted: 'catalog_review_status_intake_submitted',
  enrichment_in_progress: 'catalog_review_status_enrichment_in_progress',
  enrichment_done: 'catalog_review_status_enrichment_done',
  rework_in_progress: 'catalog_review_status_rework_in_progress',
  awaiting_owner_review: 'catalog_review_status_awaiting_owner_review',
  published: 'catalog_review_status_published',
  rejected: 'catalog_review_status_rejected',
  failed: 'catalog_review_status_failed',
}

export function CatalogCaseStatusBadge({ status, tr }: Props) {
  const label = tr[STATUS_LABEL_KEYS[status]] as string
  const className = STATUS_CLASSNAMES[status]

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${className}`}>
      {label}
    </span>
  )
}
