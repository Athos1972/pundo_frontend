# TESTSET – pundo_frontend

## Letzter Testlauf
Datum: 2026-04-10
Ergebnis: 144 Unit-Tests + 19 E2E-Tests (main.spec.ts) + 18 E2E-Tests (price-type.spec.ts, validiert) bestanden

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

### Neue Unit-Tests (price_type Feature)
| Datei | Tests | Status |
|-------|-------|--------|
| `src/tests/price-type.test.tsx` | 30 Tests — formatPriceOrLabel (alle 4 Typen × 6 Sprachen), OfferList-Sortierung, CTA-Logik, FilterChips | **PASS** |
| `src/tests/utils.test.ts` | 33 Tests — formatCrawledAt (4 Sprachen, heute/N Tage, fallback), fmtPrice, formatPrice, formatWeight, formatSizeAttr | **PASS** |

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
| `shop-admin-translations.ts` | 71% | 80% | EL/RU/AR/HE Übersetzungen implementiert, Coverage-Gap durch fehlende Branches |
| `AdminNav.tsx` | 75% (Funcs 50%) | 70% | Mobile Drawer (lines 96-115) braucht Browser-Viewport — nur in Playwright testbar |

---

### E2E-Test Struktur

#### `e2e/main.spec.ts` — Customer-Facing (keine Authentifizierung)
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

#### `e2e/shop-admin-e2e.spec.ts` — Shop-Admin Portal (pundo_test DB)
Voraussetzung: Backend auf Port 8001 mit `pundo_test` DB + `globalSetup` durchgelaufen

| Test | Details |
|------|---------|
| Login korrekt | → Redirect zu /shop-admin/dashboard |
| Login falsch | Bleibt auf Login-Seite |
| Dashboard lädt | Keine JS-Fehler |
| Navigation | Alle Menüpunkte sichtbar |
| Profil lädt | Shop-Name vorausgefüllt |
| Profil speichern | Toast "Saved" erscheint |
| Öffnungszeiten | 7 Checkboxen, Speichern mit Toast |
| Produkt anlegen | → Redirect zur Liste, Name sichtbar |
| Produkt bearbeiten | Append "(bearbeitet)", Redirect, sichtbar |
| Produkt löschen | Confirm → verschwindet aus Liste |
| Angebot anlegen | → Liste, Titel sichtbar |
| Angebot archivieren | Verschwindet aus Active, sichtbar in Expired-Tab |
| API Key anlegen | "Shown only once", `<code>` > 10 Zeichen |
| API Key löschen | Verschwindet aus Liste |
| Logout | → Redirect zu /shop-admin/login |

#### `e2e/price-type.spec.ts` — price_type Feature (pundo_test DB, Frontend Port 3002)
Validiert durch Einzeltest-Ausführung (Test-Backend war aktiv)

| Test-Gruppe | Tests | Status |
|-------------|-------|--------|
| E2E-P1: Filter chip search page | chip sichtbar EN, inaktiv by default, click → `?with_price=1`, doppelklick entfernt, reload-persistent, 0 JS-Fehler | **PASS** (validiert) |
| E2E-P2: Filter chip 6 Sprachen | EN, DE, EL, RU, AR, HE — korrekte Labels | **PASS** (validiert) |
| E2E-P3: RTL Layout | AR `dir=rtl` mit arab. Label, HE `dir=rtl` mit hebr. Label | **PASS** (validiert) |
| E2E-P4: PriceFilterToggle Produkt-Detail | Button auf Produkt-Seite sichtbar, `?with_price=1` → accent style | skips when no products in test DB |
| E2E-P5: Mobile Responsive | `width=390` — chip sichtbar, kein horizontaler Scroll | **PASS** (validiert) |

#### `e2e/shop-discovery.spec.ts` — End-to-End Shop Discovery (pundo_test DB)
Voraussetzung: Wie oben, plus Google Geocoding API aktiv

| Test | Details |
|------|---------|
| Geocoding | Shop hat lat/lng nach Approval (Larnaca ~34.9°N, ~33.6°E) |
| Shops-Listing lädt | Keine JS-Fehler |
| Test-Shop in Übersicht | Shop-Name auf `/shops` sichtbar |
| Textsuche nach Name | Test-Shop in Suchergebnissen |
| API-Suche | `GET /api/v1/shops/search?q=...` findet Shop |
| Geo-Suche | `GET /api/v1/shops/nearby?lat=34.9&lng=33.6&radius_km=5` (optional) |
| Shop-Detailseite lädt | Keine JS-Fehler |
| Shop-Name auf Detail | Sichtbar auf `/shops/[slug]` |
| Adresse auf Detail | "Larnaca" sichtbar |
| Karte (optional) | Leaflet/Map-Element vorhanden und sichtbar |
| Produkt anlegen → API | Via Shop-Admin anlegen, via `GET /api/v1/shops/{id}/products` abrufen |
| Öffnungszeiten → API | Via Shop-Admin setzen, via `GET /api/v1/shops/{id}/hours` verifizieren |

---

### E2E-Setup Infrastruktur
| Datei | Zweck |
|-------|-------|
| `e2e/global-setup.ts` | DB-Reset, Shop-Owner registrieren, approven, einloggen, `storageState` speichern |
| `pundo_main_backend/scripts/prepare_e2e_db.py` | pundo_test reset (alembic) + Kategorien von pundo kopieren |
| `pundo_main_backend/scripts/start_test_server.sh` | Backend auf Port 8001 mit `DATABASE_URL_TEST` starten |
| `e2e/.test-state.json` | Auth-State + Credentials (gitignored) |

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
| KI-002 | Shop-Admin E2E und Shop-Discovery E2E erfordern laufendes Backend auf Port 8001 — `./scripts/start_test_server.sh` muss manuell gestartet werden | 2026-04-09 |
| KI-003 | Leaflet/Map (`ShopMapClient.tsx`) hat 0% Unit-Test-Coverage — nur in Browser testbar | 2026-04-09 |
| KI-004 | **BEHOBEN** — `global-setup.ts` killt das Backend auf Port 8002 und startet es automatisch neu (sauberer Zustand bei jedem Run). Port 8001 wird in `playwright.config.ts` und `global-setup.ts` explizit abgelehnt. Healthcheck-Poll bis Backend bereit. Kein manueller Backend-Start mehr nötig. | 2026-04-10 |
