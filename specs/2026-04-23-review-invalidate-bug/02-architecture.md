# Architektur — Bugfix Review-Invalidate im Shop-Admin

> Quelle: `specs/2026-04-23-review-invalidate-bug/01-design.md`
> Du als Coder findest hier die konkrete Pfad-, Token- und Task-Definition.

---

## 1. Befund-Analyse (Root Cause)

### Bug 1 — "Alle Reviews werden invalidiert"

Du analysierst drei Hypothesen:

**(a) UI-State-Logik in `ReviewModerationTable.tsx`**
Die Logik in `setReviews((prev) => prev.map((r) => r.id === id ? {...r, is_visible: false} : r))` (Zeilen 29–31, 42–44) ist sauber. Sie ändert nur den passenden Datensatz. **Kein Bug hier.**

**(b) Falscher Proxy / falsches Token (HAUPTURSACHE)**
Das ist der eigentliche Befund. Vergleich der drei Catch-All-Proxies:

| Client-Pfad-Prefix | Cookie | Backend-Prefix |
|---|---|---|
| `/api/customer/...` | `customer_token` | `${BACKEND}/api/v1/<rest>` |
| `/api/shop-admin/...` | `shop_owner_token` | `${BACKEND}/api/v1/shop-owner/<rest>` |
| `/api/admin/...` | `admin_token` | `${BACKEND}/api/v1/admin/<rest>` |

`ReviewModerationTable.tsx` ruft heute `POST /api/customer/admin/reviews/{id}/invalidate` → wird zu `${BACKEND}/api/v1/customer/admin/reviews/{id}/invalidate` mit dem **Customer-Bearer** (oder anonym, falls kein Customer eingeloggt). Im Reviews-SSR-Loader (`reviews/page.tsx:11`) wird hingegen `admin_token ?? shop_owner_token` verwendet — also völlig anderer Auth-Kontext.

Konsequenz: Das Backend bekommt entweder einen Customer-Token (irrelevant) oder gar keinen, und je nach Backend-Verhalten kann ein unauthentifizierter / falsch authentifizierter Aufruf entweder fehlschlagen, oder — falls das Backend hier eine gefährliche Default-Logik hat — Bulk-Effekte auslösen. Der "alle Reviews invalidiert"-Effekt ist daher kein UI-Bug, sondern eine Folge des falschen Auth-Kontexts.

**(c) Backend-Bulk-Bug**
Wahrscheinlichkeit gering, sofern (b) gefixt ist. Wir prüfen es als Folge-Aufgabe gegen das Backend-Repo (siehe Backend-Aufgabe T5). Falls nach Fix die Symptomatik bleibt: Backend-Verantwortung.

### Bug 2 — `invalidated`-Event fehlt im Audit-Log

Aktuelle Pfade:

- **Mutation** (Client): `POST /api/customer/admin/reviews/{id}/invalidate`
  → Backend: `${BACKEND}/api/v1/customer/admin/reviews/{id}/invalidate`
- **Audit-Log-Read** (Server): `${BACKEND}/api/v1/admin/reviews/{id}/audit-log` (siehe `audit-log/page.tsx:14`)
- **Reviews-Liste** (Server): `${BACKEND}/api/v1/admin/reviews?limit=100` (siehe `reviews/page.tsx:14`)

Read- und Write-Pfad zeigen auf zwei **unterschiedliche** Backend-Routenbäume (`/api/v1/customer/admin/...` vs `/api/v1/admin/...`). Wenn die Mutation auf der Customer-Variante einen Audit-Eintrag schreibt (falls der Endpoint überhaupt existiert), landet er nicht in der Tabelle, die das Audit-Log liest. Sehr wahrscheinlich existiert die Customer-Variante gar nicht und das Backend antwortet 404 — was die UI nicht meldet (siehe Bug 3).

**Kanonischer Pfad: `/api/v1/admin/reviews/{id}/invalidate`** (konsistent mit Read-Pfad und Listen-Pfad). Das ist die Richtung, in die wir das Frontend verschieben.

### Bug 3 — Fehlende Fehleranzeige

`ReviewModerationTable.tsx` schluckt jeden Non-OK-Response stillschweigend (`if (res.ok) ...`). Du fügst eine inline Fehlermeldung pro Zeile hinzu — **kein Toast-Framework**, da im Repo keines etabliert ist.

---

## 2. Affected Modules / Files

