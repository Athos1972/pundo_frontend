'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { localePath } from '@/lib/routing'
import type { Lang } from '@/lib/lang'
import { privacyT } from '@/lib/i18n/privacy'

export function PrivacyTab({ lang }: { lang: string }) {
  const tr = privacyT(lang)
  const [state, setState] = useState<string>('')
  const [exportId, setExportId] = useState<string>('')
  useEffect(() => { fetch('/api/customer/customer/privacy-requests/current').then(r => r.ok ? r.json() : null).then(data => { if (data?.export) { setState(data.export.state); setExportId(data.export.id) } }).catch(() => undefined) }, [])
  async function requestExport() { const r = await fetch('/api/customer/customer/privacy-requests/export', { method: 'POST' }); const data = await r.json().catch(() => null); if (data) { setState(data.state); setExportId(data.id) } }
  return <section className="flex flex-col gap-4"><h2 className="text-xl font-bold">{tr.title}</h2><button onClick={requestExport} className="rounded-lg bg-accent px-4 py-2 text-white">{tr.export}</button>{state === 'ready' && exportId && <a className="text-accent underline" href={`/api/customer/customer/privacy-requests/exports/${exportId}/download`}>{tr.ready}</a>}{state === 'expired' && <p role="status">{tr.expired}</p>}<Link className="text-accent underline" href={localePath(lang as Lang, '/privacy-request')}>{tr.title}</Link></section>
}
