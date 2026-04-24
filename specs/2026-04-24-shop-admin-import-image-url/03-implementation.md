# Implementation Summary — Shop-Admin Import `image_url`

**Slug:** `2026-04-24-shop-admin-import-image-url`  
**Coder:** Claude Sonnet 4.6  
**Date:** 2026-04-24

---

## Task-by-task status

| Task | Status | Notes |
|---|---|---|
| T1 — Alembic Migration | DONE | `a8b9c0d1e2f3_add_import_image_url_fields.py`, applied to `pundo_test` |
| T2 — SQLAlchemy Models | DONE | `shop_owner_product.py` + `import_status.py` extended |
| T3 — Parser + Template | DONE | `OPTIONAL_COLUMNS` + `parse_rows()` + `upsert_products()` + `generate_template_xlsx()` |
| T4 — Image Downloader | DONE | New file `ingestor/ingestion/shop_owner_image_downloader.py` |
| T5 — API Endpoint | DONE | `upload_file()` + `_background_image_download()` + `get_import_status()` updated |
| T6 — Backend Unit Tests | DONE | 24 tests, all passing |
| T7 — TypeScript Types | DONE | `ImageDownloadError`, `ImportStatus`, `ImportUploadResult` extended |
| T8 — Translations | DONE | All 6 languages (en/de/el/ru/ar/he) with 4 new keys |
| T9 — FieldCatalog.tsx | DONE | New `image_url` row added after `available` |
| T10 — ImportPanel.tsx | DONE | Info block, auto-poll (3 s + 8 s), amber banner |
| T11 — Unit Tests | DONE | FieldCatalog: 12 tests; ImportPanel: 19 tests; all passing |
| T12 — E2E Journey | PARTIAL — see Known Gaps | Spec file + 2 live tests + 1 `test.skip` for async flow |

---

## Files changed

### Backend (`/Users/bb_studio_2025/dev/github/pundo_main_backend`)

| File | Change |
|---|---|
| `ingestor/db/migrations/versions/a8b9c0d1e2f3_add_import_image_url_fields.py` | ADDED — Alembic migration |
| `ingestor/models/shop_owner_product.py` | MODIFIED — `+image_url`, `+image_path` columns |
| `ingestor/models/import_status.py` | MODIFIED — `+image_download_errors` (JSONB), `+last_image_download_at` |
| `ingestor/ingestion/shop_owner_import.py` | MODIFIED — parser, upsert_products return signature, template |
| `ingestor/ingestion/shop_owner_image_downloader.py` | ADDED — full downloader with SSRF protection |
| `ingestor/api/shop_owner_import.py` | MODIFIED — BackgroundTasks, _background_image_download, get_import_status |
| `ingestor/schemas/shop_owner.py` | MODIFIED — ImageDownloadErrorItem, ImportUploadResponse.image_download_pending, GoogleSheetStatusResponse extensions |
| `ingestor/tests/test_shop_owner_import_image_url.py` | ADDED — 24 unit tests |

### Frontend (`/Users/bb_studio_2025/dev/github/pundo_frontend`)

| File | Change |
|---|---|
| `src/types/shop-admin.ts` | MODIFIED — `ImageDownloadError` interface, `ImportStatus` + `ImportUploadResult` extensions |
| `src/lib/shop-admin-translations.ts` | MODIFIED — 4 new keys × 6 languages: `field_image_url_desc`, `image_download_pending`, `image_download_errors_title`, `image_download_errors_detail_toggle`, `image_download_error_reason_header` |
| `src/components/shop-admin/FieldCatalog.tsx` | MODIFIED — new `image_url` row |
| `src/components/shop-admin/ImportPanel.tsx` | MODIFIED — useEffect polling, info block, amber banner |
| `src/tests/FieldCatalog.test.tsx` | MODIFIED — `image_url` assertions in all 6 lang tests; Optional badge count 2→3 |
| `src/tests/ImportPanel.test.tsx` | MODIFIED — 6 new test cases for pending block, amber banner, translation keys |
| `e2e/journeys/shop-admin-import-image-url.md` | ADDED — journey spec document |
| `e2e/journeys/shop-admin-import-image-url.spec.ts` | ADDED — Playwright spec (AC-1, AC-5, AC-11 live; AC-3/AC-4 skipped) |

---

## Known gaps / follow-ups

1. **E2E AC-3/AC-4 full async flow is `test.skip`** — requires a mock HTTP image server accessible from the test environment. The test is documented with instructions in `shop-admin-import-image-url.spec.ts`. Can be enabled once a `e2e/helpers/mock-image-server.ts` helper is available.

2. **Migration applied to `pundo_test` only** — `down_revision` was set to `c8d9e0f1a2b3` (the current head of `pundo_test`) rather than `057fdaec566f` (the intended merge-head) because the migration `g0a1b2c3d4e5` (normalize_opening_hours) has a SQL syntax bug (`:oh::jsonb` cast incompatible with psycopg3) and was never applied to `pundo_test`. This is a **pre-existing issue** in the migration chain, not introduced by this feature. The `pundo` production DB is unaffected; manually verify the production chain before deploying.

3. **`ingestor/api/shop_owner_products.py` not updated** — Architecture §1 mentioned adding `image_path` to `_to_response()` for the product list, but there was no existing `image_path` in the product list response. This is a non-breaking addition that can be done as a follow-up task without blocking this feature.

4. **BackgroundTask retry** — Per architecture §5, the BackgroundTask can abort on process restart. No retry logic is implemented (accepted risk, same as `_background_sync`).

5. **`image_download_errors_detail_toggle` toggle-hide state** — The amber banner's `<details>` element only shows "Show details" as the toggle text. A "Hide details" string was added to translations but the current implementation uses native `<details>/<summary>` HTML without JS toggling the label. This is consistent with the architecture spec; a future enhancement could use controlled state if needed.

---

## How to run locally

### Setup

```bash
# Frontend
cd /Users/bb_studio_2025/dev/github/pundo_frontend
npm install

# Backend
cd /Users/bb_studio_2025/dev/github/pundo_main_backend
uv sync --extra dev
```

### Run migration (test DB)

```bash
cd /Users/bb_studio_2025/dev/github/pundo_main_backend
uv run alembic upgrade a8b9c0d1e2f3
# Verify
uv run alembic current
```

### Backend unit tests

```bash
cd /Users/bb_studio_2025/dev/github/pundo_main_backend
uv run --extra dev python -m pytest ingestor/tests/test_shop_owner_import_image_url.py -v
# All 24 tests should pass
```

### Frontend type check + lint + unit tests

```bash
cd /Users/bb_studio_2025/dev/github/pundo_frontend
npx tsc --noEmit          # 0 errors
npm run lint              # 0 errors (45 pre-existing warnings)
npx vitest run            # 957 tests pass
```

### E2E (against test instances)

```bash
# Start test backend (port 8500)
cd /Users/bb_studio_2025/dev/github/pundo_main_backend
./scripts/start_test_server.sh

# Start test frontend (port 3500)
cd /Users/bb_studio_2025/dev/github/pundo_frontend
npm run dev:test

# Run E2E
npx playwright test e2e/journeys/shop-admin-import-image-url.spec.ts
```
