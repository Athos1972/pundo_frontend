# Implementation Report — Review-Invalidate Bugfix

> Feature slug: `2026-04-23-review-invalidate-bug`
> Coder: Claude (Sonnet 4.6)
> Date: 2026-04-23

---

## Task Summary

| Task | Status | Notes |
|---|---|---|
| T1 — Mutation-Pfade umstellen | done | `/api/customer/admin/reviews/{id}/invalidate` → `/api/admin/reviews/{id}/invalidate`; Restore analog |
| T2 — Reason als Schlüssel statt lokalisiertem Text | done | `{ reason }` sendet jetzt `'spam' \| 'offensive' \| 'legal' \| 'other'`; TODO-Kommentar hinterlassen für Backend-Abklärung |
| T3 — Inline-Fehlerfeedback | done | `errorById` State pro Review; Fehler bei `!res.ok`; Löschen bei Erfolg; `setPendingId(null)` auch nach Restore |
| T4 — Translations-Key `reviews_action_failed` | done | Alle 6 Sprachen ergänzt (en, de, el, ru, ar, he); TypeScript-Type automatisch inferiert aus `en`-Objekt |
| T5 — Backend-Aufgabe | skipped | Kein Frontend-Coder-Task laut Architektur-Spec. Muss im Backend-Repo `/Users/bb_studio_2025/dev/github/pundo_main_backend` separat angegangen werden: Existenz von `POST /api/v1/admin/reviews/{id}/invalidate` und `POST /api/v1/admin/reviews/{id}/restore` verifizieren, Audit-Log-Schreibung sicherstellen. |
| T6 — Manueller Smoke | skipped | Durch den e2e-tester abgedeckt. |

---

## File-by-File Changes

### Modified

**`src/components/shop-admin/ReviewModerationTable.tsx`**
- T1: `handleInvalidate` fetch-URL von `/api/customer/admin/reviews/${id}/invalidate` auf `/api/admin/reviews/${id}/invalidate` umgestellt
- T1: `handleRestore` fetch-URL von `/api/customer/admin/reviews/${id}/restore` auf `/api/admin/reviews/${id}/restore` umgestellt
- T1: Kommentare oberhalb der fetch-Aufrufe erklären den Proxy-Pfad und den R3-Mismatch (admin_token vs. shop_owner_token)
- T2: `body: JSON.stringify({ reason })` — sendet Key-String statt `tr[reviews_reason_${reason}]`; TODO-Kommentar für Backend-Abklärung
- T3: Neuer State `errorById: Record<number, string | null>`
- T3: `setErrorById` bei `!res.ok` (Fehlertext aus `tr.reviews_action_failed`)
- T3: `setErrorById` bei `res.ok` (Eintrag auf `null` setzen)
- T3: `setPendingId(null)` jetzt auch im `handleRestore` (war zuvor vergessen)
- T3: Render-Erweiterung: `<p className="text-xs text-red-600 mt-2">` pro Review, nur wenn `errorById[review.id]` gesetzt

**`src/lib/shop-admin-translations.ts`**
- T4: Key `reviews_action_failed` in allen 6 Sprachen ergänzt (en, de, el, ru, ar, he)
- TypeScript-Typ `ShopAdminTranslations` automatisch aktualisiert (wird von `typeof shopAdminTranslations.en` inferiert)

### Added

**`src/tests/ReviewModerationTable.test.tsx`** (neu)
- 12 Unit-Tests in 5 Describe-Blöcken
- Testabdeckung: Render, erfolgreiches Invalidate (nur betroffener Review), fehlgeschlagenes Invalidate (500 → Fehlermeldung, kein optimistisches Update), Pending-State (setzen/zurücksetzen/Restore), Reason-Payload (Key statt String, korrekter Proxy-Pfad)

---

## Known Gaps / Follow-ups

