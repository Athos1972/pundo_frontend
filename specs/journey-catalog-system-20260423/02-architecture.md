# Architecture: Selbstpflegender Journey-Katalog

**Slug:** `journey-catalog-system-20260423`
**Datum:** 2026-04-23
**Architect:** /architect
**Liest:** `specs/journey-catalog-system-20260423/01-design.md`

---

## 0. Scope-Erinnerung

Dies ist ein **Prozess-/Workflow-Feature**, kein Produkt-Feature. Wir liefern:

- Drei neue Dateien unter `e2e/journeys/`.
- Änderungen an den vier Skill-Dateien (designer, architect, coder, e2e-tester).
- Einen minimalen Parser-Smoke-Test.

Kein Produktionscode. Keine neuen Playwright-Journeys in diesem Spec (die entstehen erst, wenn User erste Einträge auf `approved` flippt).

---

## 1. Affected Modules / Files

### Neue Dateien

| Pfad | Zweck |
|---|---|
| `e2e/journeys/CATALOG.md` | Quelle der Wahrheit für alle Journeys. Markdown mit pro-Eintrag YAML-Frontmatter (siehe §2). |
| `e2e/journeys/CATALOG_SCHEMA.md` | Menschenlesbare Schema-/Regel-Referenz. Wird von jedem Skill vor dem Schreiben gelesen. |
| `e2e/journeys/README.md` | Runbook für Menschen: wie bestätigt man Vorschläge, wie liest man den Katalog, wie debuggt man einen Lauf. |
| `e2e/journeys/_parser.ts` | Kleiner TypeScript-Parser, der den Katalog in eine Liste typed Einträge zerlegt. Reine Lese-Utility, keine Runtime-Abhängigkeit. |
| `e2e/journeys/_parser.spec.ts` | Playwright/Vitest-Test (Entscheidung: Vitest, siehe §8) der den Seed-Katalog parsed und Schema-Konformität prüft. |

### Zu ändernde Dateien (Skill-Verhalten)

| Pfad | Änderung | Verortung |
|---|---|---|
| `~/.claude/skills/designer/SKILL.md` bzw. Repo-Override `.claude/skills/designer/SKILL.md` | Neuer Abschnitt "Journey-Impact & Vorschläge". | Nach "Output"-Block, vor "Handoff". |
| `.claude/skills/architect/SKILL.md` | Neuer Abschnitt "Journey-Deltas (Katalog-Validierung)". | Nach "Erweiterungspunkte", vor "Trade-offs". |
| `.claude/skills/coder/SKILL.md` | Neuer Abschnitt "Journey-Implementierung". | Als neuer Schritt 1.5 zwischen "Implementierung" und "Unit-Tests". |
| `.claude/skills/e2e-tester/SKILL.md` | Neue Phase 0.5 ("Journey-Scan") und Phase 3.5 ("Journey-Run"). | Nach Phase 0 bzw. Phase 3 einfügen. |

### Designer-Skill-Ort (wichtige Beobachtung)

Der Designer-Skill liegt **nur user-level** in `~/.claude/skills/designer/SKILL.md` — kein Repo-Override vorhanden (die `.claude/skills/designer/SKILL.md`-Datei wurde laut `git status` gelöscht). Entscheidung: Wir legen einen **Repo-Override** `.claude/skills/designer/SKILL.md` an, damit die Journey-Regel projektgebunden ist und in anderen Repos den Designer nicht "vergiftet". Der Repo-Override kopiert den user-level-Skill wortgetreu und hängt den Journey-Abschnitt an.

---

## 2. CATALOG.md — Schema & Format

### 2.1 Entscheidung: Markdown mit YAML-Frontmatter pro Eintrag

**Gewählt:** Eine einzige Datei `e2e/journeys/CATALOG.md`, die pro Journey einen Markdown-Abschnitt mit vorangestelltem YAML-Frontmatter-Block enthält. Trenner zwischen Einträgen: Zeile mit genau `---` auf Spaltenanfang, sowohl öffnend als auch schließend des Frontmatter-Blocks.

**Gegen separates JSON/YAML-File:**

- Agents (LLMs) lesen und schreiben Markdown besser als JSON — weniger Eskapierungsfehler, weniger kaputte Commits.
- Die Schritt-Runbooks sind frei formatierter Markdown und gehören zur Journey — Trennung wäre doppelte Buchhaltung.
- Git-Diff ist lesbar (YAML-Block + Prosa), JSON-Diff wäre verrauscht.
- Keine zusätzliche Dependency nötig; ein 50-Zeilen-Parser reicht (§5).

