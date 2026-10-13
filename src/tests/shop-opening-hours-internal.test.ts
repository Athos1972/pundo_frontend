// B5950-001: internes opening_hours inkl. zweitem Fenster (Mittagspause)
import { describe, it, expect } from 'vitest'
import { getInternalHoursRows, formatHoursWindows } from '@/lib/shop-opening-hours'

describe('getInternalHoursRows', () => {
  it('liefert zwei Fenster', () => {
    const rows = getInternalHoursRows({
      '0': { open: '07:00', close: '14:00', closed: false, second_open: '16:30', second_close: '19:00' },
    })
    expect(rows).toEqual([
      { dayKey: 'mon', closed: false, windows: [{ open: '07:00', close: '14:00' }, { open: '16:30', close: '19:00' }] },
    ])
  })

  it('nur erstes Fenster, auch bei second_* = null (Owner-PUT-Shape)', () => {
    const rows = getInternalHoursRows({
      '1': { open: '09:00', close: '18:00', closed: false, second_open: null, second_close: null },
    })
    expect(rows[0].windows).toEqual([{ open: '09:00', close: '18:00' }])
  })

  it('halbes zweites Fenster wird verworfen', () => {
    const rows = getInternalHoursRows({ '0': { open: '09:00', close: '18:00', second_open: '20:00' } })
    expect(rows[0].windows).toHaveLength(1)
    const rows2 = getInternalHoursRows({ '0': { open: '09:00', close: '18:00', second_open: '', second_close: '21:00' } })
    expect(rows2[0].windows).toHaveLength(1)
  })

  it('null -> closed', () => {
    expect(getInternalHoursRows({ '6': null })).toEqual([{ dayKey: 'sun', closed: true, windows: [] }])
  })

  it('closed:true -> closed, Zeiten ignoriert', () => {
    expect(getInternalHoursRows({ '2': { closed: true, open: '09:00', close: '10:00' } })).toEqual([
      { dayKey: 'wed', closed: true, windows: [] },
    ])
  })

  it('offen ohne Zeiten -> Tag fehlt (B5900-012)', () => {
    expect(getInternalHoursRows({ '0': { closed: false }, '1': { open: '09:00', closed: false } })).toEqual([])
  })

  it('Key fehlt -> Tag fehlt; Reihenfolge Mo..So', () => {
    const rows = getInternalHoursRows({ '4': { open: '08:00', close: '12:00' }, '0': { open: '09:00', close: '10:00' } })
    expect(rows.map((r) => r.dayKey)).toEqual(['mon', 'fri'])
  })

  it('numerische Keys haben Vorrang vor mon..sun (gemischte Shape)', () => {
    const rows = getInternalHoursRows({
      mon: null, tue: null, '0': { open: '09:00', close: '17:00', closed: false }, '5': { open: '10:00', close: '14:00', closed: false },
    })
    expect(rows.find((r) => r.dayKey === 'mon')).toEqual({ dayKey: 'mon', closed: false, windows: [{ open: '09:00', close: '17:00' }] })
    expect(rows.find((r) => r.dayKey === 'sat')?.closed).toBe(false)
    expect(rows.find((r) => r.dayKey === 'tue')?.closed).toBe(true)
  })

  it('Fallback mon..sun; Legacy-String wird ausgelassen', () => {
    const rows = getInternalHoursRows({ mon: { open: '09:00', close: '18:00' }, tue: '09:00-18:00' })
    expect(rows.map((r) => r.dayKey)).toEqual(['mon'])
  })

  it('null/undefined/Array -> []', () => {
    expect(getInternalHoursRows(null)).toEqual([])
    expect(getInternalHoursRows(undefined)).toEqual([])
    expect(getInternalHoursRows([] as unknown as Record<string, unknown>)).toEqual([])
  })
})

describe('formatHoursWindows', () => {
  it('verbindet Fenster mit Komma', () => {
    expect(formatHoursWindows([{ open: '07:00', close: '14:00' }, { open: '16:30', close: '19:00' }])).toBe(
      '07:00 – 14:00, 16:30 – 19:00',
    )
    expect(formatHoursWindows([{ open: '09:00', close: '18:00' }])).toBe('09:00 – 18:00')
  })
})
