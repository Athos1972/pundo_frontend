# Playbook e2e-tester — pundo_frontend

Gelesen vom Agent `e2e-tester` (~/.claude/agents/e2e-tester.md). Kettenprotokoll und Workflow-Regeln stehen dort und in Conventions § Spec-Workflow; hier steht nur Repo-Wissen.

Rolle in diesem Repo: Gesamtverantwortung für die Testabdeckung — Diff seit letztem Lauf analysieren, TypeScript und Lint prüfen, fehlende Unit-Tests nachschreiben, dann Browser-E2E-Tests.

**Referenzdateien (bei Bedarf lesen):**
- `reference/e2e-tester-journey-scan.md` — Phase 0.5 Schritt 3–6 (Heuristiken H1–H5, Dedup, Max-3, Report-Format)
- `reference/e2e-tester-scenarios.md` — Phase 3.1: Observable-Outcome-Prinzip + Szenarien E2E-01..08
- `reference/e2e-tester-report-templates.md` — Phase 5: TESTSET.md-Vorlage + Abschlussbericht
- `reference/e2e-tester-docs-vault.md` — Phase 5.5 Living Docs Sync + Phase 5.6 Issue-Update im Vault

**State-Dateien (in Git):** `.claude/playbooks/state/e2e-tester.last_run` (letzter Lauf: SHA, Verdict, open_failures — gelesen von `scripts/verdict-gate.mjs`), `.claude/playbooks/state/e2e-tester.journey_backlog` (geparkte Journey-Vorschläge).

**Grundregeln:**
**Grundregeln:**
- Secrets kommen aus der Umgebung, statt hardcodet in Code oder Tests zu stehen.
- Produktivdaten nur lesen, nicht verändern — es sind Echtdaten.
- **Test-Umgebung:** Alle Tests laufen auf Port **3500** (Frontend) + **8500** (Backend-Test-DB `pundo_test`). Am Studio gibt es keine Prod-DB (siehe AGENTS.md, Studio-Hinweis F6995).
- **Voraussetzung für E2E/Smoke-Tests:** Frontend (3500) und Backend (8500) laufen beide. Es gibt keine "nur-Frontend"-Tests. Ist das Backend down, starte es (`cd pundo_main_backend && ./scripts/start_test_server.sh &`) statt Tests ohne Backend durchzuführen; bleibt es down → betroffene Kriterien BLOCKED.
- **Restart-Regel:** Test-Instanzen (3500 / 8500) dürfen automatisch neu gestartet werden. Produktiv-Instanzen (3000 / 8000) startet nur der User manuell oder auf ausdrückliche Aufforderung neu, weil dort Echtdaten und laufende Nutzer hängen.
- Akzeptanzkriterien sind messbar (Selektor, URL, Text, CSS-Eigenschaft).
- Commit-Policy, Rückfragen, Verdict-Definitionen: siehe Agent und Conventions § Spec-Workflow.
- Bei Coverage-Unterschreitung dokumentieren und weitermachen, statt zu blockieren.
- **Kein Schöntesten:** Journey-Tests werden nie "passend gebogen". FAIL = FAIL, bis RCA entschieden hat ob Testfehler oder Funktionsfehler. Findings sind wertvoller als grüne Tests die Fehler verstecken.
- **Kein pre-existing-Label (F8950):** Es gibt keinen Status "pre-existing" mehr. Jedes FAIL ist `OFFEN`, `IN ARBEIT`, `GELÖST` oder `QUARANTÄNE` und hat eine Bug-Datei im zentralen Vault-Register (`00 Überblick/__ Bugs & Hotfixes/`). Ein FAIL blockiert das Verdict bis er GELÖST ist oder BB explizit entschieden hat. Quarantäne erfordert BB-Signatur (`test.fixme()` + `// QUARANTÄNE B<id> — <Grund> — <Datum>`).
- **Gate-Invariante (F8950):** `verdict:"SHIP"` ist nur erlaubt wenn `open_failures` ein leeres Array ist. Vor dem SHIP-Verdict: `node scripts/verdict-gate.mjs` ausführen — bei exit≠0 ist SHIP verboten → Verdict `FIX` oder `ESCALATE`.
- **Human-readable Reports:** Jeder Journey-Lauf produziert einen Report in `e2e/journeys/reports/`, der ohne Code-Kenntnisse nachvollziehbar ist.
- **Test-Daten-Matrix:** Gegenseitig ausschließende Zustände bekommen eigene Fixtures. Nie Zustände "zusammenpappen" um einen Test zu vereinfachen.
- **DB-Reset-Regel: `pundo_test` wird nie automatisch zurückgesetzt, weil es Echtdaten aus Prod enthält.** Weder `global-setup.ts` noch `pytest`-Fixtures dürfen die DB ohne explizites `E2E_RESET_DB=true` löschen. Tests nutzen die bestehenden Daten und legen bei Bedarf neue Datensätze per API an, statt DROP/TRUNCATE zu verwenden.
- **Testdaten auffüllen:** Wenn `pundo_test` zu leer wirkt und Tests an fehlenden Daten scheitern, Prod→Test-Sync ausführen: `cd /Users/bb_studio_2025/dev/github/pundo_main_backend && source .venv/bin/activate && ./scripts/sync_prod_to_test.sh`. Das Script holt echte Business-Daten (Shops, Items, Kategorien etc.) per SSH von Hetzner — kein Auth/PII, E2E-Fixtures bleiben erhalten.
- **Expliziter Reset** nur wenn unbedingt nötig (Migrations-Test, CI): `E2E_RESET_DB=true npx playwright test` bzw. `E2E_RESET_DB=true pytest`.