**Gegen pro-Journey-Einzelfiles:**

- Dedup-Check (§3.2) braucht Gesamtsicht — ein File bleibt billiger zu scannen.
- Git-Konflikte bei parallelen Agents werden zwar wahrscheinlicher, sind aber harmlos, weil jeder Eintrag durch `---`-Trenner und `id` eindeutig isoliert ist; ein Merge-Tool löst das trivial.

### 2.2 Frontmatter-Felder

```yaml
---
id: shop-owner-lifecycle                    # PFLICHT, kebab-case, unique, stabil
title: Shop-Owner Lifecycle                 # PFLICHT, menschenlesbar, 1 Zeile
status: proposed                             # PFLICHT, enum siehe §4
priority: P2                                 # PFLICHT, enum: P1 | P2 | P3
owner-agent: designer                        # PFLICHT, enum: designer | architect | coder | e2e-tester
proposed-in-spec: journey-catalog-system-20260423  # PFLICHT, Spec-Slug oder "ad-hoc"
touches-modules:                             # PFLICHT, nicht-leer, Glob-Pfade
  - src/app/shop-admin/**
  - src/app/shops/[id]/**
  - src/lib/shop-admin-api.ts
touches-roles:                               # OPTIONAL, enum-Liste: guest | customer | shop-owner | admin
  - shop-owner
  - guest
touches-states:                              # OPTIONAL, Liste von "<Type.field>:<value>"
  - Shop.status:active
  - Shop.status:inactive
spec-file: e2e/journeys/shop-owner-lifecycle.spec.ts  # OPTIONAL, nur bei status=implemented
status-changed-at: 2026-04-23T10:15:00Z     # PFLICHT bei jedem Wechsel, ISO-8601 UTC
status-changed-by-spec: journey-catalog-system-20260423  # PFLICHT bei jedem Wechsel
skip-reason: >                               # PFLICHT bei status=skipped oder deprecated
  User lehnte 2026-04-23 ab: Shop-Lifecycle wird manuell getestet.
last-run: never                              # PFLICHT, ISO-8601 UTC oder Literal "never"
last-result: N/A                             # PFLICHT, enum: PASS | FAIL | SKIP | N/A
last-run-sha: null                            # OPTIONAL, commit-SHA des letzten Laufs
superseded-by: null                           # OPTIONAL, id eines Nachfolgers (bei deprecated)
---
```

### 2.3 Body-Format (Prosa nach Frontmatter)

```markdown
### Journey: <title>

**Ziel:** Ein Satz, was diese Journey end-to-end beweist.

**Trigger-Regel:** Wann muss sie laufen? (z.B. "Jeder Testlauf wenn touches-modules im Diff" oder "Nur auf Abruf".)

**Schritte (Runbook):**
1. Schritt 1 ...
2. Schritt 2 ...
...

**Fixtures/Preconditions:** optional.

**Known Risks:** optional.
```

### 2.4 Datei-Header (einmalig oben in CATALOG.md)

```markdown
# Journey Catalog — pundo_frontend

> Quelle der Wahrheit. Pflegeregeln: siehe CATALOG_SCHEMA.md.
> Agents (designer/architect/coder/e2e-tester) lesen und schreiben diese Datei
> nach den dort festgelegten Rollen. User-Bestätigung (j/n) vor jeder
> Mutation außer last-run/last-result.

<!-- SCHEMA_VERSION: 1 -->
```

`SCHEMA_VERSION` als HTML-Kommentar erlaubt zukünftige Migrationen, ohne das Format zu brechen.

---

## 3. Heuristik-Spezifikation (Phase 0.5, e2e-tester)

### 3.1 Trigger-Muster → Vorschlagstyp

Der Scan liest den git-Diff (`git diff $LAST_SHA`) und wertet folgende Regeln **in dieser Priorisierungsreihenfolge** aus:

