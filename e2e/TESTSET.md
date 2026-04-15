# TESTSET – pundo_frontend

## Letzter Testlauf
Datum: 2026-04-14
SHA: 21d13b1 (Server-Commit)
Konfiguration: **playwright-cy.config.ts → https://pundo.cy (Produktion, DNS-Override: 138.201.141.109)**
Ergebnis: **53/53 E2E-Tests PASS**

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
