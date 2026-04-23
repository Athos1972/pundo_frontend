# Bugfix: Review-Invalidate im Shop-Admin

## 1. Problem & Nutzer

**Nutzer:** Admins / Shop-Owner mit Zugriff auf das Review-Moderations-UI unter `/shop-admin/reviews`.

**Symptome (vom User berichtet):**
1. Wenn Du einen einzelnen Review invalidierst, scheinen im UI **alle** Reviews invalidiert zu sein.
2. Der `invalidated`-Event taucht im Audit-Log (`/shop-admin/reviews/[id]/audit-log`) **nicht** auf, obwohl der Aktionsschlüssel in der UI-Übersetzung existiert (`reviews_audit_action_invalidated`).

**Warum wichtig:** Moderation ist eine harte Aktion, die Vertrauen, Nachvollziehbarkeit und (je nach Rechtsraum) auch Compliance betrifft. Ohne korrekte Anzeige und Audit-Trail ist sie unbrauchbar.

## 2. Befund aus dem Code (Stand heute)

Beim Lesen des aktuellen Codes sind mehrere konkrete Auffälligkeiten aufgefallen, die als Verdachtsursachen geprüft werden müssen:

- [ReviewModerationTable.tsx:23](src/components/shop-admin/ReviewModerationTable.tsx:23) ruft `POST /api/customer/admin/reviews/{id}/invalidate` auf. Dieser Pfad läuft über den **Customer-Catch-All-Proxy** [route.ts](src/app/api/customer/[...path]/route.ts), der ausschließlich das `customer_token`-Cookie liest — nicht aber `admin_token` oder `shop_owner_token`, die der Reviews-SSR-Loader [page.tsx:11](src/app/(shop-admin)/shop-admin/(portal)/reviews/page.tsx:11) verwendet. ⚠️ ANNAHME: Die Mutation läuft also entweder unauthentifiziert oder mit einem fremden Token-Kontext durch.
- Der finale Backend-Pfad wird zu `${BACKEND}/api/v1/customer/admin/reviews/{id}/invalidate`. Für die Audit-Log-Anzeige hingegen wird `${BACKEND}/api/v1/admin/reviews/{id}/audit-log` (ohne `/customer/`) genutzt → [audit-log/page.tsx:14](src/app/(shop-admin)/shop-admin/(portal)/reviews/[id]/audit-log/page.tsx:14). ⚠️ ANNAHME: Read und Write zeigen auf zwei unterschiedliche Backend-Endpunkte/Tabellen, daher fehlt der Eintrag im Log.
- Die UI-Aktualisierung in `setReviews((prev) => prev.map(...))` filtert sauber nach `id`. ⚠️ ANNAHME: Der "alle invalidated"-Effekt entsteht nicht in dieser State-Update-Logik, sondern dadurch, dass nach Reload das Backend tatsächlich falsche Daten liefert (z.B. Bulk-Effekt) **oder** die Seite optisch verwirrt (z.B. weil `pendingId` UI-Modus visuell dominiert). Muss verifiziert werden.

## 3. User Flows