### R2/T5 — Backend-Endpunkt muss verifiziert werden (BLOCKER für vollständige Funktion)
Der Fix leitet Mutations an `POST /api/v1/admin/reviews/{id}/invalidate` und `POST /api/v1/admin/reviews/{id}/restore`. Ob diese Endpunkte im Backend existieren und korrekt Audit-Log-Einträge schreiben, wurde **nicht** im Frontend-Scope verifiziert. Das Backend-Repo muss konsultiert werden (`/Users/bb_studio_2025/dev/github/pundo_main_backend`). Falls die Endpunkte fehlen oder nur unter `/api/v1/customer/admin/...` existieren, schlägt Invalidate weiterhin fehl (jetzt mit sichtbarer Fehlermeldung dank T3).

### R3 — Shop-Owner-Token-Mismatch (offene Architektur-Frage)
Der SSR-Loader (`reviews/page.tsx`) akzeptiert `admin_token ?? shop_owner_token`. Der `/api/admin/...`-Proxy sendet nur `admin_token`. Ein eingeloggter Shop-Owner ohne Admin-Rechte sieht Reviews, kann aber nicht invalidieren (401-Fehler wird jetzt sichtbar angezeigt). Klärung in einem separaten Spec erforderlich (Frage Q2 aus `02-architecture.md`).

### R4 — Reason-Format Backend
T2 sendet jetzt den Schlüssel (`'spam' | 'offensive' | 'legal' | 'other'`). Falls das Backend explizit einen freien Reason-Text erwartet, muss T5 (Backend-Aufgabe) eine Mapping-Schicht ergänzen. TODO-Kommentar ist im Code hinterlassen.

### Keine approved-Journeys für diesen Spec
`e2e/journeys/CATALOG.md` enthält keinen Eintrag mit `status: approved` und `proposed-in-spec: 2026-04-23-review-invalidate-bug`. Die bestehende Journey `customer-and-review-lifecycle` deckt Approve/Reject ab, nicht Invalidate/Restore im Shop-Admin-Portal. Eine neue Journey `shop-admin-review-moderation` sollte nach vollständiger Implementierung (inkl. Backend T5) angelegt werden.

### Vorhandene TSC-Fehler (pre-existing, nicht durch diesen Fix verursacht)
`e2e/journeys/shop-admin-offers.spec.ts` hat 2 TS-Fehler (`Property 'price' does not exist on type 'never'`). Diese existieren schon vor diesem Fix (verifiziert via `git stash`).

---

## Risiko-Flags im Code

Ein Kommentar in `ReviewModerationTable.tsx` oberhalb jedes `fetch`-Aufrufs weist explizit auf R3 (Token-Mismatch) und T5 (Backend-Verifikation) hin — für nachfolgende Maintainer.

---

## Lokales Setup & Qualitätsprüfung

```bash
# Dependencies
npm install

# Unit-Tests (dieser Fix)
npx vitest run src/tests/ReviewModerationTable.test.tsx

# Alle Unit-Tests
npx vitest run

# TypeScript-Prüfung
npx tsc --noEmit

# Lint
npm run lint

# Entwicklungsserver (Test-Instanz, Port 3500)
npm run dev:test
```

### Ergebnisse (Stand Implementierung)

| Prüfung | Ergebnis |
|---|---|
| `vitest run ReviewModerationTable.test.tsx` | 12/12 Tests bestanden |
| `tsc --noEmit` | 0 neue Fehler (2 pre-existing in `e2e/journeys/shop-admin-offers.spec.ts`) |
| `npm run lint` | 0 Errors, 44 pre-existing Warnings |

---

## Übergabe an e2e-tester

**Backend-Abhängigkeit beachten:** Bevor E2E-Tests gegen echte Daten laufen, muss sichergestellt sein, dass `POST /api/v1/admin/reviews/{id}/invalidate` und `POST /api/v1/admin/reviews/{id}/restore` im Backend (Port 8500 / pundo_test) existieren und funktionieren. Andernfalls zeigt die UI jetzt korrekt eine Fehlermeldung (statt stillschweigendem Fehlschlag wie bisher).

**Keine DB-Migrationen, keine Schema-Änderungen, keine destruktiven Operationen** in diesem Fix.
