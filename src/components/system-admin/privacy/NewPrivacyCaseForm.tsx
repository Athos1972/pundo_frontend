'use client'

import { useState } from 'react'
import type { SysAdminTranslations } from '@/lib/system-admin-translations'

export function NewPrivacyCaseForm({ tr }: { tr: SysAdminTranslations }) {
  const [notice, setNotice] = useState('')
  async function submit(form: HTMLFormElement) {
    const values = new FormData(form)
    const response = await fetch('/api/admin/privacy-requests', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        brand: values.get('brand'), right: values.get('right'), email: values.get('email'),
        language: values.get('language'), received_at: new Date(String(values.get('received_at'))).toISOString(),
      }),
    })
    setNotice(response.ok ? tr.privacy_case_saved : tr.privacy_case_error)
  }
  return <form className="flex max-w-xl flex-col gap-3" onSubmit={event => { event.preventDefault(); void submit(event.currentTarget) }}>
    <label className="flex flex-col gap-1">{tr.privacy_case_email}<input required className="rounded border p-2" name="email" type="email" /></label>
    <label className="flex flex-col gap-1">{tr.privacy_case_right}<select className="rounded border p-2" name="right"><option value="access">access</option><option value="export">export</option><option value="erasure">erasure</option><option value="correction">correction</option><option value="restriction">restriction</option><option value="objection">objection</option></select></label>
    <label className="flex flex-col gap-1">{tr.privacy_case_brand}<select className="rounded border p-2" name="brand"><option value="pundo">Pundo</option><option value="naidivse">Naidivse</option></select></label>
    <label className="flex flex-col gap-1">{tr.privacy_case_language}<select className="rounded border p-2" name="language"><option value="en">en</option><option value="de">de</option><option value="el">el</option><option value="ru">ru</option><option value="ar">ar</option><option value="he">he</option></select></label>
    <label className="flex flex-col gap-1">{tr.privacy_case_received}<input required className="rounded border p-2" name="received_at" type="datetime-local" /></label>
    <button className="rounded bg-slate-800 px-3 py-2 text-white" type="submit">{tr.privacy_case_create}</button><span role="status">{notice}</span>
  </form>
}
