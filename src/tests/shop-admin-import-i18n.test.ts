/**
 * F5920 — import namespace guards: every server code has a text in all 6 languages, placeholders are identical,
 * no key of the new namespace silently overrides a key of another shop-admin namespace.
 */
import { describe, it, expect } from 'vitest'
import { tAdmin } from '@/lib/shop-admin-translations'
import { shopAdminAuthTranslationsMap } from '@/lib/i18n/shop-admin-auth'
import { shopAdminCatalogTranslationsMap } from '@/lib/i18n/shop-admin-catalog'
import { shopAdminOffersTranslationsMap } from '@/lib/i18n/shop-admin-offers'
import { shopAdminCommonTranslationsMap } from '@/lib/i18n/shop-admin-common'
import { shopAdminCatalogReviewTranslationsMap } from '@/lib/i18n/shop-admin-catalog-review'
import { shopAdminCategoryPickerTranslationsMap } from '@/lib/i18n/shop-admin-category-picker'
import { shopAdminImportTranslationsMap } from '@/lib/i18n/shop-admin-import'
import { rowErrorText } from '@/components/shop-admin/ImportRowErrorList'
import { importErrorText } from '@/components/shop-admin/ImportPreview'
import type {
  ImportChangeField,
  ImportFileErrorCode,
  ImportPreviewErrorCode,
  ImportRowErrorCode,
  ImportRowHintCode,
  ImportSyncErrorCode,
} from '@/types/shop-admin'

const LANGS = ['en', 'de', 'el', 'ru', 'ar', 'he'] as const

// `Record<Union, true>` makes the compiler fail when the backend contract (types) gains a code this test does not know.
const ROW_ERRORS: Record<ImportRowErrorCode, true> = {
  missing_name: true, row_failed: true, invalid_ean: true, invalid_price: true, invalid_currency: true,
  invalid_available: true, invalid_language: true, invalid_image_url: true, invalid_sku: true, duplicate_in_file: true,
}
const HINTS: Record<ImportRowHintCode, true> = {
  linked_catalog_item: true, ambiguous_name_match: true, name_not_updated_shared: true, photo_skipped_shared: true,
  category_unresolved: true, category_hint_unknown: true, no_price: true, offer_replaced_complex: true, ean_mismatch: true,
}
const CHANGES: Record<ImportChangeField, true> = {
  available: true, price: true, name: true, sku: true, category: true, reactivated: true,
}
const SYNC_ERRORS: Record<ImportSyncErrorCode, true> = {
  sheet_url_invalid: true, sheet_fetch_failed: true, sheet_not_public: true, rows_failed: true, sync_failed: true,
  empty_sheet: true, missing_name_column: true, too_many_rows: true,
}
const FILE_ERRORS: Record<ImportFileErrorCode, true> = {
  unsupported_format: true, xlsx_unreadable: true, xls_unreadable: true, csv_unreadable: true, missing_name_column: true,
  empty_file: true, too_many_rows: true, invalid_default_lang: true, file_too_large: true, preview_in_progress: true,
}
const PREVIEW_ERRORS: Record<ImportPreviewErrorCode, true> = {
  job_lost: true, preview_stale: true, apply_failed: true, preview_failed: true,
}

describe('every row error code has a translated text (AK 23)', () => {
  for (const lang of LANGS) {
    it(`row errors in ${lang}`, () => {
      const tr = tAdmin(lang)
      for (const code of Object.keys(ROW_ERRORS) as ImportRowErrorCode[]) {
        expect(rowErrorText({ row: 3, code, message: 'RAW-MESSAGE' }, tr), code).not.toBe('RAW-MESSAGE')
      }
    })
    it(`unknown row error code falls back to the raw message in ${lang}`, () => {
      expect(rowErrorText({ row: 3, code: 'future_code' as never, message: 'RAW-MESSAGE' }, tAdmin(lang))).toBe('RAW-MESSAGE')
    })
  }
})

