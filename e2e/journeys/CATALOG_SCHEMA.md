# Journey Catalog — Schema-Referenz

> **Agents:** Diese Datei IMMER lesen, bevor ihr `CATALOG.md` schreibt oder ändert.
> Sie definiert das vollständige Feldschema, Lifecycle-Regeln und wer was schreiben darf.

<!-- SCHEMA_VERSION: 1 -->

---

## 1. Dateistruktur

Das Journey-Catalog-System besteht aus zwei Ebenen:

### 1a. Index: `CATALOG.md`

`CATALOG.md` ist der **reine Index** aller Journeys:
- Datei-Header (H1 + Beschreibung + SCHEMA_VERSION-Kommentar)
- Eine Markdown-Tabelle mit einer Zeile pro Journey (ID, Title, Status, Priority, Last Result)
- Keine Frontmatter-Blöcke — nur der Index

Agents und Menschen nutzen `CATALOG.md` als Übersicht und navigieren von dort zu den Einzeldateien.

### 1b. Journey-Dateien: `<id>.md`

Jede Journey lebt in einer eigenen Datei `e2e/journeys/<id>.md`:
1. YAML-Frontmatter-Block (zwischen `---`-Trennern) — vollständiges Schema wie bisher
2. Markdown-Body (`### Journey: <title>` + Prosa)

Dateiname = Journey-`id` (kebab-case, stabil). Niemals umbenennen — lieber `deprecated` + neue Datei.

Trenner zwischen Frontmatter und Body: Zeile mit exakt `---` auf Spaltenanfang.

### Erlaubte Dateien im Verzeichnis

| Datei | Typ | Geparst von `parseCatalogDirectory`? |
|---|---|---|
| `CATALOG.md` | Index | nein (explizit ausgeschlossen) |
| `CATALOG_SCHEMA.md` | Dokumentation | nein |
| `README.md` | Dokumentation | nein |
| `_archive.md` | Archiv | nein (`_`-Prefix) |
| `_parser.ts` / `_parser.spec.ts` | Code | nein (kein `.md`) |
| `<id>.md` | Journey-Datei | **ja** |

---

## 2. Frontmatter-Felder

### Pflichtfelder

| Feld | Typ | Erlaubte Werte | Beschreibung |
|------|-----|----------------|--------------|
| `id` | string | kebab-case, unique, stabil | Eindeutige Journey-ID. Niemals ändern — lieber `deprecated` + neue ID. |
| `title` | string | Freitext, max. 1 Zeile | Menschenlesbare Bezeichnung. |
| `status` | enum | `proposed` \| `approved` \| `implemented` \| `skipped` \| `deprecated` | Aktueller Lifecycle-Status. |
| `priority` | enum | `P1` \| `P2` \| `P3` | Testpriorität (P1 = immer laufen, P2 = wenn berührt, P3 = nur auf Abruf). |
| `owner-agent` | enum | `designer` \| `architect` \| `coder` \| `e2e-tester` | Agent, der den Eintrag zuletzt inhaltlich verantwortet. |
| `proposed-in-spec` | string | Spec-Slug (kebab-case-YYYYMMDD) oder `"ad-hoc"` | Spec, das diesen Eintrag ausgelöst hat. |
| `touches-modules` | string[] | Glob-Pfade, nicht leer | Module, die diese Journey berührt. Basis für Diff-Schnitt in Phase 0.5. |
| `status-changed-at` | string | ISO-8601 UTC (`YYYY-MM-DDTHH:MM:SSZ`) | Zeitpunkt des letzten Status-Wechsels. |
| `status-changed-by-spec` | string | Spec-Slug oder `"ad-hoc"` | Spec, das den letzten Statuswechsel ausgelöst hat. |
| `last-run` | string | ISO-8601 UTC oder Literal `"never"` | Zeitpunkt des letzten tatsächlichen Testlaufs. |
| `last-result` | enum | `PASS` \| `FAIL` \| `SKIP` \| `N/A` | Ergebnis des letzten Laufs. |

### Optionale Felder

