'use client'
// Only imports from React, next/image, shop-admin translations/types and sibling files (Clean Boundary)

import Image from 'next/image'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'
import { rowErrorText } from './ImportRowErrorList'
import type { ImportChangeField, ImportPreviewRow as Row, ImportRowStatus } from '@/types/shop-admin'

/** Column layout shared by the header (ImportPreview) and every row: a table from `md`, cards below. */
export const IMPORT_ROW_GRID = 'md:grid md:grid-cols-[8rem_minmax(0,2.2fr)_minmax(0,1.6fr)_6rem_7rem] md:gap-x-3'

const STATUS_STYLE: Record<ImportRowStatus, string> = {
  new: 'bg-green-100 text-green-800',
  updated: 'bg-blue-100 text-blue-800',
  unchanged: 'bg-gray-100 text-gray-600',
  error: 'bg-red-100 text-red-700',
  possible_duplicate: 'bg-amber-100 text-amber-800',
}

/** `new` = create a new article (default), `item:<id>` = use that catalogue article. */
export type DuplicateChoice = 'new' | `item:${number}`

interface Props {
  row: Row
  tr: ShopAdminTranslations
  choice: DuplicateChoice
  onChoice: (row: number, choice: DuplicateChoice) => void
}

function statusLabel(status: ImportRowStatus, tr: ShopAdminTranslations): string {
  switch (status) {
    case 'new': return tr.count_new
    case 'updated': return tr.count_updated
    case 'unchanged': return tr.count_unchanged
    case 'error': return tr.count_error
    case 'possible_duplicate': return tr.dup_title
    default: return status
  }
}

function changeLabel(change: ImportChangeField, tr: ShopAdminTranslations): string {
  switch (change) {
    case 'available': return tr.change_available
    case 'reactivated': return tr.change_reactivated
    case 'price': return tr.change_price
    case 'name': return tr.change_name
    case 'sku': return tr.change_sku
    case 'category': return tr.change_category
    default: return change
  }
}

function matchedByLabel(by: Row['matched_by'], tr: ShopAdminTranslations): string | null {
  switch (by) {
    case 'sku': return tr.matched_by_sku
    case 'ean': return tr.matched_by_ean
    case 'name': return tr.matched_by_name
    case 'decision': return tr.matched_by_decision
    default: return null
  }
}

function categorySourceLabel(source: Row['category_source'], tr: ShopAdminTranslations): string {
  if (source === 'column') return tr.category_source_column
  if (source === 'suggested') return tr.category_source_suggested
  if (source === 'existing') return tr.category_source_existing
  return ''
}

/** Unknown hint codes (newer server) are skipped instead of showing a raw code. */
function hintText(code: string, tr: ShopAdminTranslations): string | null {
  return (tr as unknown as Record<string, string | undefined>)[`hint_${code}`] ?? null
}

