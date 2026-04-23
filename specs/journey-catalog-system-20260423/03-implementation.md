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
