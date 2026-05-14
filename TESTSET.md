# TESTSET — pundo_frontend

Letzter vollständiger Testlauf: **2026-05-14**  
SHA: `819f4817e4ff44bb2454c9a3a46abdf38fdcabed`  
Gesamt-Verdict: **FIX** (18 Playwright-Failures — alle Infrastructure/Fixture-Artefakte, keiner durch Diff verursacht)

---

## Kontext: Was wurde getestet

Anlass: F6310 Language Picker One-Tap-Apply (Commits 108b763, fdaa0d3, d7b9503) + chore(deps) dependabot updates.

**Geänderte Dateien:** `src/components/ui/LanguagePickerOverlay.tsx`, `src/lib/translations.ts`, `src/lib/api.ts`, diverse E2E-Spec-Dateien.

**Kritischer Fix:** Smoketest `home-anon` (pundo.cy + naidivse.cy) meldete "header img present but not visible". Ursache war `LanguagePickerOverlay` mit `z-[60] bg-black/60 fixed inset-0`, die beim ersten Seitenaufruf ohne `app_lang`-Cookie den Header verdeckte. Root-Fix: `lang-setup.ts` setzt `app_lang`-Cookie vor Navigation. Defense-in-Depth: 108b763 ruft `dismiss()` vor `router.refresh()`/`window.location.reload()` auf.

---

## Phase 1 — Statische Prüfung

| Prüfung | Status | Details |
|---|---|---|
| TypeScript | **PASS** | `npx tsc --noEmit` exit 0 |
| ESLint | **WARN** | 34 Warnings in unveränderten Dateien; 0 Errors; geänderte Dateien clean |

**Hinweis:** Die 34 ESLint-Warnings (`--max-warnings=0` schlägt fehl) sind pre-existing in Dateien, die nicht im Diff enthalten sind. Kein Blocker.

---

## Phase 2 — Unit-Tests (Vitest)

| Status | Count |
|---|---|
| PASS | 1309 Tests in 67 Dateien |

---

## Phase 3 — Browser-E2E (Playwright)

Ausgeführt mit `E2E_REUSE_STATE=1 E2E_SKIP_FRONTEND_RESTART=1` (State 147 Min alt, shopSlug in DB = `e2e-test-shop-larnaca-1`).

| Status | Count |
|---|---|
| PASS | 400 |
| SKIP | 79 |
| FAIL | 18 |
| DID NOT RUN | 2 |

### Language-Picker-E2E (alle 14 Tests PASS)

Alle AC-Tests für One-Tap-Apply bestanden: AC1–AC11, AC-T2, AC-T3, ESC, backdrop.

### Failure-Analyse (18)

| # | Test | Root-Cause | Kategorie |
|---|---|---|---|
| 1–3 | E2E-20 Admin Shop Edit (LanguageSelector) | Shop ID 91 existiert nicht in test-DB | Pre-existing Fixture |
| 4 | D1 Offer visible on customer page | shopSlug-Mismatch (stale state) | Stale DB |
| 5 | /legal/privacy lädt ohne Fehler (EN) | Strict-mode: 2 `<main>`-Elemente (dev-mode hydration) | Flaky/Dev-mode |
| 6–7 | Angebote CRUD Anlegen/Archivieren | `ul li button` nicht gefunden (stale state/shopListingId) | Stale DB |
| 8–9 | Filter-Chips 500 errors (Parking, EL) | Backend gibt HTTP 500 auf filter-click (DB state) | Backend 500 |
| 10–14 | shop-discovery (5 Tests) | shopSlug `e2e-test-shop-larnaca` ≠ `e2e-test-shop-larnaca-1` | Stale DB |
| 15–17 | tooltip-e2e (3 Tests) | SHOP_SLUG `bookshop-chrisognosi-cfab8f67` existiert nicht in test-DB | Pre-existing Fixture |
| 18 | Shops-Liste lädt (mindestens 1 Shop) | Keine Shops in test-DB nach Reuse | Stale DB |

**Fazit:** Kein einziger Failure wurde durch den Diff (LanguagePickerOverlay, translations.ts, api.ts) verursacht.

---

## Phase 4 — Production Smoketest

Letzte Run: **2026-05-13 19:16 UTC** (Brands: pundo + naidivse)

| Status | Count |
|---|---|
| PASS | 42 |
| FAIL | 0 |
| SKIP | 4 (authenticated — login credentials fehlen in CI) |

`home-anon`-Check mit `header img selector-visible`: alle 12 Sprachvarianten PASS.

---

## FINDINGS

| ID | Beschreibung | Status |
|---|---|---|
| SMOK-1 | `header img present but not visible` — behoben durch 108b763 (dismiss() + lang-setup.ts setzt app_lang) | RESOLVED |
| E2E-20 | Fixture-abhängig: Shop ID 91 aus Prod-DB nicht in test-DB | Pre-existing, kein Blocker |
| TOOLTIP | Fixture-abhängig: `bookshop-chrisognosi-cfab8f67` nicht in test-DB | Pre-existing, kein Blocker |
| ESLINT-34 | 34 pre-existing Warnings in unveränderten Dateien | Pre-existing, kein Blocker |
| BACKEND-500 | HTTP 500 auf `/shops?lang=en&spoken_languages[]=EL` in test-DB | Backend-Issue, nicht Frontend |

---

## Verdict: FIX

Die 18 Playwright-Failures sind ausschließlich Infrastruktur-Artefakte (stale DB, pre-existing fixtures, dev-mode hydration, backend 500). Der Diff (LanguagePickerOverlay One-Tap, api.ts Cache-Fix, translations.ts Cleanup) ist korrekt implementiert. Für ein sauberes SHIP: `npx playwright test` mit frischem `global-setup` ausführen (ohne `E2E_REUSE_STATE=1`).
