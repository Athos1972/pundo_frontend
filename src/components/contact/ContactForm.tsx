'use client'

import { useState } from 'react'
import { t } from '@/lib/translations'

interface Props {
  lang: string
}

type Status = 'idle' | 'sending' | 'success' | 'error'

const CATEGORIES = [
  'contact_cat_missing_shop',
  'contact_cat_missing_product',
  'contact_cat_wrong_info',
  'contact_cat_suggestion',
  'contact_cat_other',
] as const

export function ContactForm({ lang }: Props) {
  const tr = t(lang)
  const [status, setStatus] = useState<Status>('idle')
  const [form, setForm] = useState({
    subject: '',
    category: CATEGORIES[0],
    description: '',
    name: '',
    email: '',
  })

  function update(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setStatus(res.ok ? 'success' : 'error')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <p className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-green-800 text-sm">
        {tr.contact_success}
      </p>
    )
  }

  const inputClass =
    'w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent'
  const labelClass = 'block text-sm font-medium text-text mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-text-muted leading-relaxed">{tr.contact_intro}</p>
      <div>
        <label className={labelClass}>{tr.contact_subject}</label>
        <input
          type="text"
          required
          minLength={3}
          value={form.subject}
          onChange={e => update('subject', e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>{tr.contact_category}</label>
        <select
          value={form.category}
          onChange={e => update('category', e.target.value)}
          className={inputClass}
        >
          {CATEGORIES.map(key => (
            <option key={key} value={key}>
              {tr[key]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>{tr.contact_description}</label>
        <textarea
          required
          minLength={10}
          rows={4}
          value={form.description}
          onChange={e => update('description', e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>{tr.contact_name}</label>
        <input
          type="text"
          required
          minLength={2}
          value={form.name}
          onChange={e => update('name', e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>{tr.contact_email}</label>
        <input
          type="email"
          required
          value={form.email}
          onChange={e => update('email', e.target.value)}
          className={inputClass}
        />
      </div>

      {status === 'error' && (
        <p className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
          {tr.contact_error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
      >
        {status === 'sending' ? tr.contact_sending : tr.contact_send}
      </button>
    </form>
  )
}
