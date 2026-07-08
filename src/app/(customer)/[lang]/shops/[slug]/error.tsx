'use client'

// B5900-005 — Segment-lokaler Error-Boundary für die Shop-Detailseite.
// Fängt Server-Render-Fehler *dieses Segments* ab (im Gegensatz zum globalen
// `(customer)/error.tsx`, der nur Client-seitige Render-Fehler abdeckt).
// Reiner Sicherheitsnetz-Charakter: die primäre Absicherung sind die
// null-safe Feldzugriffe in `page.tsx` (siehe `@/lib/shop-opening-hours`) —
// nach diesem Fix sollte dieser Boundary nur noch bei echten, unerwarteten
// Fehlern auslösen.

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { t } from '@/lib/translations'
import { localePath } from '@/lib/routing'
import type { Lang } from '@/lib/lang'
import { DEFAULT_LANG, LANGS } from '@/lib/lang'

export default function ShopDetailError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const params = useParams()
  const rawLang = typeof params?.lang === 'string' ? params.lang : DEFAULT_LANG
  const lang: Lang = (LANGS as readonly string[]).includes(rawLang) ? (rawLang as Lang) : DEFAULT_LANG
  const tr = t(lang)

  useEffect(() => {
    console.error('[shop-detail-error]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <h1 className="text-2xl font-extrabold text-text mb-2 font-heading">{tr.error_generic}</h1>
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={reset}
            className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors"
          >
            {tr.try_again}
          </button>
          <Link
            href={localePath(lang, '/shops')}
            className="px-6 py-2 border border-border rounded-lg text-text hover:bg-surface-alt transition-colors"
          >
            {tr.nav_shops}
          </Link>
        </div>
      </div>
    </div>
  )
}
