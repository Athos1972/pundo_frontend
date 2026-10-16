import { LANGS, DEFAULT_LANG } from '@/lib/lang'

export const PLATFORM_TIME_ZONE = 'Asia/Nicosia'

/**
 * Formatiert ein ISO-Datum in der Seitensprache. Server- und Client-Render liefern denselben String
 * (feste Locale + feste Zeitzone), damit es keine Hydration-Abweichung gibt.
 * Ungültige Eingabe → Eingabe unverändert zurück.
 */
export function formatDate(
  iso: string,
  lang: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string {
  const locale = (LANGS as readonly string[]).includes(lang) ? lang : DEFAULT_LANG
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return new Intl.DateTimeFormat(locale, { timeZone: PLATFORM_TIME_ZONE, ...options }).format(d)
  } catch {
    return iso
  }
}
