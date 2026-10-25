// F7600 CRM-Backbone, org cut, T16: birthday with "year unknown" (E19, AC 36).
// Display: unknown year -> only day and month (EN "14 March", EL "14 Μαρτίου"), never the placeholder year 2000 and
// never an age; 29 February must be possible. Input: "Year unknown" hides the year field and sends the year 2000.
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { BirthDateField } from '@/components/system-admin/crm/BirthDateField'
import {
  BIRTH_YEAR_PLACEHOLDER, EMPTY_BIRTH_DATE, birthDateInputFrom, birthDateRequest, formatBirthDate, monthNames,
  type BirthDateInput,
} from '@/components/system-admin/crm/crmBirthDate'
import { tSysAdmin } from '@/lib/system-admin-translations'
import { recorded } from './helpers/crm-person-recorded'
import type { CrmPerson } from '@/types/system-admin'

const en = tSysAdmin('en')
const el = tSysAdmin('el')
const TODAY = new Date(Date.UTC(2026, 9, 25))

describe('formatBirthDate', () => {
  it.each([
    ['2000-03-14', true, 'en', '14 March'],
    ['2000-03-14', true, 'el', '14 Μαρτίου'],
    ['2000-02-29', true, 'en', '29 February'],
    ['2000-02-29', true, 'el', '29 Φεβρουαρίου'],
    ['1987-03-14', false, 'en', '14 March 1987'],
    ['1987-03-14', false, 'el', '14 Μαρτίου 1987'],
    ['1987-03-14', true, 'de', '14 March'],        // other admin languages fall back to the EN format
  ])('%s (year unknown: %s, %s) -> %s', (date, unknown, lang, expected) => {
    expect(formatBirthDate(date, unknown, lang)).toBe(expected)
  })

  it('never shows the placeholder year and never an age', () => {
    for (const lang of ['en', 'el']) {
      const text = formatBirthDate('2000-03-14', true, lang)!
      expect(text).not.toMatch(/2000|\d{2,3}\s*(years|ετών)/)
    }
  })

  it('no date (or an unreadable one) -> null', () => {
    expect(formatBirthDate(null, false, 'en')).toBeNull()
    expect(formatBirthDate('14.03.', true, 'en')).toBeNull()
  })

  it('recorded backend answer (29 Feb, year unknown, stored as 2000-02-29) -> "29 February" / "29 Φεβρουαρίου"', () => {
    const { body } = recorded<CrmPerson>('person-detail')
    expect([body.birth_date, body.birth_year_unknown]).toEqual([`${BIRTH_YEAR_PLACEHOLDER}-02-29`, true])
    expect(formatBirthDate(body.birth_date, body.birth_year_unknown, 'en')).toBe('29 February')
    expect(formatBirthDate(body.birth_date, body.birth_year_unknown, 'el')).toBe('29 Φεβρουαρίου')
  })

  it('recorded backend answer with a known year shows the full date', () => {
    const { body } = recorded<CrmPerson>('person-patch-derive')
    expect(body.birth_year_unknown).toBe(false)
    expect(formatBirthDate(body.birth_date, body.birth_year_unknown, 'en')).toBe('14 March 1987')
  })
})