| Feld | Typ | Erlaubte Werte | Beschreibung |
|------|-----|----------------|--------------|
| `touches-roles` | string[] | `guest` \| `customer` \| `shop-owner` \| `admin` | Rollen, die diese Journey involviert. |
| `touches-states` | string[] | `<Type.field>:<value>` | Status-Felder, die diese Journey testet (z.B. `Shop.status:active`). |
| `spec-file` | string | Relativer Pfad | Nur bei `status: implemented`. Pfad zur `.spec.ts`-Datei. |
| `skip-reason` | string | Freitext (Multiline mit `>` ok) | **Pflicht** bei `status: skipped` oder `deprecated`. Begründung. |
| `last-run-sha` | string \| null | Git-Commit-SHA oder `null` | Commit-SHA des letzten Testlaufs. |
| `superseded-by` | string \| null | Journey-`id` oder `null` | Bei `deprecated`: ID des Nachfolgers. |

---

## 3. Lifecycle-Zustände

```
(neu)  ──▶  proposed ──▶ approved ──▶ implemented ──▶ (läuft regelmäßig)
               │              │              │
               │              │              └──▶ deprecated
               │              │
               └──▶ skipped   └──▶ skipped
```

### Erlaubte Übergänge

| Von → Nach | Auslöser | Schreiber |
|---|---|---|
| (neu) → `proposed` | Agent erkennt neue Journey per Heuristik | designer / architect / e2e-tester |
| `proposed` → `approved` | User-Bestätigung (j) | derselbe Agent + User-Bestätigung |
| `proposed` → `skipped` | User-Ablehnung (n) + Grund | derselbe Agent |
| `approved` → `implemented` | Coder hat `.spec.ts` commitet | **nur coder** |
| `implemented` → `deprecated` | Feature entfernt | designer oder architect |
| `implemented` → `skipped` | Temporäre Deaktivierung per User | e2e-tester (mit User-Bestätigung) |
| `skipped` → `proposed` | Wiederaufnahme mit Hinweis "früher abgelehnt" | designer / architect / e2e-tester |
| any → `last-run` / `last-result` Update | Testlauf-Ergebnis | **nur e2e-tester, ohne User-Bestätigung** |

### Verbotene Übergänge (hart)

- `proposed → implemented` direkt — Zwischenschritt `approved` ist Pflicht.
- Kein Agent außer `coder` darf `status: implemented` setzen.
- Kein Agent darf einen Eintrag **löschen** — nur auf `deprecated` setzen.
- `deprecated` ist Endzustand (nur `superseded-by` darf nachträglich gesetzt werden).

---

## 4. Agent-Verantwortlichkeitsmatrix

| Aktion | Designer | Architect | Coder | E2E-Tester | User-Bestätigung? |
|--------|:---:|:---:|:---:|:---:|:---:|
| Katalog **lesen** | ja | ja | ja | ja | — |
| Neuen Eintrag als `proposed` anlegen | ja | ja | **nein** | ja | **ja (j/n je Eintrag)** |
| `proposed` → `approved` | ja | ja | nein | ja | ja |
| `proposed` → `skipped` | ja | ja | nein | ja | ja + `skip-reason` Pflicht |
| `approved` → `implemented` | nein | nein | **ja** | nein | nein |
| `implemented` → `deprecated` | ja | ja | nein | nein | ja |
| `touches-modules` korrigieren | nein | **ja** (primär) | nein | ja (flaggt) | ja |
| `last-run` / `last-result` / `last-run-sha` | nein | nein | nein | **ja** | **nein** |
| Eintrag **löschen** | nie | nie | nie | nie | — |
| `.spec.ts`-Datei erzeugen | nein | nein | **ja** | nein | nein |
| `.spec.ts`-Datei ausführen | nein | nein | nein | **ja** | nein |

---

## 5. Heuristiken für neue Journey-Vorschläge

Der e2e-tester (Phase 0.5) und designer/architect können diese Heuristiken anwenden:

| # | Muster / Trigger | Vorschlags-Typ | Default `touches-modules` |
|---|---|---|---|
| H1 | Neue `src/app/<segment>/page.tsx` (außerhalb `api/`, `shop-admin/`, `admin/`) | `public-route-visibility-<segment>` | `src/app/<segment>/**`, `src/lib/api.ts` |
| H2 | Neue Datei in `src/app/shop-admin/**` oder `src/app/admin/**` mit `page.tsx` | `role-boundary-<segment>` | `src/app/<segment>/**`, `src/lib/shop-admin-api.ts` |
| H3 | Neues Status-Enum in `src/types/**/*.ts` (Regex: `status:\s*'[^']+'(\s*\|\s*'[^']+'){1,}`) | `state-transition-<Type>-<field>` | Alle `src/app/**/*` + `src/lib/**/*` die den Typ importieren |
| H4 | Neue Funktion in `src/lib/shop-admin-api.ts` mit Prefix `create\|update\|delete\|set\|toggle` | `write-to-read-<funcname>` — **Pflicht-ACs: siehe §5a** | `src/lib/shop-admin-api.ts`, `src/app/shop-admin/**`, `src/app/shops/[id]/**` |
| H5 | Neue API-Typ-Änderung via Backend-Schema sichtbar (`.env` / `src/types/api.ts`) | `cross-role-<feature>` | `src/types/api.ts` |

