# TESTSET – pundo_frontend

## Letzter Testlauf
Datum: 2026-04-09
Ergebnis: 91 Unit-Tests + 19 E2E-Tests bestanden, 0 übersprungen

---

### Statische Prüfung
| Prüfung | Status |
|---------|--------|
| TypeScript | PASS (0 Fehler) |
| ESLint | PASS (0 Errors, 5 pre-existing Warnings) |

**Verbleibende ESLint Warnings (pre-existing, kein Blocker):**
- `CategoryChips.tsx`, `ShopCard.tsx`: `_lang` unused (intentional, `_`-prefix)
- `BackButton.tsx`: `fallback` unused (intentional placeholder)
- `SplashScreen.tsx`: `<img>` statt `<Image />` (bewusste Ausnahme für Splash-Animation)

---

### Bugs entdeckt & behoben

| Bug | Ursache | Fix |
|-----|---------|-----|
| Redirect loop `/shop-admin/login` | Auth-guard Layout feuerte für alle Shop-Admin-Seiten inkl. Login | Route Group Refactoring: Login/Register → `shop-admin/` root, Portal → `(portal)/` subgroup mit eigenem Auth-Layout |
| RTL E2E-Test mit `?lang=ar` | Sprache wird aus Cookie gelesen, nicht URL-Param | E2E-Tests setzen `pundo_lang` Cookie via `page.context().addCookies()` |
| ESLint: Unused `useState` in `ProfileForm.tsx` | Import nicht entfernt | Import auf `useTransition` reduziert |
| ESLint: Expression-not-assignment in `SearchContent.tsx` | Ternary-Operator als Statement | In `if/else` umgeschrieben |
| Vitest pickup von Playwright `e2e/*.spec.ts` | `include` fehlte in `vitest.config.ts` | Explizites `include: ['src/tests/**/*.test.{ts,tsx}']` |

---

### Coverage-Status
| Modul | Statements | Ziel | Status |
|-------|-----------|------|--------|
| `src/lib/api.ts` | **100%** | 80% | PASS |
| `src/lib/shop-admin-translations.ts` | 71% | 80% | GAP |
| `src/components/product/ProductCard.tsx` | **94%** | 70% | PASS |
| `src/components/product/OfferList.tsx` | 86% | 70% | PASS |
| `src/components/shop/ShopCard.tsx` | **100%** | 70% | PASS |
| `src/components/shop-admin/FormField.tsx` | **100%** | 70% | PASS |
| `src/components/shop-admin/HoursEditor.tsx` | **83%** | 70% | PASS |
| `src/components/shop-admin/OfferList.tsx` | **90%** | 70% | PASS |
| `src/components/shop-admin/ProductList.tsx` | **87%** | 70% | PASS |
| `src/components/shop-admin/ApiKeyList.tsx` | 77% | 70% | PASS |
| `src/components/shop-admin/Toast.tsx` | 85% | 70% | PASS |
| `src/components/shop-admin/AdminNav.tsx` | 75% | 70% | PASS |

**Overall: Statements 88%, Branches 90%, Lines 89%**

### COVERAGE_GAP (nicht blockierend)
| Modul | Aktuell | Ziel | Ursache |
|-------|---------|------|---------|
| `shop-admin-translations.ts` | 71% | 80% | DE `upload_success`/`upload_errors` Funcs bereits getestet; EL/RU/AR/HE Übersetzungen noch nicht implementiert → kein Code zu testen |
| `AdminNav.tsx` | 75% (Funcs 50%) | 70% | Mobile Drawer (lines 96-115) braucht Browser-Viewport — nur in Playwright testbar |

---

### E2E-Tests
| Test | Status | Details |
|------|--------|---------|
| E2E-01 Startseite | **PASS** | HTTP 200, Suchfeld sichtbar, 0 JS-Fehler |
| E2E-02 Suche | **PASS** | URL-Navigation, leere Suche stabil, Search-Results lädt |
| E2E-03 RTL ar/he | **PASS** | `dir=rtl` für ar und he via Cookie; `dir=ltr` für en/de/el/ru |
| E2E-04 Produkt-Detail | **PASS** | Unbekannte Slug → 200 oder 404, kein Crash |
| E2E-05 Shop-Seite | **PASS** | Unbekannte Shop-Slug → kein Crash |
| E2E-06 Responsive Mobile | **PASS** | Kein horizontaler Scroll bei 390px, Input min 36px hoch |
| E2E-07 Auth Redirect | **PASS** | Unauthenticated → redirect zu /shop-admin/login; Login/Register-Seiten laden (200) |
| E2E-07b Fehler-Handling | **PASS** | Unbekannte Route → 404 |

### RTL-Validierung
| Sprache | dir-Attribut | Status |
|---------|-------------|--------|
| ar | rtl | PASS |
| he | rtl | PASS |
| en | ltr | PASS |
| de | ltr | PASS |
| el | ltr | PASS |
| ru | ltr | PASS |

---

### Known Issues
| ID | Beschreibung | Seit |
|----|-------------|------|
| KI-001 | EL/RU/AR/HE Translations in `shop-admin-translations.ts` noch nicht implementiert — EN wird als Fallback genutzt | 2026-04-09 |
| KI-002 | Shop-Admin Portal requires backend (`pundo_main_backend`) for full E2E — backend API not yet implemented | 2026-04-09 |
| KI-003 | Leaflet/Map (`ShopMapClient.tsx`) hat 0% Unit-Test-Coverage — nur in Browser testbar | 2026-04-09 |