describe('birthDateInputFrom / birthDateRequest', () => {
  it('API -> form: the placeholder year is not put into the year field', () => {
    expect(birthDateInputFrom('2000-02-29', true)).toEqual({ day: '29', month: '2', year: '', yearUnknown: true })
    expect(birthDateInputFrom('1987-03-14', false)).toEqual({ day: '14', month: '3', year: '1987', yearUnknown: false })
    expect(birthDateInputFrom(null, false)).toEqual(EMPTY_BIRTH_DATE)
  })

  it.each<[string, BirthDateInput, ReturnType<typeof birthDateRequest>]>([
    ['nothing filled -> no birthday', EMPTY_BIRTH_DATE, { birth_date: null, birth_year_unknown: false }],
    ['year unknown -> placeholder 2000', { day: '14', month: '3', year: '', yearUnknown: true }, { birth_date: '2000-03-14', birth_year_unknown: true }],
    ['29 Feb with year unknown is storable', { day: '29', month: '2', year: '', yearUnknown: true }, { birth_date: '2000-02-29', birth_year_unknown: true }],
    ['a typed year is ignored when the year is unknown', { day: '14', month: '3', year: '1987', yearUnknown: true }, { birth_date: '2000-03-14', birth_year_unknown: true }],
    ['known year', { day: '14', month: '3', year: '1987', yearUnknown: false }, { birth_date: '1987-03-14', birth_year_unknown: false }],
    ['29 Feb in a leap year', { day: '29', month: '2', year: '1988', yearUnknown: false }, { birth_date: '1988-02-29', birth_year_unknown: false }],
    ['29 Feb in a common year is impossible', { day: '29', month: '2', year: '1987', yearUnknown: false }, 'invalid'],
    ['31 April is impossible', { day: '31', month: '4', year: '', yearUnknown: true }, 'invalid'],
    ['year missing without "year unknown"', { day: '14', month: '3', year: '', yearUnknown: false }, 'invalid'],
    ['"year unknown" without day and month (backend 422 person_birth_date_invalid)', { ...EMPTY_BIRTH_DATE, yearUnknown: true }, 'invalid'],
    ['month missing', { day: '14', month: '', year: '', yearUnknown: true }, 'invalid'],
    ['two-digit year', { day: '14', month: '3', year: '87', yearUnknown: false }, 'invalid'],
    ['year in the future', { day: '14', month: '3', year: '2030', yearUnknown: false }, 'invalid'],
    ['year before 1900', { day: '14', month: '3', year: '1850', yearUnknown: false }, 'invalid'],
  ])('%s', (_, input, expected) => {
    expect(birthDateRequest(input, TODAY)).toEqual(expected)
  })
})

function Harness({ initial, lang = 'en' }: { initial: BirthDateInput; lang?: string }) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <BirthDateField value={value} onChange={setValue} lang={lang} tr={lang === 'el' ? el : en} />
      <output data-testid="request">{JSON.stringify(birthDateRequest(value))}</output>
    </>
  )
}

describe('BirthDateField', () => {
  it('"Year unknown" hides the year field; 29 February then gives the placeholder year 2000', () => {
    render(<Harness initial={{ day: '', month: '', year: '1990', yearUnknown: false }} />)
    expect(screen.getByLabelText('Year')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Year unknown'))
    expect(screen.queryByLabelText('Year')).toBeNull()
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: '29' } })
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2' } })
    expect(JSON.parse(screen.getByTestId('request').textContent!)).toEqual({ birth_date: '2000-02-29', birth_year_unknown: true })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('unticking "Year unknown" shows an empty year field again and flags the incomplete date', () => {
    render(<Harness initial={birthDateInputFrom('2000-03-14', true)} />)
    fireEvent.click(screen.getByLabelText('Year unknown'))
    expect((screen.getByLabelText('Year') as HTMLInputElement).value).toBe('')
    expect(screen.getByRole('alert').textContent).toBe(en.crm_birth_invalid)
  })

  it('an impossible date shows the error text', () => {
    render(<Harness initial={{ day: '29', month: '2', year: '1987', yearUnknown: false }} />)
    expect(screen.getByRole('alert').textContent).toBe(en.crm_birth_invalid)
  })

  it('month names follow the language (EL standalone form) and all labels are translated', () => {
    render(<Harness initial={EMPTY_BIRTH_DATE} lang="el" />)
    const month = screen.getByLabelText('Μήνας') as HTMLSelectElement
    expect(Array.from(month.options).map((o) => o.textContent).slice(1, 4)).toEqual(monthNames('el').slice(0, 3))
    expect(monthNames('el')[2]).toBe('Μάρτιος')
    expect(monthNames('en')[2]).toBe('March')
    expect(screen.getByLabelText('Άγνωστο έτος')).toBeTruthy()
    expect(screen.getByText('Γενέθλια')).toBeTruthy()
  })
})
