'use client'
// Only imports from shop-admin translations/types (Clean Boundary)

import { tAdmin } from '@/lib/shop-admin-translations'
import type { ImportRowError } from '@/types/shop-admin'

interface ImportRowErrorListProps {
  errors: ImportRowError[]
  lang: string
}

/** Lists every faulty row with a translated reason (unknown codes fall back to the raw message). */
export function ImportRowErrorList({ errors, lang }: ImportRowErrorListProps) {
  const tr = tAdmin(lang)

  function reason(err: ImportRowError): string {
    if (err.code === 'missing_name') return tr.row_error_missing_name
    if (err.code === 'row_failed') return tr.row_error_failed
    return err.message
  }

  return (
    <ul className="mt-2 text-xs text-amber-700 space-y-0.5 max-h-32 overflow-y-auto">
      {errors.map((err, i) => (
        <li key={`${err.row}-${i}`}>
          {tr.upload_error_row.replace('{n}', String(err.row))}: {reason(err)}
        </li>
      ))}
    </ul>
  )
}
