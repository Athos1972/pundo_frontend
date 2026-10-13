'use client'
import { useRouter } from 'next/navigation'
import { DEFAULT_LANG, type Lang } from '@/lib/lang'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/translations'

// Lang comes from the URL (or the `lang` prop on un-prefixed routes like /account), never from
// document.cookie: the cookie is invisible during SSR, so reading it here rendered "Back" on the
// server and e.g. "Πίσω" on the client -> React hydration mismatch (#418).
export function BackButton({ fallback: _fallback = '/', lang: langProp }: { fallback?: string; lang?: Lang }) {
  const router = useRouter()
  const lang = useLang(langProp ?? DEFAULT_LANG)
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
