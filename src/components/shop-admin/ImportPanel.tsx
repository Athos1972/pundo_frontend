'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

import { useState, useTransition, useRef } from 'react'
import { tAdmin } from '@/lib/shop-admin-translations'
import { showToast } from './Toast'
import { FieldCatalog } from './FieldCatalog'
import { ImportRowErrorList } from './ImportRowErrorList'
import { useImportStatusPolling } from './useImportStatusPolling'
import type { ImportStatus, ImportSyncErrorCode, ImportUploadResult } from '@/types/shop-admin'

interface ImportPanelProps {
  initialStatus: ImportStatus
  lang: string
}

export function ImportPanel({ initialStatus, lang }: ImportPanelProps) {
  const tr = tAdmin(lang)
  const [status, setStatus] = useState<ImportStatus>(initialStatus)
  const [uploadResult, setUploadResult] = useState<ImportUploadResult | null>(null)
  const [sheetsUrl, setSheetsUrl] = useState(initialStatus.google_sheet_url ?? '')
  const [isPendingUpload, startUploadTransition] = useTransition()
  const [isPendingSheets, startSheetsTransition] = useTransition()
  const [isPendingSync, startSyncTransition] = useTransition()
  const [pollTimedOut, setPollTimedOut] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { start: startPolling, stop: stopPolling } = useImportStatusPolling()

  function _mapUploadError(detail: string | undefined): string {
    if (!detail) return tr.error_generic
    if (detail.startsWith('Unsupported file format')) return tr.upload_error_unsupported_format
    if (detail.startsWith('xlsx file could not be read')) return tr.upload_error_xlsx_unreadable
    if (detail.startsWith('xls file could not be read')) return tr.upload_error_xls_unreadable
    if (detail.startsWith('File too large')) return tr.upload_error_too_large
    return tr.error_generic
  }

  async function fetchStatus(): Promise<ImportStatus | null> {
    const res = await fetch('/api/shop-admin/import/status')
    return res.ok ? ((await res.json()) as ImportStatus) : null
  }

  // Waits until the background image downloads of an upload are finished.
  function pollImages(baselineImageAt: string | null | undefined) {
    setPollTimedOut(false)
    startPolling({
      fetchStatus,
      isDone: (s) => (s.last_image_download_at ?? null) !== (baselineImageAt ?? null),
      onStatus: setStatus,
      onTimeout: () => setPollTimedOut(true),
    })
  }

  // Waits for a (re)sync of the sheet; if it queued image downloads, waits for those as well.
  function pollSync(baselineSync: string | null | undefined, baselineImageAt: string | null | undefined) {
    setPollTimedOut(false)
    startPolling({
      fetchStatus,
      isDone: (s) => {
        if ((s.last_sync ?? null) === (baselineSync ?? null)) return false
        if ((s.last_sync_result?.image_download_pending ?? 0) > 0) {
          return (s.last_image_download_at ?? null) !== (baselineImageAt ?? null)
        }
        return true
      },
      onStatus: setStatus,
      onTimeout: () => setPollTimedOut(true),
    })
  }

  function syncErrorText(code: ImportSyncErrorCode | null | undefined, count: number | undefined): string {
    switch (code) {
      case 'sheet_url_invalid': return tr.sheets_error_url_invalid
      case 'sheet_fetch_failed': return tr.sheets_error_fetch_failed
      case 'sheet_not_public': return tr.sheets_error_not_public
      case 'rows_failed': return tr.sheets_error_rows_failed.replace('{n}', String(count ?? 0))
      case 'sync_failed': return tr.sheets_error_sync_failed
      default: return tr.sheets_status_error
    }
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    startUploadTransition(async () => {
      try {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch('/api/shop-admin/import/upload', { method: 'POST', body: form })
        if (res.ok) {
          const result: ImportUploadResult = await res.json()
          setUploadResult(result)
          if (result.errors.length > 0) {
            showToast(tr.upload_nothing_imported.replace('{n}', String(result.errors.length)), 'error')
          } else {
            showToast(tr.upload_success.replace('{n}', String(result.imported)), 'success')
          }
          if ((result.image_download_pending ?? 0) > 0) pollImages(status.last_image_download_at)
        } else {
          const body = await res.json().catch(() => null)
          showToast(_mapUploadError(body?.detail), 'error')
        }
      } catch {
        showToast(tr.error_generic, 'error')
      }
      if (fileRef.current) fileRef.current.value = ''
    })
  }

  function handleConnectSheets() {
    if (!sheetsUrl.trim()) return
    startSheetsTransition(async () => {
      try {
        const res = await fetch('/api/shop-admin/import/google-sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: sheetsUrl.trim() }),
        })
        if (res.ok) {
          const data: ImportStatus = await res.json()
          setStatus(data)
          showToast(tr.sheets_connected_toast, 'success')
          pollSync(null, status.last_image_download_at)
        } else {
          showToast(tr.error_generic, 'error')
        }
      } catch {
        showToast(tr.error_generic, 'error')
      }
    })
  }

  function handleRemoveSheets() {
    startSheetsTransition(async () => {
      try {
        const res = await fetch('/api/shop-admin/import/google-sheets', { method: 'DELETE' })
        if (res.ok) {
          stopPolling()
          setPollTimedOut(false)
          setStatus((s) => ({
            ...s,
            google_sheet_url: undefined,
            last_sync: undefined,
            last_sync_status: undefined,
            last_sync_message: undefined,
            last_sync_result: undefined,
          }))
          setSheetsUrl('')
          showToast(tr.sheets_removed_toast, 'success')
        } else {
          showToast(tr.error_generic, 'error')
        }
      } catch {
        showToast(tr.error_generic, 'error')
      }
    })
  }

  function handleManualSync() {
    startSyncTransition(async () => {
      try {
        const res = await fetch('/api/shop-admin/import/google-sheets/sync', { method: 'POST' })
        if (res.ok) {
          showToast(tr.sheets_syncing, 'info')
          pollSync(status.last_sync, status.last_image_download_at)
        } else {
          showToast(tr.error_generic, 'error')
        }
      } catch {
        showToast(tr.error_generic, 'error')
      }
    })
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      {/* Excel / CSV Upload */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4">
        <h2 className="text-base font-semibold text-gray-800">{tr.upload_label}</h2>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-gray-400">{tr.upload_formats_hint}</p>
          <a
            href="/api/shop-admin/import/template"
            download
            className="text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap"
          >
            {tr.download_template}
          </a>
        </div>

        <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-8 px-4 cursor-pointer transition-colors
          ${isPendingUpload ? 'border-gray-200 bg-gray-50 cursor-wait' : 'border-gray-300 hover:border-accent'}`}>
          <span className="text-2xl mb-2" aria-hidden="true">📂</span>
          <span className="text-sm text-gray-600 font-medium">
            {isPendingUpload ? tr.uploading : tr.upload_btn}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="sr-only"
            onChange={handleUpload}
            disabled={isPendingUpload}
            aria-label={tr.upload_label}
          />
        </label>

        <FieldCatalog lang={lang} />

        {uploadResult && (
          <div className={`rounded-lg px-4 py-3 text-sm ${uploadResult.errors.length > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
            {uploadResult.errors.length === 0 ? (
              <p className="font-medium">{tr.upload_success.replace('{n}', String(uploadResult.imported))}</p>
            ) : (
              <>
                <p className="font-medium text-amber-800">
                  {tr.upload_nothing_imported.replace('{n}', String(uploadResult.errors.length))}
                </p>
                {uploadResult.errors.some((e) => e.code === 'missing_name') && (
                  <p className="text-amber-800 mt-1 text-xs font-medium">{tr.upload_hint_see_catalog}</p>
                )}
                <ImportRowErrorList errors={uploadResult.errors} lang={lang} />
              </>
            )}
          </div>
        )}

        {/* Info block: image downloads pending */}
        {(uploadResult?.image_download_pending ?? 0) > 0 && (
          <div className="rounded-lg px-4 py-3 text-sm bg-blue-50 border border-blue-200">
            <p>{tr.image_download_pending.replace('{n}', String(uploadResult!.image_download_pending))}</p>
          </div>
        )}

        {/* Amber banner: image download errors */}
        {(status.image_download_errors?.length ?? 0) > 0 && (
          <div className="rounded-lg px-4 py-3 text-sm bg-amber-50 border border-amber-200">
            <p className="font-medium">
              {tr.image_download_errors_title.replace('{n}', String(status.image_download_errors!.length))}
            </p>
            <details>
              <summary className="cursor-pointer text-amber-700 mt-1">{tr.image_download_errors_detail_toggle}</summary>
              <ul className="mt-2 text-xs space-y-1">
                {status.image_download_errors!.map((err, i) => (
                  <li key={i}>
                    {err.product_name} · <code dir="ltr">{err.url}</code> · {err.reason}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}
        {pollTimedOut && <p className="text-xs text-gray-500">{tr.import_status_poll_timeout}</p>}
      </section>

      {/* Google Sheets */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4">
        <h2 className="text-base font-semibold text-gray-800">{tr.sheets_label}</h2>

        {status.google_sheet_url ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-600 break-all">{status.google_sheet_url}</p>
            {status.last_sync && (
              <div className="text-xs text-gray-400">
                <p>
                  {tr.sheets_last_sync}: {new Date(status.last_sync).toLocaleString(lang)}
                  {' · '}
                  <span className={status.last_sync_status === 'error' ? 'text-red-500' : status.last_sync_status === 'ok' ? 'text-green-600' : 'text-gray-500'}>
                    {status.last_sync_status === 'error'
                      ? tr.sheets_status_error
                      : status.last_sync_status === 'ok'
                        ? tr.sheets_status_ok
                        : tr.sheets_status_unknown}
                  </span>
                </p>
                {status.last_sync_status === 'error' && (
                  <div className="mt-1 text-red-500">
                    <p>{syncErrorText(status.last_sync_result?.error_code, status.last_sync_result?.error_count)}</p>
                    {status.last_sync_result?.error_code === 'rows_failed' && (
                      <>
                        <ImportRowErrorList errors={status.last_sync_result.errors} lang={lang} />
                        {status.last_sync_result.errors_truncated && (
                          <p className="mt-1">{tr.sheets_errors_truncated.replace('{n}', String(status.last_sync_result.errors.length))}</p>
                        )}
                      </>
                    )}
                    {status.last_sync_message && (
                      <details className="mt-1">
                        <summary className="cursor-pointer">{tr.sheets_technical_details}</summary>
                        <code dir="ltr" className="block mt-1 break-all">{status.last_sync_message}</code>
                      </details>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleManualSync}
                disabled={isPendingSync}
                className="text-sm bg-gray-100 hover:bg-gray-200 px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {isPendingSync ? tr.sheets_syncing : tr.sheets_sync}
              </button>
              <button
                onClick={handleRemoveSheets}
                disabled={isPendingSheets}
                className="text-sm text-red-500 hover:text-red-700 px-4 py-1.5 disabled:opacity-50"
              >
                {tr.sheets_remove}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="url"
              value={sheetsUrl}
              onChange={(e) => setSheetsUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:outline-none"
              aria-label={tr.sheets_label}
            />
            <button
              onClick={handleConnectSheets}
              disabled={isPendingSheets || !sheetsUrl.trim()}
              className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-semibold
                hover:bg-accent-dark transition-colors disabled:opacity-50"
            >
              {isPendingSheets ? tr.sheets_connecting : tr.sheets_connect}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
