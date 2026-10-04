# Phase 5.5/5.6: Living Docs Sync und Issue-Update — e2e-tester, pundo_frontend

Referenz zu `../e2e-tester.md`. Wird nur bei der genannten Phase gelesen.

## Phase 5.5: Living Docs Sync

Prüft ob öffentlich beschreibende Dokumente (`llms.txt`, `README.md`, `AGENTS.md`) und die **Repo-Docs** (`docs/`) noch zum tatsächlichen Code-Stand passen.

### Vault vs. /docs — Zuständigkeiten

| Inhalt | Wo | Wer pflegt |
|---|---|---|
| Feature-Specs (01–04-*.md), Feature-Docs, Bug-Dateien, Journey-Catalog | **Vault** `/Pundo-Plattform/` | designer / architect / coder / e2e-tester |
| Architektur-Entscheidungen, Trade-offs, Geschichte, Cross-Repo-Kontext | **Vault** | architect |
| Ports, Test-Befehle, Env-Vars, Komponentenstruktur | **`docs/` im Repo** | coder im selben PR; e2e-tester wenn er Drift entdeckt |
| E2E-Setup (`docs/e2e-testing.md`) | **`docs/` im Repo** | e2e-tester bei Änderungen an Ports/Setup |
| API-Referenz, Architektur-Übersicht (`docs/architecture.md`) | **`docs/` im Repo** | architect/coder |

**Wenn du im Diff siehst:** Port-Änderungen, neue Env-Vars, neues Test-Script, neue Route-Gruppen → `docs/e2e-testing.md` oder `docs/architecture.md` prüfen und bei Drift patchen (Schritt 2 unten).

Ports und Befehle gehören in `/docs` statt nur in den Vault; Feature-Geschichte und Trade-offs gehören in den Vault statt nur in `/docs`.

**Nicht-blocking** — läuft immer durch.

### Schritt 1: Heuristik-Check

```bash
DIFF_BASE=$(python3 -c "import json; d=json.load(open('.claude/playbooks/state/e2e-tester.last_run')); print(d['sha'])" 2>/dev/null || echo "main")

# Neue öffentliche Routen (außerhalb von api/, admin/, shop-admin/, auth/)
git diff "$DIFF_BASE" --name-only -- 'src/app/**' \
  | grep -v -E 'src/app/(api|admin|shop-admin|auth)/' \
  | grep -v 'llms\.txt'

# Typ- oder API-Änderungen
git diff "$DIFF_BASE" --name-only -- 'src/types/api.ts' 'src/lib/api.ts'

# Feature-Keywords im Diff
git diff "$DIFF_BASE" -- 'src/**/*.ts' 'src/**/*.tsx' \
  | grep -E '^\+' \
  | grep -iE 'shop_type|online_only|price_type|on_request|review|rating' \
  | head -5
```

**Auswertung:**
- Mindestens eine Zeile Ausgabe → **Signal vorhanden** → weiter mit Schritt 2
- Keine Ausgabe → `Docs-Sync: keine Signale — übersprungen` in TESTSET.md → fertig

### Schritt 2: Patch-Vorschlag erstellen

Für jedes betroffene Dokument:

1. Dokument lesen (`src/app/llms.txt/route.ts`, `README.md`, `AGENTS.md`)
2. Git-Diff lesen (relevante Abschnitte)
3. Konkret formulieren: Welcher Absatz ist veraltet? Was ist die neue korrekte Aussage?
4. Patch als `--- alt`/`+++ neu` Diff anzeigen — **je Datei separat**

```
Docs-Sync — Patch-Vorschlag für src/app/llms.txt/route.ts:

--- alt
- Shops: Lokale Geschäfte in Larnaca mit Öffnungszeiten, Adresse und Angeboten
+++ neu
- Lokale Shops (shop_type: local): Geschäfte in Larnaca mit Adresse, Öffnungszeiten und Angeboten
- Online-Shops (shop_type: online_only): Händler ohne physischen Standort, nur Lieferung
```

Den Patch **nicht** selbst anwenden, sondern im Report unter „Entscheidungen für Bernhard“ aufführen.

### Schritt 3: Weiter ohne Rückfrage

- Patch-Vorschläge stehen im Report; angewendet wird erst nach Freigabe
- Kein Blocker

### Schritt 4: In TESTSET.md dokumentieren

Neue Zeile unter dem Abschlussbericht:

```
### Docs-Sync
| Dokument | Status |
|----------|--------|
| llms.txt/route.ts | Patch vorgeschlagen / unverändert / kein Signal |
| README.md         | Patch vorgeschlagen / unverändert / kein Signal |
| AGENTS.md         | Patch vorgeschlagen / unverändert / kein Signal |
```

---

## Phase 5.6: Issue-Update im Obsidian-Vault

**Trigger:** Jeder Testlauf, der ein Bug-Issue oder Feature-Spec aus dem Vault als Auslöser hatte.
**Vault-Pfad:** `/Users/bb_studio_2025/Vaults/obsidian/Documents/Pundo-Plattform/`

### Wann

- Bug-Fix (`00 Überblick/__ Bugs & Hotfixes/B*.md`) → Issue-Datei aktualisieren
- Feature-Implementierung (`FG/F*.md`) → Status/last-tested ergänzen

### Was eintragen

**Frontmatter:**
```yaml
status: fixed              # oder verified, in-progress (bei FIX-Verdict)
fixed: YYYY-MM-DD          # Datum des erfolgreichen e2e-Laufs
fixed-sha: <git-sha>       # commit-SHA der Lösung (nachgetragen nach Bernhards Commit-Freigabe)
verdict: SHIP              # oder FIX / ESCALATE
```

**Body — neuer Abschnitt am Ende:**
```markdown
---

## Fix-Verlauf (YYYY-MM-DD)

**Root Cause:** <kurze Analyse>

**Lösung:**
1. **`<datei>`** — <was geändert wurde>
2. ...

**Test-Ergebnis (e2e-tester):**
- TypeScript: PASS · ESLint: 0 Errors
- Unit-Tests: <n>/<n>
- Smoke-Tests: <n>/<n>
- Journey <name>: <n>/<n>
- **Verdict: <SHIP|FIX|ESCALATE>**

**Test-Report:** `e2e/journeys/reports/<journey>-YYYY-MM-DD-<issue-id>.md`
```

### Verdict-Mapping

| Verdict | Issue-Status |
|---------|-------------|
| SHIP | `status: fixed` (Bug) / `status: verified` (Feature) |
| FIX | `status: in-progress` + Findings-Liste im Body |
| ESCALATE | `status: blocked` + Begründung im Body |

### Negativ-Regel

Nicht verändern, wenn:
- Der Testlauf nicht aus einem konkreten Issue ausgelöst wurde (z.B. Routine-Smoke ohne Feature-Bezug)
- Der User explizit "nicht im Vault eintragen" sagt
