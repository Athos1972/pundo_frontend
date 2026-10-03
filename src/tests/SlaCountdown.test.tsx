import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SlaCountdown } from '@/components/shop-admin/catalog-review/SlaCountdown'
import { tAdmin } from '@/lib/shop-admin-translations'

const tr = tAdmin('de')

describe('SlaCountdown', () => {
  it('zeigt die verbleibende Zeit für eine Deadline in der Zukunft', () => {
    // +5s buffer so a few ms of real-time drift between constructing the deadline
    // and the component reading Date.now() can never cross a whole-minute boundary.
    const deadline = new Date(Date.now() + 5 * 60 * 60 * 1000 + 12 * 60 * 1000 + 5000).toISOString()
    render(<SlaCountdown deadline={deadline} tr={tr} />)
    expect(screen.getByText(/5h 12min/)).toBeInTheDocument()
  })

  it('zeigt "SLA überschritten" für eine Deadline in der Vergangenheit (AC 16 — kein Auto-Publish)', () => {
    const deadline = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    render(<SlaCountdown deadline={deadline} tr={tr} />)
    expect(screen.getByText(tr.catalog_review_sla_breached)).toBeInTheDocument()
  })

  it('rendert keinerlei Aktions-Buttons (rein informativ)', () => {
    const deadline = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    render(<SlaCountdown deadline={deadline} tr={tr} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
