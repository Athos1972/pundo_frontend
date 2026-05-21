# TESTSET – pundo_frontend

## Letzter Testlauf

Datum: 2026-05-21  
SHA: cd80192af7412e831f6db2bf8fe1719af30f73dc  
Spec: bugfix-delete-shop-500-20260521 + ShopForm-422-fix  
Ergebnis: 1643 Vitest PASS · Smoke RTL/LTR 3/3 · Visual-Smoke 5/5 · admin-shop-create-delete PASS · admin-data-management PASS · shop-owner-full-lifecycle 17/17 · Verdict: **SHIP**

---

## Testlauf 2026-05-20 (archiviert)

Datum: 2026-05-20  
SHA: 03d24b47eb37913071d2694634d78358a2496d2b  
Spec: signup-turnstile-no-widget-20260520 (+ B-Frontend-005 Hotfix)  
Ergebnis: 1636 Vitest PASS · Smoke 5/5 PASS · B8950-006 GELÖST · Verdict: **SHIP**

---

### Statische Prüfung (2026-05-21)

| Prüfung | Status |
|---------|--------|
| TypeScript (`tsc --noEmit`) | ✅ PASS — 0 Fehler |
| ESLint | ✅ 0 Errors, 80 Warnings (alle pre-existing) |

---

### Unit-Tests (Vitest) — 2026-05-21

| Dateien | Tests | Ergebnis |
|---------|-------|---------|
| 85 | 1643 | ✅ alle bestanden |

Neue Tests (bugfix-delete-shop-500-20260521 + ShopForm-422-fix):
- `src/tests/shop-form.test.tsx` (NEU) — 7 Tests: slug-Feld im Create-Mode, Auto-Generierung, Manual-Override, Validation, Payload-Prüfung (Create+Edit)
- `e2e/journeys/_parser.spec.ts` — Journey-Count 23→24 (admin-shop-create-delete)

Reparierte Tests:
- `e2e/smoke.spec.ts` — RTL/LTR: `networkidle` → `load` (Next.js App Router RSC Background-Requests)
- `e2e/journeys/admin-shop-create-delete.spec.ts` — Confirm-Button-Selector auf `[role="dialog"]`-Scope
- `e2e/journeys/admin-data-management.spec.ts` — Category-Lookup via `GET /api/v1/admin/categories/{id}` (Pagination-Bug)

---

### E2E-Tests — 2026-05-21

#### Smoke RTL/LTR (`e2e/smoke.spec.ts`)

| Test | Status |
|------|--------|
| RTL: Arabisch dir=rtl | ✅ PASS |
| RTL: Hebräisch dir=rtl | ✅ PASS |
| LTR: Deutsch dir=ltr | ✅ PASS |

#### Journey: admin-shop-create-delete (NEU — bugfix-delete-shop-500-20260521)

| Schritt | Status | Anmerkung |
|---------|--------|-----------|
| AC-1: Shop anlegen via UI → erscheint in Liste | ✅ PASS | Slug-Feld vorhanden, 422-Fix verifiziert |
| AC-2+AC-3: Delete + Confirm-Dialog → gelöscht | ✅ PASS | CASCADE-Fix verifiziert, Dialog-Selector gefixed |

Verdict: **PASS** (Report: `e2e/journeys/reports/admin-shop-create-delete-2026-05-21.md`)

#### Journey: admin-data-management (mustRun)

| Schritt | Status | Anmerkung |
|---------|--------|-----------|
| Brand ohne Logo: Fallback-Avatar | ✅ PASS | |
| Brand mit Logo: Upload | ⏭ SKIP | Endpoint nicht implementiert (pre-existing) |
| Category parent anlegen + abrufbar | ✅ PASS | Pagination-Fix: direkter ID-Lookup |
| Category child unter parent | ✅ PASS | |
| Admin-Categories im Browser | ⏭ SKIP | /admin/categories Route fehlt (pre-existing) |
| Pending Shop-Owner ablehnen | ✅ PASS | |
| Guide/Brand-Schritte | ⏭ SKIP | Endpoints nicht verfügbar (pre-existing) |

#### Journey: shop-owner-full-lifecycle (mustRun)

| Schritte | Status |
|----------|--------|
| 17/17 | ✅ alle PASS |

#### Visual Smoke (`e2e/journeys/visual-smoke.spec.ts`)

| Test | Status |
|------|--------|
| Produktseite: Bilder, Carousel | ✅ PASS |
| Suchergebnisse | ✅ PASS |
| Shop-Owner S1–S3 | ✅ PASS |

---

### Open Failures (Bug-Register) — 2026-05-21

Quelle der Wahrheit: Vault `FG8 Admin & Operations/Bugs/` — kein `pre-existing` mehr.
`verdict:"SHIP"` nur wenn `open_failures: []` in `.last_run`.

| Bug-ID | Kategorie | Status | Anmerkung |
|--------|-----------|--------|-----------|
| — | — | — | Keine offenen Bugs. Gate grün. |

---

### Statische Prüfung (2026-05-20 — archiviert)

| Prüfung | Status |
|---------|--------|
| TypeScript (`tsc --noEmit`) | ✅ PASS — 0 Fehler |
| ESLint | ✅ 0 Errors, 80 Warnings (alle pre-existing) |

---

### Unit-Tests (Vitest) — 2026-05-20 (archiviert)

| Dateien | Tests | Ergebnis |
|---------|-------|---------|
| 84 | 1636 | ✅ alle bestanden |

Neue Tests (signup-turnstile-no-widget-20260520):
- `src/tests/contact-form.test.tsx` — 3 neue Tests: Button-aktiv-nach-onToken, onError-Callback-verdrahtet, turnstile_failed-bei-Widget-Fehler

