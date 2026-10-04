# Phase 0.5 Schritt 3–6: Journey-Heuristik-Scan — e2e-tester, pundo_frontend

Referenz zu `../e2e-tester.md`. Wird nur bei der genannten Phase gelesen.

### Schritt 3: Heuristik-Scan — Neue Journeys proaktiv erkennen

Scanne den Phase-0-Diff mit diesen Heuristiken:

| # | Muster / Trigger | Vorschlags-Typ | Default `touches-modules` |
|---|---|---|---|
| H1 | Neue `src/app/(customer)/[lang]/<segment>/page.tsx` | `public-route-visibility-<segment>` | `src/app/(customer)/[lang]/<segment>/**`, `src/lib/api.ts` |
| H2 | Neue `page.tsx` in `src/app/(shop-admin)/shop-admin/**` oder `src/app/(system-admin)/admin/**` | `role-boundary-<segment>` | `src/app/(shop-admin)/shop-admin/<segment>/**` bzw. `src/app/(system-admin)/admin/<segment>/**`, `src/lib/shop-admin-api.ts` |
| H3 | Neues Status-Enum in `src/types/**/*.ts` (Regex: `status:\s*'[^']+'(\s*\|\s*'[^']+'){1,}`) | `state-transition-<Type>-<field>` | Alle `src/app/**/*` + `src/lib/**/*` die den Typ importieren |
| H4 | Neue Funktion in `src/lib/shop-admin-api.ts` mit Prefix `create\|update\|delete\|set\|toggle` | `write-to-read-<funcname>` | `src/lib/shop-admin-api.ts`, `src/app/(shop-admin)/shop-admin/**`, `src/app/(customer)/[lang]/shops/[slug]/**` |
| H5 | Neue API-Typ-Änderung via `src/types/api.ts` sichtbar (neues Feld/Enum) | `cross-role-<feature>` | `src/types/api.ts` |

**Nicht-Trigger:** Tests, `.md`-Dateien, reine Tailwind-Klassen-Änderungen, `node_modules`.

### Schritt 4: Deduplizierung

Vor jedem Neu-Vorschlag: Jaccard-Overlap gegen alle Katalog-Einträge prüfen (nutze `findOverlap` aus `e2e/journeys/_parser.ts`):

- `overlap >= 0.50` + Eintrag `proposed/approved/implemented` → **Merge-Vorschlag** statt Neu
- `overlap >= 0.50` + Eintrag `skipped/deprecated` → **Unterdrücken**, nur als Hinweis unter „Entscheidungen für Bernhard“: `"früher abgelehnt am <datum>, Grund: <skip-reason> — neu vorschlagen?"`
- `overlap < 0.50` → **Neuer Vorschlag**

### Schritt 5: Max-3-Regel & Priorisierung

Zeige pro Testlauf **maximal 3** Vorschläge. Priorisierung (Score, höchste zuerst):

| Score | Kriterium |
|-------|-----------|
| +3 | `touches-roles` umfasst ≥ 2 Rollen |
| +2 | Heuristik H3 (State-Transition) |
| +1 | Heuristik H1 (neue öffentliche Route) |
| +1 | Heuristik H4 (Write-to-Read) |

Gleichstand → alphabetisch nach vorgeschlagener `id`.
Überschuss → in `.claude/playbooks/state/e2e-tester.journey_backlog` (eine ID pro Zeile) parken.

**Skipped-Einträge älter als 90 Tage** separat listen:
> Unter „Entscheidungen für Bernhard“: "Folgende N skipped-Journeys sind >90 Tage alt — Archivierung vorgeschlagen."
> Archivieren = Verschieben nach `e2e/journeys/_archive.md` (nicht löschen), erst nach Freigabe.

### Schritt 6: Vorschläge in den Report (keine Rückfrage im Lauf)

Im Report unter „Entscheidungen für Bernhard“ ausgeben:

```
Journey-Scan-Ergebnis:
  mustRun: [<id>, ...] (N Journeys — laufen in Phase 3.5)
  Drift-Warnings: [<id>: <glob>] (kein Blocker)

Entscheidungen für Bernhard — mögliche fehlende Journeys:

  1. id: <vorgeschlagene-id>
     Grund: H1 — neue page.tsx in src/app/(customer)/[lang]/<segment>/
     touches-modules: [src/app/(customer)/[lang]/<segment>/**, src/lib/api.ts]
     Vorschlag: Katalogeintrag als `approved` anlegen

  2. ...

  (Weitere N Vorschläge in state/e2e-tester.journey_backlog geparkt)
```

- Nach Freigabe durch Bernhard → Eintrag als `approved` in CATALOG.md und als `<id>.md` schreiben. Für H4-Journeys (write-to-read): Body muss die drei Pflicht-ACs aus `CATALOG_SCHEMA.md §5a` enthalten (AC-1 Happy Path, AC-2 Existing-Dependency, AC-3 Feld-Edgecase) — andernfalls ist der Body unvollständig und der Coder darf nicht auf `implemented` setzen. Coder implementiert `.spec.ts` im nächsten Spec-Lauf.
- Bei Ablehnung → Eintrag als `skipped` mit `skip-reason: "Beim Testlauf <datum> abgelehnt"`.
- Phase 0.5 schreibt Katalog-Einträge **nur** nach Freigabe — außer `last-run`/`last-result` (das macht Phase 3.5).
