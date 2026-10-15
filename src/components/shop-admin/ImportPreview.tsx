'use client'
// Only imports from React, shop-admin translations/types and sibling files (Clean Boundary)

import { useMemo, useState } from 'react'
import { tAdmin } from '@/lib/shop-admin-translations'
import { ImportCountTiles, previewTiles } from './ImportCountTiles'
import { IMPORT_ROW_GRID, ImportPreviewRow, type DuplicateChoice } from './ImportPreviewRow'
import type { ImportFlowError } from './useImportPreview'
import type { ImportApplyDecision, ImportPreview as Preview, ImportRowStatus } from '@/types/shop-admin'

interface ImportPreviewProps {
  preview: Preview
  lang: string
  applying: boolean
  error: ImportFlowError | null
  timedOut: boolean
  filter: ImportRowStatus | null
  loadingMore: boolean
  onApply: (decisions: ImportApplyDecision[]) => void
  onCancel: () => void
  onFilter: (status: ImportRowStatus | null) => void
  onLoadMore: () => void
}

const FILTER_ORDER: ImportRowStatus[] = ['error', 'possible_duplicate', 'new', 'updated', 'unchanged']

/** Server `detail.code` / flow code -> translated text (unknown codes -> generic error). */
export function importErrorText(error: ImportFlowError, tr: ReturnType<typeof tAdmin>): string {
  const t = tr as unknown as Record<string, string | undefined>
  switch (error.code) {
    case 'preview_expired': return tr.preview_expired
    case 'preview_stale': return tr.preview_stale
    case 'job_lost': return tr.preview_job_lost
    case 'apply_failed': return tr.preview_apply_failed
    case 'preview_failed': return tr.preview_failed
    case 'preview_already_applied': return tr.preview_already_applied
    case 'preview_has_errors': return tr.error_generic
    case 'invalid_decision': return tr.preview_invalid_decision
    case 'decision_conflict': return tr.preview_decision_conflict
    case 'file_too_large': return tr.upload_error_too_large
    case 'unsupported_format': return tr.upload_error_unsupported_format
    case 'xlsx_unreadable': return tr.upload_error_xlsx_unreadable
    case 'xls_unreadable': return tr.upload_error_xls_unreadable
    case 'csv_unreadable': return tr.upload_error_csv_unreadable
    case 'missing_name_column': return tr.upload_error_missing_name_column
    case 'empty_file': return tr.upload_error_empty_file
    case 'too_many_rows': return tr.upload_error_too_many_rows.replace('{n}', String(error.limit ?? ''))
    case 'preview_in_progress': return tr.upload_error_preview_in_progress
    default: return t[`upload_error_${error.code}`] ?? tr.error_generic
  }
}

function progressText(preview: Preview, tr: ReturnType<typeof tAdmin>): string {
  const p = preview.progress
  if (!p) return tr.preview_applying
  const phase = (tr as unknown as Record<string, string | undefined>)[`import_phase_${p.phase}`] ?? tr.preview_applying
  return p.total > 0 ? `${phase} ${tr.import_progress_rows.replace('{done}', String(p.done)).replace('{total}', String(p.total))}` : phase
}

