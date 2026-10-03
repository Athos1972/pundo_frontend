import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EnrichmentProgress } from '@/components/shop-admin/catalog-review/EnrichmentProgress'
import { tAdmin } from '@/lib/shop-admin-translations'

const tr = tAdmin('de')

describe('EnrichmentProgress', () => {
  it('zeigt den Fortschrittstext mit done/total ersetzt', () => {
    render(<EnrichmentProgress completed={342} total={430} status="enrichment_in_progress" tr={tr} />)
    expect(screen.getByText('342 / 430 Produkte verarbeitet')).toBeInTheDocument()
  })

  it('zeigt "Wird aufbereitet" für enrichment_in_progress', () => {
    render(<EnrichmentProgress completed={0} total={10} status="enrichment_in_progress" tr={tr} />)
    expect(screen.getByText(tr.catalog_review_status_enrichment_in_progress)).toBeInTheDocument()
  })

  it('zeigt "Wird überarbeitet" für rework_in_progress (dieselbe Komponente, Design §4)', () => {
    render(<EnrichmentProgress completed={0} total={10} status="rework_in_progress" tr={tr} />)
    expect(screen.getByText(tr.catalog_review_status_rework_in_progress)).toBeInTheDocument()
  })

  it('zeigt keine Buttons (read-only, AC 13/14)', () => {
    render(<EnrichmentProgress completed={5} total={10} status="enrichment_in_progress" tr={tr} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('behandelt total=0 ohne Division-by-Zero-Crash', () => {
    render(<EnrichmentProgress completed={0} total={0} status="enrichment_in_progress" tr={tr} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })

  it('deckelt den Fortschritt bei 100% wenn completed > total', () => {
    render(<EnrichmentProgress completed={12} total={10} status="enrichment_in_progress" tr={tr} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  })
})
