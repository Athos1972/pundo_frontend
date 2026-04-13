'use client'

import { useRef, useState } from 'react'
import type { Translations } from '@/lib/translations'

const AVATAR_MAX_BYTES = 2 * 1024 * 1024
const AVATAR_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface Props {
  currentUrl: string | null | undefined
  displayName: string
  tr: Translations
  onUploaded: (avatarUrl: string) => void
}

export function AvatarUploader({ currentUrl, displayName, tr, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const avatarSrc = preview ?? currentUrl ?? null
  const initial = displayName.charAt(0).toUpperCase()

  async function handleFile(file: File) {
    setError('')
    if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
      setError(tr.account_avatar_wrong_type)
      return
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setError(tr.account_avatar_too_large)
      return
    }

    // Optimistic preview
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setUploading(true)

    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/customer/customer/auth/avatar', {
        method: 'POST',
        body: form,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.detail ?? 'Upload failed')
      }
      const data = await res.json()
      onUploaded(data.avatar_url)
    } catch (e) {
      setPreview(null)
      setError(e instanceof Error ? e.message : tr.account_avatar_too_large)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label={tr.account_avatar_upload}
        className="relative w-16 h-16 rounded-full overflow-hidden bg-accent text-white shrink-0 hover:opacity-80 transition-opacity focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
      >
        {avatarSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarSrc} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl font-bold">{initial}</span>
        )}
        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/40">
            <svg className="w-5 h-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </span>
        )}
      </button>

      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-sm font-medium text-accent hover:underline disabled:opacity-50"
        >
          {uploading ? tr.account_saving : tr.account_avatar_upload}
        </button>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
