# TESTSET – pundo_frontend

## Letzter Testlauf
Datum: 2026-04-17
SHA: 987a5e506b7d919d32dd58c2bedbb08945c3fe4d (Legal Content Translations)
Konfiguration: **e2e/pw-legal.config.ts → http://localhost:3500 (Test-Instanz)**
Ergebnis: **18/18 E2E-Tests PASS ✓**

---

## Testlauf 2026-04-17 — Legal Content (Alle Sprachen)

### Statische Prüfung

| Prüfung | Status |
|---------|--------|
| TypeScript (src/) | **PASS** — 0 Fehler in src/ |
| TypeScript (e2e/) | KNOWN_ISSUE — pre-existing Fehler in `e2e/shop-discovery.spec.ts` |
| ESLint | **PASS** — 0 Errors, pre-existing Warnings |

### Unit-Tests (Vitest)

| Metrik | Wert |
|--------|------|
| Tests gesamt | **565+ bestanden** |
| Fehlgeschlagene | 0 |

### Coverage-Snapshot

| Modul | Status |
|-------|--------|
| `src/lib/legal-content.ts` | n/a — re-export only |
| `src/lib/legal-content-en.ts` | n/a — static data |
| `src/lib/legal-content-de.ts` | n/a — static data |
| `src/lib/legal-content-ru.ts` | n/a — static data |
| `src/lib/legal-content-el.ts` | n/a — static data |
| `src/lib/legal-content-ar.ts` | n/a — static data |
| `src/lib/legal-content-he.ts` | n/a — static data |

### E2E-Tests (legal-pages.spec.ts)

| Test | Status | Anmerkung |
|------|--------|-----------|
| /legal/imprint lädt (EN) | **PASS** | |
| /legal/privacy lädt (EN) | **PASS** | |
| /legal/terms lädt (EN) | **PASS** | |
| /about lädt (EN) | **PASS** | |
| /contact lädt (EN) | **PASS** | |
| /legal/imprint kein Placeholder (en) | **PASS** | |
| /legal/imprint kein Placeholder (de) | **PASS** | |
| /legal/imprint kein Placeholder (ru) | **PASS** | |
| /legal/imprint kein Placeholder (el) | **PASS** | |
| /legal/imprint kein Placeholder (ar) | **PASS** | |
| /legal/imprint kein Placeholder (he) | **PASS** | |
| Arabisch dir=rtl auf Legal-Seite | **PASS** | |
| Hebräisch dir=rtl auf Legal-Seite | **PASS** | |
| Englisch dir=ltr auf Legal-Seite | **PASS** | |
| Deutsch dir=ltr auf Legal-Seite | **PASS** | |
| Imprint enthält echte Firmendaten | **PASS** | HE 329258, CY10329258B, Kimonos 1, Bernhard Buhl |
| Privacy Policy enthält GDPR-Rechte | **PASS** | |
| Terms enthält Datum | **PASS** | |

### RTL-Validierung

| Sprache | dir-Attribut | Status |
|---------|-------------|--------|
| ar | rtl | **PASS** |
| he | rtl | **PASS** |
| en | ltr | **PASS** |
| de | ltr | **PASS** |

### Neue/Geänderte Dateien

| Datei | Änderung |
|-------|---------|
| `src/lib/legal-content.ts` | Refactored — imports + merge statt inline content |
| `src/lib/legal-content-en.ts` | NEU — Englische Legal-Texte (imprint, privacy, terms, about, contact) |
| `src/lib/legal-content-de.ts` | NEU — Deutsche Übersetzungen |
| `src/lib/legal-content-ru.ts` | NEU — Russische Übersetzungen |
| `src/lib/legal-content-el.ts` | NEU — Griechische Übersetzungen |
| `src/lib/legal-content-ar.ts` | NEU — Arabische Übersetzungen (RTL) |
| `src/lib/legal-content-he.ts` | NEU — Hebräische Übersetzungen (RTL) |
| `e2e/legal-pages.spec.ts` | NEU — 18 E2E-Tests (kein globalSetup, standalone) |
| `e2e/pw-legal.config.ts` | NEU — Playwright-Config ohne globalSetup für Legal-Tests |

### Docs-Sync
| Dokument | Status |
|----------|--------|
| `llms.txt/route.ts` | kein Signal — keine API-Änderungen |
| `README.md` | unverändert |

---

## Testlauf 2026-04-16 — F5000 WhatsApp-Button

