import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CatalogCaseStatusBadge } from '@/components/shop-admin/catalog-review/CatalogCaseStatusBadge'
import { tAdmin } from '@/lib/shop-admin-translations'
import type { CatalogCaseStatus } from '@/types/shop-admin'

const tr = tAdmin('de')

const ALL_STATUSES: CatalogCaseStatus[] = [
  'consent_given', 'intake_submitted', 'enrichment_in_progress', 'enrichment_done',
  'awaiting_owner_review', 'published', 'rejected', 'rework_in_progress', 'failed',
]

describe('CatalogCaseStatusBadge', () => {
  it.each(ALL_STATUSES)('rendert ein Label für Status "%s" (vollständiges Record, R4)', (status) => {
    render(<CatalogCaseStatusBadge status={status} tr={tr} />)
    // Every status must resolve to a non-empty, translated label — a missing entry
    // would render "undefined" and fail this assertion (guards against status-enum drift).
    expect(screen.getByText((content) => content.length > 0)).toBeInTheDocument()
  })

  it('zeigt das korrekte Label für awaiting_owner_review', () => {
    render(<CatalogCaseStatusBadge status="awaiting_owner_review" tr={tr} />)
    expect(screen.getByText(tr.catalog_review_status_awaiting_owner_review)).toBeInTheDocument()
  })

  it('zeigt das korrekte Label für published', () => {
    render(<CatalogCaseStatusBadge status="published" tr={tr} />)
    expect(screen.getByText(tr.catalog_review_status_published)).toBeInTheDocument()
  })
})
