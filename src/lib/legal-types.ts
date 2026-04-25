// =============================================================================
// src/lib/legal-types.ts
//
// Typen für Legal-Content. Eigene Datei, damit pro-Sprache-Module den Typ
// importieren können, ohne den Aggregator `./legal-content` zu durchlaufen
// (sonst: Zirkular-Import legal-content.ts ↔ legal-content-<lang>.ts).
// =============================================================================

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