export function ImportPreview({
  preview, lang, applying, error, timedOut, filter, loadingMore, onApply, onCancel, onFilter, onLoadMore,
}: ImportPreviewProps) {
  const tr = tAdmin(lang)
  const counts = preview.counts
  const [choices, setChoices] = useState<Record<number, DuplicateChoice>>({})

  const decisions = useMemo<ImportApplyDecision[]>(
    () =>
      Object.entries(choices).flatMap(([row, choice]) =>
        choice.startsWith('item:')
          ? [{ row: Number(row), action: 'use_existing' as const, item_id: Number(choice.slice(5)) }]
          : [],
      ),
    [choices],
  )

  const errorCount = counts?.error ?? 0
  const blocked = errorCount > 0
  const canApply = preview.can_apply && !applying && !preview.expired
  const remaining = Math.max(0, preview.rows_total - preview.rows.length)
  const filters = counts ? FILTER_ORDER.filter((s) => counts[s] > 0) : []

  return (
    <div className="flex flex-col gap-4" data-testid="import-preview">
      <header className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-gray-800">{tr.preview_title}</h2>
        <p className="text-xs text-gray-500">
          {tr.preview_file.replace('{name}', preview.filename ?? '').replace('{n}', String(preview.row_count))}
          {' · '}
          {tr.preview_valid_until.replace('{time}', new Date(preview.expires_at).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }))}
        </p>
      </header>

      {counts && <ImportCountTiles tiles={previewTiles(counts, preview.full_list, tr)} />}

      {(preview.expired || error) && (
        <p role="alert" className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {preview.expired ? tr.preview_expired : importErrorText(error!, tr)}
        </p>
      )}
      {blocked && (
        <p role="alert" data-testid="import-apply-blocked" className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
          {tr.preview_apply_blocked.replace('{n}', String(errorCount))}
        </p>
      )}
      {timedOut && <p className="text-xs text-gray-500">{tr.preview_poll_timeout}</p>}

      {preview.full_list && preview.deactivations_total > 0 && (
        <details data-testid="import-deactivations" className="rounded-lg border border-orange-200 bg-orange-50/60 px-3 py-2 text-sm">
          <summary className="cursor-pointer font-medium text-orange-800">
            {tr.deactivate_title.replace('{n}', String(preview.deactivations_total))}
          </summary>
          <p className="mt-1 text-xs text-orange-700">{tr.deactivate_hint}</p>
          <ul className="mt-2 max-h-48 overflow-y-auto text-xs text-gray-700 space-y-0.5">
            {preview.deactivations.map((d) => (
              <li key={d.listing_id} className="break-words">
                {d.name}
                {d.sku && <code dir="ltr" className="ms-2 font-mono bg-white rounded px-1">{d.sku}</code>}
              </li>
            ))}
          </ul>
          {preview.deactivations_total > preview.deactivations.length && (
            <p className="mt-1 text-xs text-gray-500">
              {tr.deactivate_more.replace('{n}', String(preview.deactivations_total - preview.deactivations.length))}
            </p>
          )}
        </details>
      )}

      {/* Status filter */}
      {filters.length > 0 && (
        <div role="group" aria-label={tr.filter_label} className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={filter === null}
            onClick={() => onFilter(null)}
            className={`text-xs px-3 py-1 rounded-full border ${filter === null ? 'bg-accent text-white border-accent' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            {tr.filter_all}
          </button>
          {filters.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={filter === s}
              onClick={() => onFilter(s)}
              className={`text-xs px-3 py-1 rounded-full border ${filter === s ? 'bg-accent text-white border-accent' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
            >
              {s === 'possible_duplicate' ? tr.count_possible_duplicate : s === 'error' ? tr.count_error : s === 'new' ? tr.count_new : s === 'updated' ? tr.count_updated : tr.count_unchanged}
              {' '}
              <span dir="ltr">({counts![s]})</span>
            </button>
          ))}
        </div>
      )}

      {/* Rows: table from md, cards below */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className={`hidden ${IMPORT_ROW_GRID} px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500`} aria-hidden="true">
          <span>{tr.preview_col_status}</span>
          <span>{tr.preview_col_article}</span>
          <span>{tr.preview_col_category}</span>
          <span>{tr.preview_col_price}</span>
          <span>{tr.preview_col_available}</span>
        </div>
        {preview.rows.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-gray-400">{tr.preview_rows_none}</p>
        ) : (
          <ul>
            {preview.rows.map((row) => (
              <ImportPreviewRow
                key={row.row}
                row={row}
                tr={tr}
                choice={choices[row.row] ?? 'new'}
                onChoice={(r, c) => setChoices((prev) => ({ ...prev, [r]: c }))}
              />
            ))}
          </ul>
        )}
      </div>

      {remaining > 0 && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loadingMore}
          className="self-center text-sm text-accent hover:underline disabled:opacity-50"
        >
          {tr.preview_load_more.replace('{n}', String(remaining))}
        </button>
      )}

      {/* Actions */}
      <div className="sticky bottom-0 -mx-1 px-1 py-3 bg-white border-t border-gray-100 flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-testid="import-apply"
          onClick={() => onApply(decisions)}
          disabled={!canApply}
          className="bg-accent text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {applying ? tr.preview_applying : tr.preview_apply}
        </button>
        <button
          type="button"
          data-testid="import-cancel"
          onClick={onCancel}
          disabled={applying}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
        >
          {tr.preview_cancel}
        </button>
        {applying && <span role="status" className="text-sm text-gray-500">{progressText(preview, tr)}</span>}
      </div>
    </div>
  )
}