### Statische Prüfung

| Prüfung | Status |
|---------|--------|
| TypeScript (src/) | **PASS** — 0 Fehler in src/ |
| TypeScript (e2e/) | KNOWN_ISSUE — 12 Fehler in `e2e/shop-discovery.spec.ts` (pre-existing, seit early alpha) |
| ESLint | **PASS** — 0 Errors, 18 pre-existing Warnings |

### Unit-Tests (Vitest)

| Metrik | Wert |
|--------|------|
| Tests gesamt | **567 bestanden** (+35 vs. vorher 532) |
| Fehlgeschlagene | 0 |
| Neu geschrieben | +5 `buildWhatsAppUrl`-Tests, +4 WhatsApp-CTA-Tests, +18 Translation-Tests |

### Coverage-Snapshot (relevante Module)

| Modul | Coverage | Ziel | Status |
|-------|----------|------|--------|
| `src/lib/utils.ts` | **100%** | 90% | PASS |
| `src/lib/api.ts` | **100%** | 80% | PASS |
| `src/components/product/OfferList.tsx` | **93.75%** | 70% | PASS |
| `src/components/map/ShopMapClient.tsx` | 0% | 70% | COVERAGE_GAP |

### COVERAGE_GAP (nicht blockierend)

| Modul | Aktuell | Ziel | Ursache |
|-------|---------|------|---------|
| `ShopMapClient.tsx` | 0% | 70% | Leaflet braucht Browser-Canvas — kein JSDOM-Support |

### E2E-Tests (whatsapp-button.spec.ts)

| Test | Status | Anmerkung |
|------|--------|-----------|
| Startseite lädt fehlerfrei | **PASS** | |
| OfferList-Seite lädt fehlerfrei | **PASS** | |
| RTL ar: dir=rtl | **PASS** | |
| RTL he: dir=rtl | **PASS** | |
| LTR en: dir=ltr | **PASS** | |
| LTR de: dir=ltr | **PASS** | |
| Shop mit whatsapp: wa.me-Link | **PASS** | wa.me + `?text=` korrekt, kein tel:-Link |
| Shop ohne whatsapp, mit phone: tel:-Link | **PASS** | Regression-Check ✓ |
| OfferList: on_request-Angebot zeigt Website-CTA | **PASS** | (kein wa.me in Offers — Backend-Design) |
| Mobile: lädt fehlerfrei | **PASS** | |
| Mobile: kein horizontaler Scroll | **PASS** | |

### Geänderte Dateien (dieses Feature)

| Datei | Änderung |
|-------|---------|
| `src/types/api.ts` | `whatsapp_number`+`whatsapp_url` in ShopListItem/ShopDetailResponse (kein shop_whatsapp in OfferDetail) |
| `src/types/system-admin.ts` | `whatsapp_number` in SysAdminShop |
| `src/lib/utils.ts` | `buildWhatsAppUrl()` neu |
| `src/lib/translations.ts` | 3 neue Keys in 6 Sprachen |
| `src/components/ui/WhatsAppIcon.tsx` | Neu — SVG #25D366 |
| `src/app/(customer)/products/[slug]/page.tsx` | `productName` Prop zu OfferList |
| `src/app/(customer)/shops/[slug]/page.tsx` | WhatsApp-Button via `buildWhatsAppUrl(shop.whatsapp_number, ...)` + `?text=` |
| `src/components/system-admin/ShopForm.tsx` | `whatsapp_number` Eingabefeld |
| `e2e/whatsapp-button.spec.ts` | Neu — 11 E2E-Tests |

### Known Issues

| ID | Beschreibung | Seit |
|----|-------------|------|
| KI-01 | `e2e/shop-discovery.spec.ts`: 12 TypeScript-Fehler (`shop` possibly null, `lat`/`lng` fehlen auf `{}`) | Early Alpha |

### Docs-Sync
| Dokument | Status |
|----------|--------|
| `llms.txt/route.ts` | — (Phase 4.5 nicht ausgeführt, keine API-Änderungen die llms.txt betreffen) |
| `README.md` | unverändert |

---

---

## Testlauf 2026-04-14 — pundo.cy (Produktion, lesend)

