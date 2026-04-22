'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession } from '@/components/auth/SessionProvider'
import { useRouter } from 'next/navigation'
import { t } from '@/lib/translations'
import type { SimilaritySearchQuota } from '@/types/api'

interface Props {
  lang: string
  isOpen: boolean
  onClose: () => void
}

type ModalState = 'idle' | 'loading' | 'success' | 'error_rate_limit' | 'error_generic'

export function SearchSimilarModal({ lang, isOpen, onClose }: Props) {
  const session = useSession()
  const router = useRouter()
  const tr = t(lang)
  const [query, setQuery] = useState('')
  const [state, setState] = useState<ModalState>('idle')
  const [quota, setQuota] = useState<Pick<SimilaritySearchQuota, 'used_today' | 'limit_daily'> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!isOpen) {
      queueMicrotask(() => { setQuery(''); setState('idle') })
      return
    }
    setTimeout(() => textareaRef.current?.focus(), 50)
    if (session.is_authenticated) {
      fetch('/api/customer/customer/similarity-search/quota')
        .then((r) => (r.ok ? r.json() : null))
        .then((data: SimilaritySearchQuota | null) => {
          if (data) setQuota({ used_today: data.used_today, limit_daily: data.limit_daily })
        })
    }
  }, [isOpen, session.is_authenticated])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session.is_authenticated) {
      router.push('/auth/login')
      return
    }
    if (query.trim().length < 3) return
    setState('loading')
    const res = await fetch('/api/customer/customer/similarity-search/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query.trim() }),
    })
    if (res.ok) {
      setState('success')
    } else if (res.status === 429) {
      setState('error_rate_limit')
    } else {
      setState('error_generic')
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={tr.search_similar_title}
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-surface rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl mx-0 sm:mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text">{tr.search_similar_title}</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text p-1 rounded-lg"
            aria-label="Schließen"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {state === 'idle' && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-text-muted">{tr.search_similar_subtitle}</p>
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tr.search_similar_placeholder}
              rows={3}
              maxLength={200}
              className="w-full border border-border rounded-xl p-3 text-sm bg-surface-alt resize-none focus:outline-none focus:ring-2 focus:ring-accent"
            />
            {quota && (
              <p className="text-xs text-text-muted">
                {tr.search_similar_quota(quota.used_today, quota.limit_daily)}
              </p>
            )}
            {!session.is_authenticated && (
              <p className="text-xs text-amber-600">{tr.search_similar_login_required}</p>
            )}
            <button
              type="submit"
              disabled={query.trim().length < 3}
              className="w-full py-3 px-4 bg-accent text-white rounded-xl font-medium text-sm disabled:opacity-50 transition-opacity"
            >
              {session.is_authenticated ? tr.search_similar_submit : tr.auth_login}
            </button>
          </form>
        )}

        {state === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-text text-center">{tr.search_similar_loading}</p>
          </div>
        )}

        {state === 'success' && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-sm text-text">{tr.search_similar_success}</p>
            <button onClick={onClose} className="text-sm text-accent underline">
              {lang === 'de' ? 'Schließen' : lang === 'he' || lang === 'ar' ? 'إغلاق' : 'Close'}
            </button>
          </div>
        )}

        {(state === 'error_rate_limit' || state === 'error_generic') && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <p className="text-sm text-red-500">
              {state === 'error_rate_limit' ? tr.search_similar_rate_limit : tr.search_similar_error}
            </p>
            <button onClick={() => setState('idle')} className="text-sm text-accent underline">
              {tr.try_again}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
