# Design: Selbstpflegender Journey-Katalog für den E2E-Tester

**Slug:** `journey-catalog-system-20260423`
**Datum:** 2026-04-23
**Designer:** /designer
**Ersetzt:** `_archived-e2e-tester-journeys-20260423/01-design.md` (war themenverfehlend — definierte nur einen einzigen Flow statt den Mechanismus)

---

## 1. Problem & Users

**Problem:** Der `e2e-tester`-Skill prüft heute Einzelseiten isoliert. User-Journeys (Prozessketten über Rollen/Seiten/Zustandsübergänge) fehlen komplett. **Aber:** Der User will diese Journeys nicht manuell definieren müssen — weder jetzt noch bei jedem neuen Feature. Der Mechanismus muss sein: Agents schlagen Journeys vor, User bestätigt, Journey-Katalog wächst automatisch mit.

**Users (intern):**
- **Bernhard (Owner):** Will Journey-Abdeckung ohne manuelle Pflege. Erwartet, dass ein neues Feature automatisch die Frage auslöst: "Braucht dieses Feature eine neue Journey oder ändert es eine bestehende?"
- **Die Agents selbst (designer, architect, e2e-tester):** Lesen und schreiben den Katalog; jeder hat eine definierte Verantwortung.

**Warum jetzt:** Bisher würde jedes Feature-Spec zwar lokale Acceptance-Kriterien liefern, aber die Frage "welche End-to-End-Prozesskette berührt das?" fällt unter den Tisch. Das muss Teil des automatischen Spec-Workflows werden.

---

## 2. Kernkonzept: Der Journey-Katalog

Eine Datei — `e2e/journeys/CATALOG.md` — ist die **einzige Wahrheit** für existierende und geplante Journeys. Jeder Agent liest und schreibt sie nach klaren Regeln.

### 2.1 Katalog-Einträge

Jede Journey ist ein Markdown-Block mit YAML-Frontmatter:

```yaml
---
id: shop-owner-lifecycle
status: proposed | approved | implemented | skipped | deprecated
priority: P1 | P2 | P3
owner-agent: designer | architect | e2e-tester
proposed-in-spec: <slug-or-"ad-hoc">
touches-modules:
  - src/app/shop-admin/**
  - src/app/shops/[id]/**
  - src/app/map/**
  - src/lib/shop-admin-api.ts
last-run: 2026-04-22T15:30:00Z | never
last-result: PASS | FAIL | SKIP | N/A
---

### Journey: Shop-Owner-Lifecycle

**Ziel:** Shop-Owner registriert sich → Shop aktiv → Produkte sichtbar → Shop deaktiviert → nichts mehr sichtbar.

**Trigger-Regel:** Pflicht bei jedem Testlauf (P1).

**Schritte:** 1. Register ... 12. Cleanup (siehe Runbook).
```

### 2.2 Lifecycle eines Katalog-Eintrags

```
proposed  ──(User bestätigt)──▶  approved  ──(Coder implementiert)──▶  implemented
    │                                                                       │
    │                                                                       ▼
    └──(User lehnt ab)──▶  skipped                                  (Tests laufen regelmäßig)
                                                                            │
                                                                            ▼
                                        (Feature entfernt) ──▶  deprecated
```

---

## 3. User Flows

### Flow A — Neues Feature wird entworfen (Designer-Pfad)

1. User gibt Feature-Wunsch in `/designer`-Skill.
2. Designer schreibt `01-design.md` wie gewohnt.
3. **NEU:** Designer liest `e2e/journeys/CATALOG.md`, analysiert das eigene Feature:
   - Welche existierenden Journeys berührt es? → listet sie in `01-design.md` Abschnitt "Journey-Impact".
   - Erzeugt das Feature einen neuen End-to-End-Pfad (über ≥2 Rollen ODER ≥3 Seiten ODER State-Transitions mit Sichtbarkeits-Konsequenzen)? → schlägt neue Journey vor, Status `proposed`.
   - Frage an User am Ende von `01-design.md`: "Folgende Journey-Änderungen schlage ich vor: [...]. Bestätigen? (j/n je Eintrag)"
4. User bestätigt oder lehnt ab → Designer aktualisiert Katalog (`proposed` → `approved` oder `skipped`).

### Flow B — Architekturentscheidung mit Journey-Relevanz (Architect-Pfad)

1. Architect liest Design + Codebase wie gewohnt.
2. **NEU:** Architect prüft Katalog gegen eigene Modulübersicht:
   - Sind die in `touches-modules` gelisteten Journeys noch aktuell? (Modulpfad-Drift erkennen)
   - Fordert die Architektur eine **neue** Journey, die der Designer nicht sehen konnte? (z.B. Performance-Regression-Pfad, Caching-Invalidierung) → `proposed`.
