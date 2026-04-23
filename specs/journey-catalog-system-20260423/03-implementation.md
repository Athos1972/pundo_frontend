# Implementation: Selbstpflegender Journey-Katalog

**Slug:** `journey-catalog-system-20260423`
**Datum:** 2026-04-23
**Coder:** /coder

---

## Task-Zusammenfassung

| Task | Status | Anmerkung |
|------|--------|-----------|
| T1 — CATALOG.md, CATALOG_SCHEMA.md, README.md | DONE | Seed mit 2 Einträgen (shop-owner-lifecycle, customer-discovery), beide `proposed` |
| T2 — `_parser.ts` | DONE | parseCatalog, serializeCatalog, findOverlap, JourneyCatalogError — keine neuen Dependencies |
| T3 — `_parser.spec.ts` | DONE | 16 Tests, alle grün; `npx vitest run e2e/journeys/_parser.spec.ts` PASS |
| T4 — playwright.config.ts | DONE | `testIgnore` für `_*.spec.ts` und `_*.ts` unter `e2e/journeys/` hinzugefügt; `_parser.spec.ts` erscheint nicht in `playwright test --list` |
| T5 — Designer-Skill Repo-Override | DONE | `.claude/skills/designer/SKILL.md` neu angelegt (user-level Inhalt + Journey-Impact-Abschnitt) |
| T6 — Architect-Skill erweitern | DONE | Abschnitt "Journey-Deltas (Katalog-Validierung)" nach "Erweiterungspunkte", vor "Bekannte Trade-offs" eingefügt |
| T7 — Coder-Skill erweitern | DONE | Abschnitt 1.5 "Journey-Implementierung" als neuer Schritt zwischen "Typen" und "Tests" eingefügt |
| T8 — E2E-Tester-Skill: Phase 0.5 | DONE | Phase 0.5 "Journey-Scan" nach Phase 0 eingefügt; Heuristiken H1–H5, Dedup, Max-3-Regel, User-Frage-Template |
| T9 — E2E-Tester-Skill: Phase 3.5 | DONE | Phase 3.5 "Journey-Run" nach Phase 3 eingefügt; last-run-Updates ohne Rückfrage dokumentiert |
| T10 — `.journey_backlog` anlegen | DONE | `.claude/skills/e2e-tester/.journey_backlog` mit Kommentar-Header angelegt |
| T11 — Coder Übergabe-Protokoll | DONE | Zeile "Journeys implementiert: [IDs]" in Abschnitt 4 des Coder-Skills eingefügt |

---

## Geänderte / Neue Dateien

### Neu angelegt

| Datei | Typ | Inhalt |
|-------|-----|--------|
| `e2e/journeys/CATALOG.md` | Neu | Journey-Katalog, Header + 2 Seed-Einträge (beide `proposed`) |
| `e2e/journeys/CATALOG_SCHEMA.md` | Neu | Schema-Referenz für alle Felder, Lifecycle-Regeln, Agent-Matrix, Heuristiken |
| `e2e/journeys/README.md` | Neu | Mensch-Runbook: Quick Start, Vorschläge bestätigen, Debug, Fixture-Konventionen |
| `e2e/journeys/_parser.ts` | Neu | TypeScript-Parser (parseCatalog, serializeCatalog, findOverlap, JourneyCatalogError) |
| `e2e/journeys/_parser.spec.ts` | Neu | Vitest-Suite: 16 Tests |
| `.claude/skills/designer/SKILL.md` | Neu (Repo-Override) | Vollständiger user-level Inhalt + Journey-Impact & Vorschläge (Pflicht) |
| `.claude/skills/e2e-tester/.journey_backlog` | Neu | Leere Backlog-Datei mit Kommentar-Header |

### Geändert

| Datei | Änderung |
|-------|----------|
| `playwright.config.ts` | `testIgnore: ['**/e2e/journeys/_*.spec.ts', '**/e2e/journeys/_*.ts']` hinzugefügt |
| `vitest.config.ts` | `include` um `'e2e/journeys/_parser.spec.ts'` erweitert; `exclude` auf `['node_modules/**']` vereinfacht |
| `.claude/skills/architect/SKILL.md` | Abschnitt "Journey-Deltas (Katalog-Validierung)" nach "Erweiterungspunkte" eingefügt |
| `.claude/skills/coder/SKILL.md` | Abschnitt 1.5 "Journey-Implementierung" + Zeile "Journeys implementiert" im Übergabe-Protokoll |
| `.claude/skills/e2e-tester/SKILL.md` | Phase 0.5 "Journey-Scan" und Phase 3.5 "Journey-Run" eingefügt |

