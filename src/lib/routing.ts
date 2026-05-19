import type { Lang } from '@/lib/lang'
import { LANGS } from '@/lib/lang'

const LANG_SET = new Set<string>(LANGS)

/** Erstellt einen sprach-präfixierten Pfad: localePath('de', '/shops') → '/de/shops' */
export function localePath(lang: Lang, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`
  return `/${lang}${clean}`
}

/**
 * Entfernt den Lang-Präfix aus einem Pfad.
 *   stripLang('/de/shops') → '/shops'
 *   stripLang('/ar/')      → '/'
 *   stripLang('/shops')    → '/shops' (unverändert)
 */
export function stripLang(pathname: string): string {
  const segments = pathname.split('/')
  // segments[0] is always '' (leading slash), segments[1] is first path segment
  if (segments[1] && LANG_SET.has(segments[1])) {
    const rest = segments.slice(2).join('/')
    return rest ? `/${rest}` : '/'
  }
  return pathname
}

/**
 * Baut das hreflang-Objekt für generateMetadata.alternates.languages.
 * x-default zeigt immer auf die englische Version.
 *
 * Beispiel: buildHreflang('https://pundo.cy', '/shops/my-shop')
 * → { en: 'https://pundo.cy/en/shops/my-shop', de: '...', 'x-default': '.../en/...' }
 */
export function buildHreflang(siteUrl: string, path: string): Record<string, string> {
  const clean = path.startsWith('/') ? path : `/${path}`
  const result: Record<string, string> = {}
  for (const lang of LANGS) {
    result[lang] = `${siteUrl}/${lang}${clean}`
  }
  result['x-default'] = `${siteUrl}/en${clean}`
  return result
}
