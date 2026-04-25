---
feature: e2e-blind-spots
date: 2026-04-25
status: complete
---

# 03 Implementation: E2E Blind Spots

## Task Summary

| Task | Status | Notes |
|------|--------|-------|
| T1: AdminShopCreate-Payload-Helper | done | `/e2e/journeys/_helpers/admin-shop-payload.ts` — TypeScript mirror of backend schema, prevents wrong fields |
| T2: Full-Lifecycle beforeAll throws | done | `shop-owner-full-lifecycle.spec.ts` — all setup failures now throw instead of setting null |
| T3: Full-Lifecycle cascading-skip removal | done | Schritt 4-16 now throw instead of `test.skip()` |
| T4: DB-Token-Helper | done | `/e2e/journeys/_helpers/dev-token.ts` — reads `email_verification_token` via Python + SQLAlchemy |
| T5: Onboarding Journey Spec | done | `/e2e/journeys/shop-owner-onboarding.spec.ts` — 6 tests, all pass |
| T6: Delete legacy fixme specs + migrate | done | Deleted 2 legacy specs; migrated 9 scenarios to `shop-admin-offers.spec.ts` MIGRATED suite |
| T7: CATALOG.md deprecation notices | done | `shop-admin-offer-product.md`, `shop-admin-product-offer-ui.md` — status: deprecated + skip-reason |
| T8: README skip-vs-throw documentation | done | `e2e/journeys/README.md` — added Skip vs. Throw section + catalog entries for 2 new specs |
| T9: shop-owner-lifecycle + customer cascading skips | done | Both specs updated: setup failures throw, intentional skips get `// INTENTIONAL SKIP` comments |

All 9 tasks complete.

## Files Changed

### Added
- `e2e/journeys/_helpers/admin-shop-payload.ts` — T1: AdminShopCreate payload helper
- `e2e/journeys/_helpers/dev-token.ts` — T4: email verification token from test DB
- `e2e/journeys/shop-owner-onboarding.spec.ts` — T5: full 6-test onboarding journey
- `e2e/journeys/shop-owner-onboarding.md` — T5: catalog entry (status: implemented, P1)
- `e2e/journeys/social-link-moderation.md` — T8: catalog entry for existing spec (status: implemented, P1)
- `specs/2026-04-25-e2e-blind-spots/legacy-spec-inventory.md` — T6: inventory of deleted/migrated tests

### Modified
- `e2e/journeys/shop-owner-full-lifecycle.spec.ts` — T1+T2+T3: payload fix, throws in beforeAll + tests
- `e2e/journeys/shop-admin-offers.spec.ts` — T6: added MIGRATED suite (9 tests); fixed item_id and PriceTierCreate schema
- `e2e/journeys/shop-admin-offer-product.md` — T7: status: deprecated + skip-reason
- `e2e/journeys/shop-admin-product-offer-ui.md` — T7: status: deprecated + skip-reason
- `e2e/journeys/README.md` — T8: Skip vs. Throw documentation section
- `e2e/journeys/shop-owner-lifecycle.spec.ts` — T9: setup failures throw, intentional skips labeled
- `e2e/journeys/customer-and-review-lifecycle.spec.ts` — T9: INTENTIONAL SKIP comment added
- `e2e/journeys/_parser.spec.ts` — updated hardcoded catalog counts (14→16, P1 count 5→7)

### Deleted
- `e2e/journeys/shop-admin-offer-product.spec.ts` — T6: legacy spec with describe.fixme, old product_id API
- `e2e/journeys/shop-admin-product-offer-ui.spec.ts` — T6: legacy spec with describe.fixme, /products/new redirect

## E2E Test Results

### shop-owner-onboarding.spec.ts (T5)
All 6 tests pass:
- T1: Register form → redirect to /register/check-email
- T2: /register/check-email page shows "Check your inbox"
- T3: Verification token read from test DB via Python
- T4: /verify-email?token=... shows success + pending-approval link
- T5: Admin approves owner via API
- T6: Owner login → /shop-admin/dashboard