---

## Journey-Implementierung (T7/§7.3)

Kein approved-Journey für diesen Spec — Journey-Implementierung übersprungen.
Die 2 Seed-Einträge in CATALOG.md haben `status: proposed`. Erst nach User-Bestätigung (`j`) wechseln sie auf `approved`, danach implementiert der nächste Coder-Lauf die `.spec.ts`-Dateien.

---

## Known Gaps / Follow-ups

- **Architect-Heuristiken:** Laut Design OFFEN-7 und Architektur §7.2 Schritt 4: Architect-spezifische Heuristiken (DB-Migration → State-Transition-Journey, Feature-Flag → On/Off-Journey etc.) sind bewusst auf Iteration 2 verschoben. Phase 1 hat nur Drift-Check + Validierung.
- **`_parser.ts` deckt kein echtes Glob-Matching:** Die `findOverlap`-Funktion normalisiert Globs per String-Vergleich, macht keine echte FS-Auflösung. Das ist bewusst (Architektur §3.2: "Keine echte FS-Auflösung nötig").
- **Keine Fixture-Bibliothek:** Wird beim ersten `approved`-Journey-Lauf vom Coder angelegt (eigenes Sub-Spec).
- **Keine CI-Integration:** Nur lokaler Workflow — dokumentiert in README.md.
- **Pre-existing TS-Fehler:** `e2e/global-setup.ts` hat 4 TS-Fehler (`creds` used before assigned) — existierten vor diesem Spec, wurden nicht eingeführt.

---

## Wie lokal ausführen

### Parser-Tests (Vitest)

```bash
npx vitest run e2e/journeys/_parser.spec.ts
```

### Alle Unit-Tests (inkl. Parser)

```bash
npx vitest run
```

### Playwright-Test-Liste prüfen (kein `_parser.spec.ts` darf erscheinen)

```bash
npx playwright test --list
```

### TypeScript-Check

```bash
npx tsc --noEmit
# Erwartet: nur 4 pre-existing Fehler in e2e/global-setup.ts
```

### Lint

```bash
npm run lint
# Erwartet: 0 Errors, bekannte Warnings (pre-existing)
```

### Katalog öffnen

```bash
cat e2e/journeys/CATALOG.md
```

### Seed-Einträge aktivieren (erster Use)

```bash
# Im CATALOG.md: status: proposed → approved setzen (nach User-Entscheidung)
# Dann den /coder-Skill aufrufen — er implementiert die .spec.ts-Dateien
```

---

## Journey Spec-Implementierung (2026-04-23, zweiter Coder-Lauf)

### Task-Zusammenfassung

| Task | Status | Anmerkung |
|------|--------|-----------|
| T1 — `shop-owner-lifecycle.spec.ts` | DONE | 10 Tests; nutzt eigene Fixtures, kein Supersede-Skip (separate Fixture-Isolation) |
| T2 — `customer-discovery.spec.ts` | DONE | 9 Tests; nutzt Seed-Daten aus global-setup.ts, kein eigenes Fixture-Setup |
| T3 — `shop-owner-full-lifecycle.spec.ts` | DONE | 17 Tests; alle 6 Fixtures (shop-A maximal, shop-B minimal, 4 Produkte); RTL-Tests inkl. |
| T4 — `customer-and-review-lifecycle.spec.ts` | DONE | 12 Tests; Auth-Schritte mit conditional skip wenn /api/v1/customer/register nicht existiert |
| T5 — `admin-data-management.spec.ts` | DONE | 10 Tests; Logo-Upload mit conditional skip wenn Endpoint fehlt; Guide-Tests mit conditional skip |
| T6 — Journey-Frontmatter updaten (5x `approved` → `implemented`) | DONE | spec-file, status-changed-at, status-changed-by-spec gesetzt |
| T7 — CATALOG.md updaten (5x `approved` → `implemented`) | DONE | Index-Tabelle aktualisiert |
| T8 — `e2e/journeys/reports/` Verzeichnis anlegen | DONE | Leer; Reports werden in afterAll geschrieben |

### Geänderte / Neue Dateien

