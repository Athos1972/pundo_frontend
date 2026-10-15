'use client'
// Only imports from shop-admin translations/types (Clean Boundary)

import { tAdmin, type ShopAdminTranslations } from '@/lib/shop-admin-translations'
import type { ImportRowError } from '@/types/shop-admin'

interface ImportRowErrorListProps {
  errors: ImportRowError[]
  lang: string
}

// Codes whose text key does not follow the `row_error_<code>` pattern (B5900-030 keys).
const LEGACY_KEYS: Record<string, string> = { row_failed: 'row_error_failed' }

/** Translated reason of one row error; unknown codes fall back to the raw server message. */
export function rowErrorText(err: ImportRowError, tr: ShopAdminTranslations): string {
  const key = err.code ? (LEGACY_KEYS[err.code] ?? `row_error_${err.code}`) : null
  const text = key ? (tr as unknown as Record<string, string | undefined>)[key] : undefined
  return text ?? err.message
}

/** Lists every faulty row with a translated reason (unknown codes fall back to the raw message). */
export function ImportRowErrorList({ errors, lang }: ImportRowErrorListProps) {
  const tr = tAdmin(lang)

  return (
    <ul className="mt-2 text-xs text-amber-700 space-y-0.5 max-h-32 overflow-y-auto">
      {errors.map((err, i) => (
        <li key={`${err.row}-${i}`}>
          {tr.upload_error_row.replace('{n}', String(err.row))}: {rowErrorText(err, tr)}
        </li>
      ))}
    </ul>
  )
}
