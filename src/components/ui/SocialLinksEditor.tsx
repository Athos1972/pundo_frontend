'use client'

import { useState } from 'react'
import type { SocialLinkBlockCategory, SocialLinkFieldError, SocialLinksMap, CustomSocialLink } from '@/types/shop-admin'

const FIXED_PLATFORMS = [
  { key: 'facebook',  label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok',    label: 'TikTok' },
  { key: 'youtube',   label: 'YouTube' },
  { key: 'linkedin',  label: 'LinkedIn' },
  { key: 'x',         label: 'X / Twitter' },
] as const

const FIXED_KEYS = new Set(FIXED_PLATFORMS.map((p) => p.key))

// ─── Wire adapters ────────────────────────────────────────────────────────────

/**
 * Converts wire format (SocialLinksMap) to the editor's internal flat state.
 * Returns { flat: Record<string,string>, customKey: string, customUrl: string }
 */
function fromWire(value: SocialLinksMap | null): {
  flat: Record<string, string>
  customKey: string
  customUrl: string
} {
  if (!value) return { flat: {}, customKey: '', customUrl: '' }

  const flat: Record<string, string> = {}
  let customKey = ''
  let customUrl = ''

  for (const [k, v] of Object.entries(value)) {
    if (FIXED_KEYS.has(k as never)) {
      if (typeof v === 'string') {
        flat[k] = v
      } else if (v !== undefined) {
        // Defensive: fixed-key has non-string value (crawler artefact) — skip, warn
        console.warn(`[SocialLinksEditor] Fixed platform key "${k}" has unexpected non-string value:`, v)
      }
    } else if (k === 'other') {
      // Canonical custom-link format: { key, url } or [{ key, url }, ...]
      if (Array.isArray(v)) {
        if (v.length > 1) {
          console.warn('[SocialLinksEditor] Multiple "other" entries found — using first, ignoring rest:', v.slice(1))
        }
        const first = v[0] as CustomSocialLink | undefined
        if (first && typeof first.key === 'string' && typeof first.url === 'string') {
          customKey = first.key
          customUrl = first.url
        }
      } else if (v && typeof v === 'object' && !Array.isArray(v)) {
        const link = v as CustomSocialLink
        if (typeof link.key === 'string' && typeof link.url === 'string') {
          customKey = link.key
          customUrl = link.url
        }
      }
    } else {
      // Legacy: unknown top-level key (e.g. { xing: "https://..." }) — treat as custom slot
      if (typeof v === 'string') {
        customKey = k
        customUrl = v
      } else if (v !== undefined) {
        console.warn(`[SocialLinksEditor] Unknown key "${k}" has non-string value — skipping:`, v)
      }
    }
  }

  return { flat, customKey, customUrl }
}

/**
 * Converts the editor's internal flat state back to wire format.
 * Custom entry is wrapped under "other": { key, url } — never stored flat.
 */
function toWire(
  flat: Record<string, string>,
  customKey: string,
  customUrl: string,
): SocialLinksMap | null {
  const result: SocialLinksMap = {}

  for (const [k, v] of Object.entries(flat)) {
    if (v) result[k] = v
  }

  if (customKey && customUrl) {
    result.other = { key: customKey, url: customUrl }
  }

  return Object.keys(result).length ? result : null
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface SocialLinksEditorProps {
  value: SocialLinksMap | null
  onChange: (v: SocialLinksMap | null) => void
  onValidChange?: (isValid: boolean) => void
  titleLabel: string
  otherLabel: string
  platformNameLabel: string
  urlLabel: string
  disabled?: boolean
  serverErrors?: Record<string, SocialLinkFieldError>
  errorLabels?: Partial<Record<SocialLinkBlockCategory, string>>
  errorViaShortenerTemplate?: string
  onServerErrorDismiss?: (key: string) => void
}

export function SocialLinksEditor({
  value,
  onChange,
  onValidChange,
  titleLabel,
  otherLabel,
  platformNameLabel,
  urlLabel,
  disabled,
  serverErrors,
  errorLabels,
  errorViaShortenerTemplate,
  onServerErrorDismiss,
}: SocialLinksEditorProps) {
  const initial = fromWire(value)
  const [flat, setFlat] = useState<Record<string, string>>(initial.flat)
  const [otherKey, setOtherKey] = useState<string>(initial.customKey)
  const [otherUrl, setOtherUrl] = useState<string>(initial.customUrl)
  const [urlErrors, setUrlErrors] = useState<Record<string, string>>({})

  function buildServerErrorMessage(fieldKey: string): string | null {
    const err = serverErrors?.[fieldKey]
    if (!err) return null
    if (err.via_shortener && err.resolved_host && errorViaShortenerTemplate) {
      return errorViaShortenerTemplate.replace('{host}', err.resolved_host)
    }
    if (errorLabels?.[err.category]) return errorLabels[err.category]!
    return null
  }

  function handleFixedChange(key: string, url: string) {
    onServerErrorDismiss?.(key)
    const invalid = url && !isValidUrl(url)
    const nextErrors = invalid
      ? { ...urlErrors, [key]: 'Invalid URL' }
      : (({ [key]: _, ...rest }) => rest)(urlErrors)
    setUrlErrors(nextErrors)
    onValidChange?.(Object.keys(nextErrors).length === 0)

    const nextFlat = url ? { ...flat, [key]: url } : (({ [key]: _, ...rest }) => rest)(flat)
    setFlat(nextFlat)
    onChange(toWire(nextFlat, otherKey, otherUrl))
  }

  function handleOtherChange(newKey: string, newUrl: string) {
    const prevKey = otherKey
    setOtherKey(newKey)
    setOtherUrl(newUrl)

    onServerErrorDismiss?.(prevKey || 'other')
    if (newKey !== prevKey) onServerErrorDismiss?.(newKey)

    const invalid = newUrl && !isValidUrl(newUrl)
    const nextErrors = invalid
      ? { ...urlErrors, other: 'Invalid URL' }
      : (({ other: _, ...rest }) => rest)(urlErrors)
    setUrlErrors(nextErrors)
    onValidChange?.(Object.keys(nextErrors).length === 0)

    onChange(toWire(flat, newKey, newUrl))
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium text-gray-700">{titleLabel}</span>
      <div className="flex flex-col gap-2">
        {FIXED_PLATFORMS.map(({ key, label }) => {
          const serverError = buildServerErrorMessage(key)
          const hasServerError = !!serverError
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="w-28 text-sm text-gray-600 shrink-0">{label}</span>
              <div className="flex-1">
                <input
                  type="url"
                  placeholder="https://..."
                  defaultValue={flat[key] ?? ''}
                  disabled={disabled}
                  onChange={(e) => handleFixedChange(key, e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2
                    focus:ring-slate-400 disabled:bg-gray-50 disabled:text-gray-400
                    ${urlErrors[key] || hasServerError ? 'border-red-400' : 'border-gray-300'}`}
                />
                {urlErrors[key] && (
                  <p className="mt-0.5 text-xs text-red-500 break-words">{urlErrors[key]}</p>
                )}
                {hasServerError && !urlErrors[key] && (
                  <p className="mt-0.5 text-xs text-red-500 break-words">{serverError}</p>
                )}
              </div>
            </div>
          )
        })}

        <div className="flex items-start gap-3 pt-1">
          <span className="w-28 text-sm text-gray-600 shrink-0 pt-2">{otherLabel}</span>
          <div className="flex flex-1 gap-2">
            <input
              type="text"
              placeholder={platformNameLabel}
              value={otherKey}
              disabled={disabled}
              onChange={(e) => handleOtherChange(e.target.value, otherUrl)}
              className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-gray-50"
            />
            <div className="flex-1">
              {(() => {
                const otherErrorKey = otherKey || 'other'
                const serverError = buildServerErrorMessage(otherErrorKey)
                const hasServerError = !!serverError
                return (
                  <>
                    <input
                      type="url"
                      placeholder={`${urlLabel}: https://...`}
                      value={otherUrl}
                      disabled={disabled}
                      onChange={(e) => handleOtherChange(otherKey, e.target.value)}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2
                        focus:ring-slate-400 disabled:bg-gray-50
                        ${urlErrors.other || hasServerError ? 'border-red-400' : 'border-gray-300'}`}
                    />
                    {urlErrors.other && (
                      <p className="mt-0.5 text-xs text-red-500 break-words">{urlErrors.other}</p>
                    )}
                    {hasServerError && !urlErrors.other && (
                      <p className="mt-0.5 text-xs text-red-500 break-words">{serverError}</p>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
