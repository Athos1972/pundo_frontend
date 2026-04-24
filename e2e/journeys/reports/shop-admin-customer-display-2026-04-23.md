# E2E Test Report — Shop Admin Customer Display Fixes
**Date:** 2026-04-23  
**Session:** Post-fix verification run (B4, C2, FINDING-4, D1)  
**Run duration:** ~6 min total (2 spec runs)  
**Overall verdict:** SHIP — all 4 fixes verified, all tests pass

---

## 1. Coverage Matrix

| # | Fix / Criterion | Test performed | Result |
|---|---|---|---|
| **B4** | PATCH offer `product_id: null` unlinks product | Direct API: POST create with product_id → PATCH `{product_id: null}` → verify response `product_id` is null | **PASS** |
| **B4 (Playwright)** | B4 test in `shop-admin-offers.spec.ts` (was `test.fail()`) | `shop-admin-offers.spec.ts` test #10 | **PASS** |
| **C2** | Delete button visible for archived offers in OfferList UI | `shop-admin-offers.spec.ts` C2 test — clicks delete in expired tab | **PASS** |
| **C2 (no delete for active)** | Delete button NOT visible for active non-expired offers | `shop-admin-offers.spec.ts` C3 test — confirms no delete button on active tab | **PASS** |
| **FINDING-4** | Logo `<img>` with `/shop_logos/` URL visible on `/shops/[slug]` | `shop-admin-profile-phone-logo.spec.ts` D7 — upload via UI + navigate to customer page + assert img visible | **PASS** |
| **FINDING-4 (API)** | POST `/api/v1/shop-owner/shop/logo` returns `logo_url` | `shop-admin-profile-phone-logo.spec.ts` D1 | **PASS** |
| **FINDING-4 (HTML)** | Logo src uses `/_next/image?url=/shop_logos/...` in server-rendered HTML | Direct curl of `/shops/e2e-test-shop-larnaca-1` + grep | **PASS** |
| **D1 (active offer visible)** | Active offer title + price visible on `/shops/[slug]` | `shop-admin-offers.spec.ts` D1 (was `test.fail()`) + direct API + HTML inspection | **PASS** |
| **D1 (archived not visible)** | Archived offer NOT visible on customer page | `shop-admin-offers.spec.ts` D2 + direct API archive + curl verify | **PASS** |
| **D1 backend endpoint** | `GET /api/v1/shops/by-slug/{slug}/offers` returns active offers only | Direct API call: active offer visible, archived returns `[]` | **PASS** |
| **Full regression** | All 16 `shop-admin-offers.spec.ts` tests (A1–A6, B1–B4, C1–C3, D1–D2, REGRESSION) | `npx playwright test e2e/journeys/shop-admin-offers.spec.ts` | **16/16 PASS** |
| **Profile + Logo full suite** | 13 tests covering phone field + logo upload UI + customer visibility | `npx playwright test e2e/journeys/shop-admin-profile-phone-logo.spec.ts` | **13/13 PASS** |

**Total: 29 Playwright tests, all PASS.**

---

## 2. Environment

| Component | Value |
|---|---|
| Frontend | http://127.0.0.1:3500 — Next.js 16.2.4 standalone, build ID `0qskD3qA_2BeKy4z9bxFh` (rebuilt at 2026-04-23 ~22:30) |
| Backend | http://localhost:8500 — uvicorn 4 workers, pundo_test DB (restarted at session start) |
| Database | postgres `pundo_test` — fresh schema via alembic `upgrade head` (merge migration created to resolve MultipleHeads blocker) + production data copied |
| Node.js | v25.9.0 |
| Playwright | v1.59.1 |
| Test owner | e2e-owner@pundo-e2e.io (ID=1, status=approved, shop_id=2214, slug=e2e-test-shop-larnaca-1) |

**Setup notes:**

- Backend had `MultipleHeads` alembic error blocking `prepare_e2e_db.py`. Fixed by running `alembic merge heads` in the backend repo (created migration `057fdaec566f`). This is a backend repo maintenance issue, not a product bug.
- The first test run used a stale frontend process (PID 63166, old build `eEGytsRm12Fcr8mZns-47`). After killing the stale process and starting the new build, all tests passed immediately.
- Both `test.fail()` annotations were removed from B4 and D1 in `e2e/journeys/shop-admin-offers.spec.ts`.

---

## 3. Fix Verification Details

### Fix B4 — PATCH offer with `product_id: null` now unlinks product

**Method:** Direct API test + Playwright test B4  
**Steps executed:**
1. `POST /api/v1/shop-owner/offers` with `product_id=1` → response `product_id: 1`
2. `PATCH /api/v1/shop-owner/offers/13` with `{"product_id": null}` → response `product_id: null`
3. `GET /api/v1/shop-owner/offers` confirmed `product_id: null` for offer 13

