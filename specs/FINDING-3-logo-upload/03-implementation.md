# FINDING-3: Logo Upload — Implementation Summary

## Task-by-task summary

| Task | Status | Notes |
|------|--------|-------|
| Backend: `POST /api/v1/shop-owner/shop/logo` endpoint | Done | Added to `ingestor/api/shop_owner_shop.py` |
| Backend: StaticFiles mount `/shop_logos` in `main.py` | Done | `_shop_logo_dir` created on startup, mounted |
| Backend: Create `SHOP_LOGO_DIR` on startup | Done | `mkdir(parents=True, exist_ok=True)` in `main.py` |
| Backend: Add `SHOP_LOGO_DIR` to `.env.example` | Done | Added under Brand Logo section |
| Backend: Unit tests for logo upload endpoint | Done | `test_shop_owner_logo_upload.py` — 9 tests |
| Frontend: `/shop_logos/:path*` proxy in `next.config.ts` | Done | Same pattern as `/review_photos/` |
| Frontend: `LogoUpload.tsx` component | Done | `src/components/shop-admin/LogoUpload.tsx` |
| Frontend: Update `ProfileForm.tsx` | Done | Replaced URL text field with `LogoUpload` |
| Frontend: Translation keys in all 6 languages | Done | `shop-admin-translations.ts` |
| Frontend: `uploadShopLogo` in `shop-admin-api.ts` | Skipped — see Known Gaps | |

## File-by-file changes

### Backend (`/Users/bb_studio_2025/dev/github/pundo_main_backend`)

**Modified:**
- `ingestor/api/shop_owner_shop.py` — Added `POST /shop-owner/shop/logo` endpoint, imports for `UploadFile`, `generate_variants`, `Path`, `os`, `logging`; added `_shop_logo_dir()` helper and constants
- `ingestor/api/main.py` — Added `_shop_logo_dir` mkdir + `StaticFiles` mount at `/shop_logos`
- `.env.example` — Added `SHOP_LOGO_DIR=/shop_logos`

**Added:**
- `ingestor/tests/test_shop_owner_logo_upload.py` — 9 unit tests covering: unsupported type rejection, empty file, oversized file (>5 MB), 404 when shop not found, successful upload updates `Shop.images`, updates existing images entry, JPEG/WebP also accepted, `_shop_logo_dir()` env override

### Frontend (`/Users/bb_studio_2025/dev/github/pundo_frontend`)

**Modified:**
- `next.config.ts` — Added `/shop_logos/:path*` → backend rewrite
- `src/lib/shop-admin-translations.ts` — Added 6 keys × 6 languages: `logo_upload_label`, `logo_upload_button`, `logo_upload_success`, `logo_upload_error`, `logo_upload_size_error`, `logo_or_url`
- `src/app/(shop-admin)/shop-admin/(portal)/profile/ProfileForm.tsx` — Replaced `<FormField type="url" name="logo_url">` with `<LogoUpload>`; added `logoUrl` state; `onLogoUploaded` updates state and shows success toast; PATCH body now sends `logo_url: logoUrl` (state value)
- `src/lib/shop-admin-api.ts` — Added explanatory comment (no function added — see Known Gaps)

**Added:**
- `src/components/shop-admin/LogoUpload.tsx` — File upload component: image preview, 5 MB client-side size check, POST to `/api/shop-admin/shop/logo`, success/error/loading states, "Or enter URL" toggle showing hidden URL text input

## Known gaps / follow-ups

1. **`uploadShopLogo` not in `shop-admin-api.ts`**: That file is marked `server-side only` (reads HttpOnly cookies via `next/headers`). Adding a `File` upload function there would be misleading — `File` objects come from the browser and cannot be constructed server-side. The upload is done inline in `LogoUpload.tsx` via `fetch('/api/shop-admin/shop/logo')`, identical to how `ImportPanel.tsx` handles file uploads. A comment was added to `shop-admin-api.ts` explaining this decision.

2. **`generate_variants` is idempotent by filename stem**: The stem is always `"logo"`, so re-uploading will overwrite only if the old webp file is deleted first. The `generate_variants` function skips writing if the file already exists. For logo uploads this is intentional (logo should be deterministic per shop) — but it means uploading a second different image to the same shop will not update the files unless `logo_thumb.webp` / `logo_card.webp` are deleted. E2E tester should verify re-upload behavior if needed.

3. **No production server restart needed**: The `SHOP_LOGO_DIR` is created on startup if it doesn't exist. Existing production deployments need no manual migration.

4. **`Shop.images` JSONB backward compatibility**: `ShopProfilePatch.logo_url` URL string field is retained unchanged. The new upload endpoint is purely additive.

## How to run locally

### Backend

```bash
cd /Users/bb_studio_2025/dev/github/pundo_main_backend
source .venv/bin/activate

# Unit tests (new + existing)
python -m pytest ingestor/tests/test_shop_owner_logo_upload.py ingestor/tests/test_shop_owner_shop_api.py -v

# Full suite
python -m pytest ingestor/tests/ -v -x --ignore=ingestor/tests/e2e

# Start test backend (port 8500, DB: pundo_test)
./scripts/start_test_server.sh
```

### Frontend

```bash
cd /Users/bb_studio_2025/dev/github/pundo_frontend

# TypeScript
npx tsc --noEmit

# Lint
npm run lint

# Unit tests
npx vitest run

# Dev server (test instance — port 3500)
npm run dev:test
```

### Manual verification

1. Start backend test server: `./scripts/start_test_server.sh` (port 8500)
2. Start frontend test server: `npm run dev:test` (port 3500)
3. Navigate to `http://localhost:3500/shop-admin/profile`
4. Log in as a shop owner
5. The "Shop Logo" upload widget should appear above the Address field
6. Select a JPEG/PNG/WebP file — preview should appear immediately
7. Upload completes with success toast
8. Save the form — logo URL is included in PATCH body
9. Test oversized file (>5 MB) — should show size error inline
10. Test "Or enter URL manually" toggle — URL input appears