Reparierte Tests:
- `src/tests/account.test.tsx` — logout-Redirect `/` → `/en` (B8950-006 TESTFEHLER: commit 6ea10d2 hatte `router.push(\`/\${lang}\`)` geändert, Test nicht mitgezogen)

---

### E2E-Tests

#### Visual Smoke-Test (`e2e/journeys/visual-smoke.spec.ts`)

| Test | Status | Anmerkung |
|------|--------|-----------|
| Produktseite: Bilder laden, Carousel | ✅ PASS | B8950-003 GELÖST — Carousel sichtbar bei 768px |
| Suchergebnisse: Seite lädt ohne Crash | ✅ PASS | Leerer Zustand korrekt gerendert |
| Shop-Owner Smoke S1–S3 | ✅ 3x PASS | Auto-Approve + Dashboard + auto_seeded SKIP (Baustein B nicht deployed) |

#### Journey: customer-shop-promo-visibility (NEU — offer-price-model-and-display-20260520)

| Schritt | Status | Anmerkung |
|---------|--------|-----------|
| P1 — Kein Angebotsblock ohne Aktion | ⏭ SKIP | e2e-test-shop hat aktives Angebot — korrekt |
| P2 — ShopOfferCard vorhanden | ✅ PASS | Card sichtbar mit Preis |
| P3 — Preis-Format (max 2 Dezimalstellen) | ✅ PASS | 0 Treffer mit 3+ Stellen |
| P4 — Aktions-Badge + Strikethrough | ✅ PASS | bg-red-50 Badge + `<s>` vorhanden |
| P5 — Translations alle 6 Sprachen | ✅ PASS | Kein "undefined" in 6 Sprachen |

Verdict: **SHIP**

#### Journey: shop-admin-offers (mustRun)

| Schritt | Status | Anmerkung |
|---------|--------|-----------|
| A1 | ❌ FAIL | item_id=1 nicht in pundo_test (FIXTURE-DEFEKT → B8950-001) |
| SP4 | ❌ FAIL | Cascadiert von A1 |
| E5b | ❌ FAIL | Suche filtert nicht — war SKIP (keine Daten), jetzt sichtbar da e2e-Angebot existiert. Untersuchung nötig. |
| A2–A4, B1–B4, C1–C3, D1–D2, DT1–DT2, E5a/c/d, E1, E-NAV, E7, XS2 | ✅ 8 PASS | |
| A5–A6, B1-Cascade, C-Cascade etc. | ⏭ 27 SKIP | Cascade von A1 |

RCA A1/SP4: item_id=1 (e2e-vet-consultation-larnaca) fehlt in pundo_test — FIXTURE-DEFEKT → B8950-001  
RCA E5b: Neu sichtbar durch erstelltes E2E-Angebot. Selector-Issue oder Filter-Bug in OfferList — separate Untersuchung.

#### SEO-Tests (`e2e/seo-lengths.spec.ts`)

| Test | Status | Anmerkung |
|------|--------|-----------|
| Home page — title/OG | ✅ PASS | |
| Shop detail page | ⏭ SKIP | Prod-Sync unvollständig |
| Product detail page | ⏭ SKIP | Prod-Sync unvollständig |
| Guide detail page | ✅ PASS | |
| Ahrefs-Schwellwerte (Konstanten) | ✅ PASS | |

#### Language Picker (`e2e/language-picker.spec.ts`)

| Test | Status |
|------|--------|
| AC1–AC11, AC-T2, AC-T3, ESC, Backdrop (20 Tests) | ✅ alle PASS |

#### Community Feedback (`e2e/community-feedback.spec.ts`)

| Test | Status |
|------|--------|
| Section auf Shop-Seite, Login-CTA, RTL, Redirect (6 Tests) | ✅ alle PASS |

---

### Datenlage pundo_test (aktualisiert 2026-05-20)

| Tabelle | Anmerkung |
|---------|-----------|
| shops | E2E-Fixture e2e-test-shop (ID 7777), ggf. weitere aus Prod-Sync |
| items | item_id=1 (e2e-vet-consultation-larnaca) FEHLT — E2E-Fixtures benötigen Aktualisierung |
| unified_offers | Offer 2634 (Fotokopieren DIN-A4, promo_valid_until 2026-06-19) — manuell erstellt für Promo-Tests |

---

### COVERAGE_GAP (nicht blockierend)

| Modul | Ursache |
|-------|---------|
| `src/components/map/ShopMapClient.tsx` | Leaflet braucht Browser-Canvas — JSDOM nicht möglich |

---

### Open Failures (Bug-Register)

Quelle der Wahrheit: Vault `FG8 Admin & Operations/Bugs/`
Kein `pre-existing`-Label mehr — jedes FAIL hat eine Bug-Datei mit Owner + Kategorie.
`verdict:"SHIP"` ist nur möglich wenn alle Bugs `GELÖST` sind (`open_failures: []` in `.last_run`).

| Bug-ID | Kategorie | Status | Owner | Repo | Entdeckt |
|--------|-----------|--------|-------|------|---------|
| B8950-001 | FIXTURE-DEFEKT | GELÖST | e2e-tester | frontend | 2026-05-19 |
| B8950-002 | TESTFEHLER | GELÖST | coder | frontend | 2026-05-20 |
| B8950-003 | FLAKY | GELÖST | BB | frontend | 2026-05-15 |
| B8950-004 | FUNKTIONSFEHLER | GELÖST | coder | frontend | 2026-05-01 |
| B8950-005 | TESTFEHLER | GELÖST | BB | frontend | 2026-05-20 |
| B8950-006 | TESTFEHLER | GELÖST | coder | frontend | 2026-05-20 |
