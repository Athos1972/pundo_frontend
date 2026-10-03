import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'
import { CatalogReviewOverview } from '@/components/shop-admin/catalog-review/CatalogReviewOverview'
import { tAdmin } from '@/lib/shop-admin-translations'
import type { CatalogCaseListItem } from '@/types/shop-admin'

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement('a', { href, className }, children),
}))

const tr = tAdmin('de')

function makeCase(overrides: Partial<CatalogCaseListItem> = {}): CatalogCaseListItem {
  return {
    id: 1,
    shop_id: 1,
    status: 'enrichment_in_progress',
    item_count: 430,
    completed_item_count: 342,
    completeness_pct: 342 / 430,
    sla_deadline_at: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    consent_given_at: '2026-07-14T10:00:00Z',
    rework_cycle_count: 0,
    created_at: '2026-07-14T10:00:00Z',
    ...overrides,
  }
}

function mockFetch(cases: CatalogCaseListItem[]) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ cases }),
  })
}

describe('CatalogReviewOverview — Empty state', () => {
  it('zeigt Empty-State-Text bei 0 Cases', () => {
    render(<CatalogReviewOverview initialCases={[]} lang="de" tr={tr} />)
    expect(screen.getByText(tr.catalog_review_empty)).toBeInTheDocument()
  })
})

describe('CatalogReviewOverview — Status-abhängige Darstellung (AC 9-14)', () => {
  it('zeigt Fortschrittsanzeige, aber keine Aktions-Buttons für enrichment_in_progress (AC 14)', () => {
    render(<CatalogReviewOverview initialCases={[makeCase({ status: 'enrichment_in_progress' })]} lang="de" tr={tr} />)
    expect(screen.getByText('342 / 430 Produkte verarbeitet')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: tr.catalog_review_open_review })).not.toBeInTheDocument()
  })

  it('zeigt Fortschrittsanzeige, aber keine Aktions-Buttons für rework_in_progress (AC 13)', () => {
    render(<CatalogReviewOverview initialCases={[makeCase({ status: 'rework_in_progress', rework_cycle_count: 1 })]} lang="de" tr={tr} />)
    // Both the status badge and the EnrichmentProgress label render the same text — assert at least one occurrence.
    expect(screen.getAllByText(tr.catalog_review_status_rework_in_progress).length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByRole('link', { name: tr.catalog_review_open_review })).not.toBeInTheDocument()
  })

  it('zeigt "Überarbeitung #n" Label wenn rework_cycle_count > 0', () => {
    render(<CatalogReviewOverview initialCases={[makeCase({ status: 'rework_in_progress', rework_cycle_count: 2 })]} lang="de" tr={tr} />)
    expect(screen.getByText('Überarbeitung #2')).toBeInTheDocument()
  })

  it('zeigt keinen Rework-Badge wenn rework_cycle_count = 0', () => {
    render(<CatalogReviewOverview initialCases={[makeCase({ status: 'enrichment_in_progress', rework_cycle_count: 0 })]} lang="de" tr={tr} />)
    expect(screen.queryByText(/Überarbeitung/)).not.toBeInTheDocument()
  })

  it('zeigt "Prüfen"-Link für awaiting_owner_review, der zur Detailseite führt', () => {
    render(<CatalogReviewOverview initialCases={[makeCase({ id: 7, status: 'awaiting_owner_review' })]} lang="de" tr={tr} />)
    const link = screen.getByRole('link', { name: tr.catalog_review_open_review })
    expect(link).toHaveAttribute('href', '/shop-admin/catalog-review/7')
  })

  it('zeigt "Ansehen"-Link für published', () => {
    render(<CatalogReviewOverview initialCases={[makeCase({ id: 3, status: 'published' })]} lang="de" tr={tr} />)
    const link = screen.getByRole('link', { name: tr.catalog_review_view })
    expect(link).toHaveAttribute('href', '/shop-admin/catalog-review/3')
  })

  it('zeigt Support-Hinweis für failed, kein Owner-Handeln möglich', () => {
    render(<CatalogReviewOverview initialCases={[makeCase({ status: 'failed' })]} lang="de" tr={tr} />)
    expect(screen.getByText(tr.catalog_review_failed_notice)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: tr.catalog_review_open_review })).not.toBeInTheDocument()
  })
})

describe('CatalogReviewOverview — Polling (02-architecture.md §5, R8)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('pollt nicht, wenn kein Case in-progress ist', async () => {
    const fetchMock = mockFetch([makeCase({ status: 'published' })])
    vi.stubGlobal('fetch', fetchMock)

    render(<CatalogReviewOverview initialCases={[makeCase({ status: 'published' })]} lang="de" tr={tr} />)

    await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('pollt alle 10s, wenn mindestens ein Case in enrichment_in_progress ist', async () => {
    const fetchMock = mockFetch([makeCase({ status: 'enrichment_in_progress' })])
    vi.stubGlobal('fetch', fetchMock)

    render(<CatalogReviewOverview initialCases={[makeCase({ status: 'enrichment_in_progress' })]} lang="de" tr={tr} />)

    await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
    expect(fetchMock).toHaveBeenCalledWith('/api/shop-admin/catalog-cases')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('stoppt das Polling, sobald kein Case mehr in-progress ist (R8, kein Dauer-Polling)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ cases: [makeCase({ status: 'awaiting_owner_review' })] }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<CatalogReviewOverview initialCases={[makeCase({ status: 'enrichment_in_progress' })]} lang="de" tr={tr} />)

    // First tick: fires, fetch resolves to a non-in-progress case, React re-renders —
    // wrapped in act() so the resulting effect re-evaluation (interval cleared) is
    // flushed before we advance further.
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // Case is now awaiting_owner_review — no more in-progress, interval must be cleared.
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
