'use client'
import { useRouter } from 'next/navigation'
import { getLangFromCookie } from '@/lib/lang'
import { t } from '@/lib/translations'

export function BackButton({ fallback = '/' }: { fallback?: string }) {
  const router = useRouter()
  const lang = getLangFromCookie()
  const tr = t(lang)
  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent transition-colors mb-4"
      aria-label={tr.back}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="m10 12-4-4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {tr.back}
    </button>
  )
}
