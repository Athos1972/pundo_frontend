// src/lib/translations.ts — barrel file
// All translation strings live in src/lib/i18n/*.ts namespace files.
// This file assembles them into the legacy flat shape and re-exports helpers.

import { commonTranslations } from './i18n/common'
import { authTranslations } from './i18n/auth'
import { searchTranslations } from './i18n/search'
import { shopTranslations } from './i18n/shop'
import { reviewsTranslations } from './i18n/reviews'
import { accountTranslations } from './i18n/account'
import { communityTranslations } from './i18n/community'
import { guidesTranslations } from './i18n/guides'
import { contactTranslations } from './i18n/contact'
import { consentTranslations } from './i18n/consent'

// Re-export namespace helpers for direct use
export { tCommon, type CommonTranslations } from './i18n/common'
export { tAuth, type AuthTranslations } from './i18n/auth'
export { tSearch, type SearchTranslations } from './i18n/search'
export { tShop, type ShopTranslations } from './i18n/shop'
export { tReviews, type ReviewsTranslations } from './i18n/reviews'
export { tAccount, type AccountTranslations } from './i18n/account'
export { tCommunity, type CommunityTranslations } from './i18n/community'
export { tGuides, type GuidesTranslations } from './i18n/guides'
export { tContact, type ContactTranslations } from './i18n/contact'
export { tConsent, type ConsentTranslations } from './i18n/consent'

export const translations = {
  en: {
    ...commonTranslations.en,
    ...authTranslations.en,
    ...searchTranslations.en,
    ...shopTranslations.en,
    ...reviewsTranslations.en,
    ...accountTranslations.en,
    ...communityTranslations.en,
    ...guidesTranslations.en,
    ...contactTranslations.en,
    ...consentTranslations.en,
  },
  de: {
    ...commonTranslations.de,
    ...authTranslations.de,
    ...searchTranslations.de,
    ...shopTranslations.de,
    ...reviewsTranslations.de,
    ...accountTranslations.de,
    ...communityTranslations.de,
    ...guidesTranslations.de,
    ...contactTranslations.de,
    ...consentTranslations.de,
  },
  ru: {
    ...commonTranslations.ru,
    ...authTranslations.ru,
    ...searchTranslations.ru,
    ...shopTranslations.ru,
    ...reviewsTranslations.ru,
    ...accountTranslations.ru,
    ...communityTranslations.ru,
    ...guidesTranslations.ru,
    ...contactTranslations.ru,
    ...consentTranslations.ru,
  },
  el: {
    ...commonTranslations.el,
    ...authTranslations.el,
    ...searchTranslations.el,
    ...shopTranslations.el,
    ...reviewsTranslations.el,
    ...accountTranslations.el,
    ...communityTranslations.el,
    ...guidesTranslations.el,
    ...contactTranslations.el,
    ...consentTranslations.el,
  },
  ar: {
    ...commonTranslations.ar,
    ...authTranslations.ar,
    ...searchTranslations.ar,
    ...shopTranslations.ar,
    ...reviewsTranslations.ar,
    ...accountTranslations.ar,
    ...communityTranslations.ar,
    ...guidesTranslations.ar,
    ...contactTranslations.ar,
    ...consentTranslations.ar,
  },
  he: {
    ...commonTranslations.he,
    ...authTranslations.he,
    ...searchTranslations.he,
    ...shopTranslations.he,
    ...reviewsTranslations.he,
    ...accountTranslations.he,
    ...communityTranslations.he,
    ...guidesTranslations.he,
    ...contactTranslations.he,
    ...consentTranslations.he,
  },
} as const

export type TranslationKey = keyof typeof translations.en
export type Translations = typeof translations.en

export function t(lang: string): Translations {
  const result = translations[lang as keyof typeof translations] ?? translations.en
  return result as unknown as Translations
}
