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
    return <p className="cs-success">{tr.success}</p>
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="cs-form">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={tr.placeholder}
          required
          className="cs-input"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="cs-btn"
        >
          {status === 'loading' ? '…' : tr.submit}
        </button>
      </form>
      {status === 'error' && (
        <p className="cs-error">{tr.error}</p>
      )}
    </div>
  )
}
