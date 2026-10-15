'use client'
// Only imports from React/next-link, shop-admin translations/types and sibling files (Clean Boundary)

import Link from 'next/link'
import { tAdmin } from '@/lib/shop-admin-translations'
import type { ImportApplyResult } from '@/types/shop-admin'

interface ImportResultProps {
  result: ImportApplyResult
  lang: string
  onNewUpload: () => void
}

export function ImportResult({ result, lang, onNewUpload }: ImportResultProps) {
  const tr = tAdmin(lang)
  const t = tr as unknown as Record<string, string | undefined>
  const lines: string[] = [
    tr.result_created.replace('{n}', String(result.created)),
    tr.result_updated.replace('{n}', String(result.updated)),
    tr.result_unchanged.replace('{n}', String(result.unchanged)),
  ]
  if (result.deactivated > 0) lines.push(tr.result_deactivated.replace('{n}', String(result.deactivated)))
  if (result.linked_existing > 0) lines.push(tr.result_linked.replace('{n}', String(result.linked_existing)))
  const hints = Object.entries(result.hints ?? {}).filter(([code, n]) => n > 0 && t[`hint_${code}`])

  return (
    <div data-testid="import-result" className="flex flex-col gap-4">
      <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3">
        <h2 className="text-base font-semibold text-green-800">{tr.result_title}</h2>
        <p className="mt-0.5 text-xs text-green-700">{tr.result_rows.replace('{n}', String(result.row_count))}</p>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-green-900">
          {lines.map((l) => <li key={l}>{l}</li>)}
        </ul>
      </div>

      {result.translation_queued > 0 && (
        <p className="text-sm text-gray-600">{tr.result_translation.replace('{n}', String(result.translation_queued))}</p>
      )}
      {result.image_download_pending > 0 && (
        <p className="rounded-lg px-4 py-3 text-sm bg-blue-50 border border-blue-200">
          {tr.image_download_pending.replace('{n}', String(result.image_download_pending))}
        </p>
      )}
      {hints.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">{tr.result_hints_title}</p>
          <ul className="mt-1 text-xs text-amber-800 space-y-0.5">
            {hints.map(([code, n]) => (
              <li key={code}><span dir="ltr" className="font-semibold">{n}×</span> {t[`hint_${code}`]}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {/* /shop-admin is an i18n bypass path: no language prefix */}
        <Link
          href="/shop-admin/offers"
          className="bg-accent text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-accent-dark transition-colors"
        >
          {tr.result_to_offers}
        </Link>
        <button type="button" onClick={onNewUpload} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
          {tr.preview_upload_again}
        </button>
      </div>
    </div>
  )
}
