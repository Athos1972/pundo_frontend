# TESTSET — pundo_frontend

**Letzter Lauf:** 2026-04-25  
**Ergebnis:** ⚠️ FIX — 3 Failures (2 Funktionsfehler + 1 Testfehler)  
**SHA:** `f10484b574a297b5e0ce06ecf09c79c3c9fdfda0`

---

## Statische Prüfung

| Prüfung | Status |
|---------|--------|
| TypeScript (`tsc --noEmit`) | ✅ PASS — 0 Fehler |
| ESLint | ✅ PASS — 0 Errors, 49 Warnings |

---

## Unit-Tests (Vitest)

| Metriken | Wert |
|----------|------|
| Test Files | 48 passed |
| Tests | 984 passed |

### Coverage-Snapshot

| Modul | Statements | Branches | Status |
|-------|-----------|---------|--------|
| `src/lib/utils.ts` | 100% | 98% | ✅ PASS |
| `src/lib/api.ts` | 81% | 83% | ✅ PASS |
| `src/lib/translations.ts` | 39% | 45% | ⚠️ GAP |
| `src/lib/legal-content.ts` | 100% | 83% | ✅ PASS |
| `src/lib/lang.ts` | 67% | 50% | ⚠️ GAP |
| `src/config/brands/index.ts` | 78% | 56% | ⚠️ GAP |
| `src/components/shop-admin/*` | 60% | 56% | ⚠️ GAP |
| `src/components/ui/*` | 94% | 85% | ✅ PASS |
| Gesamt Statements | 70.31% | — | ✅ (>70%) |

### COVERAGE_GAP (nicht blockierend)

| Modul | Aktuell | Ziel | Ursache |
|-------|---------|------|---------|
| `translations.ts` | 39% | 80% | 1800-Zeilen i18n-Datei, nur Key-Existence getestet |
| `src/lib/lang.ts` | 67% | 80% | Cookie/SSR-Pfade brauchen Browser-Kontext |
| `src/components/map/*` | ~0% | 70% | Leaflet braucht Browser-Canvas |
| `src/lib/seo.ts` | 20% | 80% | SSR-only, keine Tests vorhanden |

---

## Visual Smoke-Test

| Test | Status |
|------|--------|
| Produktseite: Bilder laden, Carousel hat Items | ✅ PASS |
| Suchergebnisse: ProductCards mit Inhalt | ✅ PASS |

---

## Journey-Tests (Playwright E2E)

| Journey | Status | Anmerkung |
|---------|--------|-----------|
| `shop-owner-lifecycle` | ✅ PASS | |
| `customer-discovery` | ✅ PASS | Step 6 Map optional — soft skip |
| `shop-owner-full-lifecycle` | ❌ FAIL | Schritt 4: Produkt-API 422 (siehe Findings) |
| `customer-and-review-lifecycle` | ✅ PASS | |
| `admin-data-management` | ❌ FAIL | Schritt 3: Paginierung (pre-existing, Test-Fehler) |
| `import-page-ac-check` | ✅ PASS | |
| `shop-admin-import-image-url` | ✅ PASS | 1 skipped (async job) |
| `shop-admin-offers` | ✅ PASS | |
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
| coming-soon.spec.ts | ✅ PASS |
| community-feedback.spec.ts | ✅ PASS |
| admin.spec.ts | ✅ PASS |
| whatsapp-button.spec.ts | ❌ FAIL | 1/11: `pundo.cy` vs `localhost` in WA-URL (Test-Fehler) |
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

## Findings (unresolved)

### F1 — shop-owner-full-lifecycle: Produkt-API Schritt 4 (FUNKTIONS-FEHLER)

**Status:** FAIL  
**Journey:** shop-owner-full-lifecycle, Schritt 4  
**Erwartet:** `POST /api/v1/admin/products` → 201  
**Tatsächlich:** 422 — `Field required: slug, names`  
**RCA:** Backend-API `POST /api/v1/admin/products` hat breaking change: Erwartet jetzt `slug` (string) und `names` (multilingual dict `{"en": "..."}`) statt `name` (plain string). Test sendet noch das alte Schema.  
**Entscheidung nötig:** `test-fix` (Test updaten) oder `finding` (Backend soll altes Schema akzeptieren)?

### F2 — admin-data-management: Category-Paginierung Schritt 3 (TEST-FEHLER)

**Status:** FAIL (pre-existing seit mindestens 2026-04-24)  
**Journey:** admin-data-management, Schritt 3  
**Erwartet:** Category parent ID 8458 in Liste  
**Tatsächlich:** `GET /api/v1/admin/categories?limit=100` liefert erste 100 Einträge von 8457+ — neu erstellte Category auf Seite ~84  
**RCA:** Test-Fehler — Assertion prüft nur erste 100 Einträge, neue Category hat ID 8458+ und liegt außerhalb  
**Fix:** `GET /api/v1/admin/categories/{id}` direkt abfragen statt in Liste suchen

### F3 — whatsapp-button: `pundo.cy` vs `localhost` (TEST-FEHLER)

**Status:** FAIL  
**Test:** `e2e/whatsapp-button.spec.ts:131`  
**Erwartet:** WhatsApp-URL enthält `pundo.cy`  
**Tatsächlich:** URL enthält `localhost` (korrekt für Test-Umgebung)  
**RCA:** Seit Multi-Brand-System (Rusky/Naidivse/Pundo) wird der Hostname dynamisch aus dem Request Header ermittelt statt hardcoded. Test-Umgebung läuft auf `localhost` → kein `pundo.cy`.  
**Fix:** Assertion auf `localhost` anpassen oder Brand-Hostname in Test-Env setzen (z.B. via `NEXT_PUBLIC_BRAND_DOMAIN` env var)

---

## CATALOG-Drift behoben

In diesem Lauf korrigiert:
- `shop-admin-offer-product` + `shop-admin-product-offer-ui`: CATALOG zeigte `implemented`, .md-Dateien `deprecated` → CATALOG auf `deprecated` korrigiert
- `shop-owner-onboarding` + `social-link-moderation`: In CATALOG fehlend, obwohl .md-Dateien `implemented` zeigen → CATALOG ergänzt

---

## Docs-Sync
| Dokument | Status |
|----------|--------|
| `llms.txt/route.ts` | kein Signal |
| `README.md` | kein Signal |
| `AGENTS.md` | kein Signal |