| # | Muster / Regel | Vorschlagstyp | Default-`touches-modules` |
|---|---|---|---|
| H1 | Neue Datei in `src/app/<segment>/page.tsx` (außerhalb `api/`, `shop-admin/`, `admin/`) | `public-route-visibility-<segment>` | `src/app/<segment>/**`, `src/lib/api.ts` |
| H2 | Neue Datei in `src/app/shop-admin/**` oder `src/app/admin/**` mit `page.tsx` | `role-boundary-<segment>` | `src/app/<segment>/**`, `src/lib/shop-admin-api.ts` |
| H3 | Neues Status-Enum-Feld in `src/types/**/*.ts` (Regex: `status:\s*'[^']+'(\s*\|\s*'[^']+'){1,}`) | `state-transition-<Type>-<field>` | Alle `src/app/**/*` + `src/lib/**/*`, die den Typ importieren |
| H4 | Neue exportierte Funktion in `src/lib/shop-admin-api.ts`, deren Name mit `create|update|delete|set|toggle` beginnt | `write-to-read-<funcname>` | `src/lib/shop-admin-api.ts`, `src/app/shop-admin/**`, `src/app/shops/[id]/**` |
| H5 | Neue Migration/Schema-Änderung im Backend-Repo (falls sichtbar via `.env`-/API-Typänderung) | `cross-role-<feature>` | aus 01-design.md ableiten, sonst nur `src/types/api.ts` markieren |

**Nicht-Trigger (bewusst):** Tests, Storybook, `node_modules`, `.md`-Änderungen, reine Style-Edits (Tailwind-Klassen ohne Logik).

### 3.2 Deduplizierungs-Algorithmus

Vor jedem Vorschlag durchläuft der Agent folgenden Algorithmus gegen alle bestehenden Einträge (egal welcher Status, inkl. `skipped` und `deprecated`):

```
Sei P der Vorschlag mit modules_P = set(touches-modules nach Glob-Expansion)
Für jeden Katalog-Eintrag E mit modules_E = set(touches-modules von E):
  overlap = |modules_P ∩ modules_E| / |modules_P ∪ modules_E|    # Jaccard
  Falls overlap >= 0.50:
    Falls E.status ∈ {proposed, approved, implemented}:
      → Merge-Vorschlag: "Journey P überlappt mit E.id (Overlap X%). Zusammenführen?"
    Falls E.status ∈ {skipped, deprecated}:
      → Unterdrücken. Nur anzeigen mit Hinweis "früher abgelehnt am DATUM, Grund: skip-reason. Neu vorschlagen? j/n"
Wenn kein overlap >= 0.50:
  → Neuer Vorschlag
```

Glob-Expansion: `**` matcht rekursiv, `[param]` ist Wildcard gegen `[id]`, `[slug]` etc. Keine echte FS-Auflösung nötig — wir vergleichen normalisierte Glob-Strings.

### 3.3 Max-3-Regel & Priorisierung

Der e2e-tester zeigt pro Testlauf **maximal 3** neue Vorschläge. Priorisierung (höchste zuerst):

1. **Score(Rolle)**: `+3` wenn `touches-roles` ≥ 2 Rollen einschließt (z.B. shop-owner + guest).
2. **Score(State)**: `+2` wenn Heuristik H3 getriggert (State-Transition).
3. **Score(Public)**: `+1` wenn Heuristik H1 (neue öffentliche Route).
4. **Score(Write→Read)**: `+1` wenn H4.

Gleichstand: alphabetisch nach vorgeschlagener `id`. Überzählige Vorschläge werden in `.claude/skills/e2e-tester/.journey_backlog` (eine Zeile pro ID) geparkt und beim nächsten Lauf neu geprüft.

---

## 4. Lifecycle-Zustandsmaschine

```
                     ┌──────────────────────────────────────┐
                     ▼                                      │
(neu)  ──▶  proposed ──▶ approved ──▶ implemented ──▶ (läuft)
              │              │              │
              │              │              └──▶ deprecated ──▶ (optional superseded-by)
              │              │
              └──▶ skipped   └──▶ skipped   
```

### Erlaubte Übergänge

| Von → Nach | Auslöser | Wer darf schreiben |
|---|---|---|
| (neu) → `proposed` | Heuristik eines Agents | designer / architect / e2e-tester |
| `proposed` → `approved` | User-Bestätigung (j) | derselbe Agent, der proposed hat |
| `proposed` → `skipped` | User-Ablehnung (n) + Grund | derselbe Agent |
| `approved` → `implemented` | Coder hat `.spec.ts` geschrieben und commitet | **nur coder** |
| `implemented` → `deprecated` | Feature entfernt, Journey nicht mehr testbar | designer oder architect (je nachdem, wer Entfernung spezifiziert) |
| `implemented` → `skipped` (temporär) | User-Entscheidung | e2e-tester (mit User-Bestätigung) |
| `skipped` → `proposed` (Wiederaufnahme) | Explizit neuer Vorschlag mit Hinweis "früher abgelehnt" | designer / architect / e2e-tester |
| jeder → jeder: `last-run` / `last-result` | Testlauf-Ergebnis | **nur e2e-tester, keine User-Bestätigung nötig** |

