'use client'
// F5970 — 1-3 proof documents (PDF/JPG/PNG), checked in the browser first (type + size), removable before sending.
// A pre-check only: the backend validates the magic bytes again. Shows what is stored, who sees it and for how long.
// Only imports from src/components/ui/ and shop-admin code (Clean Boundary).

import { useRef, useState } from 'react'
import { localePath } from '@/lib/routing'
import type { Lang } from '@/lib/lang'
import type { ShopAdminClaimTranslations } from '@/lib/i18n/shop-admin-claim'

const ALLOWED_EXT = /\.(pdf|jpe?g|png)$/i
const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png'])

export type DocumentCheck = { ok: true } | { ok: false; reason: 'type' | 'size' }

/** Browser-side pre-check of one file. */
export function checkDocument(file: Pick<File, 'name' | 'type' | 'size'>, maxBytes: number): DocumentCheck {
  const typeOk = ALLOWED_EXT.test(file.name) && (file.type === '' || ALLOWED_MIME.has(file.type))
  if (!typeOk) return { ok: false, reason: 'type' }
  if (file.size > maxBytes) return { ok: false, reason: 'size' }
  return { ok: true }
}

interface Props {
  tr: ShopAdminClaimTranslations
  lang: Lang
  files: File[]
  onChange: (files: File[]) => void
  maxFiles: number
  maxBytes: number
}

export function ClaimDocumentUpload({ tr, lang, files, onChange, maxFiles, maxBytes }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [errors, setErrors] = useState<string[]>([])
  const sizeMb = Math.round(maxBytes / (1024 * 1024))

  function addFiles(list: FileList | null) {
    if (!list) return
    const next = [...files]
    const problems: string[] = []
    for (const file of Array.from(list)) {
      const check = checkDocument(file, maxBytes)
      if (!check.ok) {
        problems.push(
          (check.reason === 'type' ? tr.claim_upload_err_type : tr.claim_upload_err_size)
            .replace('{name}', file.name)
            .replace('{size}', String(sizeMb)),
        )
      } else if (next.length >= maxFiles) {
        problems.push(tr.claim_upload_err_count.replace('{max}', String(maxFiles)))
        break
      } else {
        next.push(file)
      }
    }
    setErrors(problems)
    onChange(next)
    if (inputRef.current) inputRef.current.value = ''
  }

  function remove(index: number) {
    setErrors([])
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <section className="flex flex-col gap-3" aria-label={tr.claim_upload_title} data-testid="claim-document-upload">
      <h3 className="text-sm font-semibold text-gray-900">{tr.claim_upload_title}</h3>
      <p className="text-xs text-gray-500">
        {tr.claim_upload_hint.replace('{max}', String(maxFiles)).replace('{size}', String(sizeMb))}
      </p>

      <input
        ref={inputRef}
        id="claim-files"
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        onChange={(e) => addFiles(e.target.files)}
        className="sr-only"
        data-testid="claim-file-input"
      />
      <label
        htmlFor="claim-files"
        className="inline-flex w-fit cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        {tr.claim_upload_select}
      </label>

      {files.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
              <span className="min-w-0 truncate text-gray-800" dir="auto">{file.name}</span>
              <button type="button" onClick={() => remove(i)} className="shrink-0 text-xs font-medium text-red-600 hover:underline">
                {tr.claim_upload_remove}
              </button>
            </li>
          ))}
        </ul>
      )}

      {errors.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs text-red-600" role="alert">
          {errors.map((message, i) => <li key={i}>{message}</li>)}
        </ul>
      )}

      <p className="text-xs text-gray-500">
        {tr.claim_upload_privacy}{' '}
        {/* plain anchor: the privacy page belongs to the customer root layout (no cross-layout prefetch) */}
        <a href={localePath(lang, '/legal/privacy#shop-claim')} className="text-accent underline" target="_blank" rel="noopener noreferrer">
          {tr.claim_privacy_link}
        </a>
      </p>
    </section>
  )
}
