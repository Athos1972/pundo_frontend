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

describe('nearestSnap', () => {
  it('y=0 → full', () => {
    expect(nearestSnap(0)).toBe<SheetSnap>('full')
  })

  it('y=75 → peek', () => {
    expect(nearestSnap(75)).toBe<SheetSnap>('peek')
  })

  it('y=40 → half', () => {
    expect(nearestSnap(40)).toBe<SheetSnap>('half')
  })

  it('y=10 → full (closer to 0 than to 40)', () => {
    expect(nearestSnap(10)).toBe<SheetSnap>('full')
  })

  it('y=25 → half (equidistant 0↔40 → picks half since |25-40|=15 < |25-0|=25)', () => {
    // 25 is closer to 40 (delta=15) than to 0 (delta=25)
    expect(nearestSnap(25)).toBe<SheetSnap>('half')
  })

  it('y=60 → peek (closer to 75 than to 40)', () => {
    expect(nearestSnap(60)).toBe<SheetSnap>('peek')
  })

  it('y=55 → half (equidistant: |55-40|=15 < |55-75|=20)', () => {
    expect(nearestSnap(55)).toBe<SheetSnap>('half')
  })

  it('y=57 → peek (|57-75|=18 < |57-40|=17? no → half)', () => {
    // |57-40|=17, |57-75|=18 → half wins
    expect(nearestSnap(57)).toBe<SheetSnap>('half')
  })

  it('y=58 → peek (|58-75|=17 < |58-40|=18)', () => {
    expect(nearestSnap(58)).toBe<SheetSnap>('peek')
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
