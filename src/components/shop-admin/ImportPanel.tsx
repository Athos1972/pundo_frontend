'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

import { useState, useTransition, useRef } from 'react'
import { tAdmin } from '@/lib/shop-admin-translations'
import { showToast } from './Toast'
import type { ImportStatus, ImportUploadResult } from '@/types/shop-admin'

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
  const fileRef = useRef<HTMLInputElement>(null)

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
          showToast(tr.upload_success.replace('{n}', String(result.imported)), 'success')
        } else {
          showToast(tr.error_generic, 'error')
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
          showToast('Connected', 'success')
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
          setStatus((s) => ({ ...s, google_sheet_url: undefined, last_sync: undefined, last_sync_status: undefined }))
          setSheetsUrl('')
          showToast('Removed', 'success')
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
          // Refresh status after a short delay
          setTimeout(async () => {
            try {
              const statusRes = await fetch('/api/shop-admin/import/status')
              if (statusRes.ok) setStatus(await statusRes.json())
            } catch { /* ignore */ }
          }, 3000)
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
        <p className="text-xs text-gray-400">.xlsx, .csv — {tr.download_template}</p>

        <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-8 px-4 cursor-pointer transition-colors
          ${isPendingUpload ? 'border-gray-200 bg-gray-50 cursor-wait' : 'border-gray-300 hover:border-accent'}`}>
          <span className="text-2xl mb-2" aria-hidden="true">📂</span>
          <span className="text-sm text-gray-600 font-medium">
            {isPendingUpload ? tr.uploading : tr.upload_btn}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.csv"
            className="sr-only"
            onChange={handleUpload}
            disabled={isPendingUpload}
            aria-label={tr.upload_label}
          />
        </label>

        {uploadResult && (
          <div className={`rounded-lg px-4 py-3 text-sm ${uploadResult.errors.length > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
            <p className="font-medium">{tr.upload_success.replace('{n}', String(uploadResult.imported))}</p>
            {uploadResult.errors.length > 0 && (
              <>
                <p className="text-amber-700 mt-1">{tr.upload_errors.replace('{n}', String(uploadResult.errors.length))}</p>
                <ul className="mt-2 text-xs text-amber-600 space-y-0.5 max-h-32 overflow-y-auto">
                  {uploadResult.errors.map((err) => (
                    <li key={err.row}>Row {err.row}: {err.message}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </section>

      {/* Google Sheets */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4">
        <h2 className="text-base font-semibold text-gray-800">{tr.sheets_label}</h2>

        {status.google_sheet_url ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-600 break-all">{status.google_sheet_url}</p>
            {status.last_sync && (
              <p className="text-xs text-gray-400">
                {tr.sheets_last_sync}: {new Date(status.last_sync).toLocaleString()}
                {' · '}
                <span className={status.last_sync_status === 'error' ? 'text-red-500' : 'text-green-600'}>
                  {status.last_sync_status === 'error' ? tr.sheets_status_error : tr.sheets_status_ok}
                </span>
                {status.last_sync_status === 'error' && status.last_sync_message && (
                  <span className="block text-red-400 mt-0.5">{status.last_sync_message}</span>
                )}
              </p>
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
              {isPendingSheets ? '…' : tr.sheets_connect}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