### Happy Path — einzelnen Review invalidieren
1. Du öffnest `/shop-admin/reviews`.
2. Du klickst bei genau **einem** Review auf „Invalidate", wählst einen Grund und bestätigst.
3. Genau dieser eine Review wird visuell als invalidiert markiert (`is_visible=false`, gestrichelte Border, Badge „invalidated", Restore-Button).
4. Alle anderen Reviews bleiben unverändert sichtbar.
5. Im Audit-Log dieses Reviews erscheint sofort ein Eintrag mit Aktion `invalidated`, dem gewählten Grund, Akteurstyp `admin`/`shop_owner`, IP und Zeitstempel.

### Edge Case — mehrere nacheinander invalidieren
1. Du invalidierst Review A, danach Review B.
2. Beide sind invalidiert; Reviews C, D, … bleiben sichtbar.
3. Audit-Log von A enthält **nur** den A-Event, Audit-Log von B enthält **nur** den B-Event.

### Edge Case — Restore nach Invalidate
1. Du invalidierst einen Review und klickst danach „Restore".
2. Der Review ist wieder sichtbar; Audit-Log enthält jetzt zwei Einträge: `invalidated` und `restored` in chronologischer Reihenfolge.

### Edge Case — Reload nach Invalidate
1. Nach dem Invalidieren lädst Du die Seite neu.
2. Der Server-State spiegelt exakt das, was die UI optimistisch angezeigt hat — keine zusätzlichen oder fehlenden Invalidierungen.

## 4. Komponenten- / Endpunkt-Inventar (zu prüfen oder zu ändern)

| Element | Zweck | Vermutete Änderung |
|---|---|---|
| [ReviewModerationTable.tsx](src/components/shop-admin/ReviewModerationTable.tsx) | Mutation-Aufruf, optimistisches UI-Update | Korrekten Endpunkt-Pfad / Auth-Kontext nutzen |
| [src/app/api/customer/[...path]/route.ts](src/app/api/customer/[...path]/route.ts) | Customer-Proxy, hängt nur `customer_token` an | Vermutlich falsch für Admin-Aktionen — Aufruf gehört über Admin-Proxy |
| [src/app/api/admin/[...path]/route.ts](src/app/api/admin/[...path]/route.ts) | Admin-Proxy (vermutlich richtige Wahl) | Sicherstellen, dass Invalidate/Restore hierüber laufen und Audit-Log-Schreibung beim Backend ankommt |
| Backend-Endpunkt `POST /api/v1/admin/reviews/{id}/invalidate` | Soll Review invalidieren + Audit-Eintrag schreiben | Verifizieren, dass beides passiert; ggf. Backend-Fix nötig |
| [audit-log/page.tsx](src/app/(shop-admin)/shop-admin/(portal)/reviews/[id]/audit-log/page.tsx) | Read-Pfad | Pfad-Konsistenz mit Write-Pfad sicherstellen |

## 5. Acceptance Criteria

1. **Given** ich bin als Admin/Shop-Owner eingeloggt und sehe ≥ 2 sichtbare Reviews, **when** ich genau einen Review invalidiere, **then** wird im UI ausschließlich dieser eine Review als invalidiert dargestellt, alle anderen bleiben sichtbar.
2. **Given** Acceptance #1, **when** ich die Reviews-Seite neu lade, **then** ist der State persistent: nur der eine Review bleibt invalidiert.
3. **Given** ein Review wurde gerade invalidiert, **when** ich `/shop-admin/reviews/{id}/audit-log` öffne, **then** erscheint dort ein Eintrag mit Aktion `invalidated` (Label: "Invalidiert"), dem gewählten Grund, einem Zeitstempel und einem Akteurstyp `admin` oder `shop_owner`.
4. **Given** ich invalidere und danach restoriere denselben Review, **then** zeigt der Audit-Log beide Einträge in korrekter chronologischer Reihenfolge.
5. **Given** der Mutation-Endpunkt antwortet mit Fehler (4xx/5xx), **then** wird im UI **kein** Review als invalidiert markiert (kein optimistisches Update bei Fehler) und der Nutzer erhält eine sichtbare Fehlermeldung. ⚠️ ANNAHME: aktuell wird stillschweigend nichts angezeigt — sollte verbessert werden.
6. Audit-Log-Pfad und Mutation-Pfad zeigen auf dieselbe Backend-Ressource (Konsistenz Read ↔ Write).

## 6. Open Questions / Decisions

- ❓ OFFEN: Welcher Backend-Endpunkt ist der **kanonische** für Admin-Review-Moderation — `/api/v1/admin/reviews/{id}/invalidate` oder der via Customer-Proxy erreichte `/api/v1/customer/admin/reviews/{id}/invalidate`? Das Backend-Repo (`/Users/bb_studio_2025/dev/github/pundo_main_backend`) muss konsultiert werden.
- ❓ OFFEN: Soll der Shop-Owner (nicht-Admin) überhaupt Reviews invalidieren dürfen, oder ist diese Aktion auf globale Admins beschränkt? Aktuell akzeptiert der SSR-Loader beide Tokens.
- ❓ OFFEN: Sollte beim Invalidate ein Toast/Inline-Error bei Fehlerantwort erscheinen? (Heute keinerlei Feedback.)
- ❓ OFFEN: Reproduzierbarkeit „alle Reviews invalidiert" — bitte einen konkreten Screenshot oder Schritt-für-Schritt-Reproduktion liefern, falls die Vermutung aus Abschnitt 2 nicht zutrifft.
- ⚠️ ANNAHME: Der Bug-Fix erfordert **auch** Backend-Änderungen (Audit-Log-Schreibung beim Invalidate-Endpoint). Falls das Backend bereits korrekt loggt, ist es ein reines Frontend-Routing-Problem.

---

Design complete at `specs/2026-04-23-review-invalidate-bug/01-design.md`. Ready for /architect.
