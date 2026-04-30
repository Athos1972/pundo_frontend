/**
 * Translations loader for the smoketester.
 *
 * Reads ../src/lib/translations.ts (the frontend Single Source of Truth) via tsx
 * runtime import. This is a READ-ONLY dependency — the smoketester never writes
 * back to src/.
 *
 * Usage:
 *   import { t } from './translations-loader.js'
 *   const text = t('hero_title', 'de') // => 'Produkte in Larnaca finden.'
 *   const missing = t('nonexistent', 'de') // => null (+ warning logged)
 */

// We use a dynamic import so tsx can resolve the TypeScript source at runtime.
// The path is relative from this file (smoketests/src/) to the frontend source.

type TranslationValue = string | ((...args: unknown[]) => string)
type LangMap = Record<string, TranslationValue | Record<string, TranslationValue>>

let _translations: Record<string, LangMap> | null = null

async function ensureLoaded(): Promise<Record<string, LangMap>> {
  if (_translations !== null) return _translations

  try {
    // Dynamic import resolved by tsx at runtime
    const mod = await import('../../src/lib/translations.js')
    _translations = mod.translations as Record<string, LangMap>
  } catch (err) {
    // If tsx can't resolve the .js extension, try without extension
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = await (eval('import("../../src/lib/translations.ts")') as Promise<any>)
      _translations = mod.translations as Record<string, LangMap>
    } catch (err2) {
      console.warn('[translations-loader] Failed to load translations:', err2)
      _translations = {}
    }
  }

  return _translations
}

/**
 * Look up a translation key for a given language.
 *
 * @param key  - dot-notation key, e.g. 'hero_title' or 'days.mon'
 * @param lang - language code: 'en' | 'de' | 'el' | 'ru' | 'ar' | 'he'
 * @returns    - the string value, or null if not found (never throws)
 */
export async function t(key: string, lang: string): Promise<string | null> {
  const translations = await ensureLoaded()

  const langMap = translations[lang]
  if (!langMap) {
    console.warn(`[translations-loader] Unknown language: "${lang}"`)
    return null
  }

  // Support dot-notation for nested keys (e.g. 'days.mon')
  const parts = key.split('.')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = langMap
  for (const part of parts) {
    if (current == null || typeof current !== 'object') {
      current = null
      break
    }
    current = current[part]
  }

  if (current === undefined || current === null) {
    console.warn(`[translations-loader] Missing key "${key}" for lang "${lang}"`)
    return null
  }

  if (typeof current === 'function') {
    // For function values (e.g. days_ago: (n) => `${n} days ago`), return the
    // source string — the smoketester only needs to verify the key exists, not
    // the interpolated value.
    try {
      return String(current(1))
    } catch {
      return String(current)
    }
  }

  return String(current)
}

/**
 * Synchronous lookup — only works after translations have been pre-loaded via
 * ensureLoaded(). Call loadTranslations() once at runner startup, then use tSync
 * inside assert callbacks where async is awkward.
 */
export function tSync(key: string, lang: string): string | null {
  if (_translations === null) {
    console.warn('[translations-loader] tSync called before loadTranslations()')
    return null
  }

  const langMap = _translations[lang]
  if (!langMap) {
    console.warn(`[translations-loader] Unknown language: "${lang}"`)
    return null
  }

  const parts = key.split('.')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = langMap
  for (const part of parts) {
    if (current == null || typeof current !== 'object') {
      current = null
      break
    }
    current = current[part]
  }

  if (current === undefined || current === null) {
    console.warn(`[translations-loader] Missing key "${key}" for lang "${lang}"`)
    return null
  }

  if (typeof current === 'function') {
    try {
      return String(current(1))
    } catch {
      return String(current)
    }
  }

  return String(current)
}

/**
 * Pre-load translations at startup. Call once before any tSync() calls.
 */
export async function loadTranslations(): Promise<void> {
  await ensureLoaded()
}