describe('hints, changes, sync errors, file errors, flow errors', () => {
  for (const lang of LANGS) {
    it(`all codes are translated in ${lang}`, () => {
      const tr = tAdmin(lang) as unknown as Record<string, string | undefined>
      for (const code of Object.keys(HINTS)) expect(tr[`hint_${code}`], `hint_${code}`).toBeTruthy()
      for (const code of ['available', 'reactivated', 'price', 'name', 'sku', 'category']) expect(tr[`change_${code}`], code).toBeTruthy()
      for (const code of Object.keys(CHANGES)) expect(['available', 'reactivated', 'price', 'name', 'sku', 'category']).toContain(code)
      for (const code of ['empty_sheet', 'missing_name_column', 'too_many_rows']) expect(tr[`sheets_error_${code}`], code).toBeTruthy()
      for (const code of Object.keys(SYNC_ERRORS)) expect(code).toBeTruthy()

      const t = tAdmin(lang)
      const generic = t.error_generic
      for (const code of Object.keys(FILE_ERRORS) as ImportFileErrorCode[]) {
        if (code === 'invalid_default_lang') continue // never sent wrong by the UI; generic text is fine
        expect(importErrorText({ code, limit: 100 }, t), code).not.toBe(generic)
      }
      for (const code of Object.keys(PREVIEW_ERRORS)) expect(importErrorText({ code }, t), code).not.toBe(generic)
      for (const code of ['preview_expired', 'preview_already_applied', 'invalid_decision', 'decision_conflict']) {
        expect(importErrorText({ code }, t), code).not.toBe(generic)
      }
      expect(importErrorText({ code: 'something_new' }, t)).toBe(generic)
    })
  }

  it('too_many_rows names the allowed number', () => {
    expect(importErrorText({ code: 'too_many_rows', limit: 65536 }, tAdmin('en'))).toContain('65536')
  })
})

describe('namespace hygiene', () => {
  const placeholders = (s: string) => (s.match(/\{[a-z]+\}/g) ?? []).sort().join(',')

  it('placeholders ({n}, {name}, ...) are identical in all languages for every key', () => {
    const map = shopAdminImportTranslationsMap as unknown as Record<string, Record<string, string>>
    for (const key of Object.keys(map.en)) {
      for (const lang of LANGS) {
        expect(placeholders(map[lang][key]), `${lang}.${key}`).toBe(placeholders(map.en[key]))
      }
    }
  })

  it('no empty text in any language', () => {
    const map = shopAdminImportTranslationsMap as unknown as Record<string, Record<string, string>>
    for (const lang of LANGS) for (const [k, v] of Object.entries(map[lang])) expect(v.trim().length, `${lang}.${k}`).toBeGreaterThan(0)
  })

  it('no key of the import namespace exists in another shop-admin namespace (merge would override it)', () => {
    const others = [
      shopAdminAuthTranslationsMap, shopAdminCatalogTranslationsMap, shopAdminOffersTranslationsMap,
      shopAdminCommonTranslationsMap, shopAdminCatalogReviewTranslationsMap, shopAdminCategoryPickerTranslationsMap,
    ] as unknown as Record<string, Record<string, string>>[]
    const mine = Object.keys((shopAdminImportTranslationsMap as unknown as Record<string, Record<string, string>>).en)
    for (const other of others) for (const key of mine) expect(Object.keys(other.en), key).not.toContain(key)
  })

  it('the finished sync says "set to ..." in the past tense, the preview keeps the future tense', () => {
    for (const lang of LANGS) {
      const t = tAdmin(lang)
      expect(t.count_deactivated, lang).not.toBe(t.count_deactivate)
    }
    expect(tAdmin('en').count_deactivated).toBe('Set to “not available”')
    expect(tAdmin('de').count_deactivated).toBe('Auf „nicht verfügbar“ gesetzt')
  })

  it('the 20 MB limit is named in every language (BB E17; was 5 MB)', () => {
    for (const lang of LANGS) {
      const text = tAdmin(lang).upload_error_too_large
      expect(text).toMatch(/20/)
      expect(text).not.toMatch(/\b5\b/)
    }
  })
})