### shop-admin-offers.spec.ts MIGRATED suite (T6)
All 9 migrated tests pass:
- XS1: Cross-shop injection → 422 (isolation enforced)
- XS2: Shop B offer not visible on Shop A page
- AR1: Archived offer hidden from customer page
- SP1: Offer with fixed price tier (1 step) → 201
- SP2: Offer with multiple price tier steps (3 steps) → 201
- SP3: on_request offer without price_tiers → 201
- SP4: Price tiers visible on customer shop page
- DT1: Timeless offer (no dates) → 201
- DT2: Expired offer not shown on customer page

### shop-owner-full-lifecycle.spec.ts (T2+T3)
- Schritt 1-3: PASS (setup + shop creation + shop-B creation)
- Schritt 4: FAIL — product creation uses old `name`/`shop_id`/`price_type` fields; `POST /api/v1/admin/products` now requires unified schema (`slug`, `names` dict). This is a pre-existing bug, not introduced by T1-T9.
- Schritt 5-17: cascade failure from Schritt 4 (prerequisite throws correctly)

Note: The Schritt 4 failure is CORRECT behavior — our T3 fix caused it to throw instead of silently skip, making the real bug visible. The underlying issue (product creation API schema mismatch) predates this feature and requires a separate fix.

## Unit Tests (Vitest)

All 984 tests pass across 48 test files.

Two fixes needed during implementation:
1. `skip-reason` field required by parser for `deprecated` entries → added to both deprecated md files
2. Hardcoded catalog count assertions (14→16, 5→7 P1) → updated in `_parser.spec.ts`

## Lint (ESLint)

0 errors. 49 pre-existing warnings (unchanged from before).

## Known Gaps and Follow-ups

### Pre-existing issues (out of scope for T1-T9)
1. **`shop-owner-full-lifecycle.spec.ts` Schritt 4**: Product creation via `POST /api/v1/admin/products` uses old schema (`name`, `shop_id`, `available`, `price_type`). The new unified schema requires `slug` and `names: Record<string, string>`. This was hidden by the old skip behavior and is now correctly surfaced as a failure. Needs a follow-up fix.

2. **First suite in `shop-admin-offers.spec.ts`**: `getOrCreateShopListing(token, 1)` uses `item_id=1` which doesn't exist in the test DB (seeded items start at ID 53963). Tests A2-A5, B1-B4, C1-C2, D1-D2 skip gracefully. Fix: use `STATE.fixtures.product_ids` for item IDs (as done in the MIGRATED suite).

3. **DB deadlock in global-setup**: Concurrent playwright runs trigger concurrent `prepare_e2e_db.py` executions which deadlock on TRUNCATE. Root cause: the global-setup starts a new backend before resetting the DB; the new backend holds connections that block TRUNCATE CASCADE. Workaround: kill all test processes before each run. This is a known flakiness not introduced by T1-T9.

### Out of scope by design
- `/shop-admin/products/*` redirect behavior: confirmed redirect-only, no spec needed
- SMTP integration test: token via DB query (Option A) is sufficient for CI

## How to Run Locally

### Setup (one-time)
```bash
# Terminal 1: Start test backend (port 8500, DB: pundo_test)
cd /Users/bb_studio_2025/dev/github/pundo_main_backend
./scripts/start_test_server.sh

# Terminal 2: Start test frontend (port 3500)
cd /Users/bb_studio_2025/dev/github/pundo_frontend
npm run dev:test
```

### Unit Tests
```bash
npx vitest run
```

### Lint
```bash
npm run lint
```

### E2E: Onboarding Journey
```bash
npx playwright test e2e/journeys/shop-owner-onboarding.spec.ts --reporter=line
```

### E2E: All Journeys
```bash
npx playwright test e2e/journeys/ --reporter=line
```

### Note on DB deadlocks
If you see `DeadlockDetected` in global-setup, kill all stale processes first:
```bash
pkill -9 -f "playwright|prepare_e2e_db|uvicorn.*8500"
lsof -ti TCP:3500 -sTCP:LISTEN | xargs kill -9
lsof -ti TCP:8500 -sTCP:LISTEN | xargs kill -9
```
Then run a single playwright invocation (do not run concurrent playwright processes against the same test DB).
