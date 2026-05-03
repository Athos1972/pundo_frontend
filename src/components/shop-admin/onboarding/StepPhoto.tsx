'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import type { ShopAdminTranslations } from '@/lib/shop-admin-translations'
import { validateShopName } from '@/lib/onboarding/validation'

const MAX_BYTES = 5 * 1024 * 1024

interface StepPhotoProps {
  tr: ShopAdminTranslations
  initialFile: File | null
  initialShopName: string
  onNext: (file: File | null, shopName: string) => void
  onBack: () => void
}

export function StepPhoto({ tr, initialFile, initialShopName, onNext, onBack }: StepPhotoProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(initialFile)
  const [preview, setPreview] = useState<string | null>(
    initialFile ? URL.createObjectURL(initialFile) : null
  )
  const [sizeError, setSizeError] = useState(false)
  const [shopName, setShopName] = useState(initialShopName)
  const [nameErrorCode, setNameErrorCode] = useState<'required' | 'too_short' | 'too_long' | null>(null)
  const [nameTouched, setNameTouched] = useState(false)

  const nameValidation = validateShopName(shopName)
  const nameIsValid = nameValidation.ok

  function getNameErrorText(): string | null {
    if (!nameErrorCode) return null
    if (nameErrorCode === 'required') return tr.onboarding_step5_name_required_error
    if (nameErrorCode === 'too_short') return tr.onboarding_step5_name_too_short_error
    if (nameErrorCode === 'too_long') return tr.onboarding_step5_name_too_long_error
    return null
  }

  function handleNameBlur() {
    setNameTouched(true)
    if (!nameValidation.ok) {
      setNameErrorCode(nameValidation.code)
    } else {
      setNameErrorCode(null)
    }
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setShopName(val)
    if (nameTouched) {
      const v = validateShopName(val)
      setNameErrorCode(v.ok ? null : v.code)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > MAX_BYTES) { setSizeError(true); return }
    setSizeError(false)
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function handleNext(selectedFile: File | null) {
    const v = validateShopName(shopName)
    if (!v.ok) {
      setNameTouched(true)
      setNameErrorCode(v.code)
      return
    }
    onNext(selectedFile, v.value)
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-xl font-bold text-gray-900">{tr.onboarding_step5_title}</h2>

      {/* ── Shop-name block (required) ── */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="shop-name"
          className="text-sm font-medium text-gray-700 rtl:text-right"
        >
          {tr.onboarding_step5_name_label}
          {' '}
          <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="shop-name"
          type="text"
          maxLength={120}
          dir="auto"
          autoFocus={initialShopName === ''}
          value={shopName}
          onChange={handleNameChange}
          onBlur={handleNameBlur}
          placeholder={tr.onboarding_step5_name_placeholder}
          aria-required="true"
          aria-describedby={nameErrorCode ? 'shop-name-error' : 'shop-name-helper'}
          aria-invalid={nameErrorCode ? 'true' : 'false'}
          className={[
            'w-full rounded-xl border px-4 py-3 text-base outline-none transition-colors',
            'focus:ring-2 focus:ring-accent/30 rtl:text-right',
            nameErrorCode
              ? 'border-red-400 focus:border-red-400'
              : 'border-gray-300 focus:border-accent',
          ].join(' ')}
        />
        {nameErrorCode ? (
          <p id="shop-name-error" className="text-xs text-red-600 rtl:text-right" role="alert">
            {getNameErrorText()}
          </p>
        ) : (
          <p id="shop-name-helper" className="text-xs text-gray-400 rtl:text-right">
            {tr.onboarding_step5_name_helper}
          </p>
        )}
      </div>

      {/* ── Photo block (optional) ── */}
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
        {/* Skip = skip only the photo; shop name is still required */}
        <button
          type="button"
          onClick={() => handleNext(null)}
          disabled={!nameIsValid}
          className="py-3 px-4 rounded-xl border border-gray-300 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {tr.onboarding_skip}
        </button>
        <button
          type="button"
          onClick={() => handleNext(file)}
          disabled={!nameIsValid}
          className="flex-1 py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {tr.onboarding_next}
        </button>
      </div>
    </div>
  )
}
