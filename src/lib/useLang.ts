'use client'
import { usePathname } from 'next/navigation'
import { LANGS, type Lang } from '@/lib/lang'

// Derives the active lang from the current URL so client components
// stay reactive after client-side language navigation.
// Falls back to the server-rendered prop when no lang segment is found.
export function useLang(fallbackLang: Lang): Lang {
  const pathname = usePathname()
  return (LANGS.find(l => pathname.startsWith(`/${l}/`) || pathname === `/${l}`) ?? fallbackLang) as Lang
}
