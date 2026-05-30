/**
 * Unit tests for markerIcons.ts (F4300 — Hover-Highlight)
 *
 * Beide Icons sind divIcon mit custom SVG-Pin in Akzentfarbe #D4622A.
 * Die Tests prüfen Dimensionen, CSS-Klassen und SVG-Inhalt.
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
function asMock(icon: unknown): MockIcon { return icon as MockIcon }

describe('defaultMarkerIcon', () => {
  it('is defined', () => {
    expect(defaultMarkerIcon).toBeDefined()
  })

  it('was created as a divIcon (SVG-Pin)', () => {
    expect(asMock(defaultMarkerIcon).__mockType).toBe('divIcon')
  })

  it('has iconSize [28, 40]', () => {
    expect(asMock(defaultMarkerIcon).iconSize).toEqual([28, 40])
  })

  it('has iconAnchor at base-center [14, 40]', () => {
    expect(asMock(defaultMarkerIcon).iconAnchor).toEqual([14, 40])
  })

  it('html contains brand accent color #D4622A', () => {
    expect(asMock(defaultMarkerIcon).html).toContain('#D4622A')
  })

  it('html contains pundo-pin CSS class (defined in globals.css)', () => {
    expect(asMock(defaultMarkerIcon).html).toContain('pundo-pin')
  })

  it('className is empty string to prevent Leaflet default white box', () => {
    expect(asMock(defaultMarkerIcon).className).toBe('')
  })
})

describe('highlightedMarkerIcon', () => {
  it('is defined', () => {
    expect(highlightedMarkerIcon).toBeDefined()
  })

  it('was created as a divIcon', () => {
    expect(asMock(highlightedMarkerIcon).__mockType).toBe('divIcon')
  })

  it('has same iconSize as default [28, 40]', () => {
    expect(asMock(highlightedMarkerIcon).iconSize).toEqual([28, 40])
  })

  it('html contains pundo-pin--active CSS class for active state', () => {
    expect(asMock(highlightedMarkerIcon).html).toContain('pundo-pin--active')
  })

  it('html contains brand accent color #D4622A (same SVG, CSS-only difference)', () => {
    expect(asMock(highlightedMarkerIcon).html).toContain('#D4622A')
  })

  it('html contains no inline style= attributes (CSP style-src compliant)', () => {
    expect(asMock(highlightedMarkerIcon).html).not.toContain('style=')
  })

  it('className is empty string to prevent Leaflet default white box', () => {
    expect(asMock(highlightedMarkerIcon).className).toBe('')
  })
})
