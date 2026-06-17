'use client'
// ─── CRM Public Opt-out Page (F7600) ─────────────────────────────────────────
// Token-based opt-out confirmation. No auth, no lang prefix, no PII displayed.
// POST only on explicit button click (R5: no auto-POST on load).
// Always shows the same confirmation regardless of backend result (R5: no enumeration).
// Multilingual: EL / EN / RU / DE (recipient may speak any of these).
// @seo-allow-default

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'

const TEXTS: Record<string, { title: string; body: string; button: string; done: string }> = {
  el: {
    title: 'Κατάργηση εγγραφής',
    body: 'Κάντε κλικ στο παρακάτω κουμπί για να επιβεβαιώσετε ότι δεν θέλετε να λαμβάνετε μηνύματα από εμάς.',
    button: 'Επιβεβαίωση κατάργησης εγγραφής',
    done: 'Η κατάργηση εγγραφής σας ολοκληρώθηκε. Δεν θα λαμβάνετε άλλα μηνύματα από εμάς.',
  },
  en: {
    title: 'Unsubscribe',
    body: 'Click the button below to confirm you no longer wish to receive messages from us.',
    button: 'Confirm unsubscribe',
    done: 'You have been unsubscribed. You will not hear from us again.',
  },
  ru: {
    title: 'Отписаться',
    body: 'Нажмите кнопку ниже, чтобы подтвердить, что вы больше не хотите получать сообщения от нас.',
    button: 'Подтвердить отписку',
    done: 'Вы успешно отписались. Мы больше не будем вам писать.',
  },
  de: {
    title: 'Abmelden',
    body: 'Klicken Sie auf die Schaltfläche unten, um zu bestätigen, dass Sie keine Nachrichten mehr von uns erhalten möchten.',
    button: 'Abmeldung bestätigen',
    done: 'Sie wurden abgemeldet. Sie werden keine weiteren Nachrichten von uns erhalten.',
  },
}

function detectLang(): string {
  if (typeof navigator === 'undefined') return 'en'
  const nav = navigator.language ?? 'en'
  const code = nav.split('-')[0].toLowerCase()
  return TEXTS[code] ? code : 'en'
}

function OptOutContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const langParam = searchParams.get('lang') ?? ''

  const lang = TEXTS[langParam] ? langParam : detectLang()
  const t = TEXTS[lang]

  const [state, setState] = useState<'idle' | 'pending' | 'done'>('idle')

  async function handleOptOut() {
    setState('pending')
    try {
      await fetch('/api/crm/opt-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
    } catch { /* ignore — always show confirmation */ }
    setState('done')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full flex flex-col gap-6 text-center">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{t.title}</h1>
          {state !== 'done' && (
            <p className="text-sm text-gray-600">{t.body}</p>
          )}
        </div>

        {state === 'done' ? (
          <div className="bg-green-50 rounded-xl border border-green-200 px-5 py-4">
            <p className="text-sm text-green-800 font-medium">{t.done}</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleOptOut}
            disabled={state === 'pending'}
            className="w-full px-5 py-3 bg-slate-800 text-white text-sm font-medium rounded-xl
              hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state === 'pending' ? '…' : t.button}
          </button>
        )}

        <p className="text-xs text-gray-400">pundo</p>
      </div>
    </div>
  )
}

export default function CrmOptOutPage() {
  return (
    <Suspense>
      <OptOutContent />
    </Suspense>
  )
}
