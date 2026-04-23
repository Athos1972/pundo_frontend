# Shop-Admin Offers — E2E Test Report
**Date:** 2026-04-23  
**Suite:** `e2e/journeys/shop-admin-offers.spec.ts`  
**Run duration:** ~2 min  
**Overall verdict:** FIX — 14 PASS, 2 known-failure FINDINGS (B4, D1), 0 unexpected failures

---

## 1. Coverage Matrix

| # | Criterion (from task spec) | Test | Result |
|---|---|---|---|
| A1 | title + description + price + dates + product link → 201 + visible in list | UI create + API verify | PASS |
| A2 | title + price + dates, no description, no product → 201 + visible | UI create + API verify | PASS |
| A3 | Empty price field → backend receives null (not empty string) → 201 | UI create + API verify price=null | PASS |
| A4 | Minimal: title + dates only → 201 | UI create + API verify | PASS |
| A5 | Missing title → frontend validation error, no API call | UI form submit + request intercept | PASS |
| A6 | Missing valid_from → frontend validation error, no API call | UI form submit + request intercept | PASS |
| B1 | Edit title → new title visible in list | UI edit + API verify | PASS |
| B2 | Add price to price-less offer → price shown in list | API create + UI edit + API verify | PASS |
| B3 | Link a product → product_id updated | API create + UI edit + API verify | PASS |
| B4 | Unlink product via PATCH product_id: null → product_id becomes null | Direct API test | **FAIL (FINDING)** |
| C1 | Archive active offer → moves to expired/archived tab | UI archive + API verify | PASS |
| C2 | Delete archived offer → gone from list + API | UI + API fallback | PASS (finding: no delete UI) |
| C3 | Delete active offer → 409 backend + UI prevents | API + UI check | PASS |
| D1 | Active offer visible on /shops/[slug] | Customer page render | **FAIL (FINDING)** |
| D2 | Archived offer NOT visible on /shops/[slug] | Customer page render | PASS |
| REG | OfferForm sends price: null not "" when price field empty | Request intercept | PASS |

**Result: 14 PASS, 2 FAIL (both annotated test.fail() as documented findings)**

---

## 2. Environment

| Component | Value |
|---|---|
| Frontend | http://127.0.0.1:3500 — Next.js 16.2.4 standalone (built with BACKEND_URL=http://localhost:8500) |
| Backend | http://localhost:8500 — uvicorn 4 workers, pundo_test DB |
| Database | postgres `pundo_test` — fresh schema via alembic + copied from production |
| Node.js | v25.9.0 |
| Playwright | v1.59.1 |
| Test owner | e2e-owner@pundo-e2e.io (ID=1, status=approved, shop_id=2214, slug=e2e-test-shop-larnaca-1) |
| Test product | ID=1 "Offers Test Product" — created in beforeAll |
| Archive fixture | Created in beforeAll (ID=1 pre-run, refreshed per test run) |
| Categories | Copied from pundo production DB |

**Setup method:** `global-setup.ts` (automated — kills old backend, runs `prepare_e2e_db.py`, registers + approves owner, saves storage state). Runs before every `npx playwright test` invocation.

---

## 3. Failures

### FINDING B4 — Backend PATCH silently ignores `product_id: null`

**Test:** `B4 — Unlink product via PATCH product_id: null → documents backend behavior`  
**Observed:** `PATCH /api/v1/shop-owner/offers/{id}` with `{ "product_id": null }` returns HTTP 200 but `product_id` remains unchanged (still `1`).  
**Expected:** `product_id` becomes `null` (offer unlinked from product).  
**Root cause:** `ingestor/api/shop_owner_offers.py` in `patch_offer()`:

```python
if body.product_id is not None:
    offer.product_id = body.product_id
```

All fields use the same `if ... is not None:` guard, which makes it impossible to explicitly set any nullable field to null via PATCH. This is a Pydantic v2 partial-update anti-pattern.

**Fix (backend):** Use `model_fields_set` to distinguish "field explicitly sent as null" from "field not sent":

