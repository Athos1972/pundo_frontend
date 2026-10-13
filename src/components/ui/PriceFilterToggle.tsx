'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { t } from '@/lib/translations'
import { DEFAULT_LANG } from '@/lib/lang'
import { useLang } from '@/lib/useLang'

export function PriceFilterToggle() {
  const params = useSearchParams()
  const router = useRouter()
  // URL-derived lang: document.cookie is not readable during SSR -> hydration mismatch
  const tr = t(useLang(DEFAULT_LANG))
  const active = params.get('with_price') === '1'

  const toggle = () => {
    const p = new URLSearchParams(params.toString())
    if (active) { p.delete('with_price') } else { p.set('with_price', '1') }
    router.push(`?${p}`)
  }

  return (
    <button
      onClick={toggle}
      className={`flex-shrink-0 px-3 py-1 rounded-full text-sm transition-colors ${
        active
          ? 'bg-accent text-white'
          : 'bg-surface border border-border text-text-muted hover:border-accent'
      }`}
    >
      {tr.filter_price_only}
    </button>
  )
}
