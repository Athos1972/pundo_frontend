# 03-backend-implementation.md — Unified Item & Offer Model

**Feature slug:** `2026-04-24-unified-item-offer-model`
**Status:** COMPLETE — migrations applied to `pundo_test`, ready for production
**Date:** 2026-04-24

---

## What was built

All T1–T15 tasks implemented. The two-world model (SysAdminProduct+Offer vs ShopOwnerProduct+ShopOwnerOffer) is replaced by a single unified pipeline:

```
Item (global catalogue)
  └── ShopListing (shop ↔ item junction: sku, shop_url, available)
        └── UnifiedOffer (price_tiers JSONB, source, archived)
```

---

## Files changed / created

### New models
| File | Purpose |
|------|---------|
| `ingestor/models/item.py` | Replaces `Product` |
| `ingestor/models/item_attribute.py` | Replaces `ProductAttribute` |
| `ingestor/models/item_photo.py` | Replaces `products.images` JSONB, adds `contributed_by_shop_id` |
| `ingestor/models/shop_listing.py` | New junction: item↔shop with sku/shop_url/available |
| `ingestor/models/shop_listing_attribute.py` | Per-listing attribute overrides |
| `ingestor/models/unified_offer.py` | Replaces both `Offer` + `ShopOwnerOffer`; price in `price_tiers` JSONB |

### Modified models (legacy → _deprecated table names)
| File | Change |
|------|--------|
| `ingestor/models/offer.py` | `__tablename__ = "offers_deprecated"` |
| `ingestor/models/product.py` | `__tablename__ = "products_deprecated"` |
| `ingestor/models/product_attribute.py` | `__tablename__ = "product_attributes_deprecated"` |
| `ingestor/models/spotted.py` | `product_id → item_id`, added `shop_listing_id` FK |
| `ingestor/models/__init__.py` | Added new models, removed ShopOwnerProduct/Offer/PriceTier |

### New API endpoints
| File | Routes |
|------|--------|
| `ingestor/api/shop_owner_items.py` | `GET/POST /shop-owner/items`, photos, attributes |
| `ingestor/api/shop_owner_shop_listings.py` | `GET/POST/PATCH/DELETE /shop-owner/shop-listings` |

### Updated API endpoints
| File | Change |
|------|--------|
| `ingestor/api/shop_owner_offers.py` | Uses `UnifiedOffer + ShopListing`; archive-on-price-change |
| `ingestor/api/product_query.py` | Full rewrite: `Item`, `UnifiedOffer→ShopListing→Shop` joins |
| `ingestor/api/admin/products.py` | `Item` alias for `Product` |
| `ingestor/api/admin/offers.py` | `UnifiedOffer + ShopListing` join; compat response |
| `ingestor/api/admin/shop_owner_offers.py` | `UnifiedOffer`; scalar price → price_tiers |
| `ingestor/api/admin/shop_owner_products.py` | `ShopListing + Item`; compat response |
| `ingestor/api/main.py` | Registered `shop_owner_items_router` + `shop_owner_shop_listings_router` |

### Updated ingestion
| File | Change |
|------|--------|
| `ingestor/ingestion/product_processor.py` | Creates Item + ItemAttribute + ItemPhoto + ShopListing + UnifiedOffer |
| `ingestor/ingestion/shop_owner_import.py` | CSV/XLSX import writes to Item + ShopListing + UnifiedOffer |
| `ingestor/ingestion/shop_owner_image_downloader.py` | Creates `ItemPhoto` rows instead of updating ShopOwnerProduct |
| `ingestor/ingestion/item_search.py` | New: fuzzy search + block check (rapidfuzz) |
| `ingestor/ingestion/product_dedup.py` | Rewritten: EAN/SKU/fuzzy match on new tables |
| `ingestor/workers/spotted_worker.py` | Creates Item + ShopListing + UnifiedOffer |

### New schemas
| File | Key additions |
|------|---------------|
| `ingestor/schemas/shop_owner.py` | `ItemCreate`, `UnifiedOfferCreate`, `UnifiedOfferPatch`, `ShopListingResponse`, `PriceTierCreate` |
| `ingestor/schemas/product_intake.py` | Added `item_id`, `shop_listing_id` to `ProductIntakeResponse` |