---

## Ablauf-Übersicht

```
Phase 0:   Scope-Ermittlung     (git diff → was wurde geändert?)
Phase 0.5: Journey-Scan         (Katalog → mustRun, Drift, Vorschläge)
Phase 1:   Statische Prüfung    (TypeScript + ESLint → fehlerfrei?)
Phase 2:   Unit-Tests           (Vitest → Coverage-Lücken schließen)
Phase 3:   Visual Smoke-Test    (Pflicht — immer, unabhängig vom Scope)
Phase 3.1: E2E/Browser-Tests    (Playwright → Routing, UI, RTL, Responsive)
Phase 3.5: Journey-Run          (mustRun-Journeys ausführen)
Phase 4.5: Quality-Gate         (RCA-Klassifikation, Bug-Register, Gate, Schön-Test-Check, Coder-Trigger)
Phase 5:   Qualitäts-Gate       (Zusammenfassung + TESTSET.md)
Phase 5.5: Living Docs Sync     (llms.txt, README.md, AGENTS.md — nicht-blocking)
Phase 5.6: Issue-Update         (Bug/Feature-Datei im Obsidian-Vault)
```

---

## Phase 0: Scope-Ermittlung

### last_run-Marker lesen (`state/e2e-tester.last_run`)

```bash
LAST_RUN_FILE=".claude/playbooks/state/e2e-tester.last_run"

if [ -f "$LAST_RUN_FILE" ]; then
  LAST_SHA=$(python3 -c "import json; d=json.load(open('$LAST_RUN_FILE')); print(d['sha'])")
  echo "Letzter Testlauf: $LAST_SHA"
  DIFF_BASE="$LAST_SHA"
else
  echo "Kein last_run gefunden – diff gegen main"
  DIFF_BASE="main"
fi
```

### Geänderte Dateien ermitteln

```bash
# Geänderte Source-Files (nicht Tests)
git diff "$DIFF_BASE" --name-only -- 'src/**/*.ts' 'src/**/*.tsx' | grep -v '\.test\.'

# Geänderte Test-Files
git diff "$DIFF_BASE" --name-only -- 'src/tests/**'

# Uncommitted changes
git status --short
```

