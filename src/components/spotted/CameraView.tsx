'use client'

import { useEffect, useRef } from 'react'
import { useCamera } from '@/lib/useCamera'
import type { Translations } from '@/lib/translations'

interface Props {
  tr: Translations
  onCapture: (file: File) => void
  onClose: () => void
}

export function CameraView({ tr, onCapture, onClose }: Props) {
  const { videoRef, isSupported, isActive, facingMode, error, start, flip, capture } = useCamera()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isSupported) start('environment')
  }, [isSupported, start])

  function handleCapture() {
    const file = capture()
    if (file) onCapture(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onCapture(file)
  }

  // iOS / no WebRTC fallback
  if (!isSupported) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center gap-6">
        <button
          onClick={onClose}
          className="absolute top-4 start-4 text-white p-2"
          aria-label="Close"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-lg"
          aria-label={tr.spotted_button_label}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.8">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </button>
        <p className="text-white text-sm opacity-70">{tr.spotted_button_label}</p>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Controls top bar */}
      <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-2">
        <button onClick={onClose} className="text-white p-2" aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
        <button onClick={flip} className="text-white p-2" aria-label="Flip camera">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 4v6h6M23 20v-6h-6" />
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" />
          </svg>
          <span className="sr-only">{facingMode === 'environment' ? 'front' : 'back'}</span>
        </button>
      </div>

      {/* Video viewfinder */}
      <div className="flex-1 relative overflow-hidden">
        {error === 'denied' && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-sm px-8 text-center">
            {tr.spotted_camera_denied}
          </div>
        )}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
        />
      </div>

      {/* Capture button */}
      <div className="flex items-center justify-center py-8 pb-safe">
        <button
          onClick={handleCapture}
          disabled={!isActive}
          className="w-20 h-20 rounded-full bg-white border-4 border-gray-300 disabled:opacity-40 active:scale-95 transition-transform"
          aria-label={tr.spotted_button_label}
        />
      </div>
    </div>
  )
}