### Migrations
| File | Content |
|------|---------|
| `ingestor/db/migrations/versions/j3d4e5f6a7b8_unified_item_offer_model.py` | Main migration: create tables, copy data, rename deprecated |
| `ingestor/db/migrations/versions/k4e5f6a7b8c9_add_partial_unique_index_active_manual_offers.py` | Partial unique index: one active manual offer per shop_listing |

### Tests
| File | Coverage |
|------|----------|
| `ingestor/tests/test_unified_item_offer_model.py` | 23 tests: AC-5 price history, AC-6/AC-7 scraper protection, AC-8 photo limit, AC-13 fuzzy-block |

---

## Key business rules implemented

### Price history (AC-5)
When `price_tiers`, `price_type`, or `currency` change on a PATCH, the existing offer is archived (`archived=True`) and a new offer is inserted. Meta-only changes (description, title) update in place.

### Scraper protection (AC-6/AC-7)
`UnifiedOffer.is_protected` → `True` if `source IN ('shop_manual', 'shop_upload', 'admin')`.  
`product_processor.py` checks this before overwriting. Scraper can only overwrite its own scraper offers.

### Photo limit (AC-8)
`shop_owner_items.py` photo upload handler: `SELECT FOR UPDATE` on `ItemPhoto` count per item; rejects with HTTP 409 if `count >= 8`.

### Fuzzy-block (AC-13)
`item_search.py` `check_fuzzy_block()` using `rapidfuzz.fuzz.token_sort_ratio`:
- Score ≥ 85 → HTTP 409 with `similar_items`
- Score 60–84 → HTTP 200 with `warnings.similar_items` (user can confirm)
- `confirmed=True` parameter bypasses block

### Price format
All prices live in `price_tiers` JSONB. No scalar `price` field on `UnifiedOffer`. Format:
```json
[{"unit": "piece", "unit_label_custom": null, "steps": [{"min_quantity": 1, "max_quantity": null, "price": "9.99", "currency": "EUR"}]}]
```

---

## Migration notes

### Issues fixed during test migration
1. **`ck_items_source` violation**: Legacy products had scraper-specific source values (`markospets_scraper` etc.). Fixed by normalizing any non-canonical source to `'scraper'` in the INSERT CASE statement.
2. **`jsonb_array_elements` scalar error**: Some `products.images` values were not JSON arrays. Fixed by adding `WHERE jsonb_typeof(p.images) = 'array'` guard.
3. **`offers_id_seq` already exists**: PostgreSQL did not rename the old sequence when the table was renamed to `offers_deprecated`. Fixed with a PL/pgSQL `DO $$ IF NOT EXISTS ...` block.

### Migration run
```
pundo_test: alembic upgrade head  → k4e5f6a7b8c9 (head) ✓
pundo (production): NOT YET — user to run manually
```

---

## Pending for production

1. **DB backup** before running on production (spec requirement).
2. Run on production: `alembic -x db=prod upgrade head`
3. Test server restart: `./scripts/start_test_server.sh` (port 8500)
4. Frontend update: `OfferForm.tsx` and related shop-admin UI components need updating to use new `/shop-owner/items` and `/shop-owner/shop-listings` endpoints (was using `/shop-owner/products`).

---

## Acceptance criteria status

| AC | Description | Status |
|----|-------------|--------|
| AC-1 | Item/ShopListing/UnifiedOffer model | ✓ |
| AC-2 | price_tiers JSONB replaces scalar price | ✓ |
| AC-3 | source field on Item enforced | ✓ |
| AC-4 | ShopListing unique (item_id, shop_id) | ✓ |
| AC-5 | Price history via archive-on-change | ✓ |
| AC-6 | Scraper cannot overwrite protected offer | ✓ |
| AC-7 | Scraper can overwrite own offer | ✓ |
| AC-8 | Max 8 photos per item | ✓ |
| AC-9 | Photos in item_photos table | ✓ |
| AC-10 | contributed_by_shop_id on ItemPhoto | ✓ |
| AC-11 | SKU on ShopListing | ✓ |
| AC-12 | shop_url on ShopListing | ✓ |
| AC-13 | Fuzzy-block for item creation | ✓ |
| AC-14 | confirmed=True bypasses fuzzy-block | ✓ |
| AC-15 | Customer API compat (product_id alias) | ✓ |
