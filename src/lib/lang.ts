export const LANGS = ['en', 'de', 'ru', 'el', 'ar', 'he'] as const;
export type Lang = typeof LANGS[number];

export const SUPPORTED_LANGUAGES = ['EN', 'DE', 'EL', 'RU', 'AR', 'HE'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];
export const DEFAULT_LANG: Lang = 'en';

export const RTL_LANGS: ReadonlySet<Lang> = new Set(['ar', 'he']);

export const LANG_NATIVE_NAMES: Record<Lang, string> = {
  en: 'English',
  de: 'Deutsch',
  el: 'Ελληνικά',
  ru: 'Русский',
  ar: 'العربية',
  he: 'עברית',
};

export function isRTL(lang: Lang): boolean {
  return RTL_LANGS.has(lang);
}

// Client: Cookie lesen
export function getLangFromCookie(): Lang {
  if (typeof document === 'undefined') return DEFAULT_LANG;
  const match = document.cookie.match(/app_lang=([^;]+)/);
  const val = match?.[1];
  return (LANGS as readonly string[]).includes(val ?? '') ? (val as Lang) : DEFAULT_LANG;
}

// Client: Cookie schreiben
export function setLangCookie(lang: Lang): void {
  document.cookie = `app_lang=${lang};path=/;max-age=31536000;SameSite=Lax;Secure`;
}

// Client: erste unterstützte Sprache aus navigator.languages (für LanguageHint-Vorschlag).
// null, wenn keine Browsersprache unterstützt wird — kein stiller Fallback auf DEFAULT_LANG.
export function detectSupportedBrowserLang(): Lang | null {
  if (typeof navigator === 'undefined') return null
  const candidates = (navigator.languages?.length ? navigator.languages : [navigator.language ?? '']) as string[]
  for (const raw of candidates) {
    const two = raw.toLowerCase().split('-')[0]
    if ((LANGS as readonly string[]).includes(two)) return two as Lang
  }
  return null
}

// Server: Sprache aus Request ermitteln (für Server Components)
// Reihenfolge: x-lang Header (gesetzt von proxy.ts) → app_lang Cookie → Fallback
export async function getLangServer(): Promise<Lang> {
  const { headers, cookies } = await import('next/headers');
  const headerStore = await headers();
  const xLang = headerStore.get('x-lang');
  if (xLang && (LANGS as readonly string[]).includes(xLang)) return xLang as Lang;
  const cookieStore = await cookies();
  const val = cookieStore.get('app_lang')?.value;
  return (LANGS as readonly string[]).includes(val ?? '') ? (val as Lang) : DEFAULT_LANG;
}
