# Test Report: Shop-Admin Phone Field + Logo Upload
**Date:** 2026-04-23  
**Spec file:** `e2e/journeys/shop-admin-profile-phone-logo.spec.ts`  
**Features tested:** FINDING-1 (phone field), FINDING-3 (logo upload)

---

## 1. Coverage Matrix

| ID | Criterion | Test performed | Result |
|----|-----------|---------------|--------|
| C1 | API: `phone` field present in `GET /shop-owner/shop` response | Direct backend API call, check `'phone' in profile` | PASS |
| C2 | API: PATCH with phone number saves correctly | PATCH `{phone:"+35799111222"}` → GET verify | PASS |
| C3 | API: clearing phone (`null`) removes it | PATCH `{phone:null}` after setting value → GET verify | PASS |
| C4 | UI: `input[name="phone"]` visible in ProfileForm | `page.goto('/shop-admin/profile')`, check element | PASS |
| C5 | UI+API: phone save round-trip via ProfileForm | Fill phone input, click Save, verify via API | PASS |
| C6 | Customer-facing: `/shops/[slug]` shows phone as `tel:` link | Set phone via API, load shop page, check `a[href="tel:..."]` | PASS |
| D1 | API: valid JPEG upload returns `logo_url` with `/shop_logos/` path | POST multipart JPEG to backend logo endpoint | PASS |
| D2 | API: invalid file type (PDF) returns 400 | POST PDF to logo endpoint, verify 400 + error detail | PASS |
| D3 | API: oversized file (>5MB) returns 400 | POST 6MB file to logo endpoint, verify 400 + error detail | PASS |
| D4 | UI: `LogoUpload` component visible in ProfileForm | `page.goto('/shop-admin/profile')`, check file input present | PASS |
| D5 | UI: "Or enter URL" toggle reveals URL text input | Click toggle button, verify `input[type="url"]` appears | PASS |
| D6 | UI: file input `accept` attribute restricts to JPEG/PNG/WebP | Check `input[type="file"]` accept attribute | PASS |
| D7 | UI+Customer: logo upload via UI appears in `/shops/[slug]` | `setInputFiles`, Save, check `img[src*="shop_logos"]` on shop page | FAIL — see Failures |

**Summary: 12 PASS, 1 FAIL, 0 BLOCKED**

---

## 2. Environment

| Component | Details |
|-----------|---------|
| Frontend | `http://127.0.0.1:3500` — Next.js 16.2.4 standalone build rebuilt 2026-04-23 21:26 |
| Backend | `http://localhost:8500` — uvicorn 4 workers, DB: `pundo_test` |
| Database | `pundo_test` — reset via `prepare_e2e_db.py`, categories copied from prod |
| Playwright | global-setup ran (DB reset + owner registration + approval + JWT) |
| Test state | `e2e/.test-state.json` — shop_id=2214, slug=`e2e-test-shop-larnaca-1` |
| Test images | Valid 200x200 JPEG generated via backend Pillow venv; 6MB oversized file synthetic |
| Logo storage | `/Users/bb_studio_2025/dev/github/shop_logos/` (default from `parents[3]/shop_logos`) |

**Pre-condition note:** The frontend standalone server that was running on port 3500 at test start was built *before* the phone/logo changes were committed (server started at 18:50, source modified at 21:19). The old server was killed, the standalone was rebuilt, and static assets were copied before running the final test suite. The `reuseExistingServer: true` playwright config would have silently used the stale build otherwise.

---

## 3. Failures

### D7 — FAIL: Logo not visible in customer-facing shop detail page

**Test:** After upload + form save, `img[src*="shop_logos"]` is expected in `/shops/[slug]`.

**Observed:** No `img[src*="shop_logos"]` element exists anywhere on the customer-facing shop detail page.

**Expected (per task spec):** Uploaded logo should be visible in customer-facing shop detail.

**Root cause:** The customer-facing shop detail page (`src/app/(customer)/shops/[slug]/page.tsx`) does NOT display the `logo_url` field from the shop profile at all. It only renders:
- `ShopAvatar` component which calls `GET /api/v1/shops/{id}/favicon` (the favicon endpoint), not `/shop_logos/`

The uploaded logo IS stored correctly in `Shop.images[0]["url"]` in the database and IS returned in the owner API response as `logo_url`. However, the customer detail page reads neither `shop.logo_url` nor `shop.images` from the public shop API response.

**Reproduction steps:**
1. Log in as shop owner
2. Upload a JPEG logo via `POST /api/v1/shop-owner/shop/logo` → returns `/shop_logos/2214/logo_card.webp`
3. PATCH profile with `logo_url: "/shop_logos/2214/logo_card.webp"`
4. Visit `http://localhost:3500/shops/e2e-test-shop-larnaca-1`
5. Inspect page HTML: no `<img src*="shop_logos">` present

**API state verified:** `GET /api/v1/shop-owner/shop` returns `"logo_url": "/shop_logos/2214/logo_card.webp"` — the upload and save are working correctly.

---

## 4. Divergences from Spec

### DIV-1: Customer-facing logo display not implemented

The user task spec states: *"After upload, the logo is visible in customer-facing shop detail"*

The `03-implementation.md` for FINDING-3 does NOT claim to implement this — its manual verification steps end at the admin portal (step 8: "Save the form — logo URL is included in PATCH body"). The implementation spec is silent on customer-facing display.

**Gap:** No path exists from uploaded logo to customer-visible display:
- Backend stores logo URL in `Shop.images[0]["url"]` 
- Public shop API (`GET /api/v1/shops/{slug}`) would need to expose this field
- Customer detail page would need to render it

This is an **incomplete feature** — the upload infrastructure works end-to-end through the admin portal, but the customer-facing display leg is missing.

### DIV-2: Pre-existing `data-hydrated="true"` pattern in `shop-admin-profile.spec.ts`

The existing `shop-admin-profile.spec.ts` uses `body[data-hydrated="true"]` in its `waitHydrated()` helper. The app never sets this attribute on `<body>`. The existing spec's UI tests (A2, A4, A6, A8, B2, B3, etc.) will always time out if run in isolation (single test grep). They only work when run as a full suite because the serial `describe.serial` block runs tests in order and the `networkidle` wait is sufficient for the already-warmed-up standalone server.

The new spec (`shop-admin-profile-phone-logo.spec.ts`) uses `waitProfileForm()` instead — waiting for `button[type="submit"]` which is a reliable DOM indicator that the ProfileForm has rendered.

### DIV-3: `logo_url` in `ShopProfilePatch` is retained alongside new upload endpoint

The 03-implementation.md notes this is intentional ("purely additive"). The `LogoUpload` component posts to `/api/shop-admin/shop/logo` and then the `logo_url` state is included in the profile PATCH. This means the PATCH body sets `logo_url` to the card variant URL. The customer page would need to read `shop.logo_url` from the public API to display it.

---

## 5. Verdict: FIX

**12 / 13 criteria pass.**

One failing criterion (D7) is due to a missing implementation: the customer-facing shop detail page does not display the uploaded logo. This is a feature gap, not a regression.

**Required fix:** Either:
- (a) Expose `logo_url` (or `images`) in the public shop API response and render it in `ShopDetailPage` (e.g., replace/supplement `ShopAvatar` with the uploaded logo when `shop.logo_url` is set), OR
- (b) Explicitly descope "customer-facing logo display" and mark D7 as out-of-scope for this sprint

**No fixes needed for:** phone field (C1-C6 all pass), logo upload API (D1-D3 all pass), LogoUpload UI component (D4-D6 all pass).
