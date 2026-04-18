'use client'
import { useState } from 'react'

interface EmailFormTr {
  placeholder: string
  submit: string
  success: string
  error: string
}

export function EmailSignupForm({ tr }: { tr: EmailFormTr }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/coming-soon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setStatus(res.ok ? 'success' : 'error')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <p className="text-center text-sm text-success font-medium py-3">{tr.success}</p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder={tr.placeholder}
        required
        className="border border-border rounded-xl px-4 py-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-accent/40 bg-surface"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="bg-accent text-white rounded-xl px-4 py-3 text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
      >
        {status === 'loading' ? '…' : tr.submit}
      </button>
      {status === 'error' && (
        <p className="text-center text-xs text-red-500 mt-1">{tr.error}</p>
      )}
    </form>
  )
}
