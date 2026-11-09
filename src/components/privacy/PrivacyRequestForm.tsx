'use client'
import { useState } from 'react'
import { privacyT } from '@/lib/i18n/privacy'

export function PrivacyRequestForm({ lang, brand = 'pundo' }: { lang: string; brand?: 'pundo' | 'naidivse' }) {
  const tr = privacyT(lang); const [notice, setNotice] = useState('')
  async function submit(form: FormData) { const r = await fetch('/api/privacy/privacy-requests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ brand, language: lang, right: form.get('right'), email: form.get('email'), message: form.get('message'), company: form.get('company') }) }); const data = await r.json(); setNotice(data.status === 'public_intake_disabled' ? `${tr.disabled} ${data.contact}` : tr.confirm) }
  return <form action={submit} className="flex flex-col gap-3"><label><span className="sr-only">{tr.email}</span><input required name="email" type="email" className="w-full rounded border p-2" /></label><label><span className="sr-only">{tr.requestType}</span><select name="right" className="w-full rounded border p-2"><option value="access">{tr.access}</option><option value="erasure">{tr.erasure}</option><option value="correction">{tr.correction}</option></select></label><textarea name="message" className="rounded border p-2" /><input name="company" tabIndex={-1} autoComplete="off" className="hidden" /><button className="rounded bg-accent px-4 py-2 text-white">{tr.form}</button>{notice && <p role="status">{notice}</p>}</form>
}
