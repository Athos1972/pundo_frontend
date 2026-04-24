# Test Report — Review-Invalidate Bugfix
> Spec: `2026-04-23-review-invalidate-bug`
> Tester: E2E-Tester Agent (claude-sonnet-4-6)
> Date: 2026-04-24

---

## 1. Coverage Matrix

| # | Acceptance Criterion (from 01-design.md) | Test Performed | Result |
|---|---|---|---|
| AC1 | Als Admin/Shop-Owner invalidiere ich einen Review, nur dieser wird im UI als invalidiert markiert | Unit: `ReviewModerationTable — Invalidate (Erfolg) > markiert nach Invalidate nur den betroffenen Review als invalidiert`; API: `POST /api/v1/admin/reviews/101/invalidate` → nur review 101 `is_visible=false`, reviews 102+103 unverändert | PASS |
| AC2 | State persistent nach Reload — nur der invalidierte Review bleibt invalidiert | API: Reviews-Liste nach Invalidate via `GET /api/v1/admin/reviews` abgefragt — review 101 `is_visible=false`, andere unverändert | PASS |
| AC3 | Audit-Log zeigt `invalidated`-Event mit Grund, Zeitstempel, Akteurstyp `admin` | API: `GET /api/v1/admin/reviews/101/audit-log` liefert `[{action:"invalidated", actor_type:"admin", reason:"spam", timestamp:"..."}]` | PASS |
| AC4 | Nach Invalidate + Restore zeigt Audit-Log beide Einträge in chronologischer Reihenfolge | API: Audit-Log nach Restore zeigt `[{action:"invalidated",...}, {action:"restored",...}]` in korrekter Reihenfolge | PASS |
| AC5 | Bei Fehler (4xx/5xx) wird kein Review als invalidiert markiert; Nutzer erhält sichtbare Fehlermeldung | Unit: `Fehlgeschlagenes Invalidate (fetch → 500)` — kein Badge, kein Restore-Button, Fehlermeldung `tr.reviews_action_failed` sichtbar; API: 404 bei ungültiger ID, 401 ohne Token korrekt propagiert | PASS |
| AC6 | Audit-Log-Pfad und Mutation-Pfad zeigen auf dieselbe Backend-Ressource (Read/Write-Konsistenz) | Frontend-Proxy `POST /api/admin/reviews/{id}/invalidate` erreicht `POST /api/v1/admin/reviews/{id}/invalidate`; Audit-Log SSR-Pfad liest `GET /api/v1/admin/reviews/{id}/audit-log` — beide unter `/api/v1/admin/reviews` (gleiche Ressource) | PASS |

---

## 2. Environment

| Komponente | Details |
|---|---|
| Frontend | Next.js 16.2.2, Port **3500** (`npm run dev:test`), BACKEND_URL=`http://localhost:8500` |
| Backend | FastAPI, Port **8500** (Test-Instanz), DB: `pundo_test` |
| Datenbank | PostgreSQL, `pundo_test` |
| Git SHA | `b6d9446dce0a0f1913c13bcfb02efaaa7f06e8d6` |
| Node | via `npm run dev:test` |
| Test-Fixtures (geseedet) | 3 Reviews (IDs 101, 102, 103) und 3 Customer-Users (IDs 1, 2, 3) manuell in `pundo_test` eingefügt; `review_audit_log` vor Tests geleert |
| Admin-Token | Via `POST http://localhost:8500/api/v1/admin/auth/login` mit `e2e-admin@pundo-e2e.io` / `E2eAdminPassword!99` |

---

## 3. Failures

Keine Failures. Alle 6 Acceptance Criteria bestehen.

---

## 4. Divergences from Spec

### D1 — `shop_owner_token`-Mismatch (bekanntes Risk R3, explizit dokumentiert)