3. `02-architecture.md` enthält Abschnitt "Journey-Deltas" mit konkreten Diff-Vorschlägen.
4. User bestätigt.

### Flow C — Implementierung (Coder-Pfad)

1. Coder implementiert das Feature wie gewohnt (`03-implementation.md`).
2. **NEU:** Wenn Katalog eine Journey mit Status `approved` für dieses Feature-Spec enthält, legt Coder **das konkrete Spec-File** (`e2e/journeys/<id>.spec.ts`) gleich mit an oder aktualisiert es. Danach setzt er `status: implemented` im Katalog.
3. Hinweis: Coder entwirft nicht selbst — er folgt dem im Katalog festgehaltenen Schritt-Runbook, das aus 01/02 kommt.

### Flow D — Testlauf & proaktive Journey-Entdeckung (e2e-Tester-Pfad)

1. User startet `/e2e-tester` nach Code-Änderung (oder automatisch nach Coder-Übergabe).
2. Phase 0 (Scope-Ermittlung) wie bisher: git-diff seit `.last_run`.
3. **NEU — Phase 0.5 "Journey-Scan":**
   - Tester lädt Katalog.
   - Für jede `implemented`-Journey prüft er, ob `touches-modules` mit dem git-Diff schneidet → markiert als "muss laufen".
   - **Proaktive Heuristiken** (der Tester sucht aktiv nach fehlenden Journeys):
     - Neue Datei in `src/app/<segment>/` mit `page.tsx` ohne Katalog-Eintrag → Vorschlag "Public-Route-Visibility-Journey für /<segment>"
     - Neues Admin-/Shop-Admin-Modul ohne Eintrag → Vorschlag "Role-Boundary-Journey"
     - Neuer Status-Feld-Enum in `src/types/*.ts` (z.B. `status: 'active' | 'inactive' | ...`) → Vorschlag "State-Transition-Visibility-Journey"
     - Neue Mutation in `shop-admin-api.ts` ohne öffentliche Sichtbarkeits-Journey → Vorschlag "Write-to-Read-Journey"
   - Tester fragt User: "Ich schlage folgende neuen Journeys vor: [...]. Katalogeintrag anlegen? (j je Eintrag)"
4. Phase 3.5 läuft nur `implemented`+"muss laufen"-Journeys. Neu bestätigte Vorschläge landen im Katalog als `approved` (für nächsten Coder-Pass).
5. Phase 4 aktualisiert `last-run` und `last-result` pro Journey im Katalog.

### Edge Cases

- **Feature wird entfernt:** Der Agent, der es entfernt, markiert zugehörige Journeys `deprecated`. Spec-File bleibt als Regressions-Gedächtnis, Test wird `test.skip`.
- **Modulumbenennung:** Tester erkennt, dass `touches-modules`-Pfad nicht mehr existiert → Warnung + Vorschlag zur Aktualisierung.
- **Konflikt: zwei Agents schlagen ähnliche Journey vor:** Neu-Vorschlag muss Dedup-Check gegen Katalog + pending specs machen; bei Ähnlichkeit (gleiche `touches-modules`-Schnittmenge > 50%) → Merge-Vorschlag statt Neu-Vorschlag.
- **User lehnt Vorschlag ab:** Eintrag wird `skipped` mit Begründung. Agent wiederholt den Vorschlag nicht in der nächsten Session.

⚠️ ANNAHME: Ein einfaches Markdown-File mit YAML-Frontmatter ist robust genug. Kein separates DB-/JSON-Schema nötig.

---

## 3a. Abgrenzung — was dieses Spec NICHT liefert

- **Keine konkrete Journey** wird hier ausdesignt. Der Shop-Owner-Lifecycle aus dem Vorgänger-Spec ist nur **Beispiel im Katalog-Seed**, nicht Feature dieses Specs.
- **Keine neuen Playwright-Tests** außer einem minimalen Smoke-Test, der prüft, dass der Katalog parsebar ist.
- **Keine CI-Integration.** Nur lokaler Workflow.
- **Keine Backend-Änderungen.**

---

## 4. Component / File Inventory

### Neu zu schreiben

| Pfad | Zweck |
|---|---|
| `e2e/journeys/CATALOG.md` | Quelle der Wahrheit. Header + leere Katalog-Liste + Seed-Einträge (1–2 Beispiele in `proposed`). |
| `e2e/journeys/CATALOG_SCHEMA.md` | Schema-Doku: Felder, Lifecycle, Vorschlags-Regeln. Wird von Agents beim Pflegen gelesen. |
| `e2e/journeys/README.md` | Runbook: lokal starten, Vorschläge bestätigen, Debug. |