### Scope-Matrix aufbauen

Für jede geänderte Source-Datei: welche Tests sind zuständig?

```
Naming-Konvention: src/tests/<komponentenname-oder-modul>.test.ts(x)
Beispiel: src/components/product/ProductCard.tsx geändert
→ src/tests/ProductCard.test.tsx prüfen/erstellen
```

**Ergebnis Phase 0:**
```
Geänderte Module: [Liste]
Zugehörige Tests:  [Liste – vorhanden / fehlt]
Ungetestete Module (unter Schwellwert): [Liste]
```

---

## Phase 0.5: Journey-Scan

**Kommt nach Phase 0 (Scope-Ermittlung), vor Phase 1 (Statische Prüfung).**

Lädt den Journey-Katalog, bestimmt welche Journeys laufen müssen und scannt proaktiv nach fehlenden Journeys (Vorschläge gehen in den Report, keine Rückfrage).

### Schritt 1: Katalog laden und mustRun-Liste aufbauen

```bash
# Katalog prüfen
ls e2e/journeys/CATALOG.md || echo "Kein Katalog vorhanden — Phase 0.5 überspringen"
```

```typescript
// Intern (per parseCatalogDirectory aus e2e/journeys/_parser.ts):
// Liest alle <id>.md-Dateien im Verzeichnis — CATALOG.md ist nur Index
const catalog = parseCatalogDirectory('e2e/journeys')
const implemented = catalog.filter(e => e.status === 'implemented')

// mustRun: Einträge deren touches-modules sich mit dem Phase-0-Diff schneiden
const mustRun = implemented.filter(entry =>
  entry.touchesModules.some(glob => diffIncludes(glob, phase0Diff))
)
```

Wenn kein CATALOG.md existiert: `"Journey-Scan: kein Katalog gefunden — Phase 0.5 übersprungen"` in Abschlussbericht, weiter mit Phase 1.

### Schritt 2: Drift-Check (AC-9)

Für jeden Katalog-Eintrag (alle Status): prüfe den statischen Pfadpräfix jedes `touches-modules`-Globs.

```bash
# Beispiel: Glob "src/app/shop-admin/**" → statischer Präfix "src/app/shop-admin"
ls src/app/shop-admin 2>/dev/null || echo "STALE: src/app/shop-admin"
```

- Bei fehlendem Pfad: Warnung `"Stale touches-modules in <journey-id>: <glob> existiert nicht mehr"` sammeln.
- Stale Einträge zählen **konservativ als "muss laufen"** (nicht still übergehen) + Warnung im Abschlussbericht.
- Drift-Warnings sind **kein Blocker** — dokumentieren und weitermachen.

### Schritt 3–6: Heuristik-Scan, Dedup, Max-3-Regel, Vorschläge in den Report

Lies bei Phase 0.5: `reference/e2e-tester-journey-scan.md`. Kurzfassung: Diff gegen Heuristiken H1–H5 scannen, per `findOverlap` (Jaccard ≥ 0.50) deduplizieren, maximal 3 Vorschläge pro Lauf (Überschuss → `.claude/playbooks/state/e2e-tester.journey_backlog`), alle Vorschläge unter „Entscheidungen für Bernhard“. Katalog-Einträge nur nach Freigabe schreiben — außer `last-run`/`last-result` (Phase 3.5).

---

## Phase 1: Statische Prüfung

### TypeScript

```bash
npx tsc --noEmit 2>&1
```

**Akzeptanzkriterium:** Exit-Code 0, keine Fehler.
Falls Fehler: Analysieren, fixen (oder als KNOWN_ISSUE dokumentieren).

### ESLint

```bash
npm run lint 2>&1
```

**Akzeptanzkriterium:** Keine Errors. Warnings prüfen — relevante fixen.

### Status dokumentieren

```
TypeScript: PASS / X Fehler
ESLint:     PASS / X Errors / Y Warnings
```

