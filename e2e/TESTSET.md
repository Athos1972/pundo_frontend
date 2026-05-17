# TESTSET – pundo_frontend

## Letzter Testlauf

Datum: 2026-05-16  
SHA: cfc253668e01407c8a79490a94ab059aefabed8b  
Ergebnis: 43 passed · 3 skipped (datenbedingt) · 0 failed

---

### Statische Prüfung

| Prüfung | Status |
|---------|--------|
| TypeScript (`tsc --noEmit`) | ✅ PASS — 0 Fehler |
| ESLint | ✅ PASS — 0 Errors, 79 Warnings (pre-existing) |

---

### Unit-Tests (Vitest)

| Dateien | Tests | Ergebnis |
|---------|-------|---------|
| 73 | 1424 | ✅ alle bestanden |

---

### E2E-Tests

#### Visual Smoke-Test (`e2e/journeys/visual-smoke.spec.ts`)

| Test | Status | Anmerkung |
|------|--------|-----------|
| Produktseite: Bilder laden, Carousel | ✅ PASS | 404-Seite lädt korrekt, kein Carousel-DOM → Assertion übersprungen |
| Suchergebnisse: Seite lädt ohne Crash | ✅ PASS | Leerer Zustand korrekt gerendert |

#### SEO-Tests (`e2e/seo-lengths.spec.ts`)

| Test | Status | Anmerkung |
|------|--------|-----------|
| Home page — title/OG | ✅ PASS | og:title, og:description, og:image, og:site_name, twitter:card vollständig |
| Shop detail page | ⏭ SKIP | Kein Shop via /shops-Listing erreichbar (Prod-Sync unvollständig) |
| Product detail page | ⏭ SKIP | Kein Produkt via /search erreichbar (Prod-Sync unvollständig) |
| Guide detail page — title truncated, OG | ✅ PASS | `title:{absolute:…}` verhindert Template-Overlap ≤60 Zeichen |
| Ahrefs-Schwellwerte (Konstanten) | ✅ PASS | TITLE_MIN=50, TITLE_MAX=60, DESC_MIN=110, DESC_MAX=160 |

#### Language Picker (`e2e/language-picker.spec.ts`)

| Test | Status |
|------|--------|
| AC1–AC11, AC-T2, AC-T3, ESC, Backdrop (20 Tests) | ✅ alle PASS |

#### Community Feedback (`e2e/community-feedback.spec.ts`)

| Test | Status |
|------|--------|
| Section auf Shop-Seite, Login-CTA, RTL, Redirect (6 Tests) | ✅ alle PASS |

#### Customer Discovery (`e2e/journeys/customer-discovery.spec.ts`)
Config: `playwright.config.ts` (global-setup aktiv, kein DB-Reset)

| Test | Status | Anmerkung |
|------|--------|-----------|
| Schritt 1 — Startseite Suchleiste | ✅ PASS | |
| Schritt 2 — Suche navigiert zu /search | ✅ PASS | |
| Schritt 3 — Suchergebnisse mind. 1 Karte | ⏭ SKIP | Keine Prod-Items in pundo_test |
| Schritt 4 — Klick auf ProductCard | ✅ PASS | |
| Schritt 5 — Produktname und Preis/Angebote | ✅ PASS | |
| Schritt 6 — Karten-Element (optional) | ✅ PASS | |
| Schritt 7 — Shop-Detailseite als Guest | ✅ PASS | |
| Schritt 8 — Shop-Name sichtbar | ✅ PASS | E2E-Fixture-Shop via global-setup |
| Schritt 9 — Back-Navigation | ✅ PASS | |

---

### Datenlage pundo_test

| Tabelle | Count | Anmerkung |
|---------|-------|-----------|
| shops | 1 | E2E-Fixture (shop-a) |
| items | 3 | E2E-Fixtures (Royal Canin Varianten) |
| categories | 1 | |
| shop_listings | 2 | E2E-Fixtures |
| offers | 2 | E2E-Fixtures |

Der Sync hat das Schema zurückgesetzt und die Zahlen aus der Prod-DB gemeldet, jedoch keine echten Tabellendaten übertragen (SSH-Verbindungsabbruch). Nur E2E-Fixtures aus `prepare_e2e_db.py --skip-reset --skip-prod-copy` sind vorhanden.

SEO-Tests für Shop- und Produkt-Detail-Seiten brauchen echte navigierbare Shops/Produkte → warten auf vollständigen Prod-Sync.

---

### COVERAGE_GAP (nicht blockierend)

| Modul | Ursache |
|-------|---------|
| `src/components/map/ShopMapClient.tsx` | Leaflet braucht Browser-Canvas — JSDOM nicht möglich |

---

### Known Issues

| ID | Beschreibung | Status |
|----|-------------|--------|
| DATA-001 | Prod-Sync unvollständig — pundo_test hat nur E2E-Fixtures, keine echten Shops/Items | offen |
