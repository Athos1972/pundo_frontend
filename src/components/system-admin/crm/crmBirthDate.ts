// ─── CRM person: birthday input and display (F7600 CRM-Backbone, org cut, T16; E19 birthday without year) ──────────
// Pure module (no 'use client'): the person page (Server Component) formats with it, BirthDateField edits with it.
// Storage rule of the backend: with `birth_year_unknown` the year is the placeholder leap year 2000 (so 29 February
// is storable). The placeholder is never shown, and the age never (AC 36, data minimisation).

/** Placeholder year of the backend for "year unknown" (`BIRTH_YEAR_PLACEHOLDER`). */
export const BIRTH_YEAR_PLACEHOLDER = 2000

/** Form state of the birthday: strings as typed, empty = not given. `month` is 1..12 as text. */
export interface BirthDateInput {
  day: string
  month: string
  year: string
  yearUnknown: boolean
}

export const EMPTY_BIRTH_DATE: BirthDateInput = { day: '', month: '', year: '', yearUnknown: false }

/** `birth_date` / `birth_year_unknown` of the API → form state (the placeholder year is not put into the field). */
export function birthDateInputFrom(birthDate: string | null, yearUnknown: boolean): BirthDateInput {
  const match = birthDate ? /^(\d{4})-(\d{2})-(\d{2})/.exec(birthDate) : null
  if (!match) return EMPTY_BIRTH_DATE
  return {
    day: String(Number(match[3])),
    month: String(Number(match[2])),
    year: yearUnknown ? '' : match[1],
    yearUnknown,
  }
}

function isValidDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export type BirthDateRequest = { birth_date: string | null; birth_year_unknown: boolean }

/**
 * Form state → request fields, or `'invalid'` (incomplete or impossible date; the form keeps "Save" disabled).
 * Nothing filled in → no birthday (`null`, flag `false`). "Year unknown" sends the placeholder year 2000.
 */
export function birthDateRequest(input: BirthDateInput, today: Date = new Date()): BirthDateRequest | 'invalid' {
  const day = input.day.trim()
  const month = input.month.trim()
  const year = input.yearUnknown ? '' : input.year.trim()
  if (!day && !month && !year) return input.yearUnknown ? 'invalid' : { birth_date: null, birth_year_unknown: false }
  if (!/^\d{1,2}$/.test(day) || !/^\d{1,2}$/.test(month)) return 'invalid'
  if (!input.yearUnknown && !/^\d{4}$/.test(year)) return 'invalid'
  const y = input.yearUnknown ? BIRTH_YEAR_PLACEHOLDER : Number(year)
  if (!input.yearUnknown && (y < 1900 || y > today.getUTCFullYear())) return 'invalid'
  if (!isValidDate(y, Number(month), Number(day))) return 'invalid'
  const iso = `${String(y).padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  return { birth_date: iso, birth_year_unknown: input.yearUnknown }
}

/** Locale for the admin languages: EN must read "14 March" (en-GB order), EL "14 Μαρτίου". */
function locale(lang: string): string {
  return lang === 'el' ? 'el' : 'en-GB'
}

/**
 * Birthday for the person page: unknown year → only day and month ("14 March", "14 Μαρτίου"), known year → the full
 * date ("14 March 1987"); never the placeholder year, never an age. `null` without a (readable) date.
 */
export function formatBirthDate(birthDate: string | null, yearUnknown: boolean, lang: string): string | null {
  const match = birthDate ? /^(\d{4})-(\d{2})-(\d{2})/.exec(birthDate) : null
  if (!match) return null
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  const options: Intl.DateTimeFormatOptions = yearUnknown
    ? { day: 'numeric', month: 'long', timeZone: 'UTC' }
    : { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
  return new Intl.DateTimeFormat(locale(lang), options).format(date)
}

/**
 * Month names for the month choice, index 0 = January. Nominative/standalone form (EL "Μάρτιος", not the genitive
 * "Μαρτίου" that ICU returns for `{month: 'long'}` alone): taken from the month part of "month year".
 */
export function monthNames(lang: string): string[] {
  const format = new Intl.DateTimeFormat(locale(lang), { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return Array.from({ length: 12 }, (_, index) => {
    const parts = format.formatToParts(new Date(Date.UTC(2000, index, 1)))
    return parts.find((part) => part.type === 'month')?.value ?? String(index + 1)
  })
}
