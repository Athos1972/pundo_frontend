'use client'

import { useState } from 'react'
import { useSession } from '@/components/auth/SessionProvider'
import { extractGPS } from '@/lib/exif'
import { t } from '@/lib/translations'
import { CameraView } from './CameraView'
import { AuthModal } from './AuthModal'
import type { SpottedCreateResponse } from '@/types/api'

type UploadState =
  | 'idle'
  | 'camera_open'
  | 'exif_error'
  | 'auth_gate'
  | 'uploading'
  | 'success'
  | 'upload_error'

interface Props {
  lang: string
}

export function SpottedGlobalButton({ lang }: Props) {
  const tr = t(lang)
  const session = useSession()
  const [state, setState] = useState<UploadState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingCoords, setPendingCoords] = useState<{ latitude: number; longitude: number } | null>(null)

  async function handleCapture(file: File) {
    setState('idle') // close camera overlay while processing

    const coords = await extractGPS(file)
    if (!coords) {
      setErrorMsg(tr.spotted_error_no_gps)
      setState('exif_error')
      return
    }

    setPendingFile(file)
    setPendingCoords(coords)

    if (!session.is_authenticated) {
      setState('auth_gate')
      return
    }

    await doUpload(file, coords)
  }

  async function doUpload(file: File, coords: { latitude: number; longitude: number }) {
    setState('uploading')
    try {
      const { default: compress } = await import('browser-image-compression')
      const compressed = await compress(file, {
        maxSizeMB: 3,
        maxWidthOrHeight: 2048,
        useWebWorker: true,
      })

      const form = new FormData()
      form.append('file', compressed, file.name)
      form.append('latitude', String(coords.latitude))
      form.append('longitude', String(coords.longitude))
      form.append('language', lang)

      const res = await fetch('/api/customer/customer/spotted', {
        method: 'POST',
        body: form,
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json() as SpottedCreateResponse
      void data // spotted_id available if needed later
      setState('success')
    } catch {
      setErrorMsg(tr.spotted_error_upload)
      setState('upload_error')
    }
  }

  function handleAuthSuccess() {
    if (pendingFile && pendingCoords) {
      doUpload(pendingFile, pendingCoords)
    } else {
      setState('idle')
    }
  }

  function dismiss() {
    setState('idle')
    setPendingFile(null)
    setPendingCoords(null)
  }

  return (
    // md:hidden — FAB is mobile-only
    <div className="md:hidden">
      {/* Floating Action Button */}
      {state === 'idle' && (
        <button
          onClick={() => setState('camera_open')}
          className="fixed bottom-20 end-4 z-40 w-14 h-14 rounded-full bg-accent text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          aria-label={tr.spotted_button_label}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </button>
      )}

      {/* Camera overlay */}
      {state === 'camera_open' && (
        <CameraView
          tr={tr}
          onCapture={handleCapture}
          onClose={dismiss}
        />
      )}

      {/* Auth gate */}
      {state === 'auth_gate' && (
        <AuthModal
          lang={lang}
          tr={tr}
          onSuccess={handleAuthSuccess}
          onClose={dismiss}
        />
      )}

      {/* Uploading overlay */}
      {state === 'uploading' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-surface rounded-2xl p-6 flex flex-col items-center gap-3 shadow-xl">
            <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-text">{tr.spotted_uploading}</p>
          </div>
        </div>
      )}

      {/* Success toast */}
      {state === 'success' && (
        <div className="fixed bottom-24 start-4 end-4 z-50">
          <div className="bg-green-600 text-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span className="text-sm font-medium flex-1">{tr.spotted_success}</span>
            <button onClick={dismiss} className="opacity-80 hover:opacity-100" aria-label="Dismiss">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Error toast (GPS or upload) */}
      {(state === 'exif_error' || state === 'upload_error') && (
        <div className="fixed bottom-24 start-4 end-4 z-50">
          <div className="bg-red-600 text-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4m0 4h.01" />
            </svg>
            <span className="text-sm font-medium flex-1">{errorMsg}</span>
            <button onClick={dismiss} className="opacity-80 hover:opacity-100" aria-label="Dismiss">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
