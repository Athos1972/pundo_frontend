// B8300-001: System-Admin-Öffnungszeiten — Normalisierung für den Editor
import { describe, it, expect } from 'vitest'
import { normalizeOpeningHours } from '@/components/system-admin/opening-hours'

describe('normalizeOpeningHours', () => {
  it('liefert null ohne Wochentage (leeres Objekt, null, leere Liste)', () => {
    expect(normalizeOpeningHours(null)).toBeNull()
    expect(normalizeOpeningHours(undefined)).toBeNull()
    expect(normalizeOpeningHours({})).toBeNull()
    expect(normalizeOpeningHours([])).toBeNull()
    expect(normalizeOpeningHours({ periods: [], weekdayDescriptions: [] })).toBeNull()
  })

  it('übernimmt die API-Liste mit 7 Tagen inkl. zweitem Fenster', () => {
    const api = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
      day,
      open: day === 6 ? null : '07:00',
      close: day === 6 ? null : '14:00',
      closed: day === 6,
      second_open: day === 0 ? '16:30' : null,
      second_close: day === 0 ? '19:00' : null,
    }))
    const rows = normalizeOpeningHours(api)!
    expect(rows).toHaveLength(7)
    expect(rows[0]).toEqual({
      day: 0, open: '07:00', close: '14:00', closed: false, second_open: '16:30', second_close: '19:00',
    })
    // null-Zeiten am geschlossenen Tag → Defaults, damit die time-Inputs kontrolliert bleiben
    expect(rows[6]).toEqual({ day: 6, open: '09:00', close: '18:00', closed: true })
    expect(rows[1]).not.toHaveProperty('second_open')
  })

  it('wandelt das gespeicherte Dict-Format um; null-Tage werden geschlossen statt verworfen', () => {
    const rows = normalizeOpeningHours({
      '0': { open: '09:00', close: '18:00', closed: false },
      '5': { open: '09:00', close: '13:00', closed: false },
      '6': null,
    })!
    expect(rows.map((r) => r.day)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(rows[5].close).toBe('13:00')
    expect(rows[6].closed).toBe(true)
    // fehlender Tag → geschlossen
    expect(rows[2].closed).toBe(true)
  })

  it('versteht Legacy-Keys mon…sun', () => {
    const rows = normalizeOpeningHours({ mon: { open: '10:00', close: '12:00' } })!
    expect(rows[0]).toMatchObject({ day: 0, open: '10:00', close: '12:00', closed: false })
    expect(rows[1].closed).toBe(true)
  })

  it('ergänzt fehlende Tage einer unvollständigen Liste', () => {
    const rows = normalizeOpeningHours([{ day: 3, open: '08:00', close: '12:00', closed: false }])!
    expect(rows).toHaveLength(7)
    expect(rows[3].open).toBe('08:00')
    expect(rows[0].closed).toBe(true)
  })
})