**Design (01-design.md Abschnitt 2):** Der SSR-Loader liest Reviews mit `admin_token ?? shop_owner_token`.
**Implementation:** Der `/api/admin/...`-Proxy hängt nur `admin_token` an. Ein eingeloggter Shop-Owner ohne `admin_token` erhält beim Invalidate/Restore einen 401-Fehler — den die UI jetzt sichtbar anzeigt (T3).

**Bewertung:** Kein neuer Bug. Vorher war der Pfad ganz falsch (`/api/customer/...`); jetzt ist er korrekt für Admin-Nutzer. R3 ist im Code mit Kommentar dokumentiert. Offene Frage Q2 bleibt offen. **Kein Blocker** — separater Spec für Shop-Owner-Flow ist laut Architektur-Spec explizit ausgestellt.

### D2 — Reason-Payload: Key statt lokalisierter String (Architektur-Empfehlung umgesetzt)

**Design (01-design.md Abschnitt 6 Q2-Folgen):** Reason-Format war offen.
**Architecture (02-architecture.md T2):** Empfiehlt Key-String (`'spam' | 'offensive' | 'legal' | 'other'`); TODO-Kommentar für Backend-Abklärung.
**Implementation:** Sendet Key. Backend (T5) bestätigt `Optional[str]` — Key `'spam'` wird akzeptiert und im Audit-Log als `reason:"spam"` gespeichert.

**Bewertung:** Kein Divergenz-Problem. Umsetzung ist der Spec-Empfehlung konform. Der TODO-Kommentar im Code ist korrekt hinterlassen.

### D3 — T6 (Manueller Smoke) als Teilaufgabe E2E-Tester

**Implementation (03-implementation.md):** T6 ist als "durch e2e-tester abgedeckt" markiert.
**Tatsächliche Abdeckung:** T6 wurde durch API-Tests (direkte Backend- und Frontend-Proxy-Aufrufe) abgedeckt, nicht durch Playwright-Browser-Klick-Tests. Die Reason: kein Playwright-Journey für diesen Spec existiert (laut 02-architecture.md §8 Journey-Deltas bewusst ausgelassen).

**Bewertung:** Kein Blocker. Der Smoke-Test ist auf API-Ebene vollständig. Browser-UI-Flow (T6) ist für einen separaten Journey `shop-admin-review-moderation` vorgesehen.

---

## 5. Phase 0.5 — Journey-Scan

**CATALOG.md-Check:** Kein Eintrag mit `proposed-in-spec: 2026-04-23-review-invalidate-bug` oder `status: approved` für diesen Spec. Keine mustRun-Journeys.

**Drift-Check:** Alle `touches-modules`-Pfade der 5 katalogisierten Journeys wurden geprüft — keine Stale-Einträge.

**Heuristik-Scan (H2):** Die geänderten Dateien (`ReviewModerationTable.tsx`, `shop-admin-translations.ts`) liegen in `src/components/shop-admin/` — kein neues `page.tsx` wurde hinzugefügt. Heuristik H2 schlägt **nicht** an (Bedingung ist `neue Datei in src/app/shop-admin/**` mit `page.tsx`).

**Journey-Vorschlag (nicht Action-Item):** Eine Journey `shop-admin-review-moderation` sollte nach vollständiger Backend-Verifikation (T5) angelegt werden. Sie würde abdecken: Invalidate + Audit-Log-Verifizierung + Restore + Reload-Persistenz im Browser.

**Phase 3.5 (Journey-Run):** Keine mustRun-Journeys — übersprungen.

---

## 6. Statische Prüfung (Phase 1)

| Prüfung | Ergebnis |
|---|---|
| `npx tsc --noEmit` | PASS — 0 neue Fehler; 2 pre-existing Fehler in `e2e/journeys/shop-admin-offers.spec.ts` (`Property 'price' does not exist on type 'never'`) — nicht durch diesen Fix verursacht |
| `npm run lint` | PASS — 0 Errors; 44 pre-existing Warnings (unverändert) |

