/**
 * Unit tests for markerIcons.ts (F4300 — Hover-Highlight)
 *
 * Verifies icon dimensions and that the highlighted icon carries
 * the glow HTML string. Uses a synchronous mock so module-level
 * L.icon / L.divIcon calls receive the mock before the module loads.
 */

import { describe, it, expect, vi } from 'vitest'

// Synchronous mock — must precede the import of markerIcons
vi.mock('leaflet', () => ({
  default: {
    icon: (opts: Record<string, unknown>) => ({ __mockType: 'icon', ...opts }),
    divIcon: (opts: Record<string, unknown>) => ({ __mockType: 'divIcon', ...opts }),
  },
}))
vi.mock('leaflet/dist/leaflet.css', () => ({}))

import { defaultMarkerIcon, highlightedMarkerIcon } from '@/components/map/markerIcons'

type MockIcon = { __mockType: string; iconSize?: [number, number]; iconAnchor?: [number, number]; html?: string; className?: string }
// Double-cast needed: Leaflet types don't overlap with our mock shape
function asMock(icon: unknown): MockIcon { return icon as MockIcon }

describe('defaultMarkerIcon', () => {
  it('is defined', () => {
    expect(defaultMarkerIcon).toBeDefined()
  })

  it('was created as an icon (not divIcon)', () => {
    expect(asMock(defaultMarkerIcon).__mockType).toBe('icon')
  })

  it('has iconSize [25, 41]', () => {
    expect(asMock(defaultMarkerIcon).iconSize).toEqual([25, 41])
  })

  it('has iconAnchor [12, 41]', () => {
    expect(asMock(defaultMarkerIcon).iconAnchor).toEqual([12, 41])
  })
})

describe('highlightedMarkerIcon', () => {
  it('is defined', () => {
    expect(highlightedMarkerIcon).toBeDefined()
  })

  it('was created as a divIcon (not L.icon)', () => {
    expect(asMock(highlightedMarkerIcon).__mockType).toBe('divIcon')
  })

  it('has iconSize [25, 41] — same as default', () => {
    expect(asMock(highlightedMarkerIcon).iconSize).toEqual([25, 41])
  })

  it('html uses CSS class for visual enlargement (no inline style — CSP compliance)', () => {
    expect(asMock(highlightedMarkerIcon).html).toContain('pundo-marker-highlighted')
  })

  it('html contains no inline style attributes (CSP style-src compliance)', () => {
    expect(asMock(highlightedMarkerIcon).html).not.toContain('style=')
  })

  it('html references the PNG marker image', () => {
    expect(asMock(highlightedMarkerIcon).html).toContain('marker-icon.png')
  })

  it('className is empty string to prevent Leaflet default white box', () => {
    expect(asMock(highlightedMarkerIcon).className).toBe('')
  })
})
