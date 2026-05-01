---
id: shop-owner-quick-onboarding
title: Shop-Owner Schnell-Onboarding Wizard (F5910)
status: implemented
spec-file: e2e/journeys/shop-owner-quick-onboarding.spec.ts
priority: P1
owner-agent: coder
proposed-in-spec: schnell-onboarding-mobil-20260501
touches-modules:
  - src/app/(shop-admin)/shop-admin/onboarding/**
  - src/components/shop-admin/onboarding/**
  - src/lib/onboarding/**
  - src/lib/shop-admin-translations.ts
touches-roles:
  - shop-owner
touches-states:
  - OnboardingDraft:partial
  - OnboardingDraft:complete
  - ShopOwner.status:pending_email_verification
status-changed-at: 2026-05-01T13:15:00Z
status-changed-by-spec: schnell-onboarding-mobil-20260501
last-run: 2026-05-01T13:10:00Z
last-result: 1/6 PASS (5 FAIL — FIX required)
---

# Journey: shop-owner-quick-onboarding

**Status:** implemented (spec.ts exists; 5/6 tests FAIL — FIX required)
**Priority:** P1
**Proposed in:** schnell-onboarding-mobil-20260501

## Purpose

F5910-specific acceptance criteria for the 6-step onboarding wizard:

- Draft auto-save and resume (localStorage TTL, resume banner, discard flow)
- Email-conflict error with link to login page
- Conditional specialties sub-step (step 2.5) when selected domains have specialties
- Progress bar and i18n (DE + EN at minimum)
- OAuth resume flow (`?resume=oauth` param triggers auto-submit)

## Pre-conditions

- Test backend at port 8500 running
- Test frontend at port 3500 running
- `pundo_test` DB seeded with onboarding domains via Admin API
- Backend endpoint `POST /api/v1/shop-owner/onboarding` live (confirmed 2026-05-01)

## Steps

### T1: Happy path — full wizard (email/password)
1. Navigate to /shop-admin/onboarding
2. Step 1: Click "Handwerker" → assert Next enabled, click Next
3. Step 2: Click ≥1 domain chip → click Next (skip specialty if none)
4. Step 3: Enter address → select on map → check B2C checkbox → Next
5. Step 4: Fill WhatsApp field → Next
6. Step 5: Click "Überspringen" (skip photo)
7. Step 6: Fill unique email + password → Submit
8. Assert redirect to /shop-admin/register/check-email

### T2: Draft persistence
1. Navigate to /shop-admin/onboarding
2. Select provider type "Dienstleister"
3. Reload page (F5)
4. Assert draft resume banner is visible ("Weitermachen" / "Neu beginnen")
5. Click "Weitermachen" → assert wizard continues from step 1 with Dienstleister pre-selected

### T3: Draft discard
1. Navigate to /shop-admin/onboarding with existing draft in localStorage
2. Assert resume banner shows
3. Click "Neu beginnen" → assert banner disappears → step 1 shows empty (no pre-selection)

### T4: Conditional specialties step (step 2.5)
1. Navigate to /shop-admin/onboarding
2. Select "Handwerker" → Next
3. Step 2: Select domain that has specialties (e.g. "Elektriker" if available)
4. Click Next → assert specialties sub-step renders
5. Select ≥1 specialty → click Next → assert step 3 (Location) loads

### T5: Email conflict error
1. Complete wizard steps 1–5
2. Step 6: Enter email of already-registered shop owner
3. Submit → assert error message contains link to /shop-admin/login

### T6: Progress bar + i18n
1. Navigate to /shop-admin/onboarding (lang=en)
2. Assert "Step 1 of 6" visible
3. Assert "Tradesperson" tile visible
4. Navigate to /shop-admin/onboarding (lang=de)
5. Assert "Schritt 1 von 6" (or "Step 1 of 6" depending on translation key) + "Handwerker" visible

## Notes

- Draft key: `pundo.onboarding.draft.v1` in localStorage; TTL 7 days
- Specialty step only renders if selected domain has `specialties.length > 0`
- Photo skip is always available (step 5 has "Überspringen" button)
- OAuth resume (`?resume=oauth`) is covered in shop-owner-onboarding journey T1 variant
- afterAll cleanup: delete any created shop_owners matching the test email prefix

## Known Failures (2026-05-01)

**T1/T4/T5 FAIL — CRITICAL:** `domains.filter is not a function` in `StepDomains.tsx`.
Root cause: `src/lib/onboarding/domains.ts` line 50 casts API response as `OnboardingDomain[]`
but backend returns `{ domains: OnboardingDomain[] }`. Fix: `(await res.json() as { domains: OnboardingDomain[] }).domains`.

**T2 FAIL — HIGH:** React hydration mismatch: `showDraftBanner` in `useState` initializer
reads `localStorage` which differs between SSR and client. Fix: move to `useEffect`.

**T6 FAIL — TEST-AUTHORING:** `?lang=de` URL param does not switch UI language.
Language comes from `app_lang` cookie. Fix spec to set cookie instead of URL param.
