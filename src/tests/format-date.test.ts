import { describe, it, expect } from 'vitest'
import { formatDate, PLATFORM_TIME_ZONE } from '@/lib/format-date'
import { LANGS } from '@/lib/lang'

const ISO = '2026-10-16T09:00:00Z'

describe('formatDate', () => {
  it.each(LANGS)('%s — entspricht Intl mit fester Zeitzone', (lang) => {
    const expected = new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeZone: PLATFORM_TIME_ZONE }).format(new Date(ISO))
    expect(formatDate(ISO, lang)).toBe(expected)
  })

  it('sprachtypische Merkmale', () => {
    expect(formatDate(ISO, 'en')).toMatch(/Oct 16, 2026/)
    expect(formatDate(ISO, 'de')).toMatch(/^16\.10\.2026$/)
    expect(formatDate(ISO, 'el')).toContain('Οκτ')
    expect(formatDate(ISO, 'ru')).toContain('окт')
    expect(formatDate(ISO, 'he')).toMatch(/\p{Script=Hebrew}/u)
  })

  it('feste Zeitzone: 22:30 UTC ist in Nicosia schon der Folgetag', () => {
    expect(formatDate('2026-10-16T22:30:00Z', 'de')).toBe('17.10.2026')
  })

  it('unbekannte Sprache faellt auf en zurueck', () => {
    expect(formatDate(ISO, 'xx')).toBe(formatDate(ISO, 'en'))
  })

  it('ungueltiges Datum liefert die Eingabe', () => {
    expect(formatDate('kein-datum', 'de')).toBe('kein-datum')
  })
})
