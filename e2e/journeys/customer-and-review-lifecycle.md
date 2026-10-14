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
  - src/app/(customer)/account/**
  - src/app/(customer)/[lang]/shops/[slug]/**
  - src/app/(customer)/[lang]/products/[slug]/**
  - src/components/shop/**
  - src/lib/api.ts
  - src/components/auth/**
  - src/app/api/customer/customer/auth/signup/route.ts
touches-roles:
  - customer
  - admin
  - guest
touches-states:
  - Customer.is_authenticated:false
  - Customer.is_authenticated:true
  - Review.is_visible:true
  - Review.is_visible:false
status-changed-at: 2026-04-23T15:00:00Z
status-changed-by-spec: journey-catalog-system-20260423
last-run: 2026-05-22T14:06:15Z
last-result: PASS
last-run-sha: 309239e58967e8aaa506a176c41ee5d7a88ad35c
---

### Journey: Customer Auth + Interaction + Review Lifecycle

**Ziel:** Customer registriert sich, loggt sich ein und aus, gibt eine Review ab und der Admin moderiert sie (invalidate/restore) — in einer zusammenhängenden Kette. (F8950 T20: auf die aktuelle API umgestellt; Spotted und API-Key-Zyklus siehe unten.)

**Trigger-Regel:** Pflicht wenn auth/**, ReviewForm, ReviewSection oder die Admin-Review-Moderation im Diff sind (P2).

**Test-Daten-Matrix:**

| Fixture | Was | Warum |
|---|---|---|
| `customer` | Frischer Customer `e2e-<run>-carl-<uuid>@pundo.com` (@pundo.com = automatisch verifiziert, kein OTP) | Signup/Login/Logout |
| `spec-shop` | Eigener Shop (`specShop('CARL')`) | Review-Ziel, sichtbar auf `/en/shops/<slug>` |
| `review` | Review des Customers auf den Spec-Shop (`POST /customer/reviews`) | Sichtbarkeit und Moderation |

**Schritte (Runbook, = die 8 Tests der Spec):**

PHASE 1 — Customer-Auth
1. Signup (`POST /customer/auth/signup`) → 201, `is_verified=true`
2. Auth-Guard: `/account` ohne Login leitet auf `/auth/login`
3. Login (`POST /customer/auth/login`) → Cookie `customer_token`, `/customer/auth/me` liefert den Account
4. Logout (`POST /customer/auth/logout`) → Cookie wird gelöscht (das JWT selbst bleibt zustandslos gültig)

PHASE 2 — Customer Interaction
5. Shop-Seite lädt (200, keine JS-Fehler) und zeigt den Review-Bereich
6. Review abgeben (`POST /customer/reviews`, `entity_type=shop`) → 201 und in `/shops/{id}/reviews` gelistet

PHASE 3 — Admin Moderation
7. `/admin/reviews` ist mit Admin-Session erreichbar
8. Admin invalidiert die Review (`POST /admin/reviews/{id}/invalidate`) → nicht mehr öffentlich; `restore` → wieder öffentlich

**Nicht mehr Teil dieser Journey (Zuordnung in `03-implementation.md`):** E-Mail-Verify per Admin-Bypass (Schritt 3 alt; @pundo.com ist auto-verifiziert, der OTP-Fluss ist Backend-pytest), Spotted (Schritt 9 alt; seit dem Umbau Foto-Upload mit KI-Erkennung, braucht Gateway/LLM), Admin-„Approve" (Schritt 11 alt; Reviews sind sofort sichtbar, moderiert wird per invalidate/restore) und der API-Key-Zyklus (Schritt 12 alt; `shop-admin-e2e.spec.ts` „API Key anlegen/löschen").

**Reporting-Anforderungen:** (wie Journey 1)
