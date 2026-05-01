'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'

const MAX_BYTES = 5 * 1024 * 1024

interface StepPhotoProps {
  tr: ShopAdminTranslations
  initialFile: File | null
  onNext: (file: File | null) => void
  onBack: () => void
}

export function StepPhoto({ tr, initialFile, onNext, onBack }: StepPhotoProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(initialFile)
  const [preview, setPreview] = useState<string | null>(
    initialFile ? URL.createObjectURL(initialFile) : null
  )
  const [sizeError, setSizeError] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > MAX_BYTES) { setSizeError(true); return }
    setSizeError(false)
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-xl font-bold text-gray-900">{tr.onboarding_step5_title}</h2>
      <p className="text-sm text-gray-500">{tr.onboarding_photo_title}</p>

      <div
        className="relative w-full aspect-video rounded-2xl bg-gray-100 overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-accent transition-colors"
        onClick={() => fileRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
      >
        {preview ? (
          <Image src={preview} alt="preview" fill className="object-cover" unoptimized />
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <span className="text-4xl">📷</span>
            <span className="text-sm">{tr.onboarding_photo_upload}</span>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {preview && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="text-sm text-accent hover:underline text-center"
        >
          {tr.onboarding_photo_change}
        </button>
      )}

      {sizeError && (
        <p className="text-xs text-red-600">{tr.onboarding_photo_size_error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {tr.onboarding_back}
        </button>
        <button
          type="button"
          onClick={() => onNext(null)}
          className="py-3 px-4 rounded-xl border border-gray-300 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
        >
          {tr.onboarding_skip}
        </button>
        <button
          type="button"
          onClick={() => onNext(file)}
          className="flex-1 py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-dark transition-colors"
        >
          {tr.onboarding_next}
        </button>
      </div>
    </div>
  )
}
