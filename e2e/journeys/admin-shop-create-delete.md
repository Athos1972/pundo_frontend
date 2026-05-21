---
id: admin-shop-create-delete
title: Admin Shop Create + Delete (UI Golden Path)
status: implemented
spec-file: e2e/journeys/admin-shop-create-delete.spec.ts
priority: P2
owner-agent: e2e-tester
proposed-in-spec: bugfix-delete-shop-500-20260521
touches-modules:
  - src/app/(system-admin)/admin/(portal)/shops/**
  - src/app/api/admin/[...path]/route.ts
  - src/components/system-admin/EntityTable.tsx
  - src/components/system-admin/ShopForm.tsx
  - src/components/system-admin/ConfirmDialog.tsx
touches-roles:
  - admin
touches-states:
  - Shop.status:active
  - Shop.has_offers:false
status-changed-at: 2026-05-21T00:00:00Z
status-changed-by-spec: bugfix-delete-shop-500-20260521
last-run: 2026-05-21T12:00:00Z
last-result: PASS
last-run-sha: cd80192af7412e831f6db2bf8fe1719af30f73dc
---

### Journey: Admin Shop Create + Delete (UI Golden Path)

**Ziel:** Sicherstellt dass ein System-Admin einen Shop über das Admin-UI anlegen
und anschließend wieder löschen kann. Regression-Test für Bug B8950-001
(DELETE /api/admin/shops/{id} 500 wegen fehlender CASCADE auf
offers.shop_listing_id → shop_listings.id).

**Trigger-Regel:** Wenn src/app/(system-admin)/admin/(portal)/shops/**, EntityTable, ShopForm
oder der Proxy-Handler im Diff sind (P2).

**Test-Daten-Matrix:**

| Fixture | Was | Warum |
|---|---|---|
| `e2e-shop-{uuid}` | Shop ohne Offers, ohne ShopOwner | Testet den einfachsten Delete-Pfad |

**Schritte (Runbook):**

1. Admin loggt sich im Browser ein → sieht Dashboard
2. Admin navigiert zu /admin/shops/new → Formular erscheint
3. Admin füllt Pflichtfeld "Name" mit einzigartigem UUID-Wert
4. Admin setzt Stadt auf "E2E-City"
5. Admin klickt Speichern → wird zu /admin/shops weitergeleitet, Toast "Saved" erscheint
6. Admin sucht den neu angelegten Shop (über Name-Suche)
7. Der Shop erscheint in der Liste
8. Admin klickt "Delete" → Confirm-Dialog erscheint
9. Admin bestätigt → Shop verschwindet aus der Liste, Toast erscheint
10. API-Verifikation: GET /api/v1/admin/shops?q={name} gibt 0 Treffer zurück

**Akzeptanzkriterien:**

| AC | Was | Kriterium |
|---|---|---|
| AC-1 | Create Happy Path | POST 201, Redirect auf /admin/shops, Shop in Liste |
| AC-2 | Delete Happy Path | DELETE 204, Shop nicht mehr in Liste |
| AC-3 | Confirm-Dialog | Dialog erscheint, Cancel abbrechbar, Confirm löscht |
