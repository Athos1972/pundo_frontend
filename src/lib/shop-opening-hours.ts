// B5900-005: Reine, testbare Normalisierungs-Helper für die Shop-Detailseite.
// Grund: `opening_hours_raw`/`location` sind laut Typ bereits optional/nullable,
// aber echte Produktionsdaten können zur Laufzeit vertragswidrig sein (truthy,
// aber strukturell unvollständig). Diese Helper fangen genau das ab, statt dass
// `page.tsx` mit Non-Null-Assertions crasht (siehe B5900-005 01-design.md).
//
// WICHTIG (B5900-006-Kompatibilität): Diese Funktionen sind bewusst frei von
// jeder Metadata-/Titel-/robots-Logik. B5900-006 kann sie unverändert
// wiederverwenden, um z.B. eine "vollständig-genug"-Regel für generateMetadata()
// zu bauen.

import type { OpeningHoursRaw, OpeningHoursSpecialDay, ShopDetailResponse } from '@/types/api'

/**
 * Liefert die Wochentags-Beschreibungen aus `opening_hours_raw`, niemals `undefined`.
 * `Array.isArray` statt bloßer Truthiness/`?.length`, damit ein truthy-aber-falsch
 * geformtes Feld (z.B. ein String statt Array) nicht durchrutscht.
 */
export function getWeekdayDescriptions(raw: OpeningHoursRaw | null | undefined): string[] {
  return Array.isArray(raw?.weekdayDescriptions) ? raw.weekdayDescriptions : []
}

/**
 * Liefert die Sonderöffnungstage aus `opening_hours_raw`, niemals `undefined`.
 */
export function getSpecialDays(raw: OpeningHoursRaw | null | undefined): OpeningHoursSpecialDay[] {
  return Array.isArray(raw?.specialDays) ? raw.specialDays : []
}

export interface ShopMapPin {
  id: number
  name: string
  lat: number
  lng: number
}

/**
 * Baut die Map-Pin-Liste für einen Shop. Liefert nur einen Pin, wenn `location`
 * existiert UND `lat`/`lng` tatsächlich Zahlen sind — ein truthy, aber
 * strukturell unvollständiges `location`-Objekt (z.B. `{}`) ergibt `[]` statt
 * eines Pins mit `lat: undefined` (der den Leaflet-Client crashen würde).
 */
export function buildShopPin(shop: Pick<ShopDetailResponse, 'id' | 'name' | 'location'>): ShopMapPin[] {
  const location = shop.location
  if (
    location &&
    typeof location.lat === 'number' &&
    typeof location.lng === 'number'
  ) {
    return [{ id: shop.id, name: shop.name ?? 'Shop', lat: location.lat, lng: location.lng }]
  }
  return []
}

// B5950-001: internes opening_hours (Owner-gepflegt) inkl. zweitem Fenster.
export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
export interface HoursWindow { open: string; close: string }
export interface HoursRow { dayKey: DayKey; closed: boolean; windows: HoursWindow[] }

const DAY_ORDER: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

const isNonEmpty = (v: unknown): v is string => typeof v === 'string' && v.length > 0

/**
 * Liest internes `opening_hours` ("0".."6" bevorzugt, Fallback mon..sun).
 * - Key fehlt -> Tag ausgelassen
 * - null / closed:true -> closed, keine Fenster
 * - offen ohne gültiges open/close (oder Nicht-Objekt, z.B. Legacy-String) -> Tag ausgelassen
 * - second_* nur, wenn beide nicht-leere Strings sind
 */
export function getInternalHoursRows(oh: Record<string, unknown> | null | undefined): HoursRow[] {
  if (!oh || typeof oh !== 'object' || Array.isArray(oh)) return []
  const rows: HoursRow[] = []
  DAY_ORDER.forEach((dayKey, idx) => {
    const numKey = String(idx)
    const val = numKey in oh ? oh[numKey] : oh[dayKey]
    if (val === undefined) return
    if (val === null) {
      rows.push({ dayKey, closed: true, windows: [] })
      return
    }
    if (typeof val !== 'object' || Array.isArray(val)) return
    const slot = val as Record<string, unknown>
    if (slot.closed === true) {
      rows.push({ dayKey, closed: true, windows: [] })
      return
    }
    if (!isNonEmpty(slot.open) || !isNonEmpty(slot.close)) return
    const windows: HoursWindow[] = [{ open: slot.open, close: slot.close }]
    if (isNonEmpty(slot.second_open) && isNonEmpty(slot.second_close)) {
      windows.push({ open: slot.second_open, close: slot.second_close })
    }
    rows.push({ dayKey, closed: false, windows })
  })
  return rows
}

/** "07:00 – 14:00, 16:30 – 19:00" */
export function formatHoursWindows(windows: HoursWindow[]): string {
  return windows.map((w) => `${w.open} – ${w.close}`).join(', ')
}
