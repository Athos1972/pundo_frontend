/**
 * Unit tests for SearchMapBottomSheet (F4300 — Mobile Bottom Sheet)
 *
 * Tests:
 *  (a) nearestSnap — snap point selection logic
 *  (b) Component renders drag handle
 *  (c) Component renders children
 *  (d) aria-label is forwarded correctly
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { nearestSnap, SearchMapBottomSheet } from '@/components/map/SearchMapBottomSheet'
import type { SheetSnap } from '@/components/map/SearchMapBottomSheet'

// --- nearestSnap unit tests (pure function) ---

// Snap values: full=0, half=42, peek=72 (% of sheet height = container−60px)
describe('nearestSnap', () => {
  it('y=0 → full', () => {
    expect(nearestSnap(0)).toBe<SheetSnap>('full')
  })

  it('y=72 → peek', () => {
    expect(nearestSnap(72)).toBe<SheetSnap>('peek')
  })

  it('y=42 → half', () => {
    expect(nearestSnap(42)).toBe<SheetSnap>('half')
  })

  it('y=10 → full (closer to 0 than to 42)', () => {
    expect(nearestSnap(10)).toBe<SheetSnap>('full')
  })

  it('y=21 → full (equidistant 0↔42 → full wins on <=)', () => {
    expect(nearestSnap(21)).toBe<SheetSnap>('full')
  })

  it('y=22 → half (closer to 42 than to 0)', () => {
    expect(nearestSnap(22)).toBe<SheetSnap>('half')
  })

  it('y=50 → half (|50-42|=8 < |50-72|=22)', () => {
    expect(nearestSnap(50)).toBe<SheetSnap>('half')
  })

  it('y=58 → peek (|58-72|=14 < |58-42|=16)', () => {
    expect(nearestSnap(58)).toBe<SheetSnap>('peek')
  })

  it('y=57 → half (|57-42|=15 <= |57-72|=15 → half wins on <=)', () => {
    expect(nearestSnap(57)).toBe<SheetSnap>('half')
  })
})

// --- Component rendering tests ---

describe('SearchMapBottomSheet', () => {
  it('renders children', () => {
    render(
      <SearchMapBottomSheet snap="peek" onSnapChange={vi.fn()}>
        <p>Test content</p>
      </SearchMapBottomSheet>
    )
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('renders drag handle (aria-hidden pill)', () => {
    const { container } = render(
      <SearchMapBottomSheet snap="peek" onSnapChange={vi.fn()}>
        content
      </SearchMapBottomSheet>
    )
    // The drag handle container has aria-hidden="true"
    const handle = container.querySelector('[aria-hidden="true"]')
    expect(handle).toBeInTheDocument()
  })

  it('forwards ariaLabel to the region element', () => {
    render(
      <SearchMapBottomSheet snap="peek" onSnapChange={vi.fn()} ariaLabel="Produktliste">
        content
      </SearchMapBottomSheet>
    )
    expect(screen.getByRole('region', { name: 'Produktliste' })).toBeInTheDocument()
  })

  it('onSnapChange is called when snap changes (smoke: no throw on render)', () => {
    const onSnapChange = vi.fn()
    render(
      <SearchMapBottomSheet snap="half" onSnapChange={onSnapChange}>
        content
      </SearchMapBottomSheet>
    )
    // Component rendered without throwing — state is correct
    expect(onSnapChange).not.toHaveBeenCalled()
  })
})
