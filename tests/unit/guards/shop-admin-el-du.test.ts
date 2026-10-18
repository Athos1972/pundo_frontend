/**
 * Guard (B5930-001): Das griechische Shop-Portal spricht per "du" (εσύ). Keine Sie-Formen (σας, Imperative/Verben der
 * 2. Person Plural). Erweiterung der Allowlist nur bewusst (Meldung nennt Namespace.Key und Wort).
 */
import { describe, it, expect } from 'vitest'
import { shopAdminAuthTranslationsMap } from '@/lib/i18n/shop-admin-auth'
import { shopAdminCatalogTranslationsMap } from '@/lib/i18n/shop-admin-catalog'
import { shopAdminCatalogReviewTranslationsMap } from '@/lib/i18n/shop-admin-catalog-review'
import { shopAdminCategoryPickerTranslationsMap } from '@/lib/i18n/shop-admin-category-picker'
import { shopAdminClaimTranslationsMap } from '@/lib/i18n/shop-admin-claim'
import { shopAdminCommonTranslationsMap } from '@/lib/i18n/shop-admin-common'
import { shopAdminImportTranslationsMap } from '@/lib/i18n/shop-admin-import'
import { shopAdminOffersTranslationsMap } from '@/lib/i18n/shop-admin-offers'
import { shopAdminReviewsTranslationsMap } from '@/lib/i18n/shop-admin-reviews'
import { shopAdminHelpContent } from '@/lib/shop-admin-help-content'

type Map = Record<string, Record<string, unknown>>

const NAMESPACES: Record<string, Map> = {
  auth: shopAdminAuthTranslationsMap as unknown as Map,
  catalog: shopAdminCatalogTranslationsMap as unknown as Map,
  'catalog-review': shopAdminCatalogReviewTranslationsMap as unknown as Map,
  'category-picker': shopAdminCategoryPickerTranslationsMap as unknown as Map,
  claim: shopAdminClaimTranslationsMap as unknown as Map,
  common: shopAdminCommonTranslationsMap as unknown as Map,
  import: shopAdminImportTranslationsMap as unknown as Map,
  offers: shopAdminOffersTranslationsMap as unknown as Map,
  reviews: shopAdminReviewsTranslationsMap as unknown as Map,
}

const ALLOWLIST = new Set(['είμαστε', 'πέντε', 'δεκαπέντε'])
const SIE_POSSESSIVE = /(?<!\p{L})[σΣ]ας(?!\p{L})/u
const SIE_VERB = /(ετε|ατε|είτε|ήστε|άστε|έστε|ίστε|ούστε|ψτε|ξτε|στε|ντε)$/u

function collect(): { id: string; text: string }[] {
  const out: { id: string; text: string }[] = []
  for (const [ns, map] of Object.entries(NAMESPACES)) {
    for (const [key, val] of Object.entries(map.el ?? {})) {
      if (typeof val === 'string') out.push({ id: `${ns}.${key}`, text: val })
    }
  }
  shopAdminHelpContent.el.forEach((cat, i) => {
    out.push({ id: `help.${i}.title`, text: cat.title })
    cat.items.forEach((it, j) => {
      out.push({ id: `help.${i}.${j}.q`, text: it.q })
      out.push({ id: `help.${i}.${j}.a`, text: it.a })
    })
  })
  return out
}

describe('guard: griechisches Shop-Portal nutzt die Du-Form', () => {
  const strings = collect()

  it('findet die Strings (Guard laeuft nicht ins Leere)', () => {
    expect(strings.length).toBeGreaterThan(500)
  })

  it('keine Sie-Formen', () => {
    const offenders: string[] = []
    for (const { id, text } of strings) {
      if (SIE_POSSESSIVE.test(text)) offenders.push(`${id}: σας`)
      const words = text.toLowerCase().match(/\p{L}+/gu) ?? []
      for (const w of words) {
        if ([...w].length >= 5 && SIE_VERB.test(w) && !ALLOWLIST.has(w)) offenders.push(`${id}: ${w}`)
      }
    }
    expect(offenders).toEqual([])
  })
})
