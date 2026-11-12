'use client'

import { useEffect, useState } from 'react'
import { privacyT } from '@/lib/i18n/privacy'

/** The raw token exists only in the location fragment and is removed before UI. */
export function DownloadPrivacyExport({ lang }: { lang: string }) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = window.location.hash.slice(1)
    window.history.replaceState(null, '', window.location.pathname)
    if (!token) {
      queueMicrotask(() => setMessage(privacyT(lang).download_invalid))
      return
    }
    void fetch('/api/privacy/privacy-requests/external-download/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
      cache: 'no-store',
    }).then(response => {
      const exportId = response.headers.get('x-privacy-export-id')
      if (!response.ok) throw response
      if (!exportId) throw new Error('external download confirmation failed')
      setDownloadUrl(`/api/privacy/privacy-exports/${encodeURIComponent(exportId)}/download`)
      setMessage(privacyT(lang).download_ready)
    }).catch((error: unknown) => {
      const status = error instanceof Response ? error.status : undefined
      setMessage(status === 404 || status === 410 ? privacyT(lang).download_invalid : privacyT(lang).download_error)
    })
  }, [lang])

  return <main className="mx-auto max-w-2xl px-4 py-12"><h1 className="text-2xl font-bold">{message}</h1>{downloadUrl && <a className="mt-4 inline-block text-accent underline" href={downloadUrl}>{privacyT(lang).download_link}</a>}</main>
}
