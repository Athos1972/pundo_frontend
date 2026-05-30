'use client'
import { useEffect } from 'react'
import { useLang } from '@/lib/useLang'
import { isRTL, type Lang } from '@/lib/lang'

// Keeps <html lang> and <html dir> in sync after client-side language navigation.
// The root layout sets these attributes server-side, but (customer)/layout.tsx
// does not re-render on lang-segment changes — so without this, dir stays stale.
export function DirSync({ fallbackLang }: { fallbackLang: Lang }) {
  const lang = useLang(fallbackLang)

  useEffect(() => {
    document.documentElement.setAttribute('lang', lang)
    document.documentElement.setAttribute('dir', isRTL(lang) ? 'rtl' : 'ltr')
  }, [lang])

  return null
}
