---
id: shop-admin-import-image-url
title: Import image_url Async-Flow
status: implemented
spec-file: e2e/journeys/shop-admin-import-image-url.spec.ts
priority: P2
owner-agent: coder
proposed-in-spec: shop-admin-import-image-url-20260424
touches-modules:
  - src/app/(shop-admin)/shop-admin/(portal)/import/**
  - src/components/shop-admin/ImportPanel.tsx
  - src/components/shop-admin/FieldCatalog.tsx
touches-roles:
  - shop-owner
touches-states:
  - Import.status:pending
  - Import.status:error
status-changed-at: 2026-04-24T14:00:00Z
status-changed-by-spec: shop-admin-import-image-url-20260424
last-run: 2026-04-26T21:15:00Z
last-result: PASS
last-run-sha: fd0d7241a5c0395857bb289c5f1ae76a574d157c
---

# Journey: shop-admin-import-image-url

**Status:** implemented  
**Priority:** P2  
**Last run:** 2026-04-24 (FAIL — AC-4 async flow requires live backend with image processing)

## Purpose

Verify that the `image_url` column is surfaced correctly in the Shop-Admin import UI:
1. FieldCatalog shows the `image_url` row
2. Template download includes `image_url` header
3. Import without `image_url` column shows no pending/error banners
4. (Requires live backend) Full async flow: upload CSV with image URLs → pending banner → error banner after poll

## Pre-conditions

- Shop-owner logged in at `/shop-admin/import` (test instance port 3500)
- Backend at port 8500 is running

## Steps

### AC-1: FieldCatalog shows image_url row

1. Navigate to `/shop-admin/import`
2. Assert: table row with `<code>image_url</code>` is visible
3. Assert: that row has "Optional" badge
4. Assert: that row has an example URL containing `example.com`

### AC-5: Upload without image_url column — no banners

1. Upload a CSV file containing only `name` and `available` columns (no `image_url`)
2. Assert: upload succeeds (success banner visible)
3. Assert: no blue "background download" info block visible
4. Assert: no amber "could not be loaded" banner visible

### AC-11: Template download contains image_url header

1. Click "Download template" link
2. Assert: response is an xlsx file
3. Assert: the first row of the xlsx contains the text `image_url`

### AC-3 + AC-4: Full async flow (requires live backend with mock image server)

> This test requires a mock HTTP server that can serve image files and simulate 404s.
> Marked as `test.skip` in the spec until a test helper is available.

1. Upload a CSV with 2 rows: one valid image URL (pointing to mock server), one 404 URL
2. Assert: response includes `image_download_pending: 2`
3. Assert: blue info block "2 product images are being downloaded…" is visible
4. Wait for poll (3 s + 8 s) → mock server responds with 404 for second URL
5. Assert: amber banner "2 product images could not be loaded" appears
6. Open details → assert error entry with reason `http 404` is visible

## Notes

- Polling logic in `ImportPanel.tsx` fires at 3 s and 8 s after upload with pending > 0
- The mock server approach for AC-3/AC-4 is documented as "requires live backend" — see 03-implementation.md
