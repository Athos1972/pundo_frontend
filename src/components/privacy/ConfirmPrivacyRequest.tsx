'use client'

import { useEffect, useState } from 'react'
import { privacyT } from '@/lib/i18n/privacy'

export function ConfirmPrivacyRequest({ lang }: { lang: string }) {
  const [text, setText] = useState('')

  useEffect(() => {
    const token = window.location.hash.slice(1)
    if (!token) {
      queueMicrotask(() => setText(privacyT(lang).failed))
      return
    }
    void fetch('/api/privacy/privacy-requests/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    }).then(async response => {
      const data = await response.json()
      setText(data.status === 'confirmed' ? privacyT(lang).confirm : privacyT(lang).failed)
    }).catch(() => setText(privacyT(lang).failed))
  }, [lang])

  return <main><h1>{text}</h1></main>
}
