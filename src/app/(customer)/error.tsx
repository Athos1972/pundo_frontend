'use client'
import { getLangFromCookie, isRTL } from '@/lib/lang'
import { useLang } from '@/lib/useLang'
import { tCommon } from '@/lib/translations'

export default function Error({ reset }: { reset: () => void }) {
  // URL-Segment zuerst; Bypass-Pfade (/account, /auth) fallen auf das app_lang-Cookie zurück
  const lang = useLang(getLangFromCookie())
  const tr = tCommon(lang)
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4" dir={isRTL(lang) ? 'rtl' : 'ltr'}>
      <div className="text-center">
        <h1 className="text-2xl font-extrabold text-text mb-2 font-heading">{tr.error_generic}</h1>
        <button onClick={reset} className="mt-4 px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors">
          {tr.try_again}
        </button>
      </div>
    </div>
  )
}
