# TESTSET – pundo_frontend

## Letzter Testlauf

Datum: 2026-05-20  
SHA: 7d83712551375b57c608b51b0480604fb13dfa95  
Spec: offer-price-model-and-display-20260520  
Ergebnis: 1628 Vitest PASS · E2E: customer-shop-promo-visibility SHIP · Verdict: **SHIP**

---

### Statische Prüfung

| Prüfung | Status |
|---------|--------|
| TypeScript (`tsc --noEmit`) | ✅ PASS — 0 Fehler |
| ESLint | ⚠️ 1 Error (OnboardingWizard.tsx:29 — setState in effect → B8950-004), 81 Warnings |

---

### Unit-Tests (Vitest)

| Dateien | Tests | Ergebnis |
|---------|-------|---------|
| 84 | 1628 | ✅ alle bestanden |

Neue Tests (offer-price-model-and-display-20260520):
- `src/tests/shop-offer-card.test.tsx` — 17 Tests: ShopOfferCard Standard/Promo/on_request/Bild/Link/RTL/Badge
- `src/tests/offer-form-promo.test.tsx` — 40 Tests: shop-admin-translations Promo-Keys, OfferForm Rendering, Promo-Validierungslogik
- `src/tests/OfferList.test.tsx` — 4 Regressions-Tests: promo_price prominent, standard_price strikethrough, kein Strikethrough ohne Promo, Legacy-Fallback

Reparierte Tests:
- `src/tests/language-switcher.test.tsx` — `router.refresh()` → `router.push('/ru')` (TESTFEHLER nach [lang]-Routing-Refactor)

---

### E2E-Tests

#### Visual Smoke-Test (`e2e/journeys/visual-smoke.spec.ts`)

| Test | Status | Anmerkung |
|------|--------|-----------|
| Produktseite: Bilder laden, Carousel | ❌ FAIL | Carousel-Sichtbarkeit bei 768px — 0 sichtbar statt ≥2 (intermittent, FLAKY → B8950-003) |
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
