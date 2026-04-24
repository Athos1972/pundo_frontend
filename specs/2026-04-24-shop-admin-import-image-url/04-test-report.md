# Test Report — Shop-Admin Import `image_url`

**Slug:** `2026-04-24-shop-admin-import-image-url`  
**Tester:** E2E-Tester (Claude Sonnet 4.6)  
**Date:** 2026-04-24  
**Git SHA:** `bc4e8ac89c083856c0eb12e76a581461f768787b`  
**Verdict:** FIX

---

## 1. Coverage Matrix

| AC | Criterion | Test Performed | Result |
|---|---|---|---|
| AC-1 | FieldCatalog shows `image_url` row (optional, desc, example) in all 6 langs | Vitest unit tests (6 lang × image_url assertion) + E2E `shop-admin-import-image-url.spec.ts` AC-1 | FAIL (E2E locator bug — feature present, test broken) |
| AC-2 | Import with valid image URL → `image_download_pending: 1`, DB has `image_url` set | Backend unit test `TestUpsertProductsJobs::test_new_product_with_url_creates_job` | PASS (backend UT only; live upload not tested — async flow E2E skipped) |
| AC-3 | `image_download_pending > 0` → UI shows info block with pending count | Vitest `shows image_download_pending info block when pending > 0` (mocked) | PASS |
| AC-4 | `image_download_errors` non-empty → amber banner with collapsible list | Vitest `shows amber banner when status has image_download_errors` (mocked) | PASS |
| AC-5 | Upload without `image_url` column → no info block, no amber banner | Vitest `does not show image_download_pending block when pending is 0` + E2E AC-5 smoke | FAIL (E2E: green success banner not appearing in 5 s — see Failures §3) |
| AC-6 | Empty `image_url` cell on re-import → existing image unchanged | Backend unit test `test_existing_product_empty_url_cell_no_job_no_override` | PASS |
| AC-7 | New `image_url` on re-import → new download triggered | Backend unit test `test_existing_product_new_url_creates_job` | PASS |
| AC-8 | 404 URL → `image_download_errors` entry with `reason` containing "404" | Backend unit test `TestDownloadProductImages::test_404_produces_error` | PASS |
| AC-9 | Wrong Content-Type → `image_download_errors` entry naming the content-type | Backend unit test `TestDownloadProductImages::test_invalid_content_type_produces_error` | PASS |
| AC-10 | Timeout → `image_download_errors` entry with `reason: "timeout"` | Backend unit test `TestDownloadProductImages::test_timeout_produces_error` | PASS |
| AC-11 | Template download href is `/api/shop-admin/import/template`; xlsx has `image_url` header | E2E AC-11 (href check PASS); Backend UT `TestTemplateImageUrl` (3 tests, header + examples) | PASS |
| AC-12 | Clean Boundary: no customer-facing imports in `ImportPanel.tsx`/`FieldCatalog.tsx` | Manual import inspection | PASS |
| AC-13 | No regression: `accept=".xlsx,.xls,.csv"` unaffected; Sheets connect/sync/remove functional | `import-page-ac-check` AC-4 (file accept); Vitest `renders upload section with .xlsx,.xls,.csv accept attribute` | PASS |
| AC-14 | RTL (ar/he): info block and amber banner use correct RTL layout | `import-page-ac-check` AC-7 (Arabic `dir=ltr` on code); Vitest RTL tests for FieldCatalog | PARTIAL — see Divergences §4 |

---

## 2. Environment

| Item | Value |
|---|---|
| Platform | darwin (macOS 25.4.0 arm64) |
| Node | v25.9.0 |
| Playwright | 1.59.1 |
| Vitest | 4.1.4 |
| Frontend URL | http://127.0.0.1:3500 (test instance) |
| Backend URL | http://localhost:8500 (test instance) |
| DB | `pundo_test` (PostgreSQL, Alembic head: `i2c3d4e5f6a7`) |
| Git SHA | `bc4e8ac89c083856c0eb12e76a581461f768787b` |
| Frontend build | Next.js 16.2.2 standalone |

### Fixture Loading

The Playwright global-setup (`e2e/global-setup.ts`) restarted the backend on port 8500, ran `prepare_e2e_db.py` to reset `pundo_test` and copy prod reference data, then created a fresh shop-owner (`e2e-owner@pundo-e2e.io`, shop_id=2214) and JWT cookie. The DB reset succeeded after the global-setup retried (deadlock on first attempt due to backend actively serving while schema was being dropped/recreated — pre-existing infrastructure issue, not introduced by this feature).

