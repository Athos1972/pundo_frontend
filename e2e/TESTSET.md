# TESTSET — pundo_frontend

## Playwright-Suite — Stand 2026-10-15 (F8950 Stufe 3, T15–T23 ohne T19)

Messung: `npx playwright test` mit warmem Standalone-Build, Workers 4, Backend 8500, `pundo_test`; Auswertung `node scripts/e2e-durations.mjs`.

| Größe | Vor Stufe 3 (Ende Stufe 1, Workers 2) | Nach Stufe 3 (zwei Läufe) |
|---|---|---|
| Wanduhr (`stats.duration`) | 415,7 s (6,93 min) | 139,2 s und 139,3 s (2,32 min) |
| Tests | 839 | 748 (39 `smoke`, 709 `full`) |
| passed / failed / flaky | 767 / 0 / 0 | 742 / 0 / 0 |
| skipped | 72 (u. a. 38× `variable-price` komplett, 9× `customer-and-review-lifecycle`: stille Skips durch veraltete Endpoints/Fixtures) | 6, alle mit Begründung (siehe unten); nachts zusätzlich 1 |
| `--repeat-each=2 --retries=0` | — | 1457 Tests, 0 failed, 0 flaky, 233,4 s; `--project=smoke --repeat-each=2`: 78/78 |
| `networkidle`- / `waitForTimeout`-Aufrufe im Repo | 235 / 75 | 52 / 12; in den 26 Ziel-Specs (10 langsamste laut Stufe-1-Report, 12 langsamste laut Neumessung, jeweils ohne `shop-type-api-matrix`) 0 |

Verbleibende Skips (bedingt, Grund im Test): `price-history` Realdaten (kein Crawl im 90-Tage-Fenster der Prod-Kopie), 4× `admin-catalog-review` (Gateway-Test-Server 8600 nicht erreichbar), `shop-admin-import-image-url` AC-3/4 (braucht Mock-Bild-Server); `b5950-001` AK4 überspringt zwischen ca. 23:30 und 00:30 Ortszeit (zu nah an Mitternacht).

`shop-type-api-matrix` (44 Tests, reiner API-Vertrag ohne Browser) ist seit T19 ein parametrisierter Backend-Test (`pundo_main_backend/ingestor/tests/test_shop_type_matrix.py`, 44 + 3 Drift-Tests, ca. 4 s); Spec und Journey-Datei sind gelöscht.

---

> **Momentaufnahme — zuletzt fortgeschrieben am 2026-06-09.** Zahlen und Befunde unten spiegeln nicht zwingend den aktuellen Stand. Aktuelle Ergebnisse je Journey: `last-run`/`last-result` im Frontmatter von `e2e/journeys/<id>.md` bzw. Testreports im Vault.

## Letzter Testlauf
Datum: 2026-06-09 (for-shops FAQ 6→13 Items + FAQPage JSON-LD)
Ergebnis: 2112/2112 bestanden (+20 gegenüber Vorrun, davon 2 Fixes B8950-010)
Journey-Ergebnis: kein mustRun (FAQ ist statischer Content, kein Journey-Scope)

### Statische Prüfung (FAQ-Run)
| Prüfung | Status |
|---------|--------|
| TypeScript | PASS (0 Fehler) |
| ESLint | FAIL — 1 Error in SearchContent.tsx:248 (react-hooks/preserve-manual-memoization) → B8950-011 |

### Unit-Tests
| Test-File | Tests | Status |
|---|---|---|
| for-shops.test.ts | 100 | PASS (13-Item-Count, EN spot-checks, alle 6 Sprachen) |
| f5910-service-discovery.test.tsx | 18 | PASS (nach B8950-010 Fix: "Kartenausschnitt" → "in der Nähe") |
| ... (112 weitere) | 1994 | PASS |
| **Gesamt** | **2112** | **PASS** |