export function ImportPreviewRow({ row, tr, choice, onChoice }: Props) {
  const matchText = matchedByLabel(row.matched_by, tr)
  const effectiveAvailable = row.available !== false
  const hints = row.hints.map((h) => ({ code: h, text: hintText(h, tr) })).filter((h) => h.text)
  const fieldLabel = 'md:hidden text-xs text-gray-400 me-1'

  return (
    <li
      data-testid="import-preview-row"
      data-row={row.row}
      data-status={row.status}
      className={`${IMPORT_ROW_GRID} flex flex-col gap-1 px-3 py-3 border-b border-gray-100 last:border-b-0 ${
        row.status === 'error' ? 'bg-red-50/40' : ''
      }`}
    >
      {/* Status + row number */}
      <div className="flex items-center gap-2 md:flex-col md:items-start md:gap-1">
        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[row.status] ?? STATUS_STYLE.unchanged}`}>
          {statusLabel(row.status, tr)}
        </span>
        <span className="text-xs text-gray-400">{tr.row_label.replace('{n}', String(row.row))}</span>
      </div>

      {/* Article */}
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800 break-words">{row.name || '—'}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
          {row.sku && (
            <span>
              <span className="text-gray-400">{tr.offer_sku_short} </span>
              <code dir="ltr" className="font-mono bg-gray-100 rounded px-1">{row.sku}</code>
            </span>
          )}
          {row.ean && (
            // @i18n-allow-literal — EAN ist ein internationales Kürzel
            <span><span className="text-gray-400">EAN </span><code dir="ltr" className="font-mono">{row.ean}</code></span>
          )}
          <span title={tr.language_label}>
            <code dir="ltr" className="font-mono uppercase bg-gray-100 rounded px-1">{row.language}</code>
          </span>
        </p>
        {(matchText || row.matched_name) && (
          <p className="mt-1 text-xs text-gray-500">
            {row.matched_name ? tr.matched_article.replace('{name}', row.matched_name) : null}
            {matchText && <span className="text-gray-400"> · {matchText}</span>}
          </p>
        )}
        {row.changes.length > 0 && (
          <ul className="mt-1 flex flex-wrap gap-1">
            {row.changes.map((c) => (
              <li key={c} className="text-xs rounded-full bg-blue-50 text-blue-700 px-2 py-0.5">{changeLabel(c, tr)}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Category */}
      <div className="min-w-0 text-xs text-gray-600">
        <span className={fieldLabel}>{tr.preview_col_category}:</span>
        {row.category_path ? (
          <>
            <span className="break-words">{row.category_path}</span>
            {row.category_source && <span className="text-gray-400"> ({categorySourceLabel(row.category_source, tr)})</span>}
          </>
        ) : (
          <span className="text-gray-400">{tr.category_none}</span>
        )}
      </div>

      {/* Price */}
      <div className="text-xs text-gray-700">
        <span className={fieldLabel}>{tr.preview_col_price}:</span>
        {row.price ? (
          <span dir="ltr" className="font-mono">{row.price} {row.currency}</span>
        ) : (
          <span className="text-gray-400">{tr.price_none}</span>
        )}
      </div>

      {/* Availability */}
      <div className="text-xs">
        <span className={fieldLabel}>{tr.preview_col_available}:</span>
        <span className={effectiveAvailable ? 'text-green-700' : 'text-gray-500'}>
          {effectiveAvailable ? tr.availability_yes : tr.availability_no}
        </span>
      </div>

      {/* Details spanning all columns: errors, hints, duplicate choice */}
      {(row.errors.length > 0 || hints.length > 0 || row.status === 'possible_duplicate') && (
        <div className="md:col-span-5 flex flex-col gap-2 mt-1">
          {row.errors.length > 0 && (
            <ul data-testid="import-row-errors" className="text-xs text-red-700 space-y-0.5">
              {row.errors.map((e, i) => (
                <li key={`${e.code}-${i}`}>{rowErrorText(e, tr)}</li>
              ))}
            </ul>
          )}
          {hints.length > 0 && (
            <ul className="text-xs text-amber-700 space-y-0.5">
              {hints.map((h) => (
                <li key={h.code}>{h.text}</li>
              ))}
            </ul>
          )}
          {row.status === 'possible_duplicate' && row.candidates.length > 0 && (
            <fieldset className="border border-amber-200 bg-amber-50/50 rounded-lg p-3">
              <legend className="px-1 text-xs font-medium text-amber-800">{tr.dup_question}</legend>
              <div className="flex flex-col gap-2">
                {row.candidates.map((c) => {
                  const value: DuplicateChoice = `item:${c.item_id}`
                  return (
                    <label key={c.item_id} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name={`dup-${row.row}`}
                        value={value}
                        checked={choice === value}
                        onChange={() => onChoice(row.row, value)}
                        className="accent-accent shrink-0"
                      />
                      {c.photo_url ? (
                        <Image src={c.photo_url} alt={c.name} width={40} height={40} unoptimized className="w-10 h-10 rounded object-cover shrink-0" />
                      ) : (
                        <span aria-hidden="true" className="w-10 h-10 rounded bg-gray-100 shrink-0" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-gray-800 break-words">{c.name}</span>
                        <span className="block text-xs text-gray-500">
                          {tr.dup_use_existing} · {tr.dup_similarity.replace('{n}', String(c.score))}
                        </span>
                      </span>
                    </label>
                  )
                })}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name={`dup-${row.row}`}
                    value="new"
                    checked={choice === 'new'}
                    onChange={() => onChoice(row.row, 'new')}
                    className="accent-accent shrink-0"
                  />
                  <span className="text-sm text-gray-800">{tr.dup_create_new}</span>
                </label>
              </div>
            </fieldset>
          )}
        </div>
      )}
    </li>
  )
}
