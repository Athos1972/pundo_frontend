import type { Lang } from './lang'
import { legalContentEn } from './legal-content-en'
import { legalContentDe } from './legal-content-de'
import { legalContentRu } from './legal-content-ru'
import { legalContentEl } from './legal-content-el'
import { legalContentAr } from './legal-content-ar'
import { legalContentHe } from './legal-content-he'

export type LegalPage = 'imprint' | 'privacy' | 'terms' | 'about' | 'contact'

export type LegalSection = {
  heading?: string
  body: string
}

export type LegalContent = {
  title: string
  sections: LegalSection[]
}

export type LegalContentByLang = Record<LegalPage, LegalContent>

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
