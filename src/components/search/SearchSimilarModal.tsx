'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSession } from '@/components/auth/SessionProvider'
import { useRouter } from 'next/navigation'
import { WalletChargeConfirmDialog } from '@/components/wallet/WalletChargeConfirmDialog'
import { progressionAdmissionErrorText } from '@/lib/progression-error-text'
import { requestProgressionPreflight, submitSimilaritySearch } from '@/lib/progression-api'
import { t } from '@/lib/translations'
import type { ProgressionAdmissionError, ProgressionPreflightResponse } from '@/types/api'

interface Props { lang: string; brandSlug?: string; isOpen: boolean; onClose: () => void }
type ModalState = 'form' | 'preflighting' | 'confirming' | 'submitting' | 'success' | 'error'

export function SearchSimilarModal({ lang, brandSlug = 'pundo', isOpen, onClose }: Props) {
  const session = useSession(); const router = useRouter(); const tr = t(lang)
  const [query, setQuery] = useState(''); const [state, setState] = useState<ModalState>('form')
  const [preview, setPreview] = useState<ProgressionPreflightResponse | null>(null)
  const [error, setError] = useState<ProgressionAdmissionError | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!isOpen) { queueMicrotask(() => { setQuery(''); setState('form'); setPreview(null); setError(null) }); return }
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [isOpen])
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey) }, [onClose])

  function showError(next: ProgressionAdmissionError) {
    if (next.kind === 'auth') { router.push('/auth/login'); return }
    setError(next); setState('error')
  }
  async function beginSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session.is_authenticated) { router.push('/auth/login'); return }
    if (query.trim().length < 3) return
    setState('preflighting')
    const result = await requestProgressionPreflight({ action: 'homesick', brand: brandSlug, reference: '' })
    if (!result.ok) { showError(result.error); return }
    setPreview(result.data); setState('confirming')
  }
  async function submitConfirmedSearch() {
    if (!preview || query.trim().length < 3) return
    setState('submitting')
    const result = await submitSimilaritySearch(query.trim())
    if (!result.ok) { showError(result.error); return }
    // HTTP 202 becomes success only after the client validated search_id.
    setState('success')
  }

  if (!isOpen) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={tr.search_similar_title}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-surface rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl mx-0 sm:mx-4">
        <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-text">{tr.search_similar_title}</h2><button onClick={onClose} className="text-text-muted hover:text-text p-1 rounded-lg" aria-label={tr.close}><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg></button></div>
        {state === 'form' && <form onSubmit={beginSubmit} className="flex flex-col gap-4"><p className="text-sm text-text-muted">{tr.search_similar_subtitle}</p><textarea ref={textareaRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr.search_similar_placeholder} rows={3} maxLength={200} className="w-full border border-border rounded-xl p-3 text-sm bg-surface-alt resize-none focus:outline-none focus:ring-2 focus:ring-accent" />{!session.is_authenticated && <p className="text-xs text-amber-600">{tr.search_similar_login_required}</p>}<button type="submit" disabled={query.trim().length < 3} className="w-full py-3 px-4 bg-accent text-white rounded-xl font-medium text-sm disabled:opacity-50 transition-opacity">{session.is_authenticated ? tr.search_similar_submit : tr.auth_login}</button></form>}
        {(state === 'preflighting' || state === 'submitting') && <div className="flex flex-col items-center gap-4 py-6"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /><p className="text-sm text-text text-center">{tr.search_similar_loading}</p></div>}
        {state === 'confirming' && preview && <WalletChargeConfirmDialog lang={lang} preview={preview} onConfirm={submitConfirmedSearch} onCancel={() => setState('form')} />}
        {state === 'success' && <div className="flex flex-col items-center gap-4 py-6 text-center"><p className="text-sm text-text">{tr.search_similar_success}</p><button onClick={onClose} className="text-sm text-accent underline">{tr.close}</button></div>}
        {state === 'error' && error && <div className="flex flex-col items-center gap-4 py-6 text-center"><p className="text-sm text-red-500">{progressionAdmissionErrorText(tr, error, tr.search_similar_error, lang)}</p><button onClick={() => setState('form')} className="text-sm text-accent underline">{tr.try_again}</button></div>}
      </div>
    </div>, document.body,
  )
}
