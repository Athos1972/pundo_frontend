# TESTSET – pundo_frontend

## Letzter Testlauf

Datum: 2026-05-20  
SHA: 10118b2f9da709bde99b613837accfa095a5d54a  
Spec: offer-price-model-and-display-20260520  
Ergebnis: 1616 Vitest PASS · E2E: customer-shop-promo-visibility SHIP (P2/P3/P4/P5 PASS, P1 SKIP erwartet)

---

### Statische Prüfung

| Prüfung | Status |
|---------|--------|
| TypeScript (`tsc --noEmit`) | ✅ PASS — 0 Fehler |
| ESLint | ⚠️ 1 pre-existing Error (OnboardingWizard.tsx:29 — setState in effect), 81 Warnings |

---

### Unit-Tests (Vitest)

| Dateien | Tests | Ergebnis |
|---------|-------|---------|
| 84 | 1616 | ✅ alle bestanden |

Neue Tests (offer-price-model-and-display-20260520):
- `src/tests/shop-offer-card.test.tsx` — 17 Tests: ShopOfferCard Standard/Promo/on_request/Bild/Link/RTL/Badge
- `src/tests/offer-form-promo.test.tsx` — 40 Tests: shop-admin-translations Promo-Keys, OfferForm Rendering, Promo-Validierungslogik

---

### E2E-Tests

#### Visual Smoke-Test (`e2e/journeys/visual-smoke.spec.ts`)

| Test | Status | Anmerkung |
|------|--------|-----------|
| Produktseite: Bilder laden, Carousel | ❌ FAIL | Carousel-Sichtbarkeit bei 768px — 0 sichtbar statt ≥2 (intermittenter Fehler, pre-existing seit 2026-05-15) |
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
| A1 | ❌ FAIL | item_id=1 nicht in pundo_test (pre-existing seit 2026-05-19) |
| SP4 | ❌ FAIL | Cascadiert von A1 |
| E5b | ❌ FAIL | Suche filtert nicht — war SKIP (keine Daten), jetzt sichtbar da e2e-Angebot existiert. Untersuchung nötig. |
| A2–A4, B1–B4, C1–C3, D1–D2, DT1–DT2, E5a/c/d, E1, E-NAV, E7, XS2 | ✅ 8 PASS | |
| A5–A6, B1-Cascade, C-Cascade etc. | ⏭ 27 SKIP | Cascade von A1 |

RCA A1/SP4: item_id=1 (e2e-vet-consultation-larnaca) fehlt in pundo_test — pre-existing seit 19.05.  
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

### Known Issues

| ID | Beschreibung | Status |
|----|-------------|--------|
| DATA-001 | item_id=1 (e2e-vet-consultation-larnaca) fehlt in pundo_test — shop-admin-offers A1 und SP4 immer FAIL | offen seit 2026-05-19 |
| DATA-002 | E5b (Suche OfferList) neu sichtbar da E2E-Angebot existiert — war vorher SKIP | neu 2026-05-20 |
| SMOKE-001 | Visual Smoke Carousel intermittent FAIL bei 768px — pre-existing seit 2026-05-15 | offen |
| LINT-001 | OnboardingWizard.tsx:29 setState in effect — pre-existing | offen |
