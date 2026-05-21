// ─── Shop-Owner Portal — UI Translations ─────────────────────────────────────
// IMPORTANT: Separate from src/lib/translations.ts (Clean Boundary rule).
// Infrastructure from src/lib/lang.ts (getLangServer, isRTL) may still be used.
//
// This file is a barrel. All strings live in src/lib/i18n/shop-admin-*.ts.

import { shopAdminAuthTranslationsMap } from './i18n/shop-admin-auth'
import { shopAdminCatalogTranslationsMap } from './i18n/shop-admin-catalog'
import { shopAdminOffersTranslationsMap } from './i18n/shop-admin-offers'
import { shopAdminCommonTranslationsMap } from './i18n/shop-admin-common'

export { tShopAdminAuth, type ShopAdminAuthTranslations } from './i18n/shop-admin-auth'
export { tShopAdminCatalog, type ShopAdminCatalogTranslations } from './i18n/shop-admin-catalog'
export { tShopAdminOffers, type ShopAdminOffersTranslations } from './i18n/shop-admin-offers'
export { tShopAdminCommon, type ShopAdminCommonTranslations } from './i18n/shop-admin-common'

type Lang = 'en' | 'de' | 'el' | 'ru' | 'ar' | 'he'

type MergedLang =
  typeof shopAdminAuthTranslationsMap.en &
  typeof shopAdminCatalogTranslationsMap.en &
  typeof shopAdminOffersTranslationsMap.en &
  typeof shopAdminCommonTranslationsMap.en

function mergeLang(lang: Lang): MergedLang {
  return {
    ...shopAdminAuthTranslationsMap[lang],
    ...shopAdminCatalogTranslationsMap[lang],
    ...shopAdminOffersTranslationsMap[lang],
    ...shopAdminCommonTranslationsMap[lang],
  } as MergedLang
}

const shopAdminTranslations = {
  en: mergeLang('en'),
  de: mergeLang('de'),
  el: mergeLang('el'),
  ru: mergeLang('ru'),
  ar: mergeLang('ar'),
  he: mergeLang('he'),
}

type LangKey = keyof typeof shopAdminTranslations
export type ShopAdminTranslations = typeof shopAdminTranslations.en

export function tAdmin(lang: string): ShopAdminTranslations {
  const key = lang as LangKey
  return (shopAdminTranslations[key] ?? shopAdminTranslations.en) as unknown as ShopAdminTranslations
}