### Verbotene Übergänge (hart)

- Kein direkter Sprung `proposed → implemented` (muss erst `approved`).
- Kein Agent außer Coder darf auf `implemented` setzen.
- Kein Agent darf einen Eintrag **löschen** — nur auf `deprecated` setzen.
- `deprecated` ist Endzustand (nur `superseded-by` darf noch nachträglich gesetzt werden).

---

## 5. API Contracts — interne Parser-Schnittstelle

Nicht öffentliches API, aber die vier Agents brauchen einheitliches Verhalten. `e2e/journeys/_parser.ts` exportiert:

```typescript
export interface JourneyEntry {
  id: string
  title: string
  status: 'proposed' | 'approved' | 'implemented' | 'skipped' | 'deprecated'
  priority: 'P1' | 'P2' | 'P3'
  ownerAgent: 'designer' | 'architect' | 'coder' | 'e2e-tester'
  proposedInSpec: string
  touchesModules: string[]
  touchesRoles?: ('guest' | 'customer' | 'shop-owner' | 'admin')[]
  touchesStates?: string[]
  specFile?: string
  statusChangedAt: string         // ISO-8601
  statusChangedBySpec: string
  skipReason?: string
  lastRun: string                  // ISO-8601 | "never"
  lastResult: 'PASS' | 'FAIL' | 'SKIP' | 'N/A'
  lastRunSha?: string | null
  supersededBy?: string | null
  body: string                     // Markdown nach Frontmatter
}

export function parseCatalog(markdown: string): JourneyEntry[]
export function serializeCatalog(entries: JourneyEntry[], header: string): string
export function findOverlap(
  proposed: Pick<JourneyEntry, 'touchesModules'>,
  catalog: JourneyEntry[],
  threshold?: number,             // default 0.5
): { entry: JourneyEntry; overlap: number }[]
```

**Fehlerverhalten:** Parser wirft bei fehlenden Pflichtfeldern `JourneyCatalogError` mit klarer Zeilen-Nummer. Kein stiller Default.

---

## 6. Agent-Verantwortlichkeitsmatrix

| Feld / Aktion | Designer | Architect | Coder | E2E-Tester | User-Bestätigung? |
|---|:---:|:---:|:---:|:---:|:---:|
| Katalog **lesen** | ja | ja | ja | ja | — |
| Neuen Eintrag als `proposed` anlegen | ja (H-Regeln aus Feature) | ja (Architektur-getrieben) | **nein** | ja (Phase 0.5) | **ja (j/n je Eintrag)** |
| `proposed` → `approved` | ja | ja | nein | ja | ja (durch Anlegen-Bestätigung abgedeckt, falls User direkt "ja, approved" sagt) |
| `proposed` → `skipped` | ja | ja | nein | ja | ja + `skip-reason` pflicht |
| `approved` → `implemented` | nein | nein | **nur hier** | nein | nein (impliziert durch Code-Commit) |
| `implemented` → `deprecated` | ja | ja | nein | nein | ja |
| `touches-modules` korrigieren (Drift, AC-9) | nein | **ja** (primär) | nein | ja (flaggt, schlägt Fix vor) | ja |
| `last-run`, `last-result`, `last-run-sha` updaten | nein | nein | nein | **ja (ohne Rückfrage)** | **nein** |
| Eintrag **löschen** | nie | nie | nie | nie | — (stattdessen `deprecated`) |
| `.spec.ts`-Datei erzeugen | nein | nein | **ja** | nein | nein |
| `.spec.ts`-Datei ausführen | nein | nein | nein | **ja** | nein |

---

## 7. Integration in bestehende Skill-Files

### 7.1 Designer — Einfügung nach "Output"-Block

Neuer Abschnitt **"Journey-Impact & Vorschläge (Pflicht)"**:

> 1. Lies `e2e/journeys/CATALOG.md` und `e2e/journeys/CATALOG_SCHEMA.md`.
> 2. Analysiere dein Feature gegen das Heuristik-Trio: (a) involviert es ≥ 2 Rollen? (b) durchläuft es ≥ 3 Seiten? (c) erzeugt/ändert es einen State-Transition mit Sichtbarkeits-Konsequenz?
> 3. Schreibe Abschnitt "Journey-Impact" in `01-design.md` mit einer der drei Formen:
>    - (a) **"Keine Journey betroffen"** + 1–2 Sätze Begründung.
>    - (b) **Liste betroffener existierender Journey-IDs** mit geplanten Änderungen (Schritte, touches-modules).
>    - (c) **Neue Journey-Vorschläge** im exakten Frontmatter-Format aus `CATALOG_SCHEMA.md`, Status `proposed`.
> 4. Dedup-Check gegen Katalog: bei Overlap ≥ 50% (Jaccard auf `touches-modules`) → Merge-Vorschlag statt Neu.
> 5. Frage User am Ende: "Folgende Katalog-Mutationen schlage ich vor: [...]. Bestätigen? (j/n je Eintrag)"
> 6. Bei `j`: Schreibe den Eintrag in `CATALOG.md` mit `status-changed-at`/`-by-spec` gesetzt.
> 7. Bei `n`: Schreibe den Eintrag mit `status: skipped` + `skip-reason`.

### 7.2 Architect — Neuer Abschnitt "Journey-Deltas"

> Nach dem normalen Architekturabschnitt, vor der Task-Liste:
>
> 1. Lies `CATALOG.md`. Filtere Einträge, deren `touches-modules` sich mit den in §1 dieses Architektur-Specs genannten Modulen schneiden.
> 2. Für jeden vom Designer als `proposed` markierten Journey-Eintrag zu diesem Spec: validiere `touches-modules` gegen reale Modulstruktur (Glob muss matchen). Wenn nicht: korrigiere im Vorschlag.
> 3. Prüfe auf Drift in bestehenden Einträgen (AC-9): `ls`-Check auf den ersten nicht-Wildcard-Teil jedes Globs. Bei fehlendem Pfad: "Stale touches-modules in <id>" + Fix-Vorschlag.
> 4. Eigene Architektur-getriebene Vorschläge erzeugen (Iteration 1 der Heuristiken OFFEN-7 aus Design bewusst zurückgestellt). In Iteration 1 **nur** Drift-Korrekturen und Validierung, keine neuen Architekt-Heuristiken.
> 5. Schreibe Abschnitt "Journey-Deltas" in `02-architecture.md` mit (a) validierten Designer-Vorschlägen, (b) Drift-Fixes, (c) explizitem Hinweis "keine zusätzlichen Vorschläge dieser Iteration".
> 6. User-Bestätigung nach bekanntem Muster (j/n je Delta).

### 7.3 Coder — Neuer Schritt 1.5 "Journey-Implementierung"

> **Nach** Typen-Ergänzung, **vor** Unit-Tests:
>
> 1. Lies `CATALOG.md`. Filtere Einträge mit `status: approved` **und** `proposed-in-spec == <aktueller-spec-slug>`.
> 2. Für jeden Treffer:
>    a. Lege/aktualisiere `e2e/journeys/<id>.spec.ts` nach dem im Body der Journey festgehaltenen Runbook.
>    b. Schreibe Test-Schritte deterministisch, Port **3500/8500**, Fixture-Setup im `beforeAll`.
>    c. Flippe im Frontmatter: `status: implemented`, `spec-file: e2e/journeys/<id>.spec.ts`, `status-changed-at: <jetzt>`, `status-changed-by-spec: <slug>`.
> 3. **Niemals** Einträge mit `proposed`, `skipped`, `deprecated` berühren. Diese überspringt der Coder wortlos.
> 4. **Niemals** selbst neue Journey-Vorschläge anlegen. Coder ist reiner Konsument.
> 5. Im Übergabe-Protokoll an e2e-tester: Liste implementierter Journey-IDs explizit aufführen.

### 7.4 E2E-Tester — Phase 0.5 und Phase 3.5

**Phase 0.5 — Journey-Scan (nach Phase 0, vor Phase 1):**