---

## Phase 2: Unit-Tests (Vitest)

### Schwellwerte

| Modul-Typ | Minimum | Ziel |
|-----------|---------|------|
| Pure Logik (`src/lib/utils.ts`, Mapper, Formatter) | **80%** | **90%** |
| Komponenten (React-Rendering-Logik) | **70%** | 80% |
| API-Client (`src/lib/api.ts`) | **70%** | 80% |

### Vitest einrichten (falls noch nicht vorhanden)

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom @vitest/coverage-v8
```

### Coverage messen

```bash
# Alle Tests + Coverage
npx vitest run --coverage 2>&1 | tail -40

# Einzelne Datei
npx vitest run src/tests/<name>.test.tsx --coverage
```

### Coverage-Status dokumentieren

```
Coverage-Snapshot (Phase 2):
  src/lib/utils.ts:         XX%  [PASS/GAP]
  src/lib/api.ts:           XX%  [PASS/GAP]
  src/lib/translations.ts:  XX%  [PASS/GAP]
  src/components/product/*: XX%  [PASS/GAP]
  ...
```

### Lücken schließen

Priorität 1: Geänderte Module unter Schwellwert
Priorität 2: Module mit 0% Coverage
Priorität 3: Logik-Module unter 90% (auch wenn ungeändert)

```typescript
// src/tests/<name>.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('FeatureName', () => {
  it('Normalfall', () => { ... })
  it('Edge Case', () => { ... })
  it('Fehlerfall', () => { ... })
  it('RTL: setzt dir=rtl für ar', () => { ... })
})
```

**Mock-Entscheidungsmatrix:**

| Situation | Entscheidung |
|-----------|-------------|
| Pure Logik (Formatter, Utils) | Real, kein Mock |
| API-Fetch | `vi.mock('@/lib/api', ...)` oder `global.fetch = vi.fn()` |
| Next.js Navigation | `vi.mock('next/navigation', ...)` |
| next/image | Mock (`vi.mock('next/image', ...)`) |
| Leaflet/Map | `vi.mock('react-leaflet', ...)` |
| Browser-APIs | `vi.stubGlobal('navigator', ...)` |

### Nach dem Schreiben: Tests ausführen

```bash
npx vitest run src/tests/<name>.test.tsx
```

Alle neuen Tests müssen grün sein.

### Bei unvermeidbarer Unterschreitung

```
COVERAGE_GAP: <pfad> – aktuell X%, Ziel Y%
Ursache: <Begründung>  (z.B. Leaflet braucht DOM-Canvas, SSR-only Komponenten)
Status: dokumentiert, kein Blocker
```

---

## Phase 3: Visual Smoke-Test (läuft immer)

**Warum bei jedem Lauf?** Feature-Tests prüfen nur was gerade geändert wurde. Regressions entstehen durch Seiteneffekte. Der Smoke-Test läuft deshalb bei jedem Lauf, unabhängig davon was im Diff steht.

**Was er prüft:** Seiten die echte Daten rendern — nicht nur ob Routen erreichbar sind, sondern ob die gerendereten Daten korrekt sichtbar sind.

Echte Specs (nicht im Playbook duplizieren): `e2e/smoke.spec.ts`, `e2e/smoke-shop-visibility.spec.ts` (ggf. `e2e/journeys/visual-smoke.spec.ts`).

```bash
npx playwright test --config e2e/smoke-only.config.ts
```

Prinzipien, die neue Smoke-Checks erfüllen müssen: Customer-Routen immer mit `/{lang}/`-Präfix (z. B. `/de/products/<slug>`), Bilder über `naturalWidth > 0` prüfen, keine verdächtigen 3xx-Redirects (CDN-Hotlink-Block), Carousel bei Tablet-Breite ≥ 2 sichtbare Items.

**Wenn der Smoke-Test FAIL ist:** Stoppe sofort, analysiere Root Cause. Kein Feature-Test-Weiter ohne grünen Smoke.

---

## Phase 3.1: Browser-E2E-Tests (Playwright)

Konfiguration: bestehende `playwright.config.ts` (Port 3500/8500, verwirft Port 8000) — nicht neu anlegen. Spezial-Configs in `e2e/*.config.ts` (z. B. `smoke-only.config.ts`). Setup-Details: `docs/e2e-testing.md`.

### Vorbedingungs-Check (BLOCKIEREND — vor jedem E2E/Smoke-Lauf)

```bash
# Test-Frontend läuft? (Port 3500)
curl -s -o /dev/null -w "%{http_code}" http://localhost:3500/ || echo "BLOCKED: Test-Frontend nicht erreichbar"

# Test-Backend läuft? (Port 8500)
curl -s -o /dev/null -w "%{http_code}" "http://localhost:8500/api/v1/shops?limit=1" || echo "BLOCKED: Test-Backend nicht erreichbar"
```

> Beide Dienste geben 200 zurück, bevor irgendein Playwright-Test startet.
> Es gibt keine "nur-Frontend"-Tests — der Smoke-Test prüft auch datengetriebene Seiten.
>
> Wenn ein Dienst down ist:
> - **Backend down:** `cd /Users/bb_studio_2025/dev/github/pundo_main_backend && ./scripts/start_test_server.sh &`
>   Warten bis Uvicorn "Application startup complete" meldet, dann health-Check wiederholen.
> - **Frontend down:** `lsof -ti:3500 | xargs kill -9 2>/dev/null; npm run dev:test &`
>   Warten bis "Ready in Xms" erscheint.
>
> Teste erst, wenn beide Dienste laufen — mit einem down-Dienst enden Tests mit ERR_ABORTED und maskieren echte Fehler.

> **Umgebungsregel:** E2E-Tests laufen auf Port 3500 (Frontend) + 8500 (Backend), weil 3000/8000 Prod-Ports sind.

### Szenarien E2E-01..08

Lies bei Phase 3.1: `reference/e2e-tester-scenarios.md` (Grundprinzip „DOM-Präsenz ≠ korrekte Darstellung“, Akzeptanzkriterien je Szenario, Vorlagen-Snippets).

**E2E-08 (reaktive Sprachnavigation) ist Pflicht**, sobald der Diff `src/app/(customer)/layout.tsx`, `src/lib/useLang.ts`, `src/components/layout/{Header,Footer,NavLinks,FooterLinks,BottomTabBar}.tsx`, `src/components/spotted/SpottedGlobalButton.tsx`, `src/components/search/SearchSimilarButton.tsx` oder eine neue Client Component mit `lang`-Prop aus dem Root-Layout berührt. Spec: `e2e/journeys/reactive-language-switch.spec.ts`.

### Fehlerbehandlung

1. Exit-Code != 0: Playwright-Output lesen
2. Screenshots und Traces prüfen (Playwright speichert automatisch bei Fehler)
3. Root Cause analysieren (nicht nur Symptom)
4. Max 3 Versuche pro Fehler — dann KNOWN_ISSUE dokumentieren
5. Weiter mit nächstem Test

---

## Phase 3.5: Journey-Run

**Kommt nach Phase 3.1 (Browser-E2E-Tests), vor Phase 4.5 (Quality-Gate).**

Führt alle `implemented`-Journeys aus der `mustRun`-Liste (aus Phase 0.5) aus. Nur `implemented`-Einträge werden ausgeführt — niemals `proposed`, `approved`, `skipped` oder `deprecated`.

### Schritt 1: mustRun-Journeys ausführen

```bash
# Für jeden Eintrag in mustRun:
for journey_id in "${MUST_RUN[@]}"; do
  spec_file=$(grep -A1 "id: $journey_id" e2e/journeys/CATALOG.md | grep spec-file | awk '{print $2}')
  if [ -f "$spec_file" ]; then
    npx playwright test "$spec_file"
  else
    echo "STALE spec-file: $spec_file für Journey $journey_id nicht gefunden → FAIL"
  fi
done
```

Wenn `mustRun` leer ist: `"Phase 3.5: Keine mustRun-Journeys — übersprungen"` in Abschlussbericht.

### Schritt 2: Ergebnis pro Journey erfassen

| Ergebnis | Bedingung |
|----------|-----------|
| `PASS` | Playwright exit code 0 |
| `FAIL` | Playwright exit code != 0 oder `spec-file` fehlt trotz `status: implemented` |
| `SKIP` | Journey in mustRun aber explizit via `test.skip` in spec-file |

**Stale spec-file** (Datei fehlt trotz `status: implemented`):
- Ergebnis: `FAIL`
- Warnung im Abschlussbericht: `"Stale spec-file in <journey-id>: <pfad> existiert nicht"`
- Vorschlag unter „Entscheidungen für Bernhard“: Status zurück auf `approved`

### Schritt 3: last-run-Updates (OHNE User-Rückfrage)

Phase 3.5 schreibt für jeden gelaufenen Journey-Eintrag in CATALOG.md **ohne User-Bestätigung**:

```yaml
last-run: 2026-04-23T15:30:00Z     # jetzt, ISO-8601 UTC
last-result: PASS                    # oder FAIL / SKIP
last-run-sha: abc1234               # aktueller git-SHA
```

Das ist die einzige Katalog-Mutation, die **keine User-Bestätigung** erfordert.

### Journey-Report schreiben

Nach jedem Journey-Lauf schreibt der Tester einen Human-readable Report nach dem Format aus `CATALOG_SCHEMA.md §Journey-Prinzipien`:

- Datei: `e2e/journeys/reports/<journey-id>-<YYYY-MM-DD>.md`
- Enthält: Aufgebaute Fixtures mit IDs, Schritt-für-Schritt-Protokoll (Expected/Actual/Status), Findings-Tabelle, Cleanup-Status
- Dieser Report ist für manuelle Tester lesbar — keine Code-Kenntnisse nötig

### RCA-Pflicht bei FAIL

Wenn ein Journey-Schritt FAIL liefert:
1. Screenshot und Trace automatisch gespeichert (Playwright-Standard)
2. Assertion bleibt unverändert
3. Tester dokumentiert in Finding: Expected, Actual, mögliche Ursache
4. Tester klassifiziert per RCA (Kategorien siehe Phase 4.5, Schritt 2) — keine Rückfrage im Lauf. Ist die Klassifikation unsicher: als Finding behandeln und unter „Entscheidungen für Bernhard“ aufführen.
5. Finding: Eintrag in TESTSET.md unter `### Findings (unresolved)`, Katalog-`last-result: FAIL`, Bug-Datei (Phase 4.5)
6. Testfehler: nur mit Bug-Datei `category: TESTFEHLER` + `## Korrektheits-Beweis` korrigieren (F8950), dann erneut laufen

### Was Phase 3.5 nicht macht

- `status` eines Eintrags bleibt unverändert (Ausnahme: FAIL-Korrektur bei stale spec-file, nur nach Freigabe durch Bernhard).
- Einträge mit `proposed`, `skipped` oder `deprecated` werden übersprungen, nicht ausgeführt.
- Neue Journey-Vorschläge entstehen in Phase 0.5, nicht hier.

---

## Phase 4.5: Quality-Gate & Bug-Register (F8950)

**Kommt nach Phase 3.5 (Journey-Run), vor Phase 5 (Qualitäts-Gate & Dokumentation).**

Kein FAIL bleibt namenlos. Kein SHIP ohne leeres `open_failures`. Kein Schöntesten ohne dokumentierten Beweis.

### Schritt 1 — open_failures aus letztem Lauf laden

```bash
python3 -c "
import json
try:
  d = json.load(open('.claude/playbooks/state/e2e-tester.last_run'))
  print('Vorherige open_failures:', d.get('open_failures', []))
except Exception as e:
  print('Kein last_run — leere Liste annehmen')
"
```

Prüfe für jeden Eintrag in `open_failures` den aktuellen Status in der
jeweiligen Vault-Bug-Datei. Ist er `GELÖST` → aus der Liste entfernen.

### Schritt 2 — Neue FAILs RCA-klassifizieren (Pflicht)

Jeder FAIL aus Phase 1–3.5 bekommt verpflichtend eine Kategorie:

| Kategorie | Bedeutung | Owner |
|-----------|-----------|-------|
| `FUNKTIONSFEHLER` | Produktcode ist kaputt (inkl. ESLint-Error) | coder |
| `TESTFEHLER` | Test-Assertion/Selektor falsch, Funktion korrekt | coder — **nur mit Korrektheits-Beweis** |
| `FIXTURE-DEFEKT` | Testdaten/Fixture fehlen (z.B. sync_prod_to_test.sh) | e2e-tester |
| `FLAKY` | Intermittent — muss stabilisiert werden | coder → sonst ESCALATE → BB |

„Unbekannt" ist keine gültige Kategorie. Solange die Kategorie offen ist → `ESCALATE`.

### Schritt 3 — Bug-Dateien anlegen/aktualisieren

Für jeden FAIL (neu oder weiter offen):

```
Vault-Pfad: /Users/bb_studio_2025/Vaults/obsidian/Documents/Pundo-Plattform/
            00 Überblick/__ Bugs & Hotfixes/B<id> <Titel>.md
Template:   20 Features/FG8 Admin & Operations/Bugs/Bug-Template.md
(Alte Bug-Dateien unter 20 Features/FG*/Bugs/ sind Altbestand — dort keine neuen anlegen.)
```

Pflichtfelder: `id`, `type`, `category`, `status`, `repo: frontend`, `owner`,
`discovered`, `last-run-sha`, `journey`.

Dann Bug-ID in `e2e/TESTSET.md` unter „Open Failures" eintragen.

### Schritt 4 — Schön-Test-Diff-Check

```bash
LAST_SHA=$(python3 -c "import json; print(json.load(open('.claude/playbooks/state/e2e-tester.last_run')).get('sha','HEAD~1'))" 2>/dev/null || echo "HEAD~1")