### Infrastruktur-Befund
- DNS-A-Record `pundo.cy` zeigt auf alten Server `185.26.106.234` (Apache, kein HTTPS) → HTTPS Connection Refused
- Nginx-Server `138.201.141.109` hostet die laufende Next.js-App und TLS-Zertifikat (SAN: `pundo.cy`, `www.pundo.cy`)
- Workaround: Chromium `--host-resolver-rules=MAP pundo.cy 138.201.141.109` in `playwright-cy.config.ts`
- **Empfohlene Sofort-Maßnahme:** DNS A-Record `pundo.cy` → `138.201.141.109` setzen

### E2E-Ergebnisse gegen pundo.cy

| Test | Tests | Status |
|------|-------|--------|
| E2E-01 Startseite | 2 | **PASS** |
| E2E-02 Suche | 3 | **PASS** |
| E2E-03 RTL-Layout | 6 | **PASS** — ar/he=rtl, en/de/el/ru=ltr |
| E2E-04 Produkt-Detail | 1 | **PASS** |
| E2E-04b Related Products Carousel | 6 | **PASS** |
| E2E-05 Shop-Seite | 1 | **PASS** |
| E2E-06 Responsive Mobile | 2 | **PASS** |
| E2E-07 Auth Redirect | 3 | **PASS** |
| E2E-07b Fehler-Handling | 1 | **PASS** |
| E2E-08 Karten-Routing | 3 | **PASS** — Marker, 3 Routing-Links, RTL-Popup |
| E2E-09 Customer Auth | 7 | **PASS** |
| E2E-10 Review Section | 3 | **PASS** |
| E2E-11 Help & For-Shops | 14 | **PASS** |
| E2E-11b ReviewSection Hint | 2 | **PASS** |
| **Gesamt** | **53** | **53/53 PASS** |

### Neue Dateien
- `playwright-cy.config.ts` — Playwright-Config für lesende Produktions-Tests gegen `https://pundo.cy`
- `e2e/main.spec.ts` — Cookie-Domain via `E2E_COOKIE_DOMAIN` Env-Variable (Fallback: `127.0.0.1`)

---

## Letzter lokaler Testlauf (Referenz)
Datum: 2026-04-13
SHA: 14d3468d01d9c3efc23bd9879ba7ce558d173f63
Konfiguration: Browser-Verifikation Port 3500 (Test-Dev-Server)
Ergebnis: **532/532 Unit-Tests PASS, Browser-Checks PASS**

**Infrastruktur-Änderung (2026-04-13):**
- Port 3000: `npm run start:prod` → `node .next/standalone/server.js` (kein Dev-Server, kein Konflikt)
- Port 3500: `npm run dev:test` → `next dev` mit Hot Reload (Test-Umgebung)
- Beide können gleichzeitig laufen — kein Next.js-Instanz-Konflikt mehr

**Vorheriger Lauf (2026-04-13, playwright-dev.config → 127.0.0.1:3000):**
- 49 bestanden, 4 bekannte Fehlschläge (alle pre-existing)

---

## Statische Prüfung

| Prüfung | Status |
|---------|--------|
| TypeScript | **PASS** (pre-existing `e2e/shop-discovery.spec.ts` Fehler nur in e2e/, nicht in src/) |
| ESLint | **PASS** / 18 Warnings (pre-existing `useInfiniteScroll.ts` error, nicht durch diese Änderungen) |

---

## Unit-Tests (Vitest)

| Metrik | Wert |
|--------|------|
| Test-Dateien | 22 (war 21) |
| Tests gesamt | **532 bestanden** (war 463) |
| Neu hinzugefügt | **+69 Tests** in `help-and-for-shops.test.ts` |
| Fehlgeschlagene | 0 |

### Neue Test-Dateien
- `src/tests/help-and-for-shops.test.ts` — 69 Tests für:
  - Neue Translations-Keys (footer_help, footer_for_shops, page_title_help, page_title_for_shops, reviews_how_it_works_toggle, reviews_how_it_works_body)
  - Shop-Admin Translations (nav_help, help_title) via `tAdmin()`
  - `helpContent` — alle 6 Sprachen, Kategorien, Items
  - `forShopsContent` — alle 6 Sprachen, Hero, Features, Steps
  - `shopAdminHelpContent` — alle 6 Sprachen, Kategorien, FAQ-Items

### Aktualisierte Test-Dateien
- `src/tests/footer-and-legal.test.tsx` — footer_help, footer_for_shops, page_title_help, page_title_for_shops zu requiredKeys hinzugefügt (44 Tests)

---

## Coverage-Status

