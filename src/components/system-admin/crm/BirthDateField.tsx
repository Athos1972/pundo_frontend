'use client'
// ─── Birthday input with "year unknown" (F7600 CRM-Backbone, org cut, T16; E19) ─────────────────────────────────────
// Day, month and year as separate fields: a date picker cannot take 29 February without a year. The check box
// "Year unknown" hides the year field; the request then carries the placeholder year 2000 (crmBirthDate.ts).
// Clean Boundary: only system-admin translations and the pure helper.

import { useId } from 'react'
import { birthDateRequest, monthNames, type BirthDateInput } from './crmBirthDate'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

interface BirthDateFieldProps {
  value: BirthDateInput
  onChange: (value: BirthDateInput) => void
  lang: string
  tr: SysAdminTranslations
  disabled?: boolean
}

const INPUT = 'rounded-lg border border-gray-300 px-3 py-2 text-sm'

export function BirthDateField({ value, onChange, lang, tr, disabled }: BirthDateFieldProps) {
  const id = useId()
  const invalid = birthDateRequest(value) === 'invalid'
  const set = (patch: Partial<BirthDateInput>) => onChange({ ...value, ...patch })
  return (
    <fieldset className="flex flex-col gap-2 text-sm text-gray-700" aria-describedby={invalid ? `${id}-error` : undefined}>
      <legend className="mb-1">{tr.crm_birth_date}</legend>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          {tr.crm_birth_day}
          <input
            className={`${INPUT} w-20`}
            inputMode="numeric"
            value={value.day}
            disabled={disabled}
            onChange={(event) => set({ day: event.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          {tr.crm_birth_month}
          <select
            className={INPUT}
            value={value.month}
            disabled={disabled}
            onChange={(event) => set({ month: event.target.value })}
          >
            <option value="">{tr.select_placeholder}</option>
            {monthNames(lang).map((name, index) => <option key={name} value={String(index + 1)}>{name}</option>)}
          </select>
        </label>
        {!value.yearUnknown && (
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            {tr.crm_birth_year}
            <input
              className={`${INPUT} w-24`}
              inputMode="numeric"
              value={value.year}
              disabled={disabled}
              onChange={(event) => set({ year: event.target.value })}
            />
          </label>
        )}
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={value.yearUnknown}
            disabled={disabled}
            onChange={(event) => set({ yearUnknown: event.target.checked, year: event.target.checked ? '' : value.year })}
          />
          {tr.crm_birth_year_unknown}
        </label>
      </div>
      <p className="text-xs text-gray-500">{tr.crm_birth_hint}</p>
      {invalid && <p id={`${id}-error`} role="alert" className="text-xs text-red-700">{tr.crm_birth_invalid}</p>}
    </fieldset>
  )
}