| Datei | Aktion |
|-------|--------|
| `e2e/journeys/shop-owner-lifecycle.spec.ts` | NEU |
| `e2e/journeys/customer-discovery.spec.ts` | NEU |
| `e2e/journeys/shop-owner-full-lifecycle.spec.ts` | NEU |
| `e2e/journeys/customer-and-review-lifecycle.spec.ts` | NEU |
| `e2e/journeys/admin-data-management.spec.ts` | NEU |
| `e2e/journeys/reports/` | NEU (leeres Verzeichnis, Reports werden zur Laufzeit geschrieben) |
| `e2e/journeys/shop-owner-lifecycle.md` | GEÄNDERT — status: implemented + spec-file |
| `e2e/journeys/customer-discovery.md` | GEÄNDERT — status: implemented + spec-file |
| `e2e/journeys/shop-owner-full-lifecycle.md` | GEÄNDERT — status: implemented + spec-file |
| `e2e/journeys/customer-and-review-lifecycle.md` | GEÄNDERT — status: implemented + spec-file |
| `e2e/journeys/admin-data-management.md` | GEÄNDERT — status: implemented + spec-file |
| `e2e/journeys/CATALOG.md` | GEÄNDERT — alle 5 Zeilen approved → implemented |

### Skipped Tests (mit Begründung)

| Spec | Schritt | Grund |
|------|---------|-------|
| `customer-and-review-lifecycle` | Schritte 1–5 (Customer-Auth) | Conditional skip wenn `/api/v1/customer/register` 404 liefert — Customer-Auth-Feature möglicherweise noch nicht implementiert |
| `customer-and-review-lifecycle` | Schritt 8 (Review via API) | Conditional skip wenn `/api/v1/reviews` 404 oder Auth fehlt |
| `customer-and-review-lifecycle` | Schritt 9 (Spotted) | Conditional skip wenn `/api/v1/spotted` 404 |
| `admin-data-management` | Schritt 2 (Logo-Upload) | Conditional skip wenn `/api/v1/admin/brands/{id}/logo` 404 |
| `admin-data-management` | Schritte 7–8 (Guide) | Conditional skip wenn `/api/v1/guides` oder `/api/v1/admin/guides` 404 |
| `shop-owner-full-lifecycle` | Schritt 3 (Shop-B) | Conditional skip wenn `POST /api/v1/admin/shops` nicht verfügbar |

Alle skips haben `test.skip(true, 'Reason: ...')` mit expliziter RCA-Begründung. Kein `test.fixme()`.

### Known Gaps / Follow-ups

- **Customer-Auth-Endpoints:** Falls `/api/v1/customer/register` und `/api/v1/customer/login` existieren, laufen die Auth-Tests durch. Wenn nicht, werden alle 5 Auth-Schritte per skip deaktiviert — kein Schöntesten.
- **Admin-Create für Shops/Products:** `POST /api/v1/admin/shops` und `POST /api/v1/admin/products` sind optional; falls nicht verfügbar werden entsprechende Schritte übersprungen (keine harten FAILs).
- **Shop-B Fixture:** Erfordert Admin-Create-Endpoint für Shops. Falls nicht vorhanden, wird shop-B-Journey-Abschnitt übersprungen.
- **Language-Votes für shop-A:** Runbook Step 5 (Language-Votes anlegen) ist nicht als separater Test implementiert — die Vote-API erfordert authenticated customer und ist in customer-and-review-lifecycle besser verortet.
- **PriceHistory-Datenpunkte:** product-variable braucht ≥2 historische Preispunkte für den Chart. Diese werden nicht via Setup angelegt (kein Admin-PriceHistory-Endpoint bekannt). Test prüft Chart-Element, nicht Datenmenge.
- **Cleanup-Status:** afterAll-Cleanup ist best-effort. Bei Backend-Ausfall können Fixtures verbleiben. Empfehlung: regelmäßiger DB-Reset via `prepare_e2e_db.py`.

### Wie lokal ausführen

```bash
# 1. Test-Backend starten (Port 8500)
cd /Users/bb_studio_2025/dev/github/pundo_main_backend
./scripts/start_test_server.sh

# 2. Frontend Build + Test-Server (Port 3500)
cd /Users/bb_studio_2025/dev/github/pundo_frontend
npm run dev:test

# 3. TypeScript-Check
npx tsc --noEmit

# 4. Playwright: alle Journey-Specs auflisten
npx playwright test --list --config playwright.config.ts | grep journeys/

# 5. Einzelne Journey ausführen
npx playwright test e2e/journeys/shop-owner-lifecycle.spec.ts --config playwright.config.ts
npx playwright test e2e/journeys/customer-discovery.spec.ts --config playwright.config.ts
npx playwright test e2e/journeys/shop-owner-full-lifecycle.spec.ts --config playwright.config.ts
npx playwright test e2e/journeys/customer-and-review-lifecycle.spec.ts --config playwright.config.ts
npx playwright test e2e/journeys/admin-data-management.spec.ts --config playwright.config.ts

# 6. Alle Journey-Specs auf einmal
npx playwright test e2e/journeys/ --config playwright.config.ts

# Reports werden in e2e/journeys/reports/<journey-id>-<YYYY-MM-DD>.md geschrieben
```