| Pfad | Änderung |
|---|---|
| `src/components/shop-admin/ReviewModerationTable.tsx` | Pfade auf `/api/admin/reviews/{id}/invalidate` und `/api/admin/reviews/{id}/restore` umstellen; Fehler-State pro Zeile; pendingId-Reset auch im Erfolg-Branch |
| `src/app/(shop-admin)/shop-admin/(portal)/reviews/page.tsx` | Keine Änderung (liest schon korrekt von `/api/v1/admin/reviews`) |
| `src/app/(shop-admin)/shop-admin/(portal)/reviews/[id]/audit-log/page.tsx` | Keine Änderung (liest schon korrekt von `/api/v1/admin/reviews/{id}/audit-log`) |
| `src/app/api/admin/[...path]/route.ts` | Keine Änderung (Proxy bleibt wie er ist) |
| `src/lib/shop-admin-translations.ts` | Neue Keys für Fehlermeldung in allen 6 Sprachen |
| `src/types/shop-admin.ts` | Keine Änderung |

**Clean-Boundary-Check:** Alle Änderungen bleiben innerhalb von `src/components/shop-admin/`, `src/app/(shop-admin)/`, `src/app/api/admin/` und den shop-admin-spezifischen Lib/Types-Dateien. **Keine Imports aus customer-facing Code.** `ReviewModerationTable.tsx` nutzt aktuell keine Imports außerhalb von `src/types/shop-admin` und `src/lib/shop-admin-translations` — Boundary bleibt sauber.

**Begründung Wahl `/api/admin/...` statt `/api/shop-admin/...`:** Der SSR-Loader liest von `/api/v1/admin/reviews` und akzeptiert sowohl `admin_token` als auch `shop_owner_token`. Der bestehende `admin`-Proxy hängt allerdings nur `admin_token` an. **Das ist ein Mismatch, den der Coder loud-flagged hinterlassen muss** (siehe Risiko R3). Für diesen Fix gehen wir den minimalinvasiven Weg: **`/api/admin/...` mit `admin_token`**. Falls Shop-Owner ohne Admin-Rechte auch invalidieren dürfen müssen, ist eine separate Architekturentscheidung nötig (offene Frage Q2).

---

## 3. Datenmodell-Änderungen

**Keine.** Reines Frontend-Routing-Fix. Tabellen `reviews`, `review_audit_log` (oder vergleichbar) im Backend bleiben unverändert.

---

## 4. API-Contracts

### Mutation: Invalidate (verwendet)
```
POST /api/admin/reviews/{id}/invalidate           (Client-Origin, Same-Site)
  → ${BACKEND}/api/v1/admin/reviews/{id}/invalidate
Header:    Authorization: Bearer <admin_token>
           Content-Type: application/json
Body:      { "reason": "<übersetzter Reason-String>" }
Response:  200 OK  → { ...AdminReview }    (oder 204)
           400/401/403/404/5xx → { "detail": "..." }
```

### Mutation: Restore (verwendet)
```
POST /api/admin/reviews/{id}/restore
  → ${BACKEND}/api/v1/admin/reviews/{id}/restore
Header:    Authorization: Bearer <admin_token>
Body:      (leer)
Response:  200 / 204 / Fehler analog
```

### Read: Audit-Log (unverändert, SSR direkt zum Backend)
```
GET ${BACKEND}/api/v1/admin/reviews/{id}/audit-log
Header:    Authorization: Bearer <admin_token | shop_owner_token>
Response:  200 OK → AuditLogEntry[]
```

### Read: Reviews-Liste (unverändert, SSR direkt zum Backend)
```
GET ${BACKEND}/api/v1/admin/reviews?limit=100
Header:    Authorization: Bearer <admin_token | shop_owner_token>
Response:  200 OK → AdminReview[]
```

**Reason-Wert:** Aktuell wird der **lokalisierte** String gesendet (`tr.reviews_reason_spam` → "Spam" / "Spam" / "Beleidigung" / etc.). Das ist semantisch fragwürdig — das Backend bekommt sprachabhängige Strings. Empfehlung: stattdessen den **Schlüssel** (`'spam' | 'offensive' | 'legal' | 'other'`) senden. Siehe T2 (optional, kann ggf. mit Backend abgestimmt werden — markiere als TODO falls Backend strikt einen freien Reason-Text erwartet).

---

## 5. Dependencies & Integration Points

- **Keine neuen Bibliotheken.**
- **Keine neuen Feature-Flags.**
- Bestehender `admin`-Proxy (`src/app/api/admin/[...path]/route.ts`) wird zum Mutation-Pfad. Bisher nur lesend für andere Admin-Bereiche genutzt — Risiko siehe R1.

---

## 6. Risks & Mitigations

