---
id: customer-and-review-lifecycle
title: Customer Auth + Interaction + Review Lifecycle
status: implemented
spec-file: e2e/journeys/customer-and-review-lifecycle.spec.ts
priority: P2
owner-agent: designer
proposed-in-spec: journey-catalog-system-20260423
touches-modules:
  - src/app/(customer)/auth/**
  - src/app/(customer)/shops/[id]/**
  - src/app/(customer)/products/[slug]/**
  - src/components/shop/**
  - src/lib/api.ts
touches-roles:
  - customer
  - admin
  - guest
touches-states:
  - Customer.is_authenticated:false
  - Customer.is_authenticated:true
  - Review.status:pending
  - Review.status:approved
status-changed-at: 2026-04-23T15:00:00Z
status-changed-by-spec: journey-catalog-system-20260423
last-run: 2026-04-23T13:46:00Z
last-result: PASS
last-run-sha: ef98e7e35ac3ea4e4899358acebe60e7dd61fed9
---

### Journey: Customer Auth + Interaction + Review Lifecycle

**Ziel:** Customer registriert sich, loggt sich ein, interagiert mit Shops (Review, Spotted), Shop-Owner verwaltet seinen API-Key, Admin moderiert Reviews — in einer zusammenhängenden Kette.

**Trigger-Regel:** Pflicht wenn auth/**, ReviewForm, ReviewSection, SpottedFeature oder api-keys im Diff (P2).

**Test-Daten-Matrix:**

Voraussetzung: mind. 1 aktiver Shop mit mind. 1 Produkt in pundo_test (entweder aus shop-owner-full-lifecycle oder eigener Fixture-Shop).

| Fixture | Was | Warum |
|---|---|---|
| `customer-account` | Frischer Customer-Account, unverifiziert → dann verifiziert | Auth-State-Transitions testen |
| `review-pending` | Review vom Customer, noch nicht moderiert | Moderation-Workflow testen |
| `review-approved` | Review nach Admin-Approval | Sichtbarkeit post-Approval |
| `api-key-active` | API-Key vom Shop-Owner | Generate/Revoke-Cycle |

**Schritte (Runbook):**

PHASE 1 — Customer-Auth
1. Customer registriert sich (/auth/register)
2. Vor E-Mail-Verify: geschützte Seiten leiten um → Pending-Seite korrekt angezeigt
3. E-Mail-Verifizierung (via Test-Endpoint oder Admin-Bypass)
4. Login → Redirect zu Account-Seite
5. Logout → public-only Zustand wiederhergestellt

PHASE 2 — Customer Interaction
6. Customer loggt sich wieder ein, navigiert zu einem Test-Shop
7. Review-Formular ausgefüllt und submitted → Review erscheint als "pending"
8. Spotted-Feature: Produkt als "vor Ort gesehen" markiert → Bestätigung erscheint
9. API-Key: Shop-Owner generiert Key → Key wird einmalig angezeigt → löschen → weg

PHASE 3 — Admin Moderation
10. Admin sieht pending Review in Moderation-Liste
11. Admin approved Review → erscheint jetzt öffentlich auf Shop-Detail
12. Admin rejected zweiten Review → verschwindet, Customer-Feedback angezeigt

**Reporting-Anforderungen:** (wie Journey 1)
