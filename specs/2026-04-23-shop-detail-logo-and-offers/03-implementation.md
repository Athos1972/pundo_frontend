# Implementation — Shop Detail: Logo + Active Offers

Feature slug: `2026-04-23-shop-detail-logo-and-offers`
Implemented: 2026-04-23

---

## Task Summary

### FINDING-4 — Display shop logo on customer shop page — DONE

- `ShopListItem` Pydantic schema (`ingestor/schemas/shop_query.py`) did not expose the `images` field from the `Shop` ORM model. Added `images: list[dict[str, Any]] | None = None` to the schema.
- `_build_shop_item` in `ingestor/api/shop_query.py` now passes `images=shop.images or None`.
- TypeScript `ShopDetailResponse` (extends `ShopListItem`) now has `images?: Array<{ url: string }> | null`.
- Shop page displays the logo using `next/image` (96×96 px, rounded-xl) when `shop.images?.[0]?.url` is present. Falls back to `ShopAvatar` when no logo exists.
- The `/shop_logos/` path was already proxied via `next.config.ts` — no config changes needed.

### D1 — Show active offers on customer shop page — DONE

- New `PublicOfferItem` Pydantic schema added to `ingestor/schemas/shop_query.py`.
- New backend endpoint `GET /api/v1/shops/by-slug/{slug}/offers` added to `ingestor/api/shop_query.py`. Returns active (non-archived, valid_until is null or in the future) `ShopOwnerOffer` records ordered by `created_at` desc. Public, no auth required.
- `ShopOffer` interface added to `src/types/api.ts`.
- `getShopOffers(slug, lang)` added to `src/lib/api.ts` — returns `[]` on error (graceful degradation).
- Offers are fetched server-side in parallel with `searchProducts` via `Promise.all`.
- Offers section renders below the opening hours block and above the top products section. Shows title, price + currency (if set), description (if set), valid_until date (if set). Empty state = nothing rendered.
- Two new translation keys added in all 6 languages: `shop_offers`, `shop_offer_valid_until`.

---

## Files Changed

### Backend (`/Users/bb_studio_2025/dev/github/pundo_main_backend`)

| File | Change |
|------|--------|
| `ingestor/schemas/shop_query.py` | Added `images` field to `ShopListItem`; added `PublicOfferItem` schema |
| `ingestor/api/shop_query.py` | Pass `images` in `_build_shop_item`; import `ShopOwnerOffer` + `PublicOfferItem`; add `GET /by-slug/{slug}/offers` endpoint |

### Frontend (`/Users/bb_studio_2025/dev/github/pundo_frontend`)

| File | Change |
|------|--------|
| `src/types/api.ts` | Added `images` field to `ShopDetailResponse`; added `ShopOffer` interface |
| `src/lib/api.ts` | Added `getShopOffers` function; imported `ShopOffer` type |
| `src/lib/translations.ts` | Added `shop_offers` and `shop_offer_valid_until` keys in all 6 languages (en, de, ru, el, ar, he) |
| `src/app/(customer)/shops/[slug]/page.tsx` | Import `Image` from next/image and `getShopOffers`; parallel fetch of offers; logo display with fallback; offers section |

---

## Known Gaps / Follow-ups

- Pre-existing TypeScript errors in `e2e/journeys/shop-admin-offers.spec.ts` (2 errors on `capturedBody.price` typed as `never`) — these existed before this implementation and are not introduced by these changes.
- The offers endpoint is `by-slug` only (matches the frontend usage pattern). A `/{shop_id}/offers` variant was not added but could be added later if needed.
- `valid_from` on offers is stored and returned but not displayed in the UI (offers not yet started are still returned if not archived and valid_until is not past). If business logic should exclude not-yet-started offers, the backend query filter needs a `valid_from <= now` clause.

---

## How to Run Locally

### Backend

```bash
cd /Users/bb_studio_2025/dev/github/pundo_main_backend
source .venv/bin/activate
python -m pytest ingestor/tests/ -v -q 2>&1 | tail -10
```

Start test server: `./scripts/start_test_server.sh` (port 8500, DB: pundo_test)

### Frontend

```bash
cd /Users/bb_studio_2025/dev/github/pundo_frontend
npx tsc --noEmit      # 2 pre-existing warnings in e2e spec
npm run lint          # 0 errors, pre-existing warnings only
npx vitest run        # 908 tests, all pass
npm run dev:test      # starts on port 3500, backend on 8500
```