| ID | Risiko | Mitigation |
|---|---|---|
| R1 | `admin_token`-Cookie ist möglicherweise nicht gesetzt, wenn der Nutzer nur als Shop-Owner eingeloggt ist (`shop_owner_token`). Dann schlägt Invalidate mit 401 fehl. | T3 implementiert sichtbares Fehler-Feedback. Klärung über offene Frage Q2. Falls Shop-Owner berechtigt sein sollen: in einem Folge-Spec einen `shop-admin`-Proxy-Branch oder einen unified Proxy einführen. |
| R2 | Backend-Endpoint `/api/v1/admin/reviews/{id}/invalidate` existiert evtl. nicht (oder ist unter `/api/v1/customer/admin/...` implementiert). Dann antwortet das Backend mit 404. | T5 (Backend-Aufgabe): existiert er? Falls nein, im Backend-Repo anlegen ODER hier alternativ den Pfad zurück auf `/api/v1/customer/admin/...` lenken (über einen neuen Proxy-Pfad mit `admin_token`-Cookie). Zwingend zu klären, bevor T1 deployt wird. |
| R3 | Mismatch SSR-Loader (akzeptiert beide Tokens) ↔ Mutation-Proxy (nur `admin_token`). UI zeigt also evtl. Reviews an, lässt sie aber nicht invalidieren. | Loud Flag im Code-Kommentar bei der `fetch`-Zeile + Eintrag in offene Fragen Q2. |
| R4 | Lokalisierter Reason-Text im Backend gespeichert → Audit-Log zeigt für andere Admins evtl. unverständlich. | T2 sendet bevorzugt den Schlüssel. Falls Backend strikt Text erwartet, in T5 Backend-Anpassung anstoßen. |
| R5 | Rückwärtsschritt: Falls bestehende Tests gegen die alten Pfade asserten. | Vor Merge: `e2e/journeys/customer-and-review-lifecycle.spec.ts` durchsuchen nach Pfad-Strings `'/api/customer/admin/reviews'` und `'/api/admin/reviews'`. |

---

## 7. Task-Breakdown

### T1 — Mutation-Pfade umstellen (Frontend)
**Datei:** `src/components/shop-admin/ReviewModerationTable.tsx`
- Zeile 23: `POST /api/customer/admin/reviews/${id}/invalidate` → `POST /api/admin/reviews/${id}/invalidate`
- Zeile 38: `POST /api/customer/admin/reviews/${id}/restore` → `POST /api/admin/reviews/${id}/restore`
- Im Code-Kommentar oberhalb des Aufrufs: kurz dokumentieren, dass dieser Proxy `admin_token` anhängt (für nachfolgende Maintainer).
**Abhängigkeiten:** keine.
**Sized:** ≈ 10 min.

### T2 — Reason als Schlüssel statt lokalisiertem Text senden (Frontend)
**Datei:** `src/components/shop-admin/ReviewModerationTable.tsx`
- Body-Payload: `{ reason: reason }` (also `'spam' | 'offensive' | 'legal' | 'other'`) statt `tr[...]`.
- Falls Backend explizit einen freien Text erwartet, `// TODO: confirm reason payload format with backend` als Kommentar belassen.
**Abhängigkeiten:** T1.
**Sized:** ≈ 5 min.

### T3 — Inline-Fehlerfeedback (Frontend)
**Datei:** `src/components/shop-admin/ReviewModerationTable.tsx`
- Neuer State: `const [errorById, setErrorById] = useState<Record<number, string | null>>({})`.
- Bei `!res.ok` in `handleInvalidate` und `handleRestore`: passenden Fehlertext aus `tr` setzen (`tr.reviews_action_failed`), bei Erfolg: Eintrag löschen.
- Render: unterhalb der Action-Row pro Review-Card eine `<p className="text-xs text-red-600 mt-2">{errorById[review.id]}</p>`-Zeile, nur wenn gesetzt.
- `setPendingId(null)` muss auch nach Restore gerufen werden (Konsistenz).
**Abhängigkeiten:** T1.
**Sized:** ≈ 20 min.

### T4 — Übersetzungs-Keys für Fehlermeldung (Frontend, alle 6 Sprachen)
**Datei:** `src/lib/shop-admin-translations.ts`
- Neuer Key `reviews_action_failed` in allen Sprach-Blöcken (`en`, `de`, `el`, `ru`, `ar`, `he`).
- Vorschlag DE: `'Aktion fehlgeschlagen. Bitte erneut versuchen.'`
- Vorschlag EN: `'Action failed. Please try again.'`
- Restliche Sprachen analog gem. Konvention.
- Type-Definition `ShopAdminTranslations` ggf. mitaktualisieren (TypeScript wird das ohnehin erzwingen).
**Abhängigkeiten:** keine (kann parallel zu T3 erfolgen, muss aber vor Merge mit T3 verbunden sein).
**Sized:** ≈ 15 min.