```python
if "product_id" in body.model_fields_set:
    offer.product_id = body.product_id  # correctly handles null
```

Same fix needed for: `price`, `description`.

**Reproduction:**
```bash
curl -X PATCH http://localhost:8500/api/v1/shop-owner/offers/8 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"product_id": null}'
# Response still shows product_id: 1
```

**Impact:** Medium — shop owners cannot remove a product link from an offer via the edit UI or API.

---

### FINDING D1 — Customer shop page does not render shop_owner_offers

**Test:** `D1 — Active offer visibility on customer shop detail page /shops/[slug]`  
**Observed:** The customer-facing shop detail page (`/shops/e2e-test-shop-larnaca-1`) contains no offers section. The HTML source has no reference to "offer", "angebot", or the offer titles. `hasOffersSection=false`.  
**Expected (per spec):** Active offers created by the shop owner should be visible on the public shop detail page.  
**Root cause:** `src/app/(customer)/shops/[slug]/page.tsx` has sections for: header, map, opening hours, top products, community feedback, reviews — but **no shop_owner_offers section**. The backend public API `GET /api/v1/shops/{slug}` also does not include shop_owner_offers in the response.  
**This is a missing feature, not a bug in existing code.** The shop detail page was never wired to display shop_owner_offers.

**Impact:** High — the entire customer-facing offers display (the purpose of the offers feature) is not implemented.

---

## 4. Divergences from Spec

| # | Spec expectation | Actual behavior | Severity |
|---|---|---|---|
| D1 | Active offers visible on `/shops/[slug]` | No offers section exists on customer shop page | HIGH — missing feature |
| B4 | PATCH `product_id: null` unlinks product | Silently ignored by backend | MEDIUM — backend bug |
| C2 | Delete archived offer via UI | No delete button in UI expired tab; must use direct API call | LOW — missing UI action |

### C2 — No delete button in expired tab
The `OfferList.tsx` component renders an Archive button only for active offers (line 89: `{tab === 'active' && ...}`). When switched to the expired tab, there is no delete button. Deletion of archived offers is only possible via direct API call. The spec implied a delete UI action — this gap should be addressed.

---

## 5. Findings Summary

### FINDING-B4 (BACKEND BUG)
`PATCH /api/v1/shop-owner/offers/{id}` with `product_id: null` is silently ignored. Backend uses `if body.product_id is not None:` for all nullable fields. Fix: use `model_fields_set` in Pydantic v2. Affects: `product_id`, `price`, `description` (any nullable field you might want to explicitly null out).

### FINDING-D1 (MISSING FEATURE)
Customer shop page `/shops/[slug]` does not render `shop_owner_offers`. The page source has no offers section. This is a frontend + backend gap — neither the public shop API response nor the Next.js page template includes the offers display.

### FINDING-C2 (UI GAP)
No delete button in the expired/archived tab of `OfferList`. Archived offers can only be deleted via direct API call, not through the admin UI.

---

## 6. Notes on the price: null regression fix

**Test A3 and REGRESSION both PASS.** The fix to `OfferForm.tsx` is confirmed working:

```typescript
// FIXED (current):
price: priceRaw ? priceRaw : null,
// This correctly sends null when price field is empty
```

The backend correctly accepts `price: null` and stores it as null (not empty string). Previously `price: ''` would cause HTTP 422. This regression is verified fixed.

---

## 7. Verdict: FIX

**Items requiring coder action:**

1. **B4 (backend):** Fix `patch_offer()` to use `model_fields_set` for nullable fields so `PATCH { "product_id": null }` actually unlinks the product.
2. **D1 (frontend + backend):** Implement offers display section on the customer shop detail page. Requires: (a) backend `GET /api/v1/shops/{slug}` to include active offers in response, (b) frontend shop page to render the offers list.
3. **C2 (frontend, optional):** Add delete button in the expired/archived tab of `OfferList.tsx` to allow UI-driven deletion of archived offers.