| Modul | Status |
|-------|--------|
| `src/lib/help-content.ts` | ✅ Vollabdeckung Logik & alle 6 Sprachen |
| `src/lib/for-shops-content.ts` | ✅ Vollabdeckung Logik & alle 6 Sprachen |
| `src/lib/shop-admin-help-content.ts` | ✅ Vollabdeckung Logik & alle 6 Sprachen |
| `src/lib/translations.ts` | ✅ Erweiterte Abdeckung (+8 Keys pro Sprache) |
| `src/lib/shop-admin-translations.ts` | ✅ Erweiterte Abdeckung (+2 Keys pro Sprache) |
| `src/components/ui/FaqAccordion.tsx` | COVERAGE_GAP — Async Server Component (kein JSDOM-Render) |
| `src/components/reviews/ReviewSection.tsx` | COVERAGE_GAP — Async Server Component |

### COVERAGE_GAP (nicht blockierend)

| Modul | Ursache |
|-------|---------|
| `FaqAccordion.tsx` | Async Server Component — nicht renderable in JSDOM |
| `ReviewSection.tsx` | Async Server Component — ebenfalls nicht renderbar in JSDOM |
| `ShopMapClient.tsx` | Leaflet braucht Canvas/DOM |

---

## E2E-Tests (Playwright, playwright-dev.config.ts → 127.0.0.1:3000)

| Test | Tests | Status | Notizen |
|------|-------|--------|---------|
| E2E-01 Startseite | 2 | **PASS** | 200, Suchleiste, kein JS-Fehler |
| E2E-02 Suche | 3 | **2 PASS / 1 FAIL** | URL-Navigation schlägt fehl (KI-009) |
| E2E-03 RTL-Layout | 6 | **PASS** | dir=rtl für ar/he; dir=ltr für en/de/el/ru — FIX: baseURL auf 127.0.0.1 |
| E2E-04 Produkt-Detail | 1 | **PASS** | Unbekannte Slug → kein Crash |
| E2E-04b Related Products | 6 | **PASS** | Carousel, RTL, Fallback |
| E2E-05 Shop-Seite | 1 | **PASS** | Kein Crash bei unbekannter Slug |
| E2E-06 Responsive Mobile | 2 | **PASS** | Kein Overflow, touch-freundlich |
| E2E-07 Auth Redirect | 3 | **PASS** | Redirect zu Login, Seiten rendern |
| E2E-07b Fehler-Handling | 1 | **PASS** | 404 für unbekannte Routes |
| E2E-08 Karten-Routing | 3 | **3 FAIL** | Prod-Shops ohne Koordinaten (KI-010) |
| E2E-09 Customer Auth | 7 | **PASS** | Login/Signup/VerifyEmail, RTL |
| E2E-10 Review Section | 3 | **PASS** | Seite kein Crash, Review-Section sichtbar, RTL |
| **E2E-11 Help & For-Shops** | **14** | **PASS** | /help, /for-shops, Footer-Links, RTL, Accordion, CTA |
| **E2E-11b ReviewSection Hint** | **2** | **PASS** | "How do reviews work?" Hint sichtbar und öffnet sich |
| **E2E-12 Account Auth-UI** | **Browser** | **PASS** | Login-Button im Header, Redirect-Schutz /account→/login, RTL ar/he, Mobile 375px |

### RTL-Validierung

| Sprache | Route | dir-Attribut | Status |
|---------|-------|-------------|--------|
| ar | / | rtl | **PASS** |
| he | / | rtl | **PASS** |
| ar | /help | rtl | **PASS** |
| he | /for-shops | rtl | **PASS** |
| ar | /auth/login | rtl | **PASS** |
| ar | /products/... | rtl | **PASS** |
| en/de/el/ru | / | ltr | **PASS** |

---

## Implementierte Änderungen (Account Management Session, 2026-04-13)