### Zu ändern — Skill-Dateien (Agent-Verhalten)

| Pfad | Änderung |
|---|---|
| `.claude/skills/designer/SKILL.md` | Neuer Pflicht-Abschnitt "Journey-Impact & Vorschläge". Designer liest Katalog, prüft Feature gegen Journey-Heuristiken, schlägt Änderungen vor, fragt User, schreibt Katalog. |
| `.claude/skills/architect/SKILL.md` | Neuer Pflicht-Abschnitt "Journey-Deltas". Architect validiert `touches-modules` gegen reale Modulstruktur, schlägt Architektur-getriebene Journeys vor. |
| `.claude/skills/coder/SKILL.md` | Neuer Pflicht-Abschnitt "Journey-Implementierung". Wenn eine `approved`-Journey zum Feature gehört, implementiert Coder `.spec.ts` und flipt Status auf `implemented`. |
| `.claude/skills/e2e-tester/SKILL.md` | Neue Phase 0.5 "Journey-Scan" (proaktive Heuristiken + User-Vorschlagsdialog) und Phase 3.5 "Journey-Run" (führt `implemented` aus, aktualisiert `last-run`). |

### Explizit NICHT in diesem Spec

- Die konkreten Playwright-Test-Dateien (`shop-owner-lifecycle.spec.ts` etc.). Die entstehen erst, wenn User eine Journey aus `proposed` → `approved` flipt und Coder sie implementiert.
- Fixture-Bibliothek. Wird bei erster `approved`-Journey vom Coder mit angelegt (ist dann Subspec).

---

## 5. Acceptance Criteria

### AC-1 — Katalog existiert und ist von Skills lesbar
**Given** `e2e/journeys/CATALOG.md` existiert
**When** ein Skill (designer/architect/coder/e2e-tester) wird aufgerufen
**Then** es gibt eine klare Konvention, dass der Skill diese Datei liest — dokumentiert in `CATALOG_SCHEMA.md`, referenziert in jedem der 4 Skill-Files.

### AC-2 — Designer schlägt Journey-Änderungen vor
**Given** Designer wird für ein neues Feature aufgerufen, das eine Prozesskette erzeugt (≥2 Rollen ODER ≥3 Seiten ODER State-Transitions)
**When** `01-design.md` geschrieben wird
**Then** enthält das Spec einen Abschnitt "Journey-Impact" mit mindestens einem der folgenden Ergebnisse: (a) "keine Journey betroffen — Begründung: ...", (b) Liste betroffener existierender Journeys mit Update-Vorschlag, (c) mindestens eine neue Journey als `proposed`-Eintrag (inkl. `touches-modules`).

### AC-3 — Architect validiert und erweitert Katalog
**Given** Architect wird nach Designer aufgerufen
**When** `02-architecture.md` geschrieben wird
**Then** enthält Abschnitt "Journey-Deltas" mit: (a) Validierung der vom Designer proposed Einträge, (b) ggf. Korrekturen der `touches-modules`, (c) ggf. eigene zusätzliche Journey-Vorschläge (Performance-/Caching-/Security-getrieben).

### AC-4 — Coder implementiert nur approved Journeys
**Given** Katalog enthält Einträge mit gemischten Status
**When** Coder sein Feature implementiert
**Then** legt er `.spec.ts`-Dateien ausschließlich für `approved`-Einträge an, die sein Feature berühren; flipt deren Status auf `implemented`; **niemals** für `proposed` oder `skipped`.

### AC-5 — E2E-Tester scannt proaktiv nach fehlenden Journeys
**Given** Codebase hat mind. eine Datei (neue Route/Modul/Status-Enum), die von keinem Katalog-Eintrag in `touches-modules` erfasst ist
**When** `/e2e-tester` läuft
**Then** zeigt der Tester in seiner Ausgabe eine Liste "Mögliche fehlende Journeys" mit je: ID-Vorschlag, Grund (Heuristik-Name), `touches-modules`. User wird explizit gefragt, welche in den Katalog übernommen werden.

### AC-6 — User-Bestätigung ist verpflichtend für Katalog-Mutationen
**Given** ein Agent will einen Katalog-Eintrag anlegen, ändern (außer `last-run`/`last-result`) oder löschen
**When** der Agent den Schreibvorgang vornehmen will
**Then** fragt er den User vorher mit konkretem Diff-Vorschlag und wartet auf `j/n`. Ausnahme: Nur `last-run`/`last-result` darf e2e-tester ohne Rückfrage aktualisieren.

