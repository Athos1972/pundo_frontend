'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

import { useEffect, useRef, useState, useTransition } from 'react'
import { tAdmin } from '@/lib/shop-admin-translations'
import { showToast } from './Toast'
import { FieldCatalog } from './FieldCatalog'
import { ImportRowErrorList } from './ImportRowErrorList'
import { ImportCountTiles } from './ImportCountTiles'
import { ImportPreview, importErrorText } from './ImportPreview'
import { ImportResult } from './ImportResult'
import { useImportPreview } from './useImportPreview'
import { useImportStatusPolling } from './useImportStatusPolling'
import type { ImportStatus, ImportSyncErrorCode } from '@/types/shop-admin'

interface ImportPanelProps {
  initialStatus: ImportStatus
  lang: string
}

export function ImportPanel({ initialStatus, lang }: ImportPanelProps) {
  const tr = tAdmin(lang)
  const [status, setStatus] = useState<ImportStatus>(initialStatus)
  const statusRef = useRef<ImportStatus>(initialStatus)
  useEffect(() => {
    statusRef.current = status
  })
  const [fullList, setFullList] = useState(false)
  const [sheetsUrl, setSheetsUrl] = useState(initialStatus.google_sheet_url ?? '')
  const [isPendingSheets, startSheetsTransition] = useTransition()
  const [isPendingSync, startSyncTransition] = useTransition()
  const [pollTimedOut, setPollTimedOut] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { start: startPolling, stop: stopPolling } = useImportStatusPolling()
  // After "apply": the image downloads of the new photos run in the background -> wait for them once.
  const flow = useImportPreview({
    onApplied: (p) => {
      if ((p.result?.image_download_pending ?? 0) > 0) pollImages(statusRef.current.last_image_download_at)
    },
  })
  const { phase, preview } = flow

  async function fetchStatus(): Promise<ImportStatus | null> {
    const res = await fetch('/api/shop-admin/import/status')
    return res.ok ? ((await res.json()) as ImportStatus) : null
  }

  // Waits until the background image downloads of an import are finished.
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
      case 'empty_sheet': return tr.sheets_error_empty_sheet
      case 'missing_name_column': return tr.sheets_error_missing_name_column
      case 'too_many_rows': return tr.sheets_error_too_many_rows
      default: return tr.sheets_status_error
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const input = e.target
    await flow.create(file, fullList, lang)
    input.value = '' // the same file can be chosen again after a correction
  }

  function handleConnectSheets() {
    if (!sheetsUrl.trim()) return
    startSheetsTransition(async () => {
      try {
        const res = await fetch('/api/shop-admin/import/google-sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: sheetsUrl.trim(), default_lang: lang }),
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
        const res = await fetch(`/api/shop-admin/import/google-sheets/sync?lang=${encodeURIComponent(lang)}`, { method: 'POST' })
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

  const checking = phase === 'checking'
  const showPreview = (phase === 'preview' || phase === 'applying') && preview !== null
  const wide = showPreview || phase === 'result'
  const syncResult = status.last_sync_result

  return (
    <div className={`flex flex-col gap-6 ${wide ? 'max-w-4xl' : 'max-w-xl'}`}>
      {/* Excel / CSV: upload -> preview -> apply -> result */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 flex flex-col gap-4">
        {showPreview ? (
          <ImportPreview
            preview={preview!}
            lang={lang}
            applying={phase === 'applying'}
            error={flow.error}
            timedOut={flow.timedOut}
            filter={flow.filter}
            loadingMore={flow.loadingMore}
            onApply={(decisions) => { void flow.apply(decisions) }}
            onCancel={() => { void flow.cancel() }}
            onFilter={(s) => { void flow.setFilter(s) }}
            onLoadMore={() => { void flow.loadMore() }}
          />
        ) : phase === 'result' && preview?.result ? (
          <ImportResult result={preview.result} lang={lang} onNewUpload={flow.reset} />
        ) : phase === 'failed' ? (
          <div className="flex flex-col gap-3">
            <p role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {importErrorText(flow.error ?? { code: 'unknown' }, tr)}
            </p>
            <button type="button" onClick={flow.reset} className="self-start px-4 py-2 text-sm text-accent hover:underline">
              {tr.preview_upload_again}
            </button>
          </div>
        ) : (
          <>
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

            <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                data-testid="import-full-list"
                checked={fullList}
                onChange={(e) => setFullList(e.target.checked)}
                disabled={checking}
                className="mt-0.5 accent-accent shrink-0"
              />
              <span>
                <span className="font-medium">{tr.import_full_list_label}</span>
                <span className="block text-xs text-gray-500 mt-0.5">{tr.import_full_list_hint}</span>
              </span>
            </label>

            {flow.error && (
              <p role="alert" data-testid="import-upload-error" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {importErrorText(flow.error, tr)}
              </p>
            )}

            <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-8 px-4 cursor-pointer transition-colors
              ${checking ? 'border-gray-200 bg-gray-50 cursor-wait' : 'border-gray-300 hover:border-accent'}`}>
              <span className="text-2xl mb-2" aria-hidden="true">📂</span>
              <span className="text-sm text-gray-600 font-medium">
                {checking ? tr.uploading : tr.upload_btn}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="sr-only"
                onChange={handleFile}
                disabled={checking}
                aria-label={tr.upload_label}
              />
            </label>

            {checking && (
              <div role="status" data-testid="import-checking" className="flex flex-col gap-1.5 text-sm text-gray-600">
                <p>
                  {tr.import_checking}
                  {preview?.progress && preview.progress.total > 0 && (
                    <span className="text-gray-400">
                      {' '}
                      {(tr as unknown as Record<string, string | undefined>)[`import_phase_${preview.progress.phase}`] ?? ''}
                      {' '}
                      {tr.import_progress_rows.replace('{done}', String(preview.progress.done)).replace('{total}', String(preview.progress.total))}
                    </span>
                  )}
                </p>
                {preview?.progress && preview.progress.total > 0 && (() => {
                  const percent = Math.min(100, Math.floor((preview.progress.done / preview.progress.total) * 100))
                  return (
                    <div className="flex items-center gap-2">
                      <div
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={percent}
                        className="h-2 flex-1 rounded-full bg-gray-200 overflow-hidden"
                      >
                        <div
                          className="h-full bg-accent transition-all"
                          // @csp-allow-inline-style — computed progress width
                          style={{ inlineSize: `${percent}%` }}
                        />
                      </div>
                      <span dir="ltr" className="text-xs text-gray-500 tabular-nums">
                        {tr.import_progress_percent.replace('{percent}', String(percent))}
                      </span>
                    </div>
                  )
                })()}
              </div>
            )}
            {checking && flow.timedOut && <p className="text-xs text-gray-500">{tr.preview_poll_timeout}</p>}

            <FieldCatalog lang={lang} />

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
          </>
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
                {status.last_sync_status === 'ok' && syncResult && syncResult.created !== undefined && (
                  <div className="mt-1" data-testid="sheets-sync-counts">
                    <ImportCountTiles
                      compact
                      testId="sheets-sync-tiles"
                      tiles={[
                        { key: 'new', label: tr.count_new, value: syncResult.created ?? 0, tone: 'green' },
                        { key: 'updated', label: tr.count_updated, value: syncResult.updated ?? 0, tone: 'blue' },
                        { key: 'deactivate', label: tr.count_deactivated, value: syncResult.deactivated ?? 0, tone: 'orange' },
                        { key: 'error', label: tr.count_error, value: syncResult.error_count ?? 0, tone: 'red' },
                      ]}
                    />
                    {(syncResult.possible_duplicates ?? 0) > 0 && (
                      <details className="mt-1 text-amber-700" data-testid="sheets-possible-duplicates">
                        <summary className="cursor-pointer">
                          {tr.sheets_possible_duplicates.replace('{n}', String(syncResult.possible_duplicates))}
                        </summary>
                        <ul className="mt-1 space-y-0.5 max-h-32 overflow-y-auto">
                          {(syncResult.possible_duplicate_rows ?? []).map((d) => (
                            <li key={d.row} className="break-words">
                              {tr.upload_error_row.replace('{n}', String(d.row))}: {d.name}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}
                {status.last_sync_status === 'error' && (
                  <div className="mt-1 text-red-500">
                    <p>{syncErrorText(syncResult?.error_code, syncResult?.error_count)}</p>
                    {syncResult?.error_code === 'rows_failed' && (
                      <>
                        <ImportRowErrorList errors={syncResult.errors} lang={lang} />
                        {syncResult.errors_truncated && (
                          <p className="mt-1">{tr.sheets_errors_truncated.replace('{n}', String(syncResult.errors.length))}</p>
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
