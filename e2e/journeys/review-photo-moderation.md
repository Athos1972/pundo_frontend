---
id: review-photo-moderation
title: Review-Foto-Moderation über das LLM-Gateway — pending, Webhook, überfällige Fotos im Admin-Tab (F3700)
status: implemented
spec-file: e2e/journeys/review-photo-moderation.spec.ts
priority: P2
owner-agent: e2e-tester
proposed-in-spec: 2026-10-23-photo-moderation-via-llm-gateway
touches-modules:
  - src/app/(system-admin)/admin/(portal)/reviews/**
  - src/components/system-admin/UnmoderatedPhotoList.tsx
  - src/lib/system-admin-api.ts
  - src/lib/system-admin-translations.ts
  - src/types/system-admin.ts
  - src/app/api/admin/[...path]/**
touches-roles:
  - customer
  - admin
touches-states:
  - ReviewPhoto.status:pending
  - ReviewPhoto.status:approved
  - ReviewPhoto.status:rejected
status-changed-at: 2026-10-24T17:10:00Z
status-changed-by-spec: 2026-10-23-photo-moderation-via-llm-gateway
last-run: 2026-10-24T17:09:21Z
last-result: PASS
last-run-sha: null
---

### Journey: Review-Foto-Moderation über das LLM-Gateway

**Ziel:** Ein hochgeladenes Review-Foto ist zunächst `pending`; das Gateway-Ergebnis kommt per Webhook zurück und entscheidet (nur wenn gültig); bleibt es ohne Ergebnis, erscheint es nach 30 Minuten im Admin-Tab „Fotos ohne Prüfergebnis“, der Admin gibt es frei oder lehnt es ab, und die Kundin sieht den Status im Foto-Status-Endpoint.

**Trigger-Regel:** Pflicht (P2), wenn `/admin/reviews` (Tab „Fotos ohne Prüfergebnis“), `UnmoderatedPhotoList.tsx`, die Admin-Review-Proxys, `system-admin-api.ts` zu Foto-Entscheidungen oder die Backend-Foto-Moderation (Upload, Webhook-Handler `moderate.review_photo`, Admin-Endpunkte) im Diff sind.

**Kein echter Worker nötig:** Die Kette Backend → Test-Gateway (8600) → Webhook → Backend ist echt. Die Worker-Rolle übernimmt der Test nur für die eigenen Aufträge (Task-ID aus der DB, Antwort in der Hülle des echten Workers `{output, raw}`, Form wie das Worker-Golden `moderate.review_photo.json`). Ist das Test-Gateway nicht erreichbar, überspringt die Journey sichtbar mit Grund (Muster wie `llm-effects-homesick-spotted`). Ein laufender Test-Worker (`worker.test.yml`) würde die Fotos selbst entscheiden und die Schritte S3 bis S7 stören: vorher beenden.

**Test-Daten-Matrix:**

| Fixture | Was | Warum |
|---|---|---|
| `customer` | `e2e-<run>-photo-mod-<rand>@pundo.com` (auto-verifiziert, nicht vertrauenswürdig) | Foto startet `pending` |
| `spec-shop` | `specShop('PHMOD')` | Review-Ziel |
| `photo-webhook` | Foto, Ergebnis „abgelehnt, spam“ per Gateway | Webhook-Weg, Audit `system` |
| `photo-invalid` / `photo-overdue-a` | Foto mit ungültigem Ergebnis (confidence 1.5), dann auf 40 min gealtert | Fehlerfall + Admin-Freigabe |
| `photo-overdue-b` | Foto, auf 40 min gealtert | Admin-Ablehnung, 409, spätes Ergebnis |
| `photo-fresh` | Foto frisch | erscheint nicht in der Liste |

**Schritte (Runbook):**
1. S1 Upload → 201, `pending`, Task-ID und Anfragezeit am Foto, Statusendpoint `pending` (AK 1).
2. S2 Gateway-Ergebnis „abgelehnt“ (spam) → Webhook → `rejected`, Kategorie, Grund, Modell aus dem Webhook, Audit `photo_rejected/system`, Kundin sieht es (AK 3/4).
3. S3 Ungültiges Ergebnis (confidence 1.5) → Webhook zugestellt, Foto bleibt `pending`, keine Audit-Zeile.
4. S4 Admin-API-Liste (`GET /admin/reviews/photos/unmoderated`): ohne Login 401; gealterte Fotos enthalten, frisches und entschiedenes nicht (AK 9).
5. S5 UI `/admin/reviews?filter=unmoderated_photos`: Tab, Zeilen, „Waiting ~40 min“, „Not visible yet“; Freigabe über Bestätigungsdialog → Zeile weg, `approved`, Audit `photo_approved/admin`, Kundin sieht `approved`.
6. S6 UI: Ablehnung mit Grund und Kategorie Spam → `rejected`, Kundin sieht Grund und Kategorie, Audit `photo_rejected/admin`.
7. S7 Zweite Entscheidung → 409 `photo_already_moderated`; späte widersprechende Gateway-Antwort ändert die Admin-Entscheidung nicht (AK 8).
8. S8 Tab zeigt keines der eigenen Fotos mehr.

**Aufräumen:** Review, Fotos und Audit-Zeilen der eigenen Review per SQL (Review-ID-gebunden), Fotodateien der eigenen Review-ID, offener Gateway-Auftrag des frischen Fotos (fail), Spec-Shop per Admin-Delete, Kunde über den Teardown (Marker `e2e-<run>-`).

**Known Risks:** Alterung per SQL (`ageReviewPhoto`) ändert nur die selbst angelegte Zeile. Die Admin-Liste lädt 50 Einträge je Seite, ältere echte Altbestands-Fotos der Test-DB könnten die eigenen verdrängen (Prod-Kopie hat derzeit keine). Nicht abgedeckt: Worker-Wiederholung bei unlesbarer Modellantwort, Cloud-Sperre, Vertrauenswürdige (Level-2-Fall), Arabisch/RTL im Tab, weitere Sprachen (Unit-Tests `system-admin-reviews.test.tsx`).