# Entfernte oder abgeschwächte Assertion-Zeilen seit letztem Lauf
git diff "$LAST_SHA" -- 'e2e/**/*.ts' 'src/tests/**/*.ts' \
  | grep '^-' | grep -v '^---' \
  | grep -E '\.(toBe|toEqual|toHaveLength|toBeGreaterThan|toContain|toHaveCount|toBeVisible|toBeGreaterThanOrEqual)\('
```

Wenn Treffer: Für jede entfernte/abgeschwächte Assertion prüfen ob eine Bug-Datei
mit `category: TESTFEHLER` **und** ausgefülltem `## Korrektheits-Beweis` existiert.
- Beweis vorhanden → Änderung legitim.
- Beweis fehlt → Finding `SCHÖN-TEST-VERDACHT` im Report, Verdict `ESCALATE`.

Der Check ist Heuristik (Falsch-Positiv bei legitimem Refactoring möglich) →
deshalb `ESCALATE` (Mensch entscheidet), nicht auto-FAIL.

### Schritt 5 — Gate-Check

```bash
node scripts/verdict-gate.mjs
# exit 0 → SHIP erlaubt
# exit 1 → SHIP verboten → FIX oder ESCALATE
```

Baue die finale `open_failures`-Liste: alle Bug-Dateien im Scope mit `status != GELÖST`.

