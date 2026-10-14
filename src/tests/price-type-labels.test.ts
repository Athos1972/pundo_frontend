/**
 * F8950 T20: Die Preistyp-Labels aller 6 Sprachen als Unit-Test (vorher: je 18 + 6 Playwright-Tests in
 * e2e/variable-price.spec.ts VP-3 und e2e/price-type.spec.ts "filter_price_only label correct in <lang>").
 * Die E2E-Specs pruefen das Rendering nur noch in en + ar; hier steht der exakte Text je Sprache.
 * Das Rendering selbst (OfferList, ProductCard, FilterChips) pruefen die Render-Tests in price-type.test.tsx,
 * `lint:i18n` die Key-Paritaet.
 */
import { describe, it, expect } from 'vitest'
import { t } from '@/lib/translations'
import { formatPriceOrLabel } from '@/lib/utils'

const LABELS = {
  en: { on_request: 'Price on request', free: 'Free', variable: 'Variable price', filter: 'With price only' },
  de: { on_request: 'Preis auf Anfrage', free: 'Kostenlos', variable: 'Variabler Preis', filter: 'Nur mit Preis' },
  ru: { on_request: 'Цена по запросу', free: 'Бесплатно', variable: 'Переменная цена', filter: 'Только с ценой' },
  el: { on_request: 'Τιμή κατόπιν αιτήματος', free: 'Δωρεάν', variable: 'Μεταβλητή τιμή', filter: 'Μόνο με τιμή' },
  ar: { on_request: 'السعر عند الطلب', free: 'مجاني', variable: 'سعر متغير', filter: 'بسعر فقط' },
  he: { on_request: 'מחיר לפי בקשה', free: 'חינם', variable: 'מחיר משתנה', filter: 'עם מחיר בלבד' },
} as const

describe('Preistyp-Labels in allen 6 Sprachen', () => {
  for (const [lang, l] of Object.entries(LABELS) as Array<[keyof typeof LABELS, (typeof LABELS)[keyof typeof LABELS]]>) {
    it(`${lang}: Übersetzungstexte`, () => {
      const tr = t(lang)
      expect(tr.price_on_request).toBe(l.on_request)
      expect(tr.price_free).toBe(l.free)
      expect(tr.price_variable).toBe(l.variable)
      expect(tr.filter_price_only).toBe(l.filter)
    })

    it(`${lang}: formatPriceOrLabel liefert den Label-Text je Preistyp`, () => {
      const tr = t(lang)
      expect(formatPriceOrLabel(null, 'EUR', 'on_request', null, tr).display).toBe(l.on_request)
      expect(formatPriceOrLabel(null, 'EUR', 'free', null, tr).display).toBe(l.free)
      expect(formatPriceOrLabel(null, 'EUR', 'variable', null, tr).display).toBe(l.variable)
    })
  }
})
