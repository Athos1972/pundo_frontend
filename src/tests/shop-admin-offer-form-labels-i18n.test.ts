import { describe, it, expect } from 'vitest'
import { tAdmin } from '@/lib/shop-admin-translations'

const LANGS = ['en', 'de', 'el', 'ru', 'ar', 'he'] as const
const KEYS = [
  'item_type_label', 'price_type_label', 'price_type_fixed',
  'price_type_on_request', 'price_type_free', 'price_type_variable',
] as const

describe('B5900-010 label keys', () => {
  for (const lang of LANGS) {
    it(`${lang}: all keys present and distinct from old duplicate labels`, () => {
      const tr = tAdmin(lang)
      for (const k of KEYS) expect(tr[k], `${k} missing for ${lang}`).toBeTruthy()
      expect(tr.item_type_label).not.toBe(tr.category)
      expect(tr.price_type_label).not.toBe(tr.price)
      expect(tr.price_type_fixed).not.toBe(tr.price)
    })
  }

  it('wording: no "Item" in DE catalog/offer step texts', () => {
    const tr = tAdmin('de')
    for (const v of [tr.item_picker_title, tr.item_picker_add_new, tr.offer_step_item, tr.fuzzy_match_warning, tr.fuzzy_match_hint]) {
      expect(v).not.toMatch(/\bItems?\b/)
    }
    expect(tr.item_picker_add_new).toBe('Neuen Artikel anlegen')
  })
})