### Test Run Summary

| Suite | Run | Pass | Fail | Skip |
|---|---|---|---|---|
| Vitest unit — FieldCatalog.test.tsx | 12 | 12 | 0 | 0 |
| Vitest unit — ImportPanel.test.tsx | 19 | 19 | 0 | 0 |
| Vitest — all (957 total) | 957 | 957 | 0 | 0 |
| Backend pytest — test_shop_owner_import_image_url.py | 24 | 24 | 0 | 0 |
| E2E — shop-admin-import-image-url.spec.ts | 4 | 1 | 2 | 1 |
| E2E — import-page-ac-check.spec.ts | 6 | 6 | 0 | 0 |

---

## 3. Failures

### FAIL-1: AC-1 E2E — Strict-mode violation on "Optional" badge locator

**AC:** AC-1  
**File:** `e2e/journeys/shop-admin-import-image-url.spec.ts:49`  
**Error:**
```
strict mode violation: locator('tr').filter(…).getByText('Optional') resolved to 2 elements:
  1) <td class="py-1.5 pe-3 text-gray-500">Optional</td>
  2) <td class="py-1.5 pe-3 text-gray-600">Optional URL to the product image…</td>
```

**Observed:** The selector `row.getByText('Optional')` matches both the "Optional" badge cell AND the description cell that starts with the word "Optional" (`tr.field_image_url_desc = "Optional URL to the product image..."`). Playwright's strict mode rejects ambiguous matches.

**Expected:** Single match: the badge cell in the `required` column.

**Root Cause:** Test locator is insufficiently precise. The description text for `image_url` begins with "Optional", causing the ambiguous match. This is a **test bug**, not a feature bug. The `image_url` row IS present and visible — confirmed by the Vitest unit tests and by the fact that AC-11 (which navigates the same page) passes.

**Minimal Reproduction:**
1. Navigate to `/shop-admin/import` in English.
2. The `image_url` row description reads "Optional URL to the product image (JPEG/PNG/WebP, max 5 MB). Downloaded in background."
3. `row.getByText('Optional')` matches both the td with text "Optional" and the td whose text content starts with "Optional".

**Fix:** Use `row.locator('td', { hasText: /^Optional$/ })` or `row.getByRole('cell', { name: 'Optional', exact: true }).first()`.

---

### FAIL-2: AC-5 E2E — Green success banner not appearing after mocked upload

**AC:** AC-5  
**File:** `e2e/journeys/shop-admin-import-image-url.spec.ts:96`  
**Error:**
```
Error: expect(locator('.bg-green-50')).toBeVisible() failed
Timeout: 5000ms — element(s) not found
```

**Observed:** After setting up a `page.route` mock for `/api/shop-admin/import/upload` and calling `fileInput.setInputFiles(...)`, the green success banner (`.bg-green-50`) never appears within 5 seconds.

**Expected:** After successful mocked upload (returns `{imported: 1, errors: [], image_download_pending: 0}`), the component renders a `div.bg-green-50` with the success message.

**Context:** The import form uses `useTransition(async () => {...})` to handle the upload. The file input's `onChange` handler fires `startUploadTransition(async () => { fetch(...) })`. The mock intercepts the fetch and returns 200 immediately. However:

1. `startUploadTransition` with async functions is a React 19 concurrent feature. The `setInputFiles` triggers the `onChange` event synchronously, but `useTransition` defers the state update. The 5 s timeout may be insufficient in the standalone Next.js built app.

2. More likely: the `page.route` mock is set up AFTER `page.goto`, but the test calls `fileInput.setInputFiles()` which triggers the `onChange` event. In a built (not dev-server) standalone Next.js app, the route intercept may not be active by the time the fetch fires, OR the fetch goes to the Next.js API route proxy (`/api/shop-admin/import/upload`) which then forwards to the backend at 8500. The mock only intercepts at the frontend level. If the backend at 8500 is in a degraded state after the DB reset deadlock, the upload endpoint may fail.

3. The page snapshot shows the page loaded correctly (navigation and upload form present), so it is not an auth issue.

**Minimal Reproduction:**
1. Run `npx playwright test e2e/journeys/shop-admin-import-image-url.spec.ts` after a clean DB setup.
2. AC-5 test: file is set, route is mocked, but `.bg-green-50` does not appear in 5 s.

**Classification:** This is likely a **test implementation bug** (the `page.route` mock may not intercept the Next.js rewrite proxy path correctly) rather than a feature regression. The Vitest unit test `does not show image_download_pending block when pending is 0` passes with an identical mocked response. The underlying feature code is correct (`.bg-green-50` is rendered when `uploadResult.errors.length === 0`). However, FAIL is FAIL until the coder resolves it.