**Nicht-Trigger:** Tests, Storybook, `node_modules`, `.md`-Änderungen, reine Tailwind-Klassen-Änderungen ohne Logik.

---

## 5a. Pflicht-ACs für write-to-read-Journeys (H4)

Wenn eine Journey per Heuristik H4 angelegt wird (neue `create*`/`update*`/`delete*`-Funktion), muss ihr Body **mindestens diese drei Akzeptanzkriterien** enthalten. Ohne sie ist der Body unvollständig und der Coder darf die Journey nicht auf `implemented` setzen.

| AC | Name | Was muss getestet werden |
|----|------|--------------------------|
| AC-1 | **Happy Path Create + GET-Verify** | Schreiboperation (POST/PATCH) mit allen Pflichtfeldern → 201/200; anschließend GET-Liste prüfen ob das Objekt erscheint (End-to-End: Write → Read) |
| AC-2 | **Existing-Dependency Reuse (409-Fall)** | Wenn die Schreiboperation eine abhängige Ressource voraussetzt (z.B. ShopListing), muss der Test auch den Fall abdecken, dass diese Ressource bereits existiert (409) — und die Hauptoperation trotzdem erfolgreich ist |
| AC-3 | **Feld-Edgecase** | Mindestens ein nicht-triviales Feld wird mit einem Grenzwert getestet: Dezimalzahl mit lokalem Trennzeichen (Komma statt Punkt), Leerstring bei optionalem Feld, maximale Feldlänge oder Null-Wert |

**Hintergrund:** Fehlende AC-2/AC-3 haben in der Vergangenheit dazu geführt, dass Backend-Bugs (Decimal-Serialisierung, falsche 409-Antwort-Struktur) erst in der Produktion aufgetaucht sind.

---

## 6. Deduplizierungs-Algorithmus

Vor jedem Neu-Vorschlag:

```
Sei P der Vorschlag (touches-modules als Set)
Für jeden Katalog-Eintrag E:
  overlap = |modules_P ∩ modules_E| / |modules_P ∪ modules_E|   # Jaccard-Index

  Falls overlap >= 0.50:
    Falls E.status in {proposed, approved, implemented}:
      → Merge-Vorschlag: "Journey P überlappt mit E.id (Overlap X%). Zusammenführen?"
    Falls E.status in {skipped, deprecated}:
      → Unterdrücken, außer expliziter Hinweis:
        "Früher abgelehnt am <datum>, Grund: <skip-reason>. Neu vorschlagen? j/n"

  Falls kein overlap >= 0.50:
    → Neuer Vorschlag
```

Glob-Expansion: `**` matcht rekursiv, `[param]` ist Wildcard gegen `[id]`, `[slug]` etc.

---

## 7. Max-3-Regel & Priorisierung (e2e-tester Phase 0.5)

Der e2e-tester zeigt pro Testlauf **maximal 3** neue Vorschläge. Priorisierung:

| Score | Kriterium |
|-------|-----------|
| +3 | `touches-roles` umfasst ≥ 2 Rollen |
| +2 | Heuristik H3 (State-Transition) |
| +1 | Heuristik H1 (neue öffentliche Route) |
| +1 | Heuristik H4 (Write-to-Read) |

Gleichstand: alphabetisch nach vorgeschlagener `id`.
Überschuss: wird in `.claude/skills/e2e-tester/.journey_backlog` (eine ID pro Zeile) geparkt.

---

## 8. Body-Format

Nach dem schließenden `---` des Frontmatter-Blocks folgt der Markdown-Body:

```markdown
### Journey: <title>

**Ziel:** Ein Satz, was diese Journey end-to-end beweist.

**Trigger-Regel:** Wann muss sie laufen?

**Schritte (Runbook):**
1. Schritt 1 ...
2. Schritt 2 ...

**Fixtures/Preconditions:** (optional)

**Known Risks:** (optional)
```

