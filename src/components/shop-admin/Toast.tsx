'use client'
// Only imports from src/components/ui/ allowed (Clean Boundary)

import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info'

interface ToastMessage {
  id: number
  message: string
  type: ToastType
}

let toastId = 0
type ToastHandler = (message: string, type?: ToastType) => void
let globalHandler: ToastHandler | null = null

export function showToast(message: string, type: ToastType = 'info') {
  globalHandler?.(message, type)
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    // Signal to E2E tests that React has hydrated
    document.body.dataset.hydrated = 'true'
    globalHandler = (message, type = 'info') => {
      const id = ++toastId
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
    }
    return () => { globalHandler = null }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 end-4 z-50 flex flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-lg text-sm font-medium shadow-lg max-w-sm transition-all
            ${toast.type === 'error' ? 'bg-red-600 text-white' : ''}
            ${toast.type === 'success' ? 'bg-green-600 text-white' : ''}
            ${toast.type === 'info' ? 'bg-gray-800 text-white' : ''}
          `}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
