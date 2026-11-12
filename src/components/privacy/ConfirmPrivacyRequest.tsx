'use client'

import { useEffect, useRef, useState } from 'react'
import { privacyT } from '@/lib/i18n/privacy'

export function ConfirmPrivacyRequest({ lang }: { lang: string }) {
  const tr = privacyT(lang)
  const [text, setText] = useState<string>(tr.confirmation_loading)
  const sent = useRef(false)

  useEffect(() => {
    const token = window.location.hash.slice(1)
    window.history.replaceState(null, '', window.location.pathname)
    if (!token) {
      queueMicrotask(() => setText(tr.confirmation_invalid))
      return
    }
    if (sent.current) return
    sent.current = true
    void fetch('/api/privacy/privacy-requests/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    }).then(async response => {
      const data = await response.json()
      const messages = {
        confirmed: tr.confirmation_confirmed,
        already_confirmed: tr.confirmation_already_confirmed,
        expired: tr.confirmation_expired,
        public_intake_disabled: tr.confirmation_public_disabled,
      }
      setText(messages[data.status as keyof typeof messages] ?? tr.confirmation_error)
    }).catch(() => setText(tr.confirmation_error))
  }, [lang])

  return <main><h1>{text}</h1></main>
}
