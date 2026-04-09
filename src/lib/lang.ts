export const LANGS = ['en', 'de', 'ru', 'el', 'ar', 'he'] as const;
export type Lang = typeof LANGS[number];
export const DEFAULT_LANG: Lang = 'en';

export const RTL_LANGS: ReadonlySet<Lang> = new Set(['ar', 'he']);

export function isRTL(lang: Lang): boolean {
  return RTL_LANGS.has(lang);
}

// Client: Cookie lesen
export function getLangFromCookie(): Lang {
  if (typeof document === 'undefined') return DEFAULT_LANG;
  const match = document.cookie.match(/pundo_lang=([^;]+)/);
  const val = match?.[1];
  return (LANGS as readonly string[]).includes(val ?? '') ? (val as Lang) : DEFAULT_LANG;
}

// Client: Cookie schreiben
export function setLangCookie(lang: Lang): void {
  document.cookie = `pundo_lang=${lang};path=/;max-age=31536000;SameSite=Lax`;
}

// Server: aus next/headers Cookie lesen (für Server Components)
export async function getLangServer(): Promise<Lang> {
  const { cookies } = await import('next/headers');
  const store = await cookies();
  const val = store.get('pundo_lang')?.value;
  return (LANGS as readonly string[]).includes(val ?? '') ? (val as Lang) : DEFAULT_LANG;
}
