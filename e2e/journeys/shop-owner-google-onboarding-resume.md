---
id: shop-owner-google-onboarding-resume
title: Google-Onboarding-Resume ueber den Next-Proxy (B5910-010)
status: implemented
spec-file: e2e/journeys/shop-owner-google-onboarding-resume.spec.ts
priority: P1
owner-agent: coder
proposed-in-spec: B5910-010
touches-modules:
  - src/app/api/shop-admin/[...path]/route.ts
  - src/components/shop-admin/onboarding/OnboardingWizard.tsx
  - src/lib/onboarding/onboardingApi.ts
touches-roles:
  - shop-owner
touches-states:
  - ShopOwner:pre_signup
  - ShopOwner:pending
  - CatalogConsent:given
status-changed-at: 2026-10-18T00:00:00Z
status-changed-by-spec: B5910-010
last-run: 2026-10-18T14:00:00Z
last-result: PASS
---

# Journey: shop-owner-google-onboarding-resume

**Status:** implemented
**Priority:** P1
**Proposed in:** B5910-010

## Purpose

Der Wizard sendet nach dem Google-Callback (`?resume=oauth`) ueber den same-origin Proxy `/api/shop-admin/onboarding`.
Der Proxy reicht das HttpOnly-Cookie `shop_owner_token` nur als `Authorization: Bearer` weiter; das Backend muss den
pre_signup-Token daraus akzeptieren (vorher 401 "Missing OAuth session cookie"). Der OAuth-Callback wird durch
Cookie-Setzung ersetzt (kein echter Google-Login).

## Pre-conditions

- Backend 8500 (mit Bearer-Fix), Frontend 3500, Backend-Repo-venv fuer das Anlegen des pre_signup-Owners

## Runbook (Ebene 1, synthetisch, kein Skip)

| Schritt | Aktion | Erwartung |
|---|---|---|
| G1 | pre_signup-Owner + Cookie, Entwurf mit Website und `catalogConsent`, `?resume=oauth` | Proxy-POST 201, Redirect `check-email`, Owner `pending` mit Shop, genau 1 aktiver `catalog_consent` |
| G2 | Wie G1 ohne Consent | 201, Shop, kein `catalog_consent` |
| G3 | Wie G1 ohne Cookie | 401, kein Redirect, kein Shop |

Aufraeumen: `TestDataTracker` (Owner -> Shop).