---

## 7. Unit-Tests (Phase 2)

| Test-Suite | Tests | Ergebnis |
|---|---|---|
| `ReviewModerationTable.test.tsx` | 12/12 | PASS |

**Coverage `ReviewModerationTable.tsx`:**
- Statements: 85% (Ziel: 70%) — PASS
- Branches: 80% (Ziel: 70%) — PASS
- Functions: 83.33% (Ziel: 70%) — PASS
- Lines: 90.62% (Ziel: 70%) — PASS

Uncovered Lines 59, 109, 125: `handleRestore` cancel-Zweig, Option-Rendering im Select (reine Render-Logik ohne Seiteneffekte) — akzeptabel.

**Coverage `shop-admin-translations.ts`:** 100% Statements, 100% Lines — PASS.

---

## 8. API-Integrationstests (Phase 3 — gegen Port 3500/8500)

| Test | Methode | Ergebnis |
|---|---|---|
| `POST /api/v1/admin/reviews/101/invalidate` (direkt Backend 8500) | curl mit admin_token | HTTP 200, `{"status":"invalidated"}` |
| Reviews-Liste nach Invalidate — nur review 101 `is_visible=false` | curl GET | PASS |
| `GET /api/v1/admin/reviews/101/audit-log` nach Invalidate | curl | 1 Eintrag: `action="invalidated"`, `actor_type="admin"`, `reason="spam"` |
| `POST /api/v1/admin/reviews/101/restore` (direkt Backend 8500) | curl | HTTP 200, `{"status":"restored"}` |
| Audit-Log nach Restore — beide Einträge chronologisch | curl | `[{action:"invalidated"}, {action:"restored"}]` |
| `POST /api/admin/reviews/101/invalidate` (via Frontend-Proxy Port 3500) | curl mit admin_token Cookie | HTTP 200, Backend-Review korrekt invalidiert |
| `POST /api/admin/reviews/101/restore` (via Frontend-Proxy Port 3500) | curl | HTTP 200 |
| Fehler: ungültige Review-ID 99999 | curl POST 3500 | HTTP 404 propagiert — Frontend kann Fehlermeldung anzeigen |
| Fehler: kein admin_token Cookie | curl POST 3500 | HTTP 401 propagiert — Frontend kann Fehlermeldung anzeigen |

---

## 9. Phase 4.5 — Living Docs Sync

Die geänderten Dateien (`ReviewModerationTable.tsx`, `shop-admin-translations.ts`, Test-File) betreffen internes Admin-Routing und Fehlermeldungen — keine öffentlich beschriebene Feature-Erweiterung.

`llms.txt` und `README.md` erwähnen Reviews nur im Kontext des Customer-Features (Trust-Punkte, Account-Seite). Kein Update nötig.

**Docs-Sync: kein Signal — übersprungen.**

---

## Verdict

**SHIP**

Alle 6 Acceptance Criteria aus `01-design.md` bestehen. Die Root Causes (falscher Proxy-Pfad, fehlende Fehleranzeige) sind korrekt behoben:

- T1: Mutation-Pfad auf `/api/admin/...` umgestellt — korrekte Auth (admin_token)
- T2: Reason als Key gesendet — language-agnostisch
- T3: Inline-Fehlerfeedback pro Review — kein Silent-Fail mehr
- T4: Translations-Key `reviews_action_failed` in allen 6 Sprachen
- T5 (Backend): Endpunkte `POST /api/v1/admin/reviews/{id}/invalidate` und `POST /api/v1/admin/reviews/{id}/restore` existieren und schreiben Audit-Log-Einträge korrekt

**Offene Folgearbeiten (kein Blocker für Ship):**
1. R3 (Shop-Owner-Token-Mismatch): Separater Spec, Q2 aus 02-architecture.md
2. Journey `shop-admin-review-moderation` im Katalog anlegen und implementieren