> 1. `catalog = parseCatalog(read('e2e/journeys/CATALOG.md'))`.
> 2. Für jeden `status == 'implemented'`-Eintrag: schneide `touches-modules` mit Phase-0-Diff. Bei Treffer → Eintrag wird in Phase 3.5 ausgeführt (Liste `mustRun`).
> 3. Drift-Check (AC-9): jeden `touches-modules`-Glob gegen reale FS prüfen; Stale-Warnings sammeln und im Abschlussbericht ausgeben (kein Blocker).
> 4. Heuristik-Scan (§3.1) auf dem Diff. Deduplizierung (§3.2). Top-3-Priorisierung (§3.3). Überschuss → `.journey_backlog`.
> 5. User-Frage: "Ich schlage folgende neuen Journeys vor: [...]. Katalog-Eintrag anlegen als `approved`? (j/n je Eintrag)"
>    - `j` → Eintrag wird direkt als `approved` geschrieben (User hat bestätigt). Coder wird im nächsten Spec-Lauf die `.spec.ts` bauen.
>    - `n` → als `skipped` schreiben, `skip-reason: "Beim Testlauf abgelehnt <datum>"`.
> 6. Phase 0.5 schreibt **nur** nach User-Bestätigung — außer `last-run`/`last-result` (das macht Phase 4).

**Phase 3.5 — Journey-Run (nach Phase 3, vor Phase 4):**

> 1. Für jeden Eintrag in `mustRun`: `npx playwright test <spec-file>`.
> 2. Ergebnis pro Journey erfassen: PASS/FAIL/SKIP.
> 3. Stale `spec-file` (Datei fehlt trotz `status: implemented`) → FAIL + Warnung in Abschlussbericht.
> 4. Phase 4 schreibt pro Journey `last-run` (now, UTC), `last-result`, `last-run-sha` — **ohne** User-Rückfrage.

---

## 8. Dependencies & Integration Points

- **Keine neuen npm-Dependencies.** YAML-Frontmatter wird mit einem 30–50-Zeilen-Regex-Parser gelesen (existierende `gray-matter`-artige Libs vermeiden wir bewusst — Parser soll trivial und prüfbar bleiben).
- **Vitest statt Playwright** für `_parser.spec.ts`: Der Parser ist pure Logik, kein Browser nötig. Konsistent mit der Unit-Test-Konvention des Repos (siehe `src/tests/`). Ausnahme zur "alles unter `e2e/` ist Playwright"-Norm wird in `e2e/journeys/README.md` begründet.
- **`playwright.config.ts`** muss `e2e/journeys/*.spec.ts` mit-picken. Falls `testMatch` das nicht schon tut: erweitern (Task T6).
- **`.gitignore`**: `.claude/skills/e2e-tester/.journey_backlog` soll **nicht** ignoriert werden — User soll sehen, was akkumuliert.
- **Bestehende `.last_run`-Mechanik** bleibt unverändert. Der Katalog hat ein **zusätzliches** `last-run` pro Journey; Gesamt-`.last_run` im Skill-Folder bleibt Scope-Marker für den Diff (OFFEN-3 aus Design: akzeptiert).
- **Backend:** Keine Änderungen.

---

## 9. Risks & Mitigations

### Top-3

**R1: Race Condition / Agents überschreiben sich gegenseitig.**
Szenario: Designer und e2e-tester laufen nahe zusammen; beide lesen Katalog, beide schreiben. Letzter gewinnt.
*Mitigation:* (a) Jeder Schreibvorgang liest die Datei unmittelbar vor dem Schreiben neu; (b) Schreibvorgänge sind **ausschließlich Append-für-neue-IDs** oder **Feld-Update-für-existierende-ID** — keine Full-Rewrites. Parser/Serializer erhalten die ursprüngliche Reihenfolge; (c) `id` ist unique → Kollision wird erkannt und als Fehler gemeldet. (d) Bei Konflikt: abbrechen, User informieren, manueller Merge.

**R2: Proposals akkumulieren ohne Review — Katalog bloatet.**
Szenario: User klickt aus Routine `n`, Einträge landen in `skipped`, Katalog wird zur Deponie.
*Mitigation:* (a) Skipped-Einträge älter als 90 Tage werden vom e2e-tester in Phase 0.5 **explizit gelistet** ("Folgende 7 skipped-Journeys sind >90 Tage alt. Archivieren? (j/n)"). (b) Archivieren = Verschieben nach `e2e/journeys/_archive.md`, nicht Löschen — Gedächtnis bleibt. (c) Max-3-Regel (§3.3) verhindert Vorschlags-Flut pro Lauf.

