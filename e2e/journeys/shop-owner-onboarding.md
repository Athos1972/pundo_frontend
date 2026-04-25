---
id: shop-owner-onboarding
title: Shop-Owner Onboarding (Register → Verify Email → Pending Approval → Login)
status: implemented
spec-file: e2e/journeys/shop-owner-onboarding.spec.ts
priority: P1
owner-agent: coder
proposed-in-spec: e2e-blind-spots-20260425
touches-modules:
  - src/app/(shop-admin)/shop-admin/register/**
  - src/app/(shop-admin)/shop-admin/verify-email/**
  - src/app/(shop-admin)/shop-admin/pending-approval/**
  - src/app/(shop-admin)/shop-admin/login/**
touches-roles:
  - shop-owner
  - admin
touches-states:
  - ShopOwner.status:pending
  - ShopOwner.status:approved
  - ShopOwner.email_verified:false
  - ShopOwner.email_verified:true
status-changed-at: 2026-04-25T18:00:00Z
status-changed-by-spec: e2e-blind-spots-20260425
last-run: 2026-04-25T18:00:00Z
last-result: PASS
last-run-sha: HEAD
---

# Journey: shop-owner-onboarding

**Status:** implemented
**Priority:** P1
**Last run:** 2026-04-25 (PASS — all 6 tests pass)

## Purpose

End-to-end verification of the complete shop-owner onboarding flow:
1. Registration form → redirect to /register/check-email (not 404)
2. Check-email page renders correctly
3. Email verification token retrieved from test DB (no SMTP required)
4. Token used to verify email → success page + pending-approval link
5. Admin approves the owner via API
6. Owner can log in and reach the dashboard

## Pre-conditions

- Test backend at port 8500 is running
- Test frontend at port 3500 is running
- pundo_test DB is seeded (global-setup handles this)
- e2e-admin@pundo-e2e.io admin user exists

## Steps

### T1: Register form
1. Navigate to /shop-admin/register
2. Fill all fields (name, email, password, shop_name, shop_address)
3. Submit → expect redirect to /shop-admin/register/check-email (not 404)

### T2: Check-email page
1. Navigate directly to /shop-admin/register/check-email
2. Assert page title "Check your inbox" (or locale equivalent) is visible

### T3: Get verification token
1. Query shop_owners table via Python + SQLAlchemy (no SMTP needed)
2. Assert token is non-empty

### T4: Verify email
1. Navigate to /shop-admin/verify-email?token=<token>
2. Assert no error/invalid/expired text visible
3. Assert pending-approval link exists on page

### T5: Admin approval
1. Admin logs in and PATCHes /api/v1/admin/shop-owners/{id} → status: approved
2. Assert response status is approved

### T6: Owner login
1. Navigate to /shop-admin/login, fill credentials, submit
2. Assert redirected inside /shop-admin/ (not login page, not 404)

## Notes

- Token extraction uses DB query via Python (no SMTP) — same pattern as shop-owner-full-lifecycle.spec.ts
- afterAll cleanup: sets owner status to rejected to allow re-runs
- Each run uses a unique UUID prefix so parallel CI runs don't conflict