---

## 9. Modul-Drift erkennen (AC-9)

Wenn ein `touches-modules`-Glob einen statischen Präfix hat, der im Dateisystem nicht mehr existiert:

- e2e-tester Phase 0.5 gibt Warnung: `"Stale touches-modules in <journey-id>: <glob> existiert nicht mehr"`
- Architect-Phase enthält Drift-Check als Schritt
- Der stale Eintrag zählt vorerst als "muss laufen" (konservativ) bis der Fix bestätigt ist

---

## 10. `spec-file`-Stale-Erkennung

Wenn `status: implemented` aber `spec-file` zeigt auf eine nicht-existente Datei:

- e2e-tester Phase 3.5 wertet das als FAIL
- Warnung erscheint im Abschlussbericht
- `last-result: FAIL` wird ohne User-Rückfrage gesetzt

---

## 11. Skipped-Einträge älter als 90 Tage

Der e2e-tester listet in Phase 0.5 explizit skipped-Einträge, die älter als 90 Tage sind:

> "Folgende N skipped-Journeys sind >90 Tage alt. Archivieren? (j/n)"

Archivieren = Verschieben nach `e2e/journeys/_archive.md`, nicht Löschen.

---

## Journey-Prinzipien (Pflicht für alle Agents)

### 1. Test-Daten-Matrix statt "Alles-in-einem"

Wenn UI-Zustände sich gegenseitig ausschließen (z.B. Shop mit/ohne Logo, Produkt mit/ohne Foto), legt der Coder **separate benannte Fixtures** an — keine faule "Einheitslösung". Jede Fixture hat einen eindeutigen Namen und einen klar definierten Zweck (was wird damit geprüft?).

Format im Runbook:
| Fixture-Name | Was wird aufgebaut | Was wird damit geprüft |
|---|---|---|
| `shop-maximal` | Alle Flags true, alle Felder befüllt | Maximale UI-Befüllung, keine leeren Slots |
| `shop-minimal` | Nur Pflichtfelder | Fallbacks, Default-Rendering |

### 2. Kein Schöntesten (No Beautification)

Wenn ein Journey-Test **FAIL** liefert:

1. **STOPP** — Assertion NICHT verändern, bevor RCA abgeschlossen ist.
2. **RCA dokumentieren** im Test-Report:
   - Ist der Testfall falsch? (z.B. falscher Selektor, falsche Erwartung) → Testfix mit Begründung
   - Ist die Funktionalität fehlerhaft? → Finding-Eintrag, kein Testfix
3. **Erst nach RCA** darf der Testfall angepasst werden — und nur wenn er nachweislich falsch war.
4. Findings werden in TESTSET.md unter `### Findings (unresolved)` eingetragen mit:
   - Journey-ID, Schritt-Nummer, Expected, Actual, Datum, Screenshot-Pfad

### 3. Human-readable Reports

Jeder Journey-Lauf schreibt einen Report, der **ohne Code-Kenntnisse** nachvollziehbar ist:

#### Report-Format pro Journey

```
## Journey: <title> — <PASS|FAIL|SKIP>
Datum: YYYY-MM-DD HH:MM UTC
Dauer: Xs

### Aufgebaute Test-Daten
| Fixture | ID/Slug | Aufgebaut am | Status |
|---|---|---|---|
| shop-maximal | shop-e2e-abc123 | :8500 | OK |

### Schritt-für-Schritt-Protokoll
| # | Beschreibung | Erwartet | Tatsächlich | Status |
|---|---|---|---|---|
| 1 | ShopCard zeigt Parking-Icon | Icon mit data-testid=parking-icon sichtbar | gefunden | PASS |
| 7 | Tooltip auf Parking-Icon | "Parkplatz vorhanden" erscheint beim Hover | nicht gefunden | FAIL |

### Findings (FAIL-Einträge)
| Schritt | Erwartet | Tatsächlich | RCA | Screenshot |
|---|---|---|---|---|
| 7 | Tooltip erscheint | Kein Tooltip | Tooltip-Provider fehlt auf ShopCard | test-results/... |

### Aufräumen
| Fixture | Gelöscht | Status |
|---|---|---|
| shop-maximal | ja | OK |
```

Dieser Report wird in `e2e/journeys/reports/<journey-id>-<datum>.md` gespeichert.