**R3: Modul-Drift bleibt unentdeckt → Tests laufen falsch.**
Szenario: Refactor verschiebt `src/app/shop-admin/` → `src/app/dashboard/`; `touches-modules` zeigt ins Leere; Tester denkt "kein Diff-Schnitt → muss nicht laufen".
*Mitigation:* Architect-Phase enthält Drift-Check (§7.2 Schritt 3); e2e-tester-Phase 0.5 warnt (§7.4). **Zusätzlich:** Ein Glob, dessen statischer Präfix nicht existiert, zählt vorerst als "muss laufen" (konservativ) + Warnung, damit wir nie still übergehen.

### Weitere (nicht Top-3, aber erwähnen)

- **R4:** LLM ignoriert den Skill-Abschnitt. *Mitigation:* AC-prüfbar vom e2e-tester in Phase 0.5 (prüft, ob `01-design.md` einen `## Journey-Impact`-Abschnitt enthält; Warnung falls nicht).
- **R5:** `CATALOG.md` wird in Code-Review nicht mitgelesen. *Mitigation:* `README.md` dokumentiert explizit, dass Katalog-Änderungen teil jedes PRs sind.
- **R6:** Regex-Parser verfehlt valides YAML. *Mitigation:* Parser-Spec (T4) deckt mindestens 6 Frontmatter-Varianten ab (min/max Felder, mehrzeilige `skip-reason`, leere Listen, `null`-Werte, Kommentare, schemaversion-Pragma).

---

## 10. Breaking Changes & Migration

**Keine.** Dies ist Greenfield: neue Dateien, Skill-Text-Ergänzungen, minimaler Parser. Kein Produktionscode wird geändert. `playwright.config.ts` bekommt ggf. einen `testMatch`-Zusatz — rückwärtskompatibel.

Beim ersten Lauf existiert kein Katalog → Seed-File muss Teil von T1 sein.

---

## 11. Task Breakdown (für Coder)

| # | Titel | Datei(en) | Was | Abnahmekriterium | Deps |
|---|---|---|---|---|---|
| **T1** | Katalog-Seed & Schema-Doku | `e2e/journeys/CATALOG.md`, `e2e/journeys/CATALOG_SCHEMA.md`, `e2e/journeys/README.md` | Seed-Datei mit Header + 2 Beispiel-Einträgen (Shop-Owner-Lifecycle + Public-Route-Visibility), beide `status: proposed`. Schema-Doku exakt nach §2. README als Mensch-Runbook. | Datei existiert, parser liest sie ohne Fehler (T4), 2 Einträge vorhanden, Status `proposed`, kein `implemented` | — |
| **T2** | Parser-Implementierung | `e2e/journeys/_parser.ts` | Funktionen aus §5: `parseCatalog`, `serializeCatalog`, `findOverlap`. Regex-basiert, ohne neue Dependencies. Wirft `JourneyCatalogError` mit Zeilen-Info. | Alle exports vorhanden, TypeScript-strict kompiliert, Seed aus T1 roundtrip-fähig (parse→serialize → identische Datei modulo Whitespace) | T1 |
| **T3** | Parser-Smoke-Test | `e2e/journeys/_parser.spec.ts` | Vitest-Suite: parse-Seed, Roundtrip, fehlende Pflichtfelder werfen, `findOverlap` ≥50% flaggt korrekt. Min. 6 Tests. | `npx vitest run e2e/journeys/_parser.spec.ts` PASS | T2 |
| **T4** | Playwright-testMatch erweitern | `playwright.config.ts` | Sicherstellen, dass `e2e/journeys/*.spec.ts` gematcht werden (nicht `_*.spec.ts`). | `npx playwright test --list` zeigt `e2e/journeys/`-Einträge, sobald welche existieren; `_parser.spec.ts` wird **nicht** als Playwright-Test gefasst. | T1 |
| **T5** | Designer-Skill erweitern | `.claude/skills/designer/SKILL.md` (Repo-Override neu anlegen, vom user-level kopieren) | Abschnitt "Journey-Impact & Vorschläge" exakt nach §7.1 anhängen. Handoff-Satz unverändert. | Datei existiert, Abschnitt enthalten, User-Frage-Formulierung wörtlich aus AC-6. | T1 |
| **T6** | Architect-Skill erweitern | `.claude/skills/architect/SKILL.md` | Abschnitt "Journey-Deltas" nach §7.2 einfügen. | Abschnitt vorhanden, inkl. Drift-Check-Beschreibung. | T1 |
| **T7** | Coder-Skill erweitern | `.claude/skills/coder/SKILL.md` | Schritt 1.5 "Journey-Implementierung" nach §7.3 einfügen. Expliziter Hinweis: Coder schlägt nie selbst vor. | Abschnitt vorhanden, Sperre `proposed`/`skipped` dokumentiert. | T1 |
| **T8** | E2E-Tester-Skill: Phase 0.5 | `.claude/skills/e2e-tester/SKILL.md` | Phase 0.5 nach §7.4 einfügen. Heuristiken H1–H5 aus §3.1 als Tabelle. Max-3-Regel. | Abschnitt vorhanden, verweist auf `_parser.ts` und `CATALOG_SCHEMA.md`. | T2, T1 |
| **T9** | E2E-Tester-Skill: Phase 3.5 | `.claude/skills/e2e-tester/SKILL.md` | Phase 3.5 einfügen, last-run-Updates spezifiziert. | Abschnitt vorhanden, User-Bestätigung explizit ausgeschlossen für last-run. | T8 |
| **T10** | Backlog-File-Init | `.claude/skills/e2e-tester/.journey_backlog` | Leere Datei anlegen, in README.md dokumentieren. | Datei existiert, nicht in `.gitignore`. | T1 |
| **T11** | Übergabe-Protokoll ergänzen | `.claude/skills/coder/SKILL.md` Abschnitt 4 | Template-Block um Zeile "Journeys implementiert: [IDs]" erweitern. | Block sichtbar im Protokoll-Template. | T7 |