```
open_failures == []  → Verdict SHIP
open_failures != []  → Verdict FIX   (im Chain lösbar: coder bekommt Bugs)
                       oder ESCALATE (nicht im Chain lösbar: FLAKY/Datenmodell-Frage/
                                      fehlende Kategorie/Schön-Test-Verdacht/BB nötig)
```

**`SHIP` mit nicht-leerem `open_failures` ist ein Verstoß — verboten.**

### Schritt 6 — Handoff-Block bei FIX

Bei Verdict `FIX` am Ende des Reports einfügen:

```
## Handoff an den coder (FIX-Verdict)

Offene Bugs:
- B8950-NNN (KATEGORIE) — <Kurzbeschreibung>

Vault-Pfad Bug-Dateien:
  /Users/bb_studio_2025/Vaults/obsidian/Documents/Pundo-Plattform/
  00 Überblick/__ Bugs & Hotfixes/B8950-NNN <Titel>.md

Nächster Schritt: coder-Lauf mit diesen Bug-Dateien als Input.
```

---

## Phase 5: Qualitäts-Gate & Dokumentation

### last_run-Marker aktualisieren (`state/e2e-tester.last_run`)

```bash
CURRENT_SHA=$(git rev-parse HEAD 2>/dev/null || echo "no-commits-yet")
TIMESTAMP=$(python3 -c "from datetime import datetime, timezone; print(datetime.now(timezone.utc).isoformat())")

python3 -c "
import json
# INVARIANTE: verdict='SHIP' nur wenn open_failures leer ist (F8950 Gate)
data = {
  'sha': '$CURRENT_SHA',
  'timestamp': '$TIMESTAMP',
  'verdict': '$VERDICT',           # SHIP | FIX | ESCALATE — aus Phase 4.5 Gate
  'open_failures': open_failures,  # Liste von dicts; leer = Gate grün
  'coverage_snapshot': {}
}
with open('.claude/playbooks/state/e2e-tester.last_run', 'w') as f:
    json.dump(data, f, indent=2)
print('last_run aktualisiert:', '$CURRENT_SHA', '| verdict:', '$VERDICT')
"
```

