// ─── Shop-Owner Portal — UI Translations ─────────────────────────────────────
// IMPORTANT: Separate from src/lib/translations.ts (Clean Boundary rule).
// Infrastructure from src/lib/lang.ts (getLangServer, isRTL) may still be used.
//
// This file is a barrel. All strings live in src/lib/i18n/shop-admin-*.ts.

import { shopAdminAuthTranslationsMap } from './i18n/shop-admin-auth'
import { shopAdminCatalogTranslationsMap } from './i18n/shop-admin-catalog'
import { shopAdminOffersTranslationsMap } from './i18n/shop-admin-offers'
import { shopAdminCommonTranslationsMap } from './i18n/shop-admin-common'
import { shopAdminCatalogReviewTranslationsMap } from './i18n/shop-admin-catalog-review'
import { shopAdminCategoryPickerTranslationsMap } from './i18n/shop-admin-category-picker'
import { shopAdminImportTranslationsMap } from './i18n/shop-admin-import'

export { tShopAdminAuth, type ShopAdminAuthTranslations } from './i18n/shop-admin-auth'
export { tShopAdminCatalog, type ShopAdminCatalogTranslations } from './i18n/shop-admin-catalog'
export { tShopAdminOffers, type ShopAdminOffersTranslations } from './i18n/shop-admin-offers'
export { tShopAdminCommon, type ShopAdminCommonTranslations } from './i18n/shop-admin-common'
export { tShopAdminCatalogReview, type ShopAdminCatalogReviewTranslations } from './i18n/shop-admin-catalog-review'
export { tShopAdminCategoryPicker, type ShopAdminCategoryPickerTranslations } from './i18n/shop-admin-category-picker'
export { tShopAdminImport, type ShopAdminImportTranslations } from './i18n/shop-admin-import'

type Lang = 'en' | 'de' | 'el' | 'ru' | 'ar' | 'he'

type MergedLang =
  typeof shopAdminAuthTranslationsMap.en &
  typeof shopAdminCatalogTranslationsMap.en &
  typeof shopAdminOffersTranslationsMap.en &
  typeof shopAdminCommonTranslationsMap.en &
  typeof shopAdminCatalogReviewTranslationsMap.en &
  typeof shopAdminCategoryPickerTranslationsMap.en &
  typeof shopAdminImportTranslationsMap.en

function mergeLang(lang: Lang): MergedLang {
  // Object.assign instead of 7 object spreads: spreading seven 6-way unions exceeds the TypeScript union limit (TS2590).
  return Object.assign(
    {},
    shopAdminAuthTranslationsMap[lang],
    shopAdminCatalogTranslationsMap[lang],
    shopAdminOffersTranslationsMap[lang],
    shopAdminCommonTranslationsMap[lang],
    shopAdminCatalogReviewTranslationsMap[lang],
    shopAdminCategoryPickerTranslationsMap[lang],
    shopAdminImportTranslationsMap[lang],
  ) as MergedLang
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