### T5 — BACKEND-AUFGABE (kein Frontend-Coder-Task)
**Repo:** `/Users/bb_studio_2025/dev/github/pundo_main_backend`
- Verifiziere, dass `POST /api/v1/admin/reviews/{id}/invalidate` und `POST /api/v1/admin/reviews/{id}/restore` existieren, korrekt **nur den adressierten Review** ändern und einen Audit-Log-Eintrag mit `action='invalidated'` bzw. `action='restored'` schreiben.
- Falls Endpunkte nur unter `/api/v1/customer/admin/...` existieren: nach `/api/v1/admin/...` migrieren oder spiegeln.
- Falls Reason als Schlüssel ankommt (T2): Mapping/Persistenz im Backend vorsehen.
- Frage klären: dürfen `shop_owner`-Tokens diese Endpunkte nutzen? Falls ja, `shop-owner-Proxy` im Frontend einführen oder zentrales Auth-Mapping anpassen.
**Abhängigkeiten:** logisch vor T1 zu klären.
**Sized:** Backend-seitig 1–3 h, separater Spec im Backend-Repo empfohlen.

### T6 — Manueller Smoke nach Deploy (Frontend, optional)
- 1 Review invalidieren, 1 Restore, je `audit-log`-Seite öffnen → korrekte Einträge sichtbar.
- 2. Review unangetastet lassen, Reload der Liste → nur der invalidierte ist als invalidiert markiert.
**Abhängigkeiten:** T1–T4 + T5.

**Reihenfolge:** T5 (Klärung) → T1 → T2 → T4 → T3 → T6.

---

## 8. Journey-Deltas

`e2e/journeys/CATALOG.md` enthält die Journey [`customer-and-review-lifecycle`](../../e2e/journeys/customer-and-review-lifecycle.md) (P2). Diese deckt in **PHASE 3 — Admin Moderation** das Approve/Reject von Reviews ab — aber **nicht** explizit den Invalidate/Restore-Flow im Shop-Admin-Portal und auch nicht die Audit-Log-Anzeige.

**Drift-Befund (Phase 1 — nur Drift, keine neuen Vorschläge):** Die bestehende Journey beschreibt im Schritt 11/12 "approved/rejected", was semantisch ein anderer Workflow ist als "invalidate/restore" eines bereits sichtbaren Reviews. Es gibt aktuell **keine** Journey-Datei, die genau den Bug-Fix-Pfad (Invalidate eines sichtbaren Reviews mit Audit-Eintrag) abbildet.

**Hinweis (kein Action-Item für diese Phase):** Eine neue Journey `shop-admin-review-moderation` sollte nach Implementierung dieses Fixes hinzugefügt werden. Phase 1 schließt das jedoch ausdrücklich aus — der e2e-tester wird das in `04-test-report.md` als Vorschlag aufnehmen.

---

## 9. Antworten auf offene Fragen aus `01-design.md`

| Frage | Status | Antwort |
|---|---|---|
| Q1: Welcher Backend-Endpunkt ist kanonisch — `/api/v1/admin/reviews/{id}/invalidate` oder `/api/v1/customer/admin/reviews/{id}/invalidate`? | **Beantwortet (Frontend-Sicht)** | Kanonisch ist `/api/v1/admin/reviews/{id}/invalidate` — konsistent mit Read-Pfad (`reviews/page.tsx`) und Audit-Log-Pfad. Existenz im Backend muss in T5 verifiziert werden. |
| Q2: Darf Shop-Owner (nicht-Admin) Reviews invalidieren? | **OFFEN** | Bleibt offen. SSR-Loader akzeptiert beide Tokens, Mutation-Proxy `admin` nur `admin_token`. Loud-Flag im Code (R3) + Backend-Klärung T5. Diese Architektur deckt zunächst nur **Admin-Rolle**. |
| Q3: Toast oder inline Error bei Fehlerantwort? | **Beantwortet** | Inline pro Review-Card (kein Toast-Framework einführen). Keys in T4. |
| Q4: Reproduzierbarkeit "alle Reviews invalidiert" | **Hypothese** | Nicht durch UI-State-Logik verursacht. Wahrscheinlich Folge des falschen Auth-Kontexts + fehlender Fehleranzeige (User sieht keinen Erfolg, lädt neu, Backend liefert je nach Verhalten irreführende Daten). T1+T3 zusammen sollten das Symptom beseitigen. Falls nicht: T5 Backend-Audit. |
| Q5: Backend-Änderung erforderlich? | **Bedingt ja** | Nur falls Backend-Endpoint unter dem kanonischen Pfad noch nicht existiert oder keinen Audit-Eintrag schreibt. Klärung in T5. |

---

Architecture complete at `specs/2026-04-23-review-invalidate-bug/02-architecture.md`. Ready for coder.
