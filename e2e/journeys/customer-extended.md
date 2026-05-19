---
id: customer-extended
title: Customer Favorites + Profil-Deaktivierung + MCP-Tab (F6710)
status: implemented
spec-file: e2e/journeys/customer-extended.spec.ts
priority: P2
owner-agent: coder
proposed-in-spec: e2e-auto-approve-shop-coverage-20260519
touches-modules:
  - src/app/(customer)/account/**
  - src/app/(customer)/account/mcp/**
  - src/lib/customer-api.ts
  - src/lib/oauth-api.ts
touches-roles:
  - customer
touches-states:
  - Customer.is_authenticated:true
  - Customer.status:active
  - Customer.status:deleted
status-changed-at: 2026-05-19T00:00:00Z
status-changed-by-spec: e2e-auto-approve-shop-coverage-20260519
last-run: never
last-result: N/A
last-run-sha: —
---

# Journey: customer-extended

**Status:** proposed
**Priority:** P2
**Proposed in:** e2e-auto-approve-shop-coverage-20260519

## Purpose

Schließt Testlücken im Customer-Bereich, die `customer-and-review-lifecycle` nicht abdeckt:
- Favoriten (hinzufügen, im Account-Tab sehen, entfernen)
- Eigene Reviews im Account-Profil ansehen
- Profil-Deaktivierung / Account-Löschung (OTP-Flow)
- MCP-Tab (`/account/mcp`) lädt ohne 404

## Pre-conditions

- Test-Backend Port 8500, Test-Frontend Port 3500
- `@pundo.com` Auto-Approve implementiert (Baustein A, F6710)
- Mind. 1 aktives Item in `pundo_test` (für Favoriten-Test)
- Baustein G (MCP 404-Fix): T4 skippt mit `test.skip()` wenn 404 zurückkommt

## Steps

### T1: Favoriten
1. Customer anlegen: `fav-<uuid>@pundo.com` → Auto-Approve → Login via Browser
2. API: `POST /api/v1/customer/favorites/<item_id>` (erstes verfügbares Item)
3. Browser: `/account` → Tab „Favorites" → Item-Name sichtbar
4. API: `DELETE /api/v1/customer/favorites/<item_id>`
5. Browser: Tab reload → Item nicht mehr in Favoriten-Liste

### T2: Eigene Reviews im Profil
1. Customer aus T1 (oder neuer Account)
2. API: Review via `POST /api/v1/reviews` anlegen, direkt via Admin-API auf `approved` setzen
3. Browser: `/account` → Tab „Reviews" → Review-Text + Rating sichtbar

### T3: Profil-Deaktivierung (Account-Löschung)
1. Frischer Customer: `del-<uuid>@pundo.com` → Auto-Approve → Login
2. API: `POST /api/v1/customer/auth/account/request-deletion`
3. OTP direkt aus DB lesen (Admin-DB-Query oder Test-Bypass-Endpoint falls vorhanden)
4. API: `DELETE /api/v1/customer/auth/account` mit OTP
5. Login-Versuch: `POST /api/v1/customer/auth/login` → `401`

### T4: MCP-Tab (Baustein G)
1. Eingeloggter Customer navigiert zu `/account/mcp`
2. Assert: HTTP 200 (kein 404, kein 5xx)
3. Assert: Heading `mcp_heading` Translation-Key sichtbar
4. Assert: Leere Verbindungsliste (kein aktiver OAuth-Client für neuen Account)

```typescript
// Guard falls Baustein G noch nicht deployt:
test('MCP-Tab lädt', async ({ page }) => {
  await page.goto('/account/mcp')
  const status = page.url().includes('404') || ...
  test.skip(status === 404, 'Baustein G (MCP Deploy) noch ausstehend')
  ...
})
```

## Cleanup

`afterAll`: alle Accounts (`fav-*`, `del-*`, `mcp-*`) via Admin-API löschen

## Notes

- T3 OTP: Entweder Admin-Endpoint `GET /api/v1/admin/otp/<email>` (falls vorhanden) oder direkte DB-Query via Backend-Testhelper. Backend-Coder klärt den einfachsten Weg.
- T4 hängt von F6600-MCP-Deploy ab — mit `test.skip` guard für Resilienz
- T1 nutzt den `default_alert_interval`-Default des CustomerUser — kein Setup nötig
