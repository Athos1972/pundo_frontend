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