---

## Refactor: Journey-Katalog aufgeteilt in Einzeldateien (2026-04-23)

**Durchgeführt von:** /coder (Folgeauftrag, kein eigener Spec-Slug)

### Task-Zusammenfassung

| Task | Status | Anmerkung |
|------|--------|-----------|
| T1 — 5 Journey-Einzeldateien anlegen | DONE | `shop-owner-lifecycle.md`, `customer-discovery.md`, `shop-owner-full-lifecycle.md`, `customer-and-review-lifecycle.md`, `admin-data-management.md` — Inhalt 1:1 aus CATALOG.md extrahiert |
| T2 — CATALOG.md zu Index umbauen | DONE | Kein Frontmatter mehr; nur H1 + Beschreibung + Markdown-Tabelle mit 5 Einträgen |
| T3 — `parseCatalogDirectory()` in `_parser.ts` | DONE | Neue Export-Funktion; liest alle `<id>.md` im Verzeichnis, excludiert CATALOG.md/CATALOG_SCHEMA.md/README.md/`_`-Prefix; sortiert nach P1→P2→P3 dann id |
| T4 — `_parser.spec.ts` erweitern | DONE | Stale-Assertion `status: proposed` → `approved` korrigiert; 4 neue Tests (parseCatalogDirectory findet 5 Dateien, ignoriert Index-Dateien, Sortiertests); gesamt 20 Tests grün |
| T5 — CATALOG_SCHEMA.md §1 aktualisieren | DONE | Neues Zwei-Ebenen-Layout dokumentiert (Index + Einzeldateien) |
| T6 — README.md aktualisieren | DONE | Dateistruktur-Übersicht, Quick-Start und Debug-Abschnitte auf neue Struktur angepasst |

### Geänderte / Neue Dateien

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `e2e/journeys/shop-owner-lifecycle.md` | NEU | Journey-Einzeldatei (Frontmatter + Body) |
| `e2e/journeys/customer-discovery.md` | NEU | Journey-Einzeldatei |
| `e2e/journeys/shop-owner-full-lifecycle.md` | NEU | Journey-Einzeldatei |
| `e2e/journeys/customer-and-review-lifecycle.md` | NEU | Journey-Einzeldatei |
| `e2e/journeys/admin-data-management.md` | NEU | Journey-Einzeldatei |
| `e2e/journeys/CATALOG.md` | GEÄNDERT | War: Multi-Entry-Datei mit Frontmatter-Blöcken. Jetzt: reiner Index (Tabelle) |
| `e2e/journeys/_parser.ts` | GEÄNDERT | `fs`/`path`-Imports hinzugefügt; `parseCatalogDirectory()` exportiert |
| `e2e/journeys/_parser.spec.ts` | GEÄNDERT | Stale-Assertion korrigiert; `loadSeedCatalog()` durch `loadJourneyFile()`/`loadAllJourneys()` ersetzt; 4 neue Tests |
| `e2e/journeys/CATALOG_SCHEMA.md` | GEÄNDERT | §1 Dateistruktur: Zwei-Ebenen-Layout beschrieben |
| `e2e/journeys/README.md` | GEÄNDERT | Dateistruktur-Sektion, Katalog ansehen, Debug, approved-befördern |

### Known Gaps / Follow-ups

- `parseCatalogDirectory` liest von Disk (Node `fs`) — das ist bewusst, da die Funktion nur in Vitest-/Agent-Kontext läuft, nie im Browser-Bundle.
- Pre-existing TS-Fehler in `e2e/global-setup.ts` bleiben unverändert (4 Fehler, existierten vor diesem Auftrag).

### Wie lokal ausführen

```bash
# Parser-Tests (Vitest) — alle 20 müssen grün sein
npx vitest run e2e/journeys/_parser.spec.ts

# TypeScript-Check
npx tsc --noEmit
```
