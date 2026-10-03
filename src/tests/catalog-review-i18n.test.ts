import { describe, it, expect } from 'vitest'
import { tAdmin } from '@/lib/shop-admin-translations'
import { shopAdminCatalogReviewTranslationsMap } from '@/lib/i18n/shop-admin-catalog-review'

const LANGS = ['en', 'de', 'el', 'ru', 'ar', 'he'] as const

const REQUIRED_KEYS = [
  'nav_catalog_review', 'catalog_review_title', 'catalog_review_empty',
  'catalog_review_col_date', 'catalog_review_col_items', 'catalog_review_col_completeness',
  'catalog_review_col_status', 'catalog_review_col_sla', 'catalog_review_rework_badge',
  'catalog_review_status_enrichment_in_progress', 'catalog_review_status_rework_in_progress',
  'catalog_review_status_awaiting_owner_review', 'catalog_review_status_published',
  'catalog_review_status_rejected', 'catalog_review_status_failed',
  'catalog_review_progress_text', 'catalog_review_sla_remaining', 'catalog_review_sla_breached',
  'catalog_review_refresh', 'catalog_review_open_review', 'catalog_review_view',
  'catalog_review_before', 'catalog_review_after', 'catalog_review_raw_category',
  'catalog_review_pundo_category', 'catalog_review_attributes', 'catalog_review_embedding_status',
  'catalog_review_lang_coverage', 'catalog_review_sample_count',
  'catalog_review_item_error', 'catalog_review_missing_field',
  'catalog_review_approve', 'catalog_review_reject', 'catalog_review_reject_feedback_label',
  'catalog_review_reject_explains_rework', 'catalog_review_approve_confirm',
  'catalog_review_reject_confirm', 'catalog_review_action_failed',
  'catalog_review_conflict_reload', 'catalog_review_not_found',
  'catalog_review_in_progress_notice', 'catalog_review_back',
] as const

describe('catalog_review i18n — key parity across all 6 languages', () => {
  it.each(LANGS)('Sprache %s hat alle Pflicht-Keys aus 02-architecture.md §7', (lang) => {
    const tr = tAdmin(lang)
    for (const key of REQUIRED_KEYS) {
      expect(tr[key as keyof typeof tr], `missing key "${key}" for lang "${lang}"`).toBeTruthy()
    }
  })

  it.each(LANGS)('Sprache %s hat identische Keys wie EN (kein Drift)', (lang) => {
    const enKeys = Object.keys(shopAdminCatalogReviewTranslationsMap.en).sort()
    const langKeys = Object.keys(shopAdminCatalogReviewTranslationsMap[lang]).sort()
    expect(langKeys).toEqual(enKeys)
  })
})

describe('catalog_review i18n — RTL languages are real translations, not transliteration', () => {
  it('ar-Werte enthalten arabische Schriftzeichen', () => {
    const ar = shopAdminCatalogReviewTranslationsMap.ar
    expect(ar.catalog_review_title).toMatch(/[؀-ۿ]/)
    expect(ar.catalog_review_reject_explains_rework).toMatch(/[؀-ۿ]/)
  })

  it('he-Werte enthalten hebräische Schriftzeichen', () => {
    const he = shopAdminCatalogReviewTranslationsMap.he
    expect(he.catalog_review_title).toMatch(/[֐-׿]/)
    expect(he.catalog_review_reject_explains_rework).toMatch(/[֐-׿]/)
  })
})

describe('catalog_review i18n — placeholder tokens preserved across languages', () => {
  it.each(LANGS)('%s: catalog_review_progress_text enthält {done} und {total}', (lang) => {
    const text = shopAdminCatalogReviewTranslationsMap[lang].catalog_review_progress_text
    expect(text).toContain('{done}')
    expect(text).toContain('{total}')
  })

  it.each(LANGS)('%s: catalog_review_sample_count enthält {returned} und {requested}', (lang) => {
    const text = shopAdminCatalogReviewTranslationsMap[lang].catalog_review_sample_count
    expect(text).toContain('{returned}')
    expect(text).toContain('{requested}')
  })

  it.each(LANGS)('%s: catalog_review_lang_coverage enthält {n}', (lang) => {
    const text = shopAdminCatalogReviewTranslationsMap[lang].catalog_review_lang_coverage
    expect(text).toContain('{n}')
  })
})
