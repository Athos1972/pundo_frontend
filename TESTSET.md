# TESTSET — pundo_frontend

**Letzter Lauf:** 2026-05-03
**Feature:** SP4-Fix: `getShopOffers` SSR-Cache + Assertion-Timing; guide-images Test-Mock korrigiert
**Ergebnis:** ✅ SHIP — 64 Unit-Test-Dateien/1220 Tests PASS · 323 Playwright PASS · 37 vorbekannte Fails
**SHA:** uncommitted

---

## Statische Prüfung

| Prüfung | Status |
|---------|--------|
| TypeScript (`tsc --noEmit`) | ⚠️ 7 pre-existing Fehler in `activity-poll.test.ts` (TS2353 `brand`-Property) — existierten vor diesem PR |
| ESLint | ✅ PASS — 0 Errors, 52 Warnings (pre-existing) |

---

## Unit-Tests (Vitest)

| Metriken | Wert |
|----------|------|
| Test Files | 64 passed |
| Tests | 1220 passed |

### Coverage-Snapshot

| Modul | Statements | Branches | Status |
|-------|-----------|---------|--------|
| `src/lib/utils.ts` | 100% | 98% | ✅ PASS |
| `src/lib/api.ts` | 81% | 83% | ✅ PASS |
| `src/lib/translations.ts` | 39% | 45% | ⚠️ GAP |
| `src/lib/legal-content.ts` | 100% | 83% | ✅ PASS |
| `src/lib/lang.ts` | 67% | 50% | ⚠️ GAP |
| `src/lib/useFabOnboarding.ts` | 85% | 78% | ✅ PASS |
| `src/config/brands/index.ts` | 78% | 56% | ⚠️ GAP |
| `src/components/shop-admin/*` | 60% | 56% | ⚠️ GAP |
| `src/components/ui/*` | 94% | 85% | ✅ PASS |
| Gesamt Statements | 71.3% | — | ✅ (>70%) |

### COVERAGE_GAP (nicht blockierend)

| Modul | Aktuell | Ziel | Ursache |
|-------|---------|------|---------|
| `translations.ts` | 39% | 80% | 1800-Zeilen i18n-Datei, nur Key-Existence getestet |
| `src/lib/lang.ts` | 67% | 80% | Cookie/SSR-Pfade brauchen Browser-Kontext |
| `src/components/map/*` | ~0% | 70% | Leaflet braucht Browser-Canvas |
| `src/lib/seo.ts` | 20% | 80% | SSR-only, keine Tests vorhanden |

---

## AC-Verifikation — Coming-Soon entfernt (curl, Port 3500)

| Acceptance Criterion | Methode | Status |
|---|---|---|
| AC1: `GET /` mit Host `naidivse.com` → normale App | curl + grep | ✅ PASS — zeigt `Naidivse`, `Finde alles`, kein `coming_soon` |
| AC3: `GET /coming-soon` → 404 | curl | ✅ PASS — HTTP 404 |
| AC4: `POST /api/coming-soon` → 404 | curl | ✅ PASS — HTTP 404 |
| AC2: `GET /shops` mit Host `naidivse.com` → normale Shops | curl | ✅ PASS — HTTP 200, kein `coming_soon` |

---

## Visual Smoke-Test

| Test | Status |
|------|--------|
| Produktseite: Bilder laden, Carousel hat Items | ⚠️ SKIP — Global-Setup blockiert (pre-existing DB-Bug, s. Known Issues) |
| Suchergebnisse: ProductCards mit Inhalt | ⚠️ SKIP — Global-Setup blockiert |

---

## Journey-Tests (Playwright E2E)

| Journey | Status | Anmerkung |
|---------|--------|-----------|
| `shop-owner-lifecycle` | ✅ PASS | |
| `customer-discovery` | ✅ PASS | Step 6 Map optional — soft skip |
| `shop-owner-full-lifecycle` | ✅ PASS | F1 fix: POST body auf `slug`+`names`+`source` umgestellt |
| `customer-and-review-lifecycle` | ✅ PASS | |
| `admin-data-management` | ❌ FAIL | Schritt 3: Paginierung (pre-existing, Test-Fehler) |
| `import-page-ac-check` | ✅ PASS | |
| `shop-admin-import-image-url` | ✅ PASS | 1 skipped (async job) |
| `shop-admin-offers` | ✅ PASS | SP4 fix: `cache: 'no-store'` + `toContainText()` |
| `shop-owner-onboarding` | ✅ PASS | |
| `social-link-moderation` | ✅ PASS | |

---

## Standard E2E-Tests

| Test | Status |
|------|--------|
| E2E main.spec.ts | ✅ PASS |
| language-smoke.spec.ts (RTL ar/he, LTR de/en/el/ru) | ✅ PASS — 24/24 |
| shop-discovery.spec.ts | ✅ PASS |
| price-type.spec.ts | ✅ PASS |
| shop-card-enrichment.spec.ts | ✅ PASS |
| legal-pages.spec.ts | ✅ PASS |
| ~~coming-soon.spec.ts~~ | gelöscht — Route entfernt (2026-04-30) |
| naidivse-live.spec.ts | ✅ PASS (4/4 Playwright, 1.6m — AC1/2/3/4 grün nach Global-Setup-Fix) |
| community-feedback.spec.ts | ✅ PASS |
| admin.spec.ts (inkl. E2E-17 selector-fix) | ✅ PASS |
| whatsapp-button.spec.ts | ✅ PASS — F3 fix: `pundo.cy` → dynamic hostname |
| shop-admin-e2e.spec.ts | ✅ PASS |
| variable-price.spec.ts | ✅ PASS |
| tooltip-e2e-check.spec.ts | ✅ PASS |

