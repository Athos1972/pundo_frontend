#!/usr/bin/env tsx
// scripts/check-i18n-parity.ts
// Checks that all 6 language blocks in every i18n namespace file have the same keys as EN.
// Usage: tsx scripts/check-i18n-parity.ts

import { commonTranslations } from '../src/lib/i18n/common'
import { authTranslations } from '../src/lib/i18n/auth'
import { searchTranslations } from '../src/lib/i18n/search'
import { shopTranslations } from '../src/lib/i18n/shop'
import { reviewsTranslations } from '../src/lib/i18n/reviews'
import { accountTranslations } from '../src/lib/i18n/account'
import { communityTranslations } from '../src/lib/i18n/community'
import { guidesTranslations } from '../src/lib/i18n/guides'
import { contactTranslations } from '../src/lib/i18n/contact'

type AnyTranslationMap = Record<string, Record<string, unknown>>

const namespaces: { name: string; obj: AnyTranslationMap }[] = [
  { name: 'common', obj: commonTranslations as unknown as AnyTranslationMap },
  { name: 'auth', obj: authTranslations as unknown as AnyTranslationMap },
  { name: 'search', obj: searchTranslations as unknown as AnyTranslationMap },
  { name: 'shop', obj: shopTranslations as unknown as AnyTranslationMap },
  { name: 'reviews', obj: reviewsTranslations as unknown as AnyTranslationMap },
  { name: 'account', obj: accountTranslations as unknown as AnyTranslationMap },
  { name: 'community', obj: communityTranslations as unknown as AnyTranslationMap },
  { name: 'guides', obj: guidesTranslations as unknown as AnyTranslationMap },
  { name: 'contact', obj: contactTranslations as unknown as AnyTranslationMap },
]

const LANGS = ['de', 'ru', 'el', 'ar', 'he'] as const

let totalErrors = 0

for (const { name, obj } of namespaces) {
  const enKeys = Object.keys(obj['en'])
  for (const lang of LANGS) {
    const langKeys = Object.keys(obj[lang] ?? {})
    const missing = enKeys.filter(k => !langKeys.includes(k))
    const extra = langKeys.filter(k => !enKeys.includes(k))
    if (missing.length > 0) {
      console.error(`[${name}] ${lang}: missing keys: ${missing.join(', ')}`)
      totalErrors += missing.length
    }
    if (extra.length > 0) {
      console.error(`[${name}] ${lang}: extra keys (not in EN): ${extra.join(', ')}`)
      totalErrors += extra.length
    }
  }
}

if (totalErrors === 0) {
  console.log('i18n parity check passed — all namespaces are in sync across all 6 languages.')
  process.exit(0)
} else {
  console.error(`\ni18n parity check FAILED — ${totalErrors} key discrepancies found.`)
  process.exit(1)
}
