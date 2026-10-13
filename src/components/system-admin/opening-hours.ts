// Only imports from src/types/system-admin allowed (Clean Boundary)
import type { DayHours } from '@/types/system-admin'

const DAY_NAMES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DEFAULT_OPEN = '09:00'
const DEFAULT_CLOSE = '18:00'

type RawSlot = {
  day?: unknown
  open?: unknown
  close?: unknown
  closed?: unknown
  second_open?: unknown
  second_close?: unknown
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v !== '' ? v : undefined
}

function toDay(day: number, raw: RawSlot | null | undefined): DayHours {
  // null / missing day = closed (shop-owner portal stores closed days as null)
  if (!raw || typeof raw !== 'object') {
    return { day, open: DEFAULT_OPEN, close: DEFAULT_CLOSE, closed: true }
  }
  const hours: DayHours = {
    day,
    open: str(raw.open) ?? DEFAULT_OPEN,
    close: str(raw.close) ?? DEFAULT_CLOSE,
    closed: raw.closed === true,
  }
  const secondOpen = str(raw.second_open)
  const secondClose = str(raw.second_close)
  if (secondOpen || secondClose) {
    hours.second_open = secondOpen ?? ''
    hours.second_close = secondClose ?? ''
  }
  return hours
}

/**
 * Normalizes opening hours from the admin API into exactly 7 editor rows (B8300-001).
 *
 * Accepts the API list format `[{day, open, close, closed, …}]` as well as the
 * stored dict format `{"0".."6": {…} | null}` (or legacy `mon`…`sun` keys).
 * Returns null when no weekday is present, so the editor falls back to defaults.
 */
export function normalizeOpeningHours(raw: unknown): DayHours[] | null {
  if (!raw || typeof raw !== 'object') return null

  const byDay = new Map<number, RawSlot | null>()
  if (Array.isArray(raw)) {
    for (const slot of raw as RawSlot[]) {
      if (slot && typeof slot === 'object' && typeof slot.day === 'number' && slot.day >= 0 && slot.day <= 6) {
        byDay.set(slot.day, slot)
      }
    }
  } else {
    const obj = raw as Record<string, RawSlot | null>
    for (let d = 0; d < 7; d++) {
      if (String(d) in obj) byDay.set(d, obj[String(d)])
      else if (DAY_NAMES[d] in obj) byDay.set(d, obj[DAY_NAMES[d]])
    }
  }

  if (byDay.size === 0) return null
  return [0, 1, 2, 3, 4, 5, 6].map((d) => toDay(d, byDay.get(d)))
}