| Datei | Änderung |
|-------|----------|
| `src/types/customer.ts` | +avatar_url, +has_password, +LinkedProvider, +LinkedAccountsResponse |
| `src/lib/translations.ts` | +32 Account-Keys × 6 Sprachen |
| `src/components/auth/SessionProvider.tsx` | +useSetSession() Hook |
| `src/components/layout/Header.tsx` | UserMenu eingebaut |
| `src/components/layout/UserMenu.tsx` | NEU — Login-Button (unauth) / Avatar-Dropdown (auth) |
| `src/components/account/AccountTabs.tsx` | NEU — 4-Tab-Container |
| `src/components/account/ProfileTab.tsx` | NEU — Avatar + Display-Name + Google-Verknüpfung |
| `src/components/account/SecurityTab.tsx` | NEU — E-Mail-Änderung + Passwort-Änderung |
| `src/components/account/ReviewsTab.tsx` | NEU — Eigene Reviews mit Löschen-Funktion |
| `src/components/account/DangerTab.tsx` | NEU — Konto-Löschen-Einstieg |
| `src/components/account/AvatarUploader.tsx` | NEU — Avatar-Upload mit Optimistic-Preview |
| `src/components/account/DeleteAccountModal.tsx` | NEU — OTP-Bestätigungs-Modal |
| `src/app/(customer)/account/page.tsx` | Tab-Struktur, linked-accounts + reviews fetch |
| `package.json` | +start:prod Script (standalone node server) |
| `.claude/launch.json` | pundo_frontend → start:prod statt dev |
| `src/tests/account.test.tsx` | NEU — 29 Unit-Tests |

---

## Implementierte Änderungen (Help & For-Shops Session)

| Datei | Änderung |
|-------|----------|
| `src/lib/help-content.ts` | NEU — Customer FAQ, 3 Kategorien, 6 Sprachen |
| `src/lib/for-shops-content.ts` | NEU — For-Shops Landing Page, 6 Features, 3 Steps, 6 Sprachen |
| `src/lib/shop-admin-help-content.ts` | NEU — Shop-Admin FAQ, 4 Kategorien, 6 Sprachen |
| `src/components/ui/FaqAccordion.tsx` | NEU — Zero-JS Server Component via `<details>/<summary>` |
| `src/app/(customer)/help/page.tsx` | NEU — /help Route |
| `src/app/(customer)/for-shops/page.tsx` | NEU — /for-shops Landing Page |
| `src/app/(shop-admin)/shop-admin/(portal)/help/page.tsx` | NEU — Shop-Admin Help Portal |
| `src/lib/translations.ts` | +8 Keys × 6 Sprachen |
| `src/lib/shop-admin-translations.ts` | +2 Keys × 6 Sprachen |
| `src/components/layout/Footer.tsx` | +2 Links: /help, /for-shops |
| `src/components/shop-admin/AdminNav.tsx` | +Help nav item mit ? Icon |
| `src/components/reviews/ReviewSection.tsx` | Inline "How do reviews work?" `<details>` Hint |
| `playwright-dev.config.ts` | **FIX**: baseURL localhost→127.0.0.1 (RTL-Cookie-Domain-Fix) |
| `src/tests/help-and-for-shops.test.ts` | NEU — 69 Unit-Tests |
| `src/tests/footer-and-legal.test.tsx` | +4 requiredKeys |
| `e2e/main.spec.ts` | +E2E-11 (14 Tests) + E2E-11b (2 Tests) |

---

## Code-Fixes während des Tests

| Datei | Änderung | Grund |
|-------|----------|-------|
| `playwright-dev.config.ts` | `localhost` → `127.0.0.1` in baseURL | Cookie mit `domain: '127.0.0.1'` wird von `localhost`-Origin nicht akzeptiert — alle RTL-Tests schlugen fehl |
| `src/tests/help-and-for-shops.test.ts` | `shopAdminTranslations` import → `tAdmin()` | `shopAdminTranslations` ist private (nicht exportiert) |

---

## Known Issues

| ID | Beschreibung | Seit | Status |
|----|-------------|------|--------|
| KI-007 | E2E-08: Leaflet-Marker fehlen — pundo_test ohne Geo-Koordinaten | 2026-04-11 | ✅ War behoben, Prod-Daten kopiert |
| KI-008 | Backend Port 8000 JWT-Bug — Admin E2E SKIP auf Dev-Server | 2026-04-11 | OPEN |
| KI-009 | E2E-02: Search URL wird zu `/?` statt `/search?q=...` bei playwright-dev.config (127.0.0.1:3000). Enter-Key triggert native Form-Submit statt router.push. Auf Test-Stack (3500) war PASS. | 2026-04-13 | OPEN (Dev-Config only) |
| KI-010 | E2E-08: Prod-Shops (Backend 8000) haben keine lat/lng-Koordinaten → Leaflet-Marker fehlen bei playwright-dev.config | 2026-04-13 | OPEN (Prod-Daten) |
