/**
 * Language setup helper for the smoketester.
 *
 * Sets the app_lang cookie on a Playwright BrowserContext so the frontend
 * renders in the requested language. Also detects RTL languages (ar, he)
 * so the runner can apply RTL-specific asserts.
 */

import type { BrowserContext } from '@playwright/test'

/** Languages that use right-to-left text direction */
const RTL_LANGUAGES = new Set(['ar', 'he'])

/** All supported languages */
export type SupportedLang = 'en' | 'de' | 'el' | 'ru' | 'ar' | 'he'

/**
 * Apply language to a Playwright BrowserContext by setting the app_lang cookie.
 *
 * @param context  - Playwright BrowserContext
 * @param lang     - Language code (en, de, el, ru, ar, he)
 * @param baseUrl  - The base URL of the brand being tested (for cookie domain)
 */
export async function applyLanguage(
  context: BrowserContext,
  lang: string,
  baseUrl: string,
): Promise<void> {
  const url = new URL(baseUrl)
  await context.addCookies([
    {
      name: 'app_lang',
      value: lang,
      domain: url.hostname,
      path: '/',
      // 1 year expiry (matches frontend cookie convention)
      expires: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
      httpOnly: false,
      secure: url.protocol === 'https:',
      sameSite: 'Lax',
    },
  ])
}

/**
 * Returns true if the given language is RTL.
 */
export function isRtl(lang: string): boolean {
  return RTL_LANGUAGES.has(lang)
}

/**
 * Returns the expected `dir` attribute value for the given language.
 */
export function getDir(lang: string): 'rtl' | 'ltr' {
  return isRtl(lang) ? 'rtl' : 'ltr'
}