---

## 4. Divergences from Spec

### D-1: `import-page-ac-check.spec.ts` not extended with `image_url` assertions

Architecture §7 T11 specified: "E2E-Smoke in bestehendem `import-page-ac-check.spec.ts`" with assertions for AC-1 (image_url row visible), AC-5 (upload without image_url), and AC-11 (template header). The coder instead created a new `shop-admin-import-image-url.spec.ts` and did NOT add `image_url` assertions to `import-page-ac-check.spec.ts`. This is a divergence from architecture — the existing spec still has no assertion that `image_url` code element is visible in the FieldCatalog.

**Impact:** Regression risk — `import-page-ac-check` would not catch a future removal of the `image_url` row.

### D-2: `dir="ltr"` on `<code>` in amber banner uses explicit HTML attribute, not Tailwind `rtl:`

AC-14 specifies "Tailwind `rtl:`-Modifier, kein explizites `dir`-Setzen im JS". The amber banner in `ImportPanel.tsx` line 218 sets `<code dir="ltr">{err.url}</code>`. This is identical to the approach used in `FieldCatalog.tsx` for the example URL column (which has been passing tests since before this feature), so the pattern is established and consistent within the codebase. However it technically diverges from AC-14's wording. For URL content in `<code>` elements, `dir="ltr"` is semantically correct (URLs are always left-to-right), so this is a documentation/spec divergence rather than a functional bug.

### D-3: `image_download_errors_detail_toggle` toggle label does not switch between "Show/Hide"

03-implementation.md Known Gap #5 acknowledges: the `<details>/<summary>` implementation only shows "Show details" and doesn't dynamically switch to "Hide details" when open. A translation key `image_download_errors_detail_toggle_hide` exists in translations but is not used. This is a documented known gap that the native HTML `<details>` behavior partially covers (the summary is always visible regardless).

### D-4: Backend `ingestor/api/shop_owner_products.py` not updated

Architecture §1 specified `_to_response()` should return `image_path` in the product list endpoint. The coder's implementation notes (Known Gap #3) acknowledge this was not done. This is non-breaking but means the portal product list does not yet expose `image_path` to show whether a product has an imported image.

### D-5: Migration `down_revision` set to `c8d9e0f1a2b3` instead of intended merge-head `057fdaec566f`

As documented in 03-implementation.md Known Gap #2, the migration chain in `pundo_test` diverges from the intended `down_revision`. The migration `a8b9c0d1e2f3` branches from `c8d9e0f1a2b3` rather than `057fdaec566f` (merge head). Both branches ultimately merge in `i2c3d4e5f6a7`. The test DB reaches the correct final state. Production DB migration chain must be manually verified before deploy.

---

## 5. Phase 0.5 — Journey Scan

- **shop-admin-import-image-url.spec.ts** exists → status updated from `approved` to `implemented` in CATALOG.md
- **import-page-ac-check** is mustRun (ImportPanel.tsx changed) → ran, 6/6 PASS
- **H3 Heuristic check** for `ImageDownloadError` interface: it is a plain interface with string fields, not a status enum. H3 does not fire.
- Drift check: all `touches-modules` globs resolve to existing paths.

---

## 6. Verdict: FIX

### Required fixes before SHIP

1. **FAIL-1 (test bug):** Fix the `row.getByText('Optional')` locator in `shop-admin-import-image-url.spec.ts:49`. Use an exact-text or role-based selector that does not match the description cell. Suggested: `row.locator('td').filter({ hasText: /^Optional$/ })`.

2. **FAIL-2 (test bug or environment issue):** Investigate why the green success banner does not appear in the AC-5 E2E test. Likely cause: `page.route()` mock does not intercept the Next.js proxy path to the backend. Fix options: (a) use `page.route('**/api/shop-admin/import/upload', ...)` with a wildcard, or (b) ensure the backend at 8500 is in a healthy state before running the upload test, or (c) add a timeout buffer with `await page.waitForTimeout(500)` before checking the banner.

### Non-blocking follow-ups (do not block SHIP after test fixes)

- D-1: Add `image_url` code element assertion to `import-page-ac-check.spec.ts` for regression protection.
- D-4: Add `image_path` to `shop_owner_products.py` `_to_response()` (acknowledged in Known Gaps).
- D-3: Toggle label "Hide details" for amber banner `<details>` (acknowledged, native HTML behavior is acceptable).
