// src/tests/PriceHistory.test.tsx — T9
// Render-Tests for <PriceHistory>, <PriceHistoryEmpty>, <PriceHistoryStats>.
// Tests map to ACs: AC-4, AC-5, AC-6, AC-8, AC-9, AC-10.

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PriceHistory } from '@/components/ui/PriceHistory'
import type { PriceHistoryItem } from '@/types/api'

// PriceHistoryChart uses 'use client' — in vitest/jsdom it renders fine as-is
// because there's no RSC boundary. No extra mock needed.

function makeItem(price: string, crawled_at: string, shop_id = 1): PriceHistoryItem {
  return { shop_id, price, crawled_at }
}

const T1 = '2026-04-17T10:00:00Z'
const T2 = '2026-04-20T10:00:00Z'
const T3 = '2026-04-25T10:00:00Z'

// ─────────────────────────────────────────────
// AC-9: 0 points → null (block not rendered)
// ─────────────────────────────────────────────
describe('PriceHistory with 0 items', () => {
  it('renders nothing (null)', () => {
    const { container } = render(<PriceHistory items={[]} lang="en" />)
    expect(container.firstChild).toBeNull()
  })
})

// ─────────────────────────────────────────────
// AC-8: 1 point → PriceHistoryEmpty
// ─────────────────────────────────────────────
describe('PriceHistory with 1 item (AC-8)', () => {
  it('shows no-change-yet text', () => {
    render(<PriceHistory items={[makeItem('20.00', T1)]} lang="en" />)
    expect(screen.getByText(/No price change observed yet/i)).toBeTruthy()
  })

  it('shows the current price', () => {
    render(<PriceHistory items={[makeItem('20.00', T1)]} lang="en" />)
    expect(screen.getByText('€20.00')).toBeTruthy()
  })

  it('does NOT render an SVG sparkline', () => {
    const { container } = render(<PriceHistory items={[makeItem('20.00', T1)]} lang="en" />)
    const svgs = container.querySelectorAll('svg')
    expect(svgs).toHaveLength(0)
  })

  it('AC-10: German locale shows de string', () => {
    render(<PriceHistory items={[makeItem('20.00', T1)]} lang="de" />)
    expect(screen.getByText(/Noch keine Preisänderung/i)).toBeTruthy()
  })
})

// ─────────────────────────────────────────────
// AC-4: ≥ 2 points → stats visible
// ─────────────────────────────────────────────
describe('PriceHistory with ≥ 2 items (AC-4)', () => {
  const items = [
    makeItem('25.00', T1),
    makeItem('20.00', T2),
    makeItem('18.00', T3),
  ]

  it('shows Lowest label', () => {
    render(<PriceHistory items={items} lang="en" />)
    expect(screen.getByText('Lowest')).toBeTruthy()
  })

  it('shows Highest label', () => {
    render(<PriceHistory items={items} lang="en" />)
    expect(screen.getByText('Highest')).toBeTruthy()
  })

  it('shows Average label', () => {
    render(<PriceHistory items={items} lang="en" />)
    expect(screen.getByText('Average')).toBeTruthy()
  })

  it('renders an SVG sparkline', () => {
    const { container } = render(<PriceHistory items={items} lang="en" />)
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────
// AC-5: Trend badge colour
// ─────────────────────────────────────────────
describe('PriceHistory trend badge (AC-5)', () => {
  it('price drop → text-success class on badge', () => {
    // 25 → 18 = drop
    const items = [makeItem('25.00', T1), makeItem('18.00', T2)]
    const { container } = render(<PriceHistory items={items} lang="en" />)
    const successEls = container.querySelectorAll('.text-success')
    // At least one element should have text-success (trend badge OR best-seen)
    expect(successEls.length).toBeGreaterThan(0)
  })

  it('price rise → text-accent class on badge', () => {
    // 18 → 25 = rise
    const items = [makeItem('18.00', T1), makeItem('25.00', T2)]
    const { container } = render(<PriceHistory items={items} lang="en" />)
    const accentEls = container.querySelectorAll('.text-accent')
    expect(accentEls.length).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────
// AC-6: isCurrentLowest → best-seen notice
// ─────────────────────────────────────────────
describe('PriceHistory best-price notice (AC-6)', () => {
  it('shows best-seen text when current price is the lowest', () => {
    // 25 → 18 (current = lowest)
    const items = [makeItem('25.00', T1), makeItem('18.00', T2)]
    render(<PriceHistory items={items} lang="en" />)
    expect(screen.getByText(/Best price seen so far/i)).toBeTruthy()
  })

  it('does NOT show best-seen text when current price is NOT the lowest', () => {
    // 18 → 25 (current is highest)
    const items = [makeItem('18.00', T1), makeItem('25.00', T2)]
    render(<PriceHistory items={items} lang="en" />)
    expect(screen.queryByText(/Best price seen so far/i)).toBeNull()
  })
})

// ─────────────────────────────────────────────
// AC-10: i18n — non-English locale check
// ─────────────────────────────────────────────
describe('PriceHistory i18n (AC-10)', () => {
  it('de: shows German stat labels', () => {
    const items = [makeItem('25.00', T1), makeItem('18.00', T2)]
    render(<PriceHistory items={items} lang="de" />)
    expect(screen.getByText('Tiefstpreis')).toBeTruthy()
    expect(screen.getByText('Höchstpreis')).toBeTruthy()
    expect(screen.getByText('Durchschnitt')).toBeTruthy()
  })

  it('ar: shows Arabic stat label', () => {
    const items = [makeItem('25.00', T1), makeItem('18.00', T2)]
    render(<PriceHistory items={items} lang="ar" />)
    expect(screen.getByText('الأدنى')).toBeTruthy()
  })

  it('he: shows Hebrew no-change-yet string for 1 point', () => {
    render(<PriceHistory items={[makeItem('20.00', T1)]} lang="he" />)
    expect(screen.getByText(/לא נצפה שינוי מחיר/)).toBeTruthy()
  })
})