### TESTSET.md und Abschlussbericht

Datei `e2e/TESTSET.md` aktualisieren und Abschlussbericht erstellen — Vorlagen: lies bei Phase 5: `reference/e2e-tester-report-templates.md`.

---

## Phase 5.5 / 5.6: Living Docs Sync und Issue-Update

Nicht-blocking. Ablauf, Heuristik-Befehle, Patch-Format und Verdict→Issue-Status-Mapping: lies bei Phase 5.5: `reference/e2e-tester-docs-vault.md`. Docs-Patches nie selbst anwenden, sondern unter „Entscheidungen für Bernhard“ aufführen.

---

## Wichtige Hinweise

- Produktivdaten bleiben unverändert: kein Schreiben in die Produktiv-DB (siehe Grundregeln).
- **Keine Migrationen „für prod“:** Prod migriert beim Backend-Start im Container automatisch (siehe Conventions.md, „Datenbanken“).
- **Test-Umgebung:** Frontend Port **3500**, Backend Port **8500**. Getestet wird gegen diese Test-Instanzen, nicht gegen Produktiv.
- **AGENTS.md lesen:** Next.js (Version siehe `package.json`) hat Breaking Changes — Docs prüfen!
- **RTL:** `dir` kommt aus `isRTL()` in `src/lib/lang.ts` — keine eigenen Sprachlisten in Tests oder Code.
- **Backend-Pfad:** Falls Backend-Änderungen nötig: `/Users/bb_studio_2025/dev/github/pundo_main_backend`
  - Backend-Playbooks: `.../pundo_main_backend/.claude/playbooks/`
- **E2E-03 (RTL) hat hohe Priorität** — Fehler hier betrifft AR/HE-Nutzer vollständig.
- **Coverage-Unterschreitung ist kein Blocker** — dokumentieren und weiter.
- **Leaflet/Map ist immer ein COVERAGE_GAP** — kein echter Canvas in JSDOM.
