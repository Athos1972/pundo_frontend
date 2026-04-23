# Journey Catalog — Runbook für Menschen

Dieses Verzeichnis enthält den **selbstpflegenden Journey-Katalog** für pundo_frontend.
Agents (designer, architect, coder, e2e-tester) schlagen User-Journeys vor und pflegen sie.
Du (Bernhard) bestätigst jeden Vorschlag mit `j` oder lehnst ihn mit `n` ab.

---

## Quick Start

### Katalog ansehen

```bash
cat e2e/journeys/CATALOG.md
```

### Einen Journey-Testlauf starten (nach Implementation)

```bash
# Einzelne Journey (wenn spec-file existiert)
npx playwright test e2e/journeys/shop-owner-lifecycle.spec.ts

# Alle implementierten Journeys
npx playwright test e2e/journeys/
```

### Parser-Tests ausführen

```bash
# Vitest direkt — nicht über playwright.config.ts!
npx vitest run e2e/journeys/_parser.spec.ts
```

---

## Vorschläge bestätigen

Wenn ein Agent eine neue Journey vorschlägt, zeigt er dir:

```
Ich schlage folgende neue Journey vor:

  id: public-route-visibility-dashboard
  title: Dashboard Public Route Visibility
  status: proposed
  touches-modules:
    - src/app/dashboard/**
    - src/lib/api.ts
  Grund: H1 — neue page.tsx in src/app/dashboard/

Katalogeintrag anlegen? (j/n)
```

- `j` → Agent schreibt Eintrag in CATALOG.md
- `n` → Agent schreibt Eintrag mit `status: skipped` und `skip-reason`

**Wichtig:** Du musst nie selbst in CATALOG.md schreiben. Die Agents tun das nach deiner Bestätigung.

---

## Journey-Status-Überblick

| Status | Bedeutung | Wer kann ändern |
|--------|-----------|-----------------|
| `proposed` | Vorgeschlagen, noch nicht bestätigt | designer / architect / e2e-tester |
| `approved` | Von dir bestätigt, wartet auf Implementierung | Agent nach deiner Bestätigung |
| `implemented` | Coder hat `.spec.ts` geschrieben | nur coder |
| `skipped` | Von dir abgelehnt (mit Begründung) | Agent nach deiner Ablehnung |
| `deprecated` | Feature entfernt, Journey obsolet | designer oder architect |

---

## Implementierten Journey von `proposed` zu `approved` befördern

Wenn du eine vorgeschlagene Journey genehmigen willst, ohne dass ein Agent gerade aktiv ist:

1. Öffne `CATALOG.md`
2. Ändere `status: proposed` → `status: approved`
3. Aktualisiere `status-changed-at` auf jetzt (ISO-8601 UTC)
4. Setze `status-changed-by-spec: ad-hoc`
5. Committe die Änderung

Beim nächsten `/coder`-Lauf wird er die `approved`-Journey automatisch implementieren.

---

## Debug — Parser-Fehler

Falls ein Agent "JourneyCatalogError" meldet:

```
JourneyCatalogError: Missing required field 'status' at line 12
```

1. Öffne `CATALOG.md`
2. Suche den Eintrag bei Zeile 12
3. Füge das fehlende Pflichtfeld hinzu (siehe CATALOG_SCHEMA.md §2 für alle Pflichtfelder)
4. Führe zur Verifikation aus: `npx vitest run e2e/journeys/_parser.spec.ts`

---

## Fixture-Konventionen

Journey-Fixtures (Test-Daten) werden in `e2e/journeys/fixtures/` abgelegt:

```
e2e/journeys/
├── fixtures/
│   ├── shop-owner.json     # Testdaten für Shop-Owner-Lifecycle
│   └── products.json       # Produktdaten für Customer-Discovery
├── CATALOG.md
├── CATALOG_SCHEMA.md
├── README.md               (diese Datei)
├── _parser.ts              # TypeScript-Parser (Vitest, kein Playwright)
├── _parser.spec.ts         # Parser-Tests (Vitest)
└── <id>.spec.ts            # Journey-Tests (Playwright, erst wenn implemented)
```

Fixture-Format: JSON-Array, kompatibel mit Backend-Fixture-Loader.

---

## Koexistenz: `.last_run` vs. Katalog-`last-run`

Es gibt zwei Zeitmarker:

| Marker | Pfad | Scope | Schreiber |
|--------|------|-------|-----------|
| Gesamt-`.last_run` | `.claude/skills/e2e-tester/.last_run` | Gesamt-Repo (git-SHA + Timestamp) | e2e-tester Phase 4 |
| Journey-`last-run` | `CATALOG.md` pro Eintrag | Journey-spezifisch (ISO-8601) | e2e-tester Phase 4 (ohne Rückfrage) |

Das ist kein Fehler — beide Marker haben unterschiedliche Scopes und existieren bewusst nebeneinander.

---

## `_parser.ts` ist kein Playwright-Test

`_parser.ts` und `_parser.spec.ts` beginnen mit Unterstrich-Prefix (`_`). Das ist bewusst:

- Playwright ignoriert Dateien mit `_`-Prefix per Konvention
- Die Tests laufen via **Vitest**, nicht Playwright
- Grund: Der Parser ist pure Logik, kein Browser nötig

```bash
# Richtig:
npx vitest run e2e/journeys/_parser.spec.ts

# Falsch (läuft nicht):
npx playwright test e2e/journeys/_parser.spec.ts
```

---

## Journey-Backlog

Wenn der e2e-tester in einem Lauf mehr als 3 neue Journey-Vorschläge hat, parkt er überschüssige in:

```
.claude/skills/e2e-tester/.journey_backlog
```

Diese werden beim nächsten Lauf erneut geprüft (und ggf. wieder gefiltert).
Die Datei ist absichtlich im Git — du kannst sie lesen und verwalten.

---

## Known Limitations (Phase 1)

- **Keine automatische CI-Integration.** Journey-Tests laufen nur lokal.
- **Kein `version`-Feld.** Änderungen an Schritten werden per Git-History nachvollzogen.
- **Kein Text-Editor-Diff.** Nur `j/n` je Vorschlag (Text-Edit-Option kommt ggf. in Phase 2).
- **Architect-Heuristiken eingeschränkt.** Phase 1 hat Architect nur Drift-Check + Validierung; eigene Heuristiken kommen in Phase 2.
- **Keine Fixture-Bibliothek.** Wird beim ersten `approved`-Journey-Lauf vom Coder mit angelegt.