### Reihenfolge / Abhängigkeiten

```
T1 ──▶ T2 ──▶ T3
 │      │
 │      └──▶ T8 ──▶ T9
 ├──▶ T4
 ├──▶ T5
 ├──▶ T6
 ├──▶ T7 ──▶ T11
 └──▶ T10
```

Sinnvolle Coder-Sitzungen:

- **Sitzung A:** T1 + T2 + T3 + T4 (Katalog + Parser + Playwright-Config).
- **Sitzung B:** T5 + T6 + T7 + T11 (Skill-Texte Designer/Architect/Coder).
- **Sitzung C:** T8 + T9 + T10 (E2E-Tester-Skill + Backlog-File).

Jede Sitzung ≤ halber Tag.

---

## 12. Journey-Deltas (dieses Spec)

Dieses Architektur-Spec betrifft den Journey-Katalog **als Mechanismus**, nicht eine konkrete Journey. Daher:

- **Keine** neuen Journey-Einträge von der Architect-Seite.
- **Seed-Einträge** (T1) kommen vom Coder aus dem Design übernommen, bleiben `proposed` — User wird beim ersten Designer-Lauf gefragt, ob einer davon auf `approved` hochgestuft wird.
- **Keine Drift-Fixes** möglich (noch kein Katalog vorhanden).

Explizit: "Keine zusätzlichen Journey-Vorschläge dieser Iteration."

---

## 13. Offene Fragen aus Design — Stand

| Design-Referenz | Entscheidung dieser Architektur |
|---|---|
| OFFEN-1 (Heuristik-Schärfe) | Max-3-Regel formalisiert in §3.3 mit Priorisierungs-Score. |
| OFFEN-2 (Merge-Gewinner) | User entscheidet per j/n am Diff — Agent zeigt beide Einträge, fragt welche ID behalten wird. |
| OFFEN-3 (Koexistenz `.last_run`) | Akzeptiert: zwei Marker, verschiedene Scopes. Dokumentiert in README. |
| OFFEN-4 (Pfad) | `e2e/journeys/CATALOG.md` (wie im Design empfohlen). |
| OFFEN-5 (Versionierung) | Keine `version:`-Felder in Phase 1. `SCHEMA_VERSION`-Kommentar im Datei-Header erlaubt spätere Migration. |
| OFFEN-6 (Bestätigungsformat) | `j/n` pro Eintrag. Text-Editor-Option **nicht** in Phase 1. |
| OFFEN-7 (Architect-Heuristiken) | Auf Iteration 2 verschoben. Phase 1 hat Architect nur Drift-Check + Validierung. |

Keine blockierenden offenen Fragen.

---

Architecture complete at `specs/journey-catalog-system-20260423/02-architecture.md`. Ready for coder.