### RTL-Validierung

| Sprache | dir-Attribut | Status |
|---------|-------------|--------|
| ar | rtl | ✅ PASS |
| he | rtl | ✅ PASS |
| en / de / el / ru | ltr | ✅ PASS |

---

## Findings (aktiv)

### F2 — admin-data-management: Category-Paginierung Schritt 3 (TEST-FEHLER)

**Status:** FAIL (pre-existing seit mindestens 2026-04-24)  
**Journey:** admin-data-management, Schritt 3  
**Erwartet:** Category parent ID 8458 in Liste  
**Tatsächlich:** `GET /api/v1/admin/categories?limit=100` liefert erste 100 Einträge von 8457+ — neu erstellte Category auf Seite ~84  
**RCA:** Test-Fehler — Assertion prüft nur erste 100 Einträge, neue Category hat ID 8458+ und liegt außerhalb  
**Fix:** `GET /api/v1/admin/categories/{id}` direkt abfragen statt in Liste suchen

---

## Behobene Findings

| Finding | Beschreibung | Fix | Status |
|---------|-------------|-----|--------|
| F1 | shop-owner-full-lifecycle: API 422 — `POST /api/v1/admin/products` erwartet `slug`+`names` statt `name` | `shop-owner-full-lifecycle.spec.ts` POST-Body auf neues Schema umgestellt | ✅ BEHOBEN |
| F3 | whatsapp-button: `pundo.cy` vs `localhost` — Multi-Brand-System gibt dynamischen Hostname | Assertion auf `toMatch(/on \S+/)` angepasst | ✅ BEHOBEN |
| F-GS | Global-Setup: `item_attributes.attribute_value` JSONB-Mismatch — Plain-String wurde nicht als JSONB gecastet | `_get_pg_jsonb_cols()` + CAST-Branch in `_copy_table()` in `pundo_main_backend/scripts/prepare_e2e_db.py` | ✅ BEHOBEN |
| E2E-17 | `input[name="taxonomy_type"]` nicht gefunden — Kategorien-Fix konvertierte Input zu Select | Selektor auf `select[name="taxonomy_type"]` geändert | ✅ BEHOBEN |
| Kategorien 422 | `TREE_LIMIT: 2000` überschreitet Backend-Cap von 1000 | `TREE_LIMIT = 1000` | ✅ BEHOBEN |
| Kategorien taxonomy_type Default | Default `'product'` nicht in Enum `['google','unspsc']` | Default auf `''` geändert | ✅ BEHOBEN |
| Kategorien taxonomy_type Freitext | Freitexteingabe statt Dropdown | `<select>` mit Google/UNSPSC-Optionen | ✅ BEHOBEN |

---

## Entfernte Features (dieses Laufs)

### Coming-Soon — vollständig entfernt (2026-04-30)

**Frontend (`pundo_frontend`):**
- `src/app/coming-soon/` — Route + Layout + EmailSignupForm + CountdownTimer gelöscht
- `src/app/api/coming-soon/route.ts` — API-Handler gelöscht
- `src/proxy.ts` — Job 4 (naidivse Coming-Soon-Rewrite) entfernt
- `src/config/brands/naidivse.ts` — meta.description aktualisiert
- `src/lib/translations.ts` — 66 `coming_*`-Keys aus allen 6 Sprachen entfernt
- `e2e/coming-soon.spec.ts` — gelöscht
- `e2e/naidivse-live.spec.ts` — neu: verifiziert AC1–AC4 (alle 4 grün)

**Backend (`pundo_main_backend`):**
- `ingestor/api/coming_soon.py`, `models/coming_soon_signup.py`, `schemas/coming_soon.py` — gelöscht
- `ingestor/tests/test_coming_soon.py` — gelöscht
- `ingestor/api/main.py` — Router-Registrierung entfernt
- `ingestor/db/migrations/versions/u4i5j6k7l8m9_coming_soon_signups.py` — gelöscht
- `ingestor/db/migrations/versions/w6k7l8m9n0o1_drop_coming_soon_signups.py` — neue Forward-Migration (DROP TABLE)
- `scripts/migrate_coming_soon_txt.py` — gelöscht
- ⚠️ Prod-DB: `alembic upgrade head` noch ausstehend (manuell durch User)

**Vault (`Pundo-Plattform`):**
- `20 Features/FG7 Marketing & Community/N0200 Waitlist-Landing/` — kompletter Ordner gelöscht
- Backlinks aus 8 Vault-Dateien bereinigt

---

## Neue Features (dieses Laufs)

### FAB / Homesick-System (Naidivse-Brand)
- `src/app/(customer)/homesick/page.tsx` — neue Route
- `src/app/(customer)/nostalgia/page.tsx` — neue Route
- `src/components/home/HomesickTeaser.tsx` — bedingte Anzeige auf Startseite
- `src/components/ui/FABOnboardingPopout.tsx` — Floating Action Button Onboarding
- `src/lib/useFabOnboarding.ts` — Hook für FAB-Onboarding-State
- 1017/1017 Unit-Tests inkl. `fab-onboarding.test.tsx`

---

## CATALOG-Drift behoben (Session 1)

- `shop-admin-offer-product` + `shop-admin-product-offer-ui`: CATALOG zeigte `implemented`, .md-Dateien `deprecated` → CATALOG auf `deprecated` korrigiert
- `shop-owner-onboarding` + `social-link-moderation`: In CATALOG fehlend, obwohl .md-Dateien `implemented` zeigen → CATALOG ergänzt

---

## Docs-Sync
| Dokument | Status |
|----------|--------|
| `llms.txt/route.ts` | kein Signal |
| `README.md` | kein Signal |
| `AGENTS.md` | kein Signal |