### AC-7 — Lifecycle-Übergänge sind nachvollziehbar
**Given** irgendein Katalog-Eintrag wechselt Status
**When** der Katalog nach dem Wechsel geöffnet wird
**Then** der Eintrag zeigt Datum des letzten Statuswechsels (`status-changed-at`) und den auslösenden Spec-Slug (`status-changed-by-spec`). Bei `skipped` zusätzlich `skip-reason`.

### AC-8 — Keine doppelten Vorschläge über Sessions hinweg
**Given** ein Vorschlag wurde vom User als `skipped` bestätigt
**When** in einer späteren Session ein Agent denselben oder ähnlichen (≥50% Modul-Überlappung) Vorschlag machen würde
**Then** prüft der Agent zuerst den Katalog, erkennt den skipped-Eintrag und wiederholt den Vorschlag **nicht** (oder nur mit explizitem Hinweis "früher abgelehnt — Umstände geändert?").

### AC-9 — Modul-Drift wird erkannt
**Given** ein Katalog-Eintrag hat `touches-modules: src/app/map/**`, aber der Pfad existiert nach Refactor nicht mehr
**When** `/e2e-tester` läuft
**Then** Warnung "Stale touches-modules in <journey-id>" erscheint + Vorschlag zur Korrektur (User bestätigt).

### AC-10 — Der Katalog-Seed enthält Beispiele, aber keine ungeprüften Pflichten
**Given** das Spec wird implementiert
**When** `CATALOG.md` erstmals angelegt wird
**Then** enthält es 1–2 Beispiel-Einträge (z.B. Shop-Owner-Lifecycle) im Status `proposed`, damit Agents Schemata sehen — aber keine `implemented`-Einträge. Der User kann jeden Beispiel-Eintrag bewusst bestätigen oder verwerfen.

### AC-11 — Tester führt keine nicht-approved Journey aus
**Given** Katalog enthält `proposed`/`skipped`/`deprecated`-Einträge
**When** `/e2e-tester` Phase 3.5 läuft
**Then** führt er ausschließlich `implemented`-Einträge aus. Andere Status sind nie "run"-Kandidaten.

---

## 6. Open Questions

❓ **OFFEN-1 Heuristik-Schärfe:** Wie aggressiv soll der e2e-tester vorschlagen? Pro neuer Route ein Vorschlag ist nervig. Schwellwert? ⚠️ ANNAHME: Tester fasst Vorschläge zu **max. 3 pro Testlauf** zusammen, priorisiert nach "berührt mehrere Rollen" > "berührt Status-Feld" > "neue Public-Route".

❓ **OFFEN-2 Merge-Vorschlag-Logik:** Bei 50% Modul-Überlappung zusammenführen — wer entscheidet, welcher Eintrag gewinnt? ⚠️ ANNAHME: User entscheidet per j/n am Diff.

❓ **OFFEN-3 Koexistenz mit `.last_run`:** Der Katalog hat `last-run` pro Journey, aber es gibt schon `.claude/skills/e2e-tester/.last_run` fürs Gesamt-Repo. Zwei Quellen akzeptabel? Empfehlung: Ja — Gesamt-`.last_run` bleibt Scope-Marker; Katalog-`last-run` ist Journey-spezifisch.

❓ **OFFEN-4 Wo liegt CATALOG.md genau:** `e2e/journeys/CATALOG.md` (nah am Code) oder `specs/_catalog/journeys.md` (nah an Specs)? Empfehlung: **`e2e/journeys/CATALOG.md`**, weil dort auch die Spec-Files und Fixtures liegen werden und der e2e-tester dort ohnehin operiert.

❓ **OFFEN-5 Versionierung:** Wenn eine Journey sich ändert (Schritte), brauchen wir `version: 2`? ⚠️ ANNAHME: Nein in Phase 1. Änderungen werden per Git-History nachvollzogen. Wenn Journey so grundlegend anders, dass Alt-Test deprecated werden muss → `deprecated` + neuer Eintrag mit neuer ID.

❓ **OFFEN-6 Bestätigungsformat:** Soll der User je Vorschlag mit `j/n` antworten oder lieber einen Text-Editor öffnen und den Diff manuell bearbeiten? Empfehlung: `j/n` pro Eintrag für Phase 1; Text-Edit optional.

❓ **OFFEN-7 Architektur-getriebene Journey-Arten:** Welche automatischen Heuristiken soll der Architect haben? Vorschlag für Diskussion: (a) neue Datenbank-Migration → State-Transition-Journey, (b) neues Feature-Flag → On/Off-Visibility-Journey, (c) neuer externer API-Call → Failure-Mode-Journey. Aber: Sollen alle von Anfang an? Empfehlung: Start mit den Heuristiken aus Flow D (e2e-tester-Seite), Architect-Heuristiken in Iteration 2.

---

Design complete at `specs/journey-catalog-system-20260423/01-design.md`. Ready for /architect.
