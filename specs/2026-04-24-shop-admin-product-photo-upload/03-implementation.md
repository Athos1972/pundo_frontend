# Implementation Handoff — Shop-Admin Produktfoto-Upload (Frontend)

**Slug:** `2026-04-24-shop-admin-product-photo-upload`
**Coder:** Claude Sonnet 4.6
**Datum:** 2026-04-24
**Scope:** Frontend-Tasks T7–T12 only. Backend-Tasks T1–T6 are a separate ticket.

---

## Task Summary

| Task | Status | Notes |
|---|---|---|
| T7 — Types + Translations | Done | `AdminProductImage` interface + `images?: AdminProductImage[]` on `AdminProduct`; 10 translation keys × 6 languages |
| T8 — `ProductPhotoUpload` component | Done | Full implementation with file picker, blob preview, upload, remove, reorder, inline errors, RTL |
| T9 — Integration in `ProductForm` | Done | Between category and PriceTierEditor; create-mode pending queue + post-save upload; edit-mode delete diff + reorder |
| T10 — `ProductList` thumbnail column | Done | First photo shown; camera emoji placeholder fallback |
| T11 — E2E journey spec | Skipped | No `approved` entry in `e2e/journeys/CATALOG.md` for slug `shop-admin-product-photo-upload`. Architect proposed a `proposed` entry — status must be confirmed by user and set to `approved` before e2e-tester can implement it. |
| T12 — Language smoke extension | Skipped | `/shop-admin/products/new` requires auth session; the existing smoke test does not have shop-owner auth cookies set up. Extending it would only test the login-redirect page, which is not meaningful for the upload label check (AC-9). |

---

## File-by-File Changes

### Added

| File | Description |
|---|---|
| `src/components/shop-admin/ProductPhotoUpload.tsx` | New client component — upload, preview, reorder, remove |
| `src/tests/ProductPhotoUpload.test.tsx` | 18 Vitest unit tests covering all AC scenarios |

### Modified

| File | Change |
|---|---|
| `src/types/shop-admin.ts` | New `AdminProductImage` interface; `images?: AdminProductImage[]` added to `AdminProduct` (optional to remain backwards-compatible while backend T1–T6 are not yet deployed) |
| `src/lib/shop-admin-translations.ts` | 10 new keys per language × 6 languages = 60 new strings (en, de, el, ru, ar, he) |
| `src/components/shop-admin/ProductForm.tsx` | Import `ProductPhotoUpload`; image state management; create-mode pending file upload after POST; edit-mode diff delete + reorder via PUT |
| `src/components/shop-admin/ProductList.tsx` | Added `Image` import; thumbnail column before product name |

### Unmodified (as expected)

- `src/app/api/shop-admin/[...path]/route.ts` — Catch-all proxy already handles multipart
- `src/app/(shop-admin)/shop-admin/(portal)/products/new/page.tsx` — already loads `ProductForm`
- `src/app/(shop-admin)/shop-admin/(portal)/products/[id]/edit/page.tsx` — `images` arrives from backend response via `getAdminProducts`

---

## API Flows Implemented

### ProductPhotoUpload (edit-mode, `productId` present)

- **Upload:** `POST /api/shop-admin/products/{id}/images` (multipart) → response `{id, url, sort_order}` replaces blob preview
- **Remove:** local state only — DELETE call issued during form save
- **Reorder:** local state only — PUT call issued during form save

### ProductForm save sequence

**Create-mode:**
1. `POST /api/shop-admin/products` → get `{id}`
2. For each pending file: `POST /api/shop-admin/products/{id}/images` (sequential, errors non-fatal)
3. `saveTiers(...)` as before
4. Redirect to `/shop-admin/products`

**Edit-mode:**
1. `PATCH /api/shop-admin/products/{id}`
2. For each image removed vs. original set: `DELETE /api/shop-admin/products/{id}/images/{image_id}`
3. If images present: `PUT /api/shop-admin/products/{id}/images/reorder` with `{order: [id1, ...]}`
4. `saveTiers(...)` as before
5. Redirect to `/shop-admin/products`

---

## Known Gaps / Follow-ups

### Backend not yet implemented (T1–T6 — separate ticket)

The backend endpoints `POST /api/v1/shop-owner/products/{id}/images`, `DELETE .../images/{image_id}`, and `PUT .../images/reorder` **do not exist yet**. The Next.js catch-all proxy will return 404 for all image operations. This is expected — no frontend bug. Once T1–T6 land, the frontend will work without any further frontend changes.

The `images` field is typed as **optional** (`images?: AdminProductImage[]`) on `AdminProduct` precisely because the backend currently returns products without this field. Once the backend returns `images: []` by default (per the Pydantic schema in T2), the field can remain optional (safe) or be made required.

### AC-4 (Kund:innen-Sichtbarkeit) — explicitly out of scope

Shop-Owner products are not yet visible in the public product search/catalog. This is a separate design session per the architecture doc §0.

### T11 — E2E journey spec

The architect proposed a new CATALOG entry `shop-admin-product-photo-upload` with status `proposed`. A user confirmation is required to advance it to `approved`. The e2e-tester should not create the journey file until the status is `approved` in `e2e/journeys/CATALOG.md`.

### T12 — Language smoke not extended

The `/shop-admin/products/new` page requires a shop-owner session cookie. The smoke test suite has no auth setup for this role. Extension is deferred until a shared auth fixture is available.

---

## How to Run Locally

```bash
# Install dependencies (if needed)
npm ci

# TypeScript check
npx tsc --noEmit

# Unit tests
npx vitest run

# Lint
npm run lint

# Dev server (test instance — port 3500)
npm run dev:test
```

Navigate to `http://localhost:3500/shop-admin/products/new` to see the upload block in the form. Backend photo API calls will 404 until T1–T6 are implemented.

---

## Clean Boundary Verification

`ProductPhotoUpload.tsx` and `ProductForm.tsx` import exclusively from:
- `react` (core)
- `next/image`, `next/navigation` (Next.js primitives)
- `@/lib/shop-admin-translations` (tAdmin)
- `@/types/shop-admin` (AdminProductImage, AdminProduct, PriceTier, PriceUnitOption)
- `./FormField`, `./Toast`, `./PriceTierEditor`, `./ProductPhotoUpload` (shop-admin siblings)

No imports from `src/components/product/`, `src/components/map/`, `src/components/search/`, `src/components/shop/`, or `src/types/api.ts`. `npx tsc --noEmit` passes clean.
