---
id: shop-owner-admin-approval-flow
title: Shop-Owner Admin-Approval via Browser-UI
status: implemented
spec-file: e2e/journeys/shop-owner-admin-approval-flow.spec.ts
priority: P1
owner-agent: e2e-tester
proposed-in-spec: shop-owner-admin-approval-flow-20260605
touches-modules:
  - src/app/(system-admin)/admin/(portal)/shop-owners/**
  - src/app/(shop-admin)/shop-admin/(portal)/**
  - src/app/(shop-admin)/shop-admin/auth/callback/**
  - src/lib/system-admin-api.ts
  - src/lib/shop-admin-api.ts
  - src/types/system-admin.ts
touches-roles:
  - admin
  - shop-owner
touches-states:
  - ShopOwner.status:pre_signup
  - ShopOwner.status:pending
  - ShopOwner.status:approved
status-changed-at: 2026-06-05T00:00:00Z
status-changed-by-spec: shop-owner-admin-approval-flow-20260605
last-run: 2026-06-05T09:20:00Z
last-result: PASS
---

### Journey: Shop-Owner Admin-Approval via Browser-UI

**Ziel:** Regression-Guard für den vollständigen Approval-Flow via Admin-Browser-UI.
Bisherige Journeys testen Admin-Operationen nur via direktem API-Call. Diese Journey
testet die tatsächliche Browser-Interaktion mit dem Admin-Frontend.

Absichert folgende Bugs:
- `AdminShopOwnerResponse.shop_id: int` (nicht Optional) → 500 bei `pre_signup`-Accounts → Admin-Liste leer
- `pre_signup` fehlte im Admin-Filter-Dropdown → Owner unsichtbar
- `(portal)/layout.tsx` redirectete `pre_signup` nicht auf Onboarding

**Trigger-Regel:** Pflicht wenn `src/app/(system-admin)/admin/(portal)/shop-owners/**`,
`src/lib/system-admin-api.ts` oder `src/types/system-admin.ts` im Diff sind (P1).

**Test-Daten-Matrix:**

| Fixture | Was | Zweck |
|---|---|---|
| `e2e-approval-{uuid}` | Shop-Owner + Shop via `/register`, status=`pending` | Haupt-Flow: Browser-Approval + Shop-Owner-Login |
| `e2e-presignup-{uuid}` | Shop-Owner via `/register`, via Admin-PATCH auf `pre_signup` gesetzt | AC-4: Regression-Guard fehlender `pre_signup`-Filter |

----

### Runbook

**PHASE 1 — Setup (API gegen :8500)**

1. Backend-Healthcheck
2. Admin-Token holen (via `adminLogin()` Helper)
3. Fixture A (`e2e-approval-{uuid}`) anlegen: `POST /api/v1/shop-owner/register` mit shop_name → `status=pending`
4. Fixture B (`e2e-presignup-{uuid}`) anlegen: `POST /api/v1/shop-owner/register` → dann `PATCH /api/v1/admin/shop-owners/{id}` auf `status=pre_signup`

**PHASE 2 — Admin-UI Browser (:3500)**

5. Admin-Login via Browser-Formular (`/admin/login`) → Cookie `admin_token` gesetzt
6. `/admin/shop-owners` öffnen → Zeilen sichtbar (kein leeres 500er-Catch)
7. Filter `pending` → Fixture A erscheint in Liste
8. Filter `pre_signup` → Fixture B erscheint in Liste
9. Fixture A: Edit-Seite → Approve-Button klicken → Status-Badge wird `approved`
10. Admin-Logout via Logout-Button → Cookie gelöscht, Redirect auf `/admin/login`
11. `/admin/shop-owners` direkt → Redirect zurück auf `/admin/login`

**PHASE 3 — Shop-Owner-Login nach Approval (:3500)**

12. Shop-Owner (Fixture A) loggt sich ein (E-Mail/Passwort, kein OAuth)
13. Dashboard lädt — kein Redirect auf Onboarding, kein Redirect auf Pending-Approval
14. `/shop-admin/profile` öffnen → `input[name="name"]` hat nicht-leeren Wert

**PHASE 4 — Cleanup (API)**

15. Fixture A: Admin PATCH → `rejected`
16. Fixture B: Admin PATCH → `rejected`

----

### Akzeptanzkriterien

| AC | Schritt | Was | Kriterium |
|---|---|---|---|
| AC-1 | 5 | Admin-Login via Formular | Cookie `admin_token` gesetzt, URL = `/admin/dashboard` oder `/admin/shop-owners` |
| AC-2 | 6 | Shop-Owner-Liste lädt | Min. 1 Zeile sichtbar (500-Regression) |
| AC-3 | 7 | Filter `pending` | Fixture A erscheint |
| AC-4 | 8 | Filter `pre_signup` | Fixture B erscheint (pre_signup-Filter-Regression) |
| AC-5 | 9 | Approve-Button | Status-Badge → `approved`, Toast sichtbar |
| AC-6 | 10 | Admin-Logout | `admin_token` Cookie weg, Redirect auf `/admin/login` |
| AC-7 | 11 | Geschützter Zugriff | `/admin/shop-owners` → Redirect auf Login |
| AC-8 | 13 | Shop-Owner-Dashboard | URL = `/shop-admin/dashboard`, kein Onboarding-Redirect |
| AC-9 | 14 | Profil nicht leer | `input[name="name"]` nicht leer |