### COVERAGE_GAP (nicht blockierend)
| Modul | Aktuell | Ursache |
|-------|---------|---------|
| ShopMapClient.tsx | ~0% | Leaflet braucht Browser-Canvas |

### E2E-Journeys (mustRun)
| Journey | Tests | Status |
|---|---|---|
| shop-owner-full-lifecycle | 17/17 (nimmt seit F8950 T18 die Schritte des früheren `shop-owner-lifecycle` auf) | PASS |
| shop-owner-quick-onboarding | 9/9 | PASS |

### Journey-Katalog-Drift (Bestätigung durch BB ausstehend)
- `shop-owner-quick-onboarding` touches-modules: `src/app/(shop-admin)/shop-admin/auth/callback/**` fehlt — OAuth-Callback ist Teil des OAuth-Wizard-Flows

### Fixes während dieses Testlaufs
| Datei | Änderung | Grund |
|---|---|---|
| `src/app/(shop-admin)/shop-admin/auth/callback/page.tsx:18` | `/shop-admin/` → `/shop-admin/dashboard` | Primär-Fix: OAuth Post-Login 404 |
| `src/tests/shop-admin-login-oauth.test.tsx:187` | Assertion auf `/shop-admin/dashboard` korrigiert | Test-Update begleitend zu T1 |
| `e2e/journeys/customer-shop-all-products-flow.md` | `---` → `----` (3 Stellen im Body) | Body-Separator parsebar machen |
| `e2e/journeys/_parser.spec.ts` | `toHaveLength(26)` → `toHaveLength(27)` (3 Stellen) | Korrekte Journey-Count nach `---`-Fix |
| `public/seed-visuals/_manifest.json` | Duplikate bereinigt, `total` + Dateigrössen aktualisiert | FIXTURE-DEFEKT: Build-Script erzeugt Duplikate |

### CSP-Fix Änderungen (2026-06-05)
| Datei | Änderung | Grund |
|---|---|---|
| `src/proxy.ts` | `style-src 'unsafe-inline'`, `allowInlineStyles`-Param + isBlogPage-Block entfernt | Kernfix — CSP-Violation dauerhaft beseitigen |
| `eslint-rules/no-inline-style.js` | Neue lokale ESLint-Rule `local-csp/no-inline-style` | Guardrail: warnt bei künftigen `style={{}}` |
| `eslint.config.mjs` | Rule registriert als warn für `src/**/*.tsx` | — |
| `AGENTS.md` | Coding-Guideline Inline-Styles | KI-Agents und Menschen |
| 10 TSX-Dateien | `@csp-allow-inline-style` Opt-out-Kommentare oder Tailwind-Ersatz | Bestandscode whitelist |

### E2E-Verifikation (FAQ-Run — curl-basiert, kein Playwright-Build)
| Prüfung | Status |
|---|---|
| 6×/lang/for-shops: 13 Questions im JSON-LD | PASS |
| FAQPage @type in JSON-LD (alle 6 Sprachen) | PASS |
| AR: html[dir=rtl] | PASS |
| HE: html[dir=rtl] | PASS |
| EN/DE/EL/RU: html[dir=ltr] | PASS |
| Erstes FAQ-Item: "commission" sichtbar | PASS |
| Letztes FAQ-Item: "automatically translates" | PASS |

### Open Failures
`verdict:"SHIP"` erlaubt — `open_failures: []`

| Bug-ID | Kategorie | Status | Entdeckt | Beschreibung |
|---|---|---|---|---|
| B8950-011 | FUNKTIONSFEHLER | GELÖST | 2026-06-09 | ESLint react-hooks/preserve-manual-memoization in SearchContent.tsx:248 — useCallback entfernt |

### Docs-Sync (CSP-Run)
| Dokument | Status |
|---|---|
| llms.txt/route.ts | kein Signal |
| README.md | kein Signal |
| AGENTS.md | aktualisiert (Inline-Style Guideline) |
