import type { Lang } from './lang'
import type { BrandConfig } from '@/config/brands'
import { legalContentEn } from './legal-content-en'
import { legalContentDe } from './legal-content-de'
import { legalContentRu } from './legal-content-ru'
import { legalContentEl } from './legal-content-el'
import { legalContentAr } from './legal-content-ar'
import { legalContentHe } from './legal-content-he'
import type { LegalContent, LegalPage } from './legal-types'

export type { LegalPage, LegalSection, LegalContent, LegalContentByLang } from './legal-types'

function applyBrandSubstitutions(
  content: LegalContent,
  brand: Pick<BrandConfig['legal'], 'appName' | 'domain'>,
): LegalContent {
  const sub = (text: string) =>
    text
      .replace(/\bPundo\b/g, brand.appName)
      .replace(/pundo\.cy/g, brand.domain)
      .replace(/info@pundo\.cy/g, `info@${brand.domain}`)

  return {
    title: sub(content.title),
    sections: content.sections.map((s) => ({
      heading: s.heading ? sub(s.heading) : s.heading,
      body: sub(s.body),
    })),
  }
}

export function getLegalContentForBrand(
  page: LegalPage,
  lang: Lang,
  brand: Pick<BrandConfig, 'legal'>,
): LegalContent {
  const raw = legalContent[page][lang]
  if (brand.legal.appName === 'Pundo' && brand.legal.domain === 'pundo.cy') return raw
  return applyBrandSubstitutions(raw, brand.legal)
}

export const legalContent: Record<LegalPage, Record<Lang, LegalContent>> = {
  imprint: {
    en: legalContentEn.imprint,
    de: legalContentDe.imprint,
    ru: legalContentRu.imprint,
    el: legalContentEl.imprint,
    ar: legalContentAr.imprint,
    he: legalContentHe.imprint,
  },
  privacy: {
    en: legalContentEn.privacy,
    de: legalContentDe.privacy,
    ru: legalContentRu.privacy,
    el: legalContentEl.privacy,
    ar: legalContentAr.privacy,
    he: legalContentHe.privacy,
  },
  terms: {
    en: legalContentEn.terms,
    de: legalContentDe.terms,
    ru: legalContentRu.terms,
    el: legalContentEl.terms,
    ar: legalContentAr.terms,
    he: legalContentHe.terms,
  },
  about: {
    en: legalContentEn.about,
    de: legalContentDe.about,
    ru: legalContentRu.about,
    el: legalContentEl.about,
    ar: legalContentAr.about,
    he: legalContentHe.about,
  },
  contact: {
    en: legalContentEn.contact,
    de: legalContentDe.contact,
    ru: legalContentRu.contact,
    el: legalContentEl.contact,
    ar: legalContentAr.contact,
    he: legalContentHe.contact,
  },
}