**Backend change verified:** `ingestor/api/shop_owner_offers.py` now uses `if "product_id" in body.model_fields_set:` (Pydantic v2 `model_fields_set`) for all nullable fields.  
**Result:** PASS — product_id is correctly set to null after PATCH.

### Fix C2 — Delete button for archived/expired offers in OfferList UI

**Method:** Playwright test C2 (clicking delete in expired tab)  
**Steps executed:**
1. Offer archived via API in beforeAll
2. Navigated to `/shop-admin/offers`
3. Clicked "Expired" tab
4. Delete button found (`isDeletable()` returns `true` for archived offers)
5. Delete confirmed → offer disappears from list
6. API verification: offer not present in `GET /api/v1/shop-owner/offers?archived=true`

**Source change verified:** `OfferList.tsx` lines 21–22: `isDeletable = offer.archived || isExpired(offer)`. Delete button at line 144: `{isDeletable(offer) && (...)}`.  
**Also verified:** C3 test confirms active non-archived/non-expired offers have no delete button in active tab.  
**Result:** PASS

### FINDING-4 — Logo visible on customer shop page

**Method:** Direct API upload + HTML inspection + Playwright test D7  
**Steps executed:**
1. `POST /api/v1/shop-owner/shop/logo` with test JPEG → response `{"logo_url": "/shop_logos/2214/logo_orig.jpg"}`
2. `curl http://localhost:3500/shops/e2e-test-shop-larnaca-1` → HTML contains `/_next/image?url=%2Fshop_logos%2F2214%2Flogo_orig.jpg`
3. Playwright D7 test: uploads file via `<input type="file">` → navigates to customer page → asserts `<img>` with `/shop_logos/` visible

**Frontend change verified:** `src/app/(customer)/shops/[slug]/page.tsx` renders `next/image` component with `src={shop.images?.[0]?.url}`, fallback to `ShopAvatar`.  
**Backend change verified:** `ShopListItem` schema now includes `images` field; `_build_shop_item` passes `images=shop.images`.  
**No 404 errors:** `/shop_logos/` path proxied via `next.config.ts` (pre-existing config).  
**Result:** PASS

### D1 — Offers visible on customer shop page

**Method:** Direct API create/archive + HTML inspection + Playwright tests D1 and D2  
**Steps executed:**
1. `POST /api/v1/shop-owner/offers` with valid date range `2026-01-01` to `2026-12-31`
2. `curl http://localhost:3500/shops/e2e-test-shop-larnaca-1` → HTML contains `"D1 Test Active Offer"` + price + "Valid until"
3. `PATCH /api/v1/shop-owner/offers/12` with `{archived: true}`
4. `curl` again → offer no longer in HTML
5. `GET /api/v1/shops/by-slug/e2e-test-shop-larnaca-1/offers` → returns `[]` (archived excluded)
6. Playwright D1: asserts offer title visible on page (previously `test.fail()`, now passes)
7. Playwright D2: asserts archived offer NOT visible (was passing before, still passes)

**Backend change verified:** New endpoint `GET /api/v1/shops/by-slug/{slug}/offers` returns `PublicOfferItem[]` — active only (non-archived, valid_until null or future).  
**Frontend change verified:** `src/app/(customer)/shops/[slug]/page.tsx` — offers fetched via `getShopOffers(slug, lang)` in parallel with `searchProducts`. Offers section renders below opening hours.  
**Translation keys verified:** `shop_offers` (section heading "Current offers") and `shop_offer_valid_until` in all 6 languages.  
**Result:** PASS

---

## 4. Divergences from Spec

None. All 4 fixes match the spec exactly:
- B4: spec says "PATCH `product_id: null` → product_id becomes null" — verified.
- C2: spec says "delete button visible for archived offers" — verified.
- FINDING-4: spec says "img with `/shop_logos/` visible" — verified.
- D1: spec says "offer title visible on customer page, archived not visible" — verified.

---

## 5. Side Notes

**Pre-existing issues NOT introduced by these fixes:**

- Alembic `MultipleHeads` error in backend (`c8d9e0f1a2b3` and `g0a1b2c3d4e5`). Fixed by running `alembic merge heads` to create merge migration `057fdaec566f`. This is unrelated to the 4 fixes but blocked the test environment startup.
- `e2e/journeys/shop-admin-offers.spec.ts` had 2 pre-existing TypeScript errors (`capturedBody.price` typed as `never` in REGRESSION test). These do not affect test execution.

**`test.fail()` annotations removed:** Both B4 and D1 tests in `shop-admin-offers.spec.ts` had `test.fail()` removed and comments updated to reflect the fixes.

---

## 6. Verdict: SHIP

All 4 fixes are verified working:

| Fix | Status |
|---|---|
| B4 — PATCH product_id: null unlinks product | SHIP |
| C2 — Delete button for archived offers in UI | SHIP |
| FINDING-4 — Logo visible on customer shop page | SHIP |
| D1 — Active offers visible on customer shop page | SHIP |

29 Playwright tests pass. No regressions detected. No blocking issues.
