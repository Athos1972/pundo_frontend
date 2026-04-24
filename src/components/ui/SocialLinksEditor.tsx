'use client'

import { useState } from 'react'
import type { SocialLinkBlockCategory, SocialLinkFieldError } from '@/types/shop-admin'

const FIXED_PLATFORMS = [
  { key: 'facebook',  label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok',    label: 'TikTok' },
  { key: 'youtube',   label: 'YouTube' },
  { key: 'linkedin',  label: 'LinkedIn' },
  { key: 'x',         label: 'X / Twitter' },
] as const

export interface SocialLinksEditorProps {
  value: Record<string, string> | null
  onChange: (v: Record<string, string> | null) => void
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
  const [otherKey, setOtherKey] = useState<string>(() => {
    if (!value) return ''
    const known = new Set(FIXED_PLATFORMS.map((p) => p.key))
    return Object.keys(value).find((k) => !known.has(k as never)) ?? ''
  })
  const [otherUrl, setOtherUrl] = useState<string>(() => {
    if (!value || !otherKey) return ''
    return value[otherKey] ?? ''
  })
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

  function updateLinks(key: string, url: string) {
    const base: Record<string, string> = {}
    for (const p of FIXED_PLATFORMS) {
      const existing = value?.[p.key]
      if (existing) base[p.key] = existing
    }
    if (otherKey && otherUrl) base[otherKey] = otherUrl

    if (url) {
      base[key] = url
    } else {
      delete base[key]
    }

    onChange(Object.keys(base).length ? base : null)
  }

  function handleFixedChange(key: string, url: string) {
    onServerErrorDismiss?.(key)
    const invalid = url && !isValidUrl(url)
    setUrlErrors((e) => {
      const next = invalid ? { ...e, [key]: 'Invalid URL' } : (({ [key]: _, ...rest }) => rest)(e)
      onValidChange?.(Object.keys(next).length === 0)
      return next
    })
    updateLinks(key, url)
  }

  function handleOtherChange(newKey: string, newUrl: string) {
    const prevKey = otherKey
    setOtherKey(newKey)
    setOtherUrl(newUrl)

    onServerErrorDismiss?.(prevKey || 'other')
    if (newKey !== prevKey) onServerErrorDismiss?.(newKey)

    const base: Record<string, string> = {}
    for (const p of FIXED_PLATFORMS) {
      const existing = value?.[p.key]
      if (existing) base[p.key] = existing
    }
    if (prevKey && prevKey !== newKey) delete base[prevKey]
    if (newKey && newUrl) base[newKey] = newUrl

    const invalid = newUrl && !isValidUrl(newUrl)
    setUrlErrors((e) => {
      const next = invalid ? { ...e, other: 'Invalid URL' } : (({ other: _, ...rest }) => rest)(e)
      onValidChange?.(Object.keys(next).length === 0)
      return next
    })

    onChange(Object.keys(base).length ? base : null)
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
                  defaultValue={value?.[key] ?? ''}
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
