# Backend-Architektur: Unified Item & Offer Model
**Feature-Slug:** `2026-04-24-unified-item-offer-model`
**Datum:** 2026-04-24
**Basis:** `01-design.md` (final), `02-architecture.md` (Frontend-Architektur, final)
**Backend-Repo:** `/Users/bb_studio_2025/dev/github/pundo_main_backend`
**Status:** Bereit für Backend-Coder

---

## 1. DB-Schema

### 1.1 Neue Tabelle: `items`

Ersetzt `products`. Felder aus `ingestor/models/product.py` (`Product`-Klasse, Tabelle `products`) werden 1:1 übernommen und um `source`-Pflichtfeld ergänzt.

```sql
CREATE TABLE items (
    id              SERIAL PRIMARY KEY,
    slug            VARCHAR(256) NOT NULL,
    item_type       VARCHAR(16)  NOT NULL DEFAULT 'product',   -- 'product' | 'service'
    status          VARCHAR(32)  NOT NULL DEFAULT 'active',    -- 'active' | 'inactive'
    names           JSONB        NOT NULL DEFAULT '{}',
    descriptions    JSONB,
    category_id     INTEGER REFERENCES categories(id),
    brand_id        INTEGER REFERENCES brands(id),
    ean             VARCHAR(14),
    identifiers     JSONB,
    attribute_observations JSONB,
    source          VARCHAR(32)  NOT NULL,                     -- 'scraper'|'admin'|'shop_manual'|'shop_upload'|'spotted'
    source_url      TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE items ADD CONSTRAINT ck_items_item_type
    CHECK (item_type IN ('product', 'service'));
ALTER TABLE items ADD CONSTRAINT ck_items_status
    CHECK (status IN ('active', 'inactive'));
ALTER TABLE items ADD CONSTRAINT ck_items_source
    CHECK (source IN ('scraper', 'admin', 'shop_manual', 'shop_upload', 'spotted'));

-- Indizes
CREATE UNIQUE INDEX ix_items_slug         ON items(slug);
CREATE        INDEX ix_items_ean          ON items(ean);
CREATE        INDEX ix_items_category_id  ON items(category_id);
CREATE        INDEX ix_items_brand_id     ON items(brand_id);
CREATE        INDEX ix_items_status       ON items(status);
```

**Hinweis:** Das `attributes`-JSONB-Feld aus `products` entfällt in `items` — Attribute sind jetzt ausschließlich in `item_attributes` gespeichert. Das `images`-JSONB-Feld aus `products` entfällt ebenfalls — Fotos wandern nach `item_photos`. Beide Daten werden im Rahmen der Migration übertragen (siehe §2).

### 1.2 Neue Tabelle: `item_attributes`

Ersetzt `product_attributes`. Felder aus `ingestor/models/product_attribute.py` (`ProductAttribute`-Klasse) 1:1 übernommen, FK-Umbenennung von `product_id` → `item_id`.

```sql
CREATE TABLE item_attributes (
    id              SERIAL PRIMARY KEY,
    item_id         INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    attribute_key   VARCHAR(100) NOT NULL,
    attribute_value JSONB,
    source          VARCHAR(50),
    confidence      FLOAT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_item_attr_key UNIQUE (item_id, attribute_key)
);

CREATE INDEX ix_item_attributes_item_id ON item_attributes(item_id);
```

### 1.3 Neue Tabelle: `item_photos`

Ersetzt `shop_owner_product_images` (für den globalen Item-Kontext). Übernimmt das Multi-Varianten-URL-Schema aus `ingestor/models/shop_owner_product_image.py`.

```sql
CREATE TABLE item_photos (
    id                      SERIAL PRIMARY KEY,
    item_id                 INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    contributed_by_shop_id  INTEGER REFERENCES shops(id) ON DELETE SET NULL,
    url                     TEXT    NOT NULL,   -- card-Variante (primäre Anzeige-URL)
    url_thumb               TEXT,
    url_card                TEXT,
    url_carousel            TEXT,
    url_detail              TEXT,
    url_orig                TEXT,
    thumbnail_url           TEXT,               -- Alias für url_thumb, für einfache API-Responses
    sort_order              INTEGER NOT NULL DEFAULT 0,
    sha256                  CHAR(64),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ux_item_photos_item_sort
        UNIQUE (item_id, sort_order) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX ix_item_photos_item_id  ON item_photos(item_id);
CREATE INDEX ix_item_photos_sha256   ON item_photos(sha256);
```

**Limit-Enforcement:** Max. 8 Fotos pro Item wird in der Business-Logic-Schicht erzwungen (analog zu `MAX_IMAGES_PER_PRODUCT = 8` in `ingestor/api/shop_owner_products.py`), mit `SELECT FOR UPDATE` gegen Race-Conditions.

### 1.4 Neue Tabelle: `shop_listings`

Junction-Tabelle zwischen `items` und `shops`.

```sql
CREATE TABLE shop_listings (
    id          SERIAL PRIMARY KEY,
    item_id     INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    shop_id     INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    available   BOOLEAN NOT NULL DEFAULT true,
    source      VARCHAR(32) NOT NULL,
    sku         VARCHAR(128),
    shop_url    TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_shop_listing_item_shop UNIQUE (item_id, shop_id),
    CONSTRAINT ck_shop_listings_source
        CHECK (source IN ('scraper', 'admin', 'shop_manual', 'shop_upload', 'spotted'))
);

CREATE INDEX ix_shop_listings_item_id  ON shop_listings(item_id);
CREATE INDEX ix_shop_listings_shop_id  ON shop_listings(shop_id);
CREATE INDEX ix_shop_listings_sku      ON shop_listings(shop_id, sku) WHERE sku IS NOT NULL;
```

**Hinweis zum UNIQUE-Constraint:** Ein Shop kann ein Item nur einmal listen. Falls ein Scraper dieselbe Kombination ein zweites Mal sendet, wird das ShopListing aktualisiert (nicht dupliziert), aber ein neues Offer angelegt.

### 1.5 Neue Tabelle: `shop_listing_attributes`

Shop-spezifische Zusatzattribute an der Verknüpfung. Erlaubte Keys werden durch `category_attribute_definitions` (Tabelle `ingestor/models/category_attribute.py`) des zugehörigen Items vorgegeben.

```sql
CREATE TABLE shop_listing_attributes (
    id                  SERIAL PRIMARY KEY,
    shop_listing_id     INTEGER NOT NULL REFERENCES shop_listings(id) ON DELETE CASCADE,
    attribute_key       VARCHAR(100) NOT NULL,
    attribute_value     JSONB,
    CONSTRAINT uq_shop_listing_attr_key UNIQUE (shop_listing_id, attribute_key)
);

CREATE INDEX ix_shop_listing_attributes_listing_id ON shop_listing_attributes(shop_listing_id);
```

### 1.6 Neue Tabelle: `offers` (unified)

Ersetzt sowohl `offers` (Scraper) als auch `shop_owner_offers`. Die `price_tiers`-Struktur wird als JSONB eingebettet (kein separates Subtabellen-Schema für Offers), weil Offers immutable/archiviert sind — kein In-Place-Update nötig.

```sql
CREATE TABLE offers (
    id               SERIAL PRIMARY KEY,
    shop_listing_id  INTEGER NOT NULL REFERENCES shop_listings(id) ON DELETE RESTRICT,
    title            VARCHAR(512),
    description      TEXT,
    price_type       VARCHAR(16) NOT NULL DEFAULT 'fixed',
    price_tiers      JSONB NOT NULL DEFAULT '[]',
    currency         VARCHAR(3)  NOT NULL DEFAULT 'EUR',
    valid_from       DATE,
    valid_until      DATE,
    source           VARCHAR(32) NOT NULL,
    offer_url        TEXT,
    archived         BOOLEAN NOT NULL DEFAULT false,
    crawled_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_offers_price_type
        CHECK (price_type IN ('fixed', 'on_request', 'free', 'variable')),
    CONSTRAINT ck_offers_source
        CHECK (source IN ('scraper', 'admin', 'shop_manual', 'shop_upload', 'spotted'))
);

CREATE INDEX ix_offers_shop_listing_id  ON offers(shop_listing_id);
CREATE INDEX ix_offers_source           ON offers(source);
CREATE INDEX ix_offers_archived         ON offers(archived) WHERE archived = false;
CREATE INDEX ix_offers_valid_range      ON offers(valid_from, valid_until)
    WHERE archived = false;
```

**`price_tiers` JSONB-Format** (analog zu `PriceTier`/`PriceTierStep` aus `ingestor/models/price_tier.py`):

```json
[
  {
    "unit": "piece",
    "unit_label_custom": null,
    "steps": [
      {"min_quantity": 1, "max_quantity": null, "price": "9.99", "currency": "EUR"}
    ]
  }
]
```

---

## 2. Migration

### 2.1 Überblick

Die bestehende Alembic-Migration liegt in `ingestor/db/migrations/`. Die jüngste Migration ist `i2c3d4e5f6a7_merge_heads_for_product_images.py`. Die neue Migration erstellt eine neue Revisions-Datei mit dem Schema-Wechsel.

**Migrationsziel:**
- `products` → `items` (Umbenennung + strukturelle Anpassung)
- `product_attributes` → `item_attributes` (`product_id` → `item_id`)
- `offers` (Scraper-Tabelle) → `shop_listings` + neue `offers`-Tabelle
- `shop_owner_products` und `shop_owner_offers` → **verworfen** (Testdaten)

### 2.2 Schritt-für-Schritt Alembic-Plan

**Neue Migrations-Datei:** `ingestor/db/migrations/versions/j3d4e5f6a7b8_unified_item_offer_model.py`

```python
# Revisions: down_revision = 'i2c3d4e5f6a7'
```

**Phase 1 — Neue Tabellen anlegen** (ohne Daten, ohne FK-Konflikte):
```sql
CREATE TABLE items ( ... );              -- §1.1
CREATE TABLE item_attributes ( ... );   -- §1.2
CREATE TABLE item_photos ( ... );       -- §1.3
CREATE TABLE shop_listings ( ... );     -- §1.4
CREATE TABLE shop_listing_attributes ();-- §1.5
-- offers: Umbenennung der alten Tabelle, neue Struktur in Phase 3
```

**Phase 2 — Daten kopieren:**

```sql
-- 2a. products → items (alle Felder 1:1 außer images/attributes)
INSERT INTO items (id, slug, item_type, status, names, descriptions,
                   category_id, brand_id, ean, identifiers,
                   attribute_observations, source, source_url, created_at, updated_at)
SELECT id, slug, item_type, status, names, descriptions,
       category_id, brand_id, ean, identifiers,
       attribute_observations,
       COALESCE(source, 'scraper'),   -- source war nullable in products
       source_url, created_at, updated_at
FROM products;

-- 2b. product_attributes → item_attributes
INSERT INTO item_attributes (id, item_id, attribute_key, attribute_value,
                              source, confidence, created_at, updated_at)
SELECT id, product_id, attribute_key, attribute_value,
       source, confidence, created_at, updated_at
FROM product_attributes;

-- 2c. products.images (JSONB-Array) → item_photos
-- Jedes Element in products.images wird eine Zeile in item_photos.
-- Das Feld contributed_by_shop_id bleibt NULL (Scraper-Bilder gehören keinem Shop).
INSERT INTO item_photos (item_id, contributed_by_shop_id, url, thumbnail_url, sort_order)
SELECT
    p.id,
    NULL,
    img->>'url',
    CASE WHEN img->>'variants' IS NOT NULL
         THEN img->'variants'->>'thumb'
         ELSE NULL
    END,
    ordinality - 1
FROM products p,
     jsonb_array_elements(COALESCE(p.images, '[]'::jsonb)) WITH ORDINALITY AS t(img, ordinality)
WHERE img->>'url' IS NOT NULL;

-- 2d. offers (Scraper, alte Tabelle) → shop_listings + neue offers
-- Für jeden (product_id, shop_id) Pair wird ein ShopListing angelegt.
-- Duplikate bei mehreren Offers für dasselbe (product_id, shop_id)-Paar:
-- ON CONFLICT DO NOTHING beim ShopListing.
INSERT INTO shop_listings (item_id, shop_id, available, source, sku, shop_url, created_at, updated_at)
SELECT DISTINCT ON (product_id, shop_id)
    product_id, shop_id,
    is_available,
    'scraper',
    sku,
    url,
    crawled_at,
    crawled_at
FROM offers_old   -- Alias für die alte offers-Tabelle vor Umbenennung
ORDER BY product_id, shop_id, crawled_at DESC
ON CONFLICT (item_id, shop_id) DO NOTHING;

-- 2e. Alle alten Scraper-Offers → neue offers-Tabelle
INSERT INTO offers (id, shop_listing_id, price_type, price_tiers, currency,
                    source, archived, crawled_at, created_at)
SELECT
    o.id,
    sl.id,
    o.price_type,
    CASE
        WHEN o.price IS NOT NULL THEN
            jsonb_build_array(
                jsonb_build_object(
                    'unit', 'piece',
                    'unit_label_custom', NULL,
                    'steps', jsonb_build_array(
                        jsonb_build_object(
                            'min_quantity', 1,
                            'max_quantity', NULL,
                            'price', o.price::text,
                            'currency', o.currency
                        )
                    )
                )
            )
        ELSE '[]'::jsonb
    END,
    o.currency,
    'scraper',
    false,
    o.crawled_at,
    o.crawled_at
FROM offers_old o
JOIN shop_listings sl ON sl.item_id = o.product_id AND sl.shop_id = o.shop_id;
```

**Phase 3 — Sequence anpassen** (damit neue Auto-IDs nicht mit migrierten IDs kollidieren):
```sql
SELECT setval('items_id_seq', (SELECT MAX(id) FROM items));
SELECT setval('item_attributes_id_seq', (SELECT MAX(id) FROM item_attributes));
SELECT setval('offers_id_seq', (SELECT MAX(id) FROM offers));
```

**Phase 4 — Alte Tabellen umbenennen / löschen:**
```sql
ALTER TABLE products RENAME TO products_deprecated;
ALTER TABLE product_attributes RENAME TO product_attributes_deprecated;
ALTER TABLE offers RENAME TO offers_deprecated;   -- erst nach Umschreiben der alten offers auf neue
DROP TABLE shop_owner_offers;       -- Testdaten, kein Backup nötig
DROP TABLE shop_owner_products;     -- Testdaten, kein Backup nötig
DROP TABLE price_tiers;             -- Testdaten, gehörte zu shop_owner_products
DROP TABLE price_tier_steps;        -- Testdaten, gehörte zu price_tiers
DROP TABLE shop_owner_product_images; -- Testdaten
```

**Hinweis:** `products_deprecated`, `product_attributes_deprecated`, `offers_deprecated` bleiben für einen Rollback-Zeitraum von 2 Wochen bestehen, danach Drop via separater Migration.

### 2.3 SpottedSubmission FK-Update

`ingestor/models/spotted.py` hat `product_id` und `offer_id` als FK. Nach Migration:
```sql
ALTER TABLE spotted_submissions RENAME COLUMN product_id TO item_id;
ALTER TABLE spotted_submissions ADD COLUMN shop_listing_id INTEGER REFERENCES shop_listings(id);
-- offer_id bleibt, zeigt jetzt auf neue offers-Tabelle
```

---

## 3. API-Endpoints

Alle Endpoints liegen unter Prefix `/api/v1/`. Auth via `require_shop_owner` (Cookie-basiert, bestehende Implementierung in `core/auth/shop_owner_dependency.py`).

### 3.1 Item-Suche

```
GET /api/v1/shop-owner/items
```

**Auth:** `require_shop_owner`

**Query-Parameter:**
```
q: str | None        # Freitext-Suche (Levenshtein, §6)
ean: str | None      # Exakter EAN-Match (Priorität vor q)
limit: int = 20      # max 50
lang: str = "de"     # aus Accept-Language-Header
```

**Request:** keine Body

**Response-Schema (Pydantic):**
```python
class ItemSearchResultSchema(BaseModel):
    id: int
    slug: str
    item_type: Literal["product", "service"]
    name: str           # lokalisiert nach lang-Parameter
    category_id: int | None
    ean: str | None
    photo_url: str | None

class ItemSearchResponse(BaseModel):
    items: list[ItemSearchResultSchema]
    total: int
    fuzzy_matches: list[ItemSearchResultSchema] = []
    # fuzzy_matches: gefüllt wenn q-Suche mit Levenshtein ähnliche Items findet
    # → Frontend zeigt FuzzyMatchWarning (§5.1 Frontend-Architektur)
```

**Logik:** EAN → exakter DB-Match auf `items.ean`; Freitext → Levenshtein via `rapidfuzz` (§6).

---

### 3.2 Item anlegen

```
POST /api/v1/shop-owner/items
```

**Auth:** `require_shop_owner`

**Request-Schema:**
```python
class ItemCreate(BaseModel):
    name_de: str                        # min_length=2, Pflicht
    item_type: Literal["product", "service"] = "product"
    category_id: int
    ean: str | None = None              # 8–14 Zeichen numerisch
    brand_id: int | None = None

    @field_validator("ean")
    @classmethod
    def validate_ean(cls, v):
        if v is not None and (not v.isdigit() or not 8 <= len(v) <= 14):
            raise ValueError("EAN muss 8–14 Ziffern haben")
        return v
```

**Response-Schema:**
```python
class ItemResponse(BaseModel):
    id: int
    slug: str
    item_type: str
    status: str
    names: dict[str, str]
    descriptions: dict[str, str] | None
    category_id: int | None
    brand_id: int | None
    ean: str | None
    source: str
    photos: list[ItemPhotoResponse]
    created_at: datetime
```

**Logik:**
1. Fuzzy-Check vor Anlage: `rapidfuzz.fuzz.token_sort_ratio` gegen alle Items in gleicher Kategorie. Wenn Score ≥ 85: Response HTTP 409 mit `similar_items: list[ItemSearchResultSchema]`.
2. Slug generieren via `slugify` (analog `_generate_slug` in `ingestor/ingestion/product_processor.py`).
3. `source = 'shop_manual'`, `names = {"de": name_de}`.

**HTTP-Fehler:**
- `409 Conflict` + Body `{"detail": "fuzzy_match", "similar_items": [...]}` wenn Levenshtein-Schwellwert unterschritten.
- `422` bei Validierungsfehlern.

---

### 3.3 Item-Details abrufen

```
GET /api/v1/shop-owner/items/{item_id}
```

**Auth:** `require_shop_owner`

**Response:** `ItemResponse` (§3.2)

---

### 3.4 Item-Attribute abrufen

```
GET /api/v1/shop-owner/items/{item_id}/attributes
```

**Auth:** `require_shop_owner`

**Response-Schema:**
```python
class ItemAttributeResponse(BaseModel):
    id: int
    attribute_key: str
    attribute_value: Any
    source: str | None
    confidence: float | None

class ItemAttributeListResponse(BaseModel):
    items: list[ItemAttributeResponse]
```

---

### 3.5 Item-Fotos hochladen

```
POST /api/v1/shop-owner/items/{item_id}/photos
```

**Auth:** `require_shop_owner`

**Request:** `multipart/form-data`, Feld `file: UploadFile`
- MIME: `image/jpeg`, `image/png`, `image/webp`
- Max-Size: 5 MB (analog `_IMAGE_MAX_BYTES` in `ingestor/api/shop_owner_products.py`)
- Max-Fotos: 8 pro Item (SELECT FOR UPDATE gegen Race-Conditions)

**Response-Schema:**
```python
class ItemPhotoResponse(BaseModel):
    id: int
    url: str
    thumbnail_url: str | None
    sort_order: int
    contributed_by_shop_id: int | None
```

**Logik:** Exakt wie `upload_product_image` in `ingestor/api/shop_owner_products.py`, jedoch:
- `item_id` statt `product_id`
- Kein ShopOwner-Ownership-Check auf dem Item selbst (Item ist global), aber `contributed_by_shop_id = owner.shop_id` setzen.

---

### 3.6 Item-Foto löschen

```
DELETE /api/v1/shop-owner/items/{item_id}/photos/{photo_id}
```

**Auth:** `require_shop_owner`

**Logik:** Nur Fotos mit `contributed_by_shop_id == owner.shop_id` dürfen gelöscht werden. Admin-Fotos (`contributed_by_shop_id IS NULL`) sind nicht löschbar via Shop-Owner-API.

---

### 3.7 Item-Foto als Hauptfoto setzen

```
PATCH /api/v1/shop-owner/items/{item_id}/photos/{photo_id}
```

**Auth:** `require_shop_owner`

**Request-Schema:**
```python
class ItemPhotoPatch(BaseModel):
    sort_order: int | None = None
```

Setzt `sort_order = 0` auf dem gewünschten Foto und schiebt alle anderen um +1 hoch (atomares Update mit DEFERRABLE CONSTRAINT).

---

### 3.8 ShopListings auflisten

```
GET /api/v1/shop-owner/shop-listings
```

**Auth:** `require_shop_owner` → filtert automatisch auf `shop_id = owner.shop_id`

**Query-Parameter:**
```
q: str | None       # Freitext-Suche im Item-Namen
limit: int = 20
offset: int = 0
lang: str = "de"
```

**Response-Schema:**
```python
class ShopListingItemEmbedded(BaseModel):
    id: int
    slug: str
    item_type: str
    name: str           # lokalisiert
    category_id: int | None
    ean: str | None
    photo_url: str | None
    status: str

class ShopListingResponse(BaseModel):
    id: int
    item_id: int
    shop_id: int
    item: ShopListingItemEmbedded
    available: bool
    source: str
    sku: str | None
    shop_url: str | None
    created_at: datetime
    # aktuelles (nicht archiviertes) Offer — kann null sein
    current_offer: OfferResponse | None

class ShopListingListResponse(BaseModel):
    items: list[ShopListingResponse]
    total: int
```

---

### 3.9 ShopListing anlegen

```
POST /api/v1/shop-owner/shop-listings
```

**Auth:** `require_shop_owner`

**Request-Schema:**
```python
class ShopListingCreate(BaseModel):
    item_id: int
    sku: str | None = None
    shop_url: str | None = None
    available: bool = True
```

**Response:** `ShopListingResponse` (§3.8)

**Logik:**
- `source = 'shop_manual'`
- `shop_id = owner.shop_id`
- Falls `(item_id, shop_id)` bereits existiert: HTTP 409 + `{"detail": "listing_exists", "shop_listing_id": <id>}` → Frontend kann direkt zur Offer-Erstellung springen.
- Falls `Item.status = 'inactive'`: ShopListing darf trotzdem angelegt werden (Design-Entscheidung §8 aus 01-design.md).

---

### 3.10 ShopListing abrufen

```
GET /api/v1/shop-owner/shop-listings/{listing_id}
```

**Auth:** `require_shop_owner` + Ownership-Check (`shop_id == owner.shop_id`)

**Response:** `ShopListingResponse` (§3.8)

---

### 3.11 ShopListing aktualisieren

```
PATCH /api/v1/shop-owner/shop-listings/{listing_id}
```

**Auth:** `require_shop_owner` + Ownership-Check

**Request-Schema:**
```python
class ShopListingPatch(BaseModel):
    available: bool | None = None
    sku: str | None = None
    shop_url: str | None = None
```

Nur diese drei Felder sind patch-bar (Item-Wechsel wird durch Neu-Anlage eines ShopListings gelöst, nicht durch Patch).

**Response:** `ShopListingResponse`

---

### 3.12 ShopListing löschen

```
DELETE /api/v1/shop-owner/shop-listings/{listing_id}
```

**Auth:** `require_shop_owner` + Ownership-Check

**Logik:** Vor dem Löschen prüfen ob aktive (nicht-archivierte) Offers existieren. Wenn ja: HTTP 409 → Shop-Owner muss Offers zuerst archivieren. Cascades archivieren Offers nicht automatisch — explizite UI-Rückmeldung bevorzugt.

---

### 3.13 ShopListing-Attribute abrufen

```
GET /api/v1/shop-owner/shop-listings/{listing_id}/attributes
```

**Auth:** `require_shop_owner` + Ownership-Check

**Response:**
```python
class ShopListingAttributeResponse(BaseModel):
    id: int
    attribute_key: str
    attribute_value: Any

class ShopListingAttributeListResponse(BaseModel):
    items: list[ShopListingAttributeResponse]
    # Erlaubte Keys aus CategoryAttributeDefinition des zugehörigen Items
    allowed_keys: list[str]
```

---

### 3.14 Offers auflisten (erweitert)

```
GET /api/v1/shop-owner/offers
```

Bestehender Endpoint (`ingestor/api/shop_owner_offers.py`) wird erweitert.

**Auth:** `require_shop_owner`

**Query-Parameter:**
```
archived: bool | None   # None = nur aktive
source: str | None      # Filter nach source-Feld
limit: int = 20
offset: int = 0
lang: str = "de"
```

**Response-Schema** (erweitert gegenüber bestehendem `OfferListResponse`):
```python
class OfferResponse(BaseModel):
    id: int
    shop_listing_id: int
    title: str | None
    description: str | None
    price_type: str
    price_tiers: list[dict]     # PriceTier-Struktur als JSONB
    currency: str
    valid_from: date | None
    valid_until: date | None
    source: str
    offer_url: str | None
    archived: bool
    crawled_at: datetime | None
    created_at: datetime
    # Embedded Item-Name für Listenansicht
    item_name: str | None       # aus ShopListing → Item.names[lang]

class OfferListResponse(BaseModel):
    items: list[OfferResponse]
    total: int
```

---

### 3.15 Offer anlegen (unified)

```
POST /api/v1/shop-owner/offers
```

**Auth:** `require_shop_owner`

**Request-Schema:**
```python
class OfferCreate(BaseModel):
    shop_listing_id: int                    # Pflicht (kein product_id mehr)
    title: str | None = None
    description: str | None = None
    price_type: Literal["fixed", "on_request", "free", "variable"] = "fixed"
    price_tiers: list[PriceTierCreate] = [] # PriceTierCreate: unit + steps
    currency: str = "EUR"
    valid_from: date | None = None
    valid_until: date | None = None
    offer_url: str | None = None
```

**Response:** `OfferResponse` (§3.14)

**Logik:**
1. Ownership-Check: `ShopListing.shop_id == owner.shop_id`
2. Preishistorie: Wenn bereits ein nicht-archiviertes Offer mit `source in ('shop_manual', 'shop_upload', 'admin')` existiert → altes archivieren, neues anlegen.
3. Wenn bereits ein nicht-archiviertes Offer mit `source in ('scraper', 'spotted')` existiert → archivieren, neues mit `source='shop_manual'` anlegen (Edge Case A2 aus Design).
4. `source = 'shop_manual'`

---

### 3.16 Offer aktualisieren

```
PATCH /api/v1/shop-owner/offers/{offer_id}
```

**Auth:** `require_shop_owner`

**Request-Schema:**
```python
class OfferPatch(BaseModel):
    title: str | None = None
    description: str | None = None
    price_type: str | None = None
    price_tiers: list[PriceTierCreate] | None = None
    currency: str | None = None
    valid_from: date | None = None
    valid_until: date | None = None
    offer_url: str | None = None
    archived: bool | None = None
```

**Preishistorie-Logik:** Bei jeder Änderung an `price_tiers`, `price_type` oder `currency` wird das aktuelle Offer archiviert und ein neues angelegt (immutable + archive-on-change). Das bestehende Offer wird also **nicht** in-place gepatcht, sondern:
1. Altes Offer: `archived = true`
2. Neues Offer: alle Felder übernommen + Änderungen aus Patch

Bei Änderungen nur an `title`, `description`, `offer_url`, `valid_from`, `valid_until`: In-Place-Update ist akzeptabel (keine Preisänderung → keine Preishistorie nötig).

---

### 3.17 Offer löschen

```
DELETE /api/v1/shop-owner/offers/{offer_id}
```

Bestehende Logik aus `ingestor/api/shop_owner_offers.py` bleibt: nur archivierte oder abgelaufene Offers dürfen gelöscht werden.

---

### 3.18 Kunden-API (Compat-Layer — keine neuen Endpoints)

Die Endpoints `GET /api/v1/products`, `GET /api/v1/products/{slug}`, `GET /api/v1/shops` in `ingestor/api/product_query.py` und `ingestor/api/shop_query.py` bleiben erhalten und erhalten einen **Backend-Serializer**, der aus den neuen Tabellen die bisherige Response-Form baut.

**Änderung in `product_query.py`:** `FROM products` → `FROM items`; alle Feld-Aliases beibehalten. Das `thumbnail`-Feld wird aus `item_photos WHERE sort_order = 0` gelesen statt aus `products.images`.

---

## 4. Scraper-Adapter

### 4.1 Ziel

Der Scraper sendet weiterhin an `POST /api/v1/products/intake/batch`. Der Endpoint-Vertrag (Datei: `ingestor/api/product_intake.py`, Schema: `ingestor/schemas/product_intake.py`) bleibt **unverändert**. Ein Adapter-Layer in `ingestor/ingestion/product_processor.py` schreibt die eingehenden Daten auf die neuen Tabellen.

### 4.2 Mapping-Tabelle

| Scraper-Payload-Feld (`IntakeProductData`) | Neue Tabelle / Feld |
|--------------------------------------------|---------------------|
| `data.name`, `data.description` | `items.names[source_lang]`, `items.descriptions[source_lang]` |
| `data.ean` | `items.ean` |
| `data.brand_name` | `items.brand_id` (via `resolve_or_create_brand`) |
| `data.category_path` | `items.category_id` (via Category-Matcher) |
| `data.product_url` | `items.source_url` + `shop_listings.shop_url` |
| `data.image_urls` | `item_photos` (Zeilen für jede URL, `contributed_by_shop_id=NULL`) |
| `data.attributes` | `item_attributes` (normalisiert via `normalize_attributes`) |
| `data.sku` | `shop_listings.sku` |
| `data.is_available` / `data.stock_status` | `shop_listings.available` |
| `data.price`, `data.price_type`, `data.currency` | `offers.price_tiers` (JSONB), `offers.price_type`, `offers.currency` |
| `data.price_note` | `offers.description` |
| `request.scraped_at` | `offers.crawled_at` |
| `request.source` | `items.source`, `shop_listings.source`, `offers.source` |

### 4.3 Umbau `process_product_intake`

**Datei:** `ingestor/ingestion/product_processor.py`

Die Funktion `process_product_intake` wird umgebaut. Neue Schritte:

1. Shop-Resolution: unverändert (`resolve_shop`)
2. Language-Detection: unverändert
3. Brand-Resolution: unverändert
4. Attribute-Normalisierung: unverändert (`normalize_attributes`)
5. **Dedup-Check:** `find_duplicate` bleibt, arbeitet jetzt auf `items`-Tabelle (FK-Änderung in `product_dedup.py`)
6. **Item anlegen** (wenn kein Duplikat): `Item(...)` statt `Product(...)`; Fotos via `item_photos`; Attribute via `item_attributes`
7. **ShopListing anlegen oder upsert:** `INSERT INTO shop_listings ... ON CONFLICT (item_id, shop_id) DO UPDATE SET available=..., sku=..., shop_url=..., source='scraper'`
8. **Offer anlegen** (immer, append-only für `source='scraper'`):
   - Erst Scraper-Schutzregel prüfen (§7)
   - Offer anlegen mit `price_tiers` JSONB aus `data.price`

**Response-Schema `ProductIntakeResponse`** wird erweitert:
```python
class ProductIntakeResponse(BaseModel):
    status: Literal["accepted", "duplicate", "rejected"]
    product_id: int | None = None       # Legacy-Feld bleibt (= item_id)
    item_id: int | None = None          # Neu (Alias für product_id)
    shop_listing_id: int | None = None  # Neu
    offer_id: int | None = None
    shop_id: int | None = None
    brand_id: int | None = None
    category_id: int | None = None
    flags: list[str] = []
    reason: str | None = None
```

### 4.4 Umbau `find_duplicate`

**Datei:** `ingestor/ingestion/product_dedup.py`

- `FROM products` → `FROM items`
- `Product.ean` → `Item.ean`
- `Product.names` → `Item.names`
- `Product.brand_id` → `Item.brand_id`
- `Product.attributes` entfällt (Attribute jetzt in `item_attributes`) → Variant-Fingerprint aus `item_attributes`-Join bauen statt aus `products.attributes`-JSONB
- `Offer.sku` + `Offer.shop_id` → `shop_listings.sku` + `shop_listings.shop_id`
- `rapidfuzz` bleibt (bereits als Dependency vorhanden, `_FUZZY_THRESHOLD = 92` bleibt für Dedup-Zwecke)

---

## 5. Spotted-Worker

**Datei:** `ingestor/workers/spotted_worker.py`

### 5.1 Umbau `_find_or_create_product` → `_find_or_create_item`

```python
def _find_or_create_item(
    session,
    product_name: str,
    language: str,
    vision: dict,
) -> tuple[Item, ShopListing]:
    """
    Gibt (item, shop_listing) zurück.
    shop_listing ist entweder neu angelegt oder bereits vorhanden.
    Wird nach shop-Match aufgerufen → shop.id verfügbar.
    """
    # 1. Exakter Name-Match in items.names[language]
    existing_item = session.execute(
        select(Item).where(
            func.lower(Item.names[language].astext) == product_name.lower()
        ).limit(1)
    ).scalar_one_or_none()

    if not existing_item:
        # Brand resolven (analog bisheriger Logik)
        brand_id = _resolve_brand(session, vision.get("brand"))
        # Neues Item anlegen (source='spotted')
        for _ in range(3):
            slug = f"spotted-{slugify(product_name)}-{uuid4().hex[:6]}"
            item = Item(slug=slug, names={language: product_name},
                       source="spotted", brand_id=brand_id,
                       item_type="product", status="active")
            session.add(item)
            try:
                session.flush()
                break
            except IntegrityError:
                session.rollback()
        existing_item = item

    # 2. ShopListing anlegen oder wiederverwenden
    # shop.id ist als Parameter aus _store_results verfügbar
    return existing_item
    # ShopListing wird in _store_results angelegt (braucht shop.id)
```

### 5.2 Umbau `_store_results`

```python
def _store_results(session, spotted, vision, lat, lng, language):
    # ... (Vision-Felder setzen, shop-Match wie bisher)

    # Item finden/anlegen
    item = _find_or_create_item(session, product_name, language, vision)
    spotted.item_id = item.id   # neues Feld nach FK-Umbenennung

    # ShopListing anlegen oder wiederverwenden
    shop_listing = session.execute(
        select(ShopListing).where(
            ShopListing.item_id == item.id,
            ShopListing.shop_id == shop.id
        )
    ).scalar_one_or_none()

    if shop_listing is None:
        shop_listing = ShopListing(
            item_id=item.id,
            shop_id=shop.id,
            available=True,
            source="spotted",
        )
        session.add(shop_listing)
        session.flush()

    spotted.shop_listing_id = shop_listing.id   # neues Feld

    # Offer — nur wenn Preis erkannt
    if spotted.detected_price is not None:
        offer = Offer(
            shop_listing_id=shop_listing.id,
            price_type="fixed",
            price_tiers=[{
                "unit": "piece",
                "unit_label_custom": None,
                "steps": [{"min_quantity": 1, "max_quantity": None,
                           "price": str(spotted.detected_price),
                           "currency": spotted.detected_currency or "EUR"}]
            }],
            currency=spotted.detected_currency or "EUR",
            source="spotted",
            archived=False,
            crawled_at=datetime.now(timezone.utc),
        )
        session.add(offer)
        session.flush()
        spotted.offer_id = offer.id
```

### 5.3 Modell-Änderungen `ingestor/models/spotted.py`

```python
# Umbenennung / neue FKs
item_id: Mapped[Optional[int]] = mapped_column(
    ForeignKey("items.id", ondelete="SET NULL"), nullable=True
)
shop_listing_id: Mapped[Optional[int]] = mapped_column(
    ForeignKey("shop_listings.id", ondelete="SET NULL"), nullable=True
)
# offer_id bleibt, zeigt auf neue offers-Tabelle
# product_id wird via Alembic umbenannt zu item_id (§2.3)
```

---

## 6. Levenshtein-Fuzzy-Match

### 6.1 Library

**Bereits im Projekt:** `rapidfuzz` ist als Dependency vorhanden (Import in `ingestor/ingestion/product_dedup.py`).

Keine neue Dependency nötig. `rapidfuzz` ist schneller als `python-Levenshtein` und funktional identisch.

### 6.2 Verwendung im Item-Such-Endpoint

**Datei (neu):** `ingestor/ingestion/item_search.py`

```python
from rapidfuzz import fuzz, process

_FUZZY_SEARCH_THRESHOLD = 60   # Schwellwert für Suche (niedrig = mehr Treffer)
_FUZZY_BLOCK_THRESHOLD  = 85   # Schwellwert für Hard-Block (neu anlegen)

def search_items(
    q: str,
    lang: str,
    session: Session,
    limit: int = 20,
) -> tuple[list[Item], list[Item]]:
    """
    Gibt (direkte_treffer, fuzzy_matches) zurück.
    direkte_treffer: Items mit Score >= FUZZY_BLOCK_THRESHOLD
    fuzzy_matches:   Items mit Score >= FUZZY_SEARCH_THRESHOLD (und < BLOCK_THRESHOLD)
                     → Frontend zeigt diese als Warnung beim Neu-Anlegen-Versuch
    """
    candidates = session.execute(
        select(Item.id, Item.names, Item.slug, Item.item_type,
               Item.category_id, Item.ean, Item.status)
        .where(Item.status == "active")
    ).all()

    q_lower = q.lower()
    results_above_block = []
    results_fuzzy_only  = []

    for row in candidates:
        name = (row.names or {}).get(lang) or (row.names or {}).get("de") or ""
        if not name:
            continue
        score = fuzz.token_sort_ratio(q_lower, name.lower())
        if score >= _FUZZY_BLOCK_THRESHOLD:
            results_above_block.append((score, row))
        elif score >= _FUZZY_SEARCH_THRESHOLD:
            results_fuzzy_only.append((score, row))

    results_above_block.sort(key=lambda x: x[0], reverse=True)
    results_fuzzy_only.sort(key=lambda x: x[0], reverse=True)

    direct = [row for _, row in results_above_block[:limit]]
    fuzzy  = [row for _, row in results_fuzzy_only[:10]]  # max 10 Warnungen
    return direct, fuzzy
```

### 6.3 Hard-Block-Mechanismus

Beim `POST /api/v1/shop-owner/items` (§3.2): Vor der Anlage wird `search_items(name_de, ...)` aufgerufen. Wenn `direct`-Liste nicht leer → HTTP 409 mit `similar_items`. Das Frontend blockiert die Neu-Anlage und zeigt die ähnlichen Items.

Der Shop-Owner kann erst dann ein neues Item anlegen, wenn er explizit alle vorgeschlagenen Items dismisst (Frontend-seitige Logik, Backend akzeptiert den Create-Request ohne weitere Prüfung wenn der Request den Parameter `confirmed=true` enthält).

```python
# Im POST /items Handler:
class ItemCreate(BaseModel):
    ...
    confirmed: bool = False   # True wenn User Fuzzy-Warning bereits gesehen+dismissed

# Logik:
if not body.confirmed:
    direct, fuzzy = search_items(body.name_de, lang, session)
    if direct:
        raise HTTPException(status_code=409, detail={
            "code": "fuzzy_match",
            "similar_items": [serialize_item(i) for i in direct]
        })
```

---

## 7. Scraper-Schutzregel

### 7.1 Implementierungsort

**Business-Logic-Layer** in `ingestor/ingestion/product_processor.py`, nicht als DB-Constraint. Grund: Die Regel erfordert eine Query auf das aktuelle (nicht-archivierte) Offer — das ist in einem CHECK-Constraint nicht darstellbar.

### 7.2 Logik

```python
def _should_scraper_overwrite_offer(
    item_id: int,
    shop_id: int,
    session: Session,
) -> bool:
    """
    Gibt True zurück wenn der Scraper ein neues Offer anlegen darf.
    Gibt False zurück wenn ein manuelles/admin-geschütztes Offer existiert.
    """
    existing = session.execute(
        select(Offer)
        .join(ShopListing, Offer.shop_listing_id == ShopListing.id)
        .where(
            ShopListing.item_id == item_id,
            ShopListing.shop_id == shop_id,
            Offer.archived == False,
            Offer.source.in_(["shop_manual", "shop_upload", "admin"])
        )
        .limit(1)
    ).scalar_one_or_none()

    return existing is None   # True = darf überschreiben
```

### 7.3 Einbau in `process_product_intake`

Im Schritt "7. Create Offer" (nach Shop-Listing anlegen):
```python
if _should_scraper_overwrite_offer(item_id, shop_id, session):
    # Altes Scraper-Offer archivieren (falls vorhanden)
    old_offer = session.execute(
        select(Offer)
        .join(ShopListing, ...)
        .where(..., Offer.source.in_(["scraper", "spotted"]),
               Offer.archived == False)
    ).scalar_one_or_none()
    if old_offer:
        old_offer.archived = True

    # Neues Offer anlegen
    offer = Offer(shop_listing_id=..., source="scraper", ...)
    session.add(offer)
else:
    # Geschütztes Offer vorhanden → kein neues anlegen, nur ShopListing updaten
    logger.info("scraper_offer_blocked_by_manual source=shop_manual/shop_upload/admin")
    offer = None
```

### 7.4 DB-Constraint als zweite Verteidigungslinie

Zusätzlich zur Business-Logic wird ein partieller Index angelegt, der verhindert, dass zwei nicht-archivierte Offers für dasselbe ShopListing mit qualitativer Quelle gleichzeitig existieren (hilft beim Debugging):

```sql
CREATE UNIQUE INDEX uq_offers_active_manual_per_listing
    ON offers(shop_listing_id)
    WHERE archived = false
      AND source IN ('shop_manual', 'shop_upload', 'admin');
```

Dieser Unique-Index blockiert Race-Conditions, wo zwei parallele Requests dasselbe ShopListing schreiben wollen.

---

## 8. Preishistorie

### 8.1 Prinzip: Immutable Offers, Archive-on-Change

`offers`-Zeilen werden **nie** in-place geändert, wenn der Preis sich ändert. Jede Preisänderung:
1. Setzt `archived = true` auf dem alten Offer
2. Legt ein neues Offer an

Das `archived`-Flag ist der einzige mutable Boolean auf einer Offer-Zeile (neben nicht-preisrelevanten Metadaten wie `title`, `description`, `valid_from/until`, `offer_url` die in-place geändert werden dürfen).

### 8.2 Trigger: Wann wird archiviert?

| Auslöser | Verhalten |
|----------|-----------|
| Scraper sendet neuen Preis (source=scraper, kein Schutz) | Altes Scraper-Offer archiviert, neues angelegt |
| Shop-Owner patcht `price_tiers` oder `price_type` | Altes Offer archiviert, neues mit gleicher `source` angelegt |
| Shop-Owner übernimmt Scraper-Offer | Scraper-Offer archiviert, neues `source=shop_manual` angelegt |
| Admin ändert Preis | Altes archiviert, neues `source=admin` |

### 8.3 Preishistorie-Query

```sql
-- Aktuelle Preise für ein ShopListing
SELECT * FROM offers
WHERE shop_listing_id = :listing_id
  AND archived = false
ORDER BY created_at DESC
LIMIT 1;

-- Volle Preishistorie
SELECT * FROM offers
WHERE shop_listing_id = :listing_id
ORDER BY created_at DESC;
```

### 8.4 Archivierungslogik in `PATCH /offers/{offer_id}`

```python
# In ingestor/api/shop_owner_offers.py (Umbau)
PRICE_FIELDS = {"price_tiers", "price_type", "currency"}

price_changed = bool(body.model_fields_set & PRICE_FIELDS)

if price_changed:
    # Altes Offer archivieren, neues anlegen
    offer.archived = True
    session.flush()
    new_offer = Offer(
        shop_listing_id=offer.shop_listing_id,
        title=body.title or offer.title,
        description=body.description if "description" in body.model_fields_set else offer.description,
        price_type=body.price_type or offer.price_type,
        price_tiers=body.price_tiers or offer.price_tiers,
        currency=body.currency or offer.currency,
        valid_from=body.valid_from if "valid_from" in body.model_fields_set else offer.valid_from,
        valid_until=body.valid_until if "valid_until" in body.model_fields_set else offer.valid_until,
        offer_url=body.offer_url if "offer_url" in body.model_fields_set else offer.offer_url,
        source=offer.source,   # source bleibt
        archived=False,
    )
    session.add(new_offer)
    session.commit()
    return _to_response(new_offer)
else:
    # Nur Metadaten-Felder — In-Place-Update
    if "title" in body.model_fields_set: offer.title = body.title
    # ... etc.
    session.commit()
    return _to_response(offer)
```

---

## 9. Risiken

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| `products` → `items` Umbenennung bricht bestehende Kunden-API | Hoch | Kritisch | Compat-Layer in `product_query.py` (§3.18); alte Tabelle bleibt als `products_deprecated` bis alle Queries umgestellt |
| Daten-Migration: Offer ohne passenden ShopListing-Eintrag | Mittel | Datenverlust | Migrationsskript loggt alle `orphan_offers` ohne shop-match; manuelle Review vor Drop |
| `rapidfuzz` Fuzzy-Match auf großem Item-Katalog (> 100k Items) zu langsam | Mittel | API-Timeout | In-Memory-Scan ist O(n); ab 50k Items auf PostgreSQL Full-Text-Search (`tsvector`) wechseln; Threshold vorerst mit Index-Vorfilter auf Kategorie einschränken |
| `SpottedSubmission.product_id` FK-Umbenennung bricht bestehende Spotted-Daten | Niedrig | Inkonsistenz | Alembic-Migration umbenennt die Spalte; bestehende Werte bleiben erhalten (nur Spaltenname ändert sich) |
| `UNIQUE INDEX uq_offers_active_manual_per_listing` blockiert Scraper-Batch unerwartet | Niedrig | Scraper-Fehler | Index greift nur auf `source IN ('shop_manual', 'shop_upload', 'admin')` → Scraper-Writes sind davon nicht betroffen |
| `price_tiers` als JSONB in `offers`: keine Typisierung auf DB-Ebene | Niedrig | Daten-Inkonsistenz | Pydantic-Schemas erzwingen Struktur auf API-Ebene; keine unstrukturierten Writes möglich |
| Import-Endpoint (`shop_owner_import.py`) schreibt noch auf alte Tabellen | Hoch | Import kaputt | T3 (Import-Umbau) muss vor Go-Live abgeschlossen sein |
| Kein Rollback-Plan wenn Migration fehlschlägt | Mittel | Datenverlust | `products_deprecated`-Tabellen ermöglichen Rollback; Feature-Flag-Strategie (alte Endpoints parallel lassen bis FE deployed) |

---

## 10. Nummerierte Task-Liste (für Backend-Coder)

> Reihenfolge ist Abhängigkeitsreihenfolge. T1–T3 können nach DB-Migration parallel laufen.

**T1 — Alembic-Migration**
Datei: `ingestor/db/migrations/versions/j3d4e5f6a7b8_unified_item_offer_model.py`.
Phase 1–4 wie in §2.2 beschrieben. Daten-Migration sorgfältig: zuerst `items`, dann `item_attributes`, dann `item_photos`, dann `shop_listings`, dann `offers`. Sequences aktualisieren. `shop_owner_products`, `shop_owner_offers`, `price_tiers`, `price_tier_steps`, `shop_owner_product_images` droppen. `spotted_submissions.product_id` umbenennen zu `item_id` + neues Feld `shop_listing_id` hinzufügen (§2.3).

**T2 — SQLAlchemy-Modelle**
Neue Dateien: `ingestor/models/item.py` (ersetzt `product.py`), `ingestor/models/item_attribute.py` (ersetzt `product_attribute.py`), `ingestor/models/item_photo.py` (neu), `ingestor/models/shop_listing.py` (neu), `ingestor/models/shop_listing_attribute.py` (neu), `ingestor/models/unified_offer.py` (ersetzt `offer.py` und `shop_owner_offer.py`).
`ingestor/models/spotted.py` anpassen (§5.3).
`ingestor/models/__init__.py` aktualisieren.

**T3 — Pydantic-Schemas**
Neue/erweiterte Schemas in `ingestor/schemas/shop_owner.py`: `ItemCreate`, `ItemResponse`, `ItemPhotoResponse`, `ItemPhotoPatch`, `ItemSearchResultSchema`, `ItemSearchResponse`, `ItemAttributeResponse`, `ItemAttributeListResponse`, `ShopListingCreate`, `ShopListingPatch`, `ShopListingResponse`, `ShopListingListResponse`, `ShopListingAttributeListResponse`.
`OfferCreate`, `OfferPatch`, `OfferResponse`, `OfferListResponse` ersetzen: `product_id` → `shop_listing_id`, `price: Decimal` → `price_tiers: list[dict]`.
`ProductIntakeResponse` erweitern um `item_id`, `shop_listing_id` (§4.3).

**T4 — Item-Such-Logik**
Neue Datei: `ingestor/ingestion/item_search.py` (§6.2).
Fuzzy-Search mit `rapidfuzz.fuzz.token_sort_ratio`, `_FUZZY_SEARCH_THRESHOLD = 60`, `_FUZZY_BLOCK_THRESHOLD = 85`.

**T5 — Dedup-Umbau**
`ingestor/ingestion/product_dedup.py`: `Product` → `Item`, Variant-Fingerprint aus `item_attributes`-Join statt `products.attributes`-JSONB. `Offer.sku` + `Offer.shop_id` → `ShopListing.sku` + `ShopListing.shop_id`.

**T6 — Neuer API-Router: `shop_owner_items.py`**
Neue Datei: `ingestor/api/shop_owner_items.py`.
Implementiert §3.1 (GET /items), §3.2 (POST /items), §3.3 (GET /items/{id}), §3.4 (GET /items/{id}/attributes), §3.5 (POST /items/{id}/photos), §3.6 (DELETE /items/{id}/photos/{photo_id}), §3.7 (PATCH /items/{id}/photos/{photo_id}).
In `ingestor/api/main.py` registrieren.

**T7 — Neuer API-Router: `shop_owner_shop_listings.py`**
Neue Datei: `ingestor/api/shop_owner_shop_listings.py`.
Implementiert §3.8–§3.13 (ShopListing CRUD + Attribute).
In `ingestor/api/main.py` registrieren.

**T8 — Bestehende Shop-Owner-Offers API umbauen**
`ingestor/api/shop_owner_offers.py`: `ShopOwnerOffer` → `Offer` (unified). `product_id` → `shop_listing_id`. Preishistorie-Logik (§8.4) einbauen. Scraper-Schutzregel (§7.3) für POST einbauen. Neue Query-Parameter `source` (§3.14).

**T9 — Import-Endpoint anpassen**
`ingestor/api/shop_owner_import.py`: Import-Logik schreibt auf `items` + `shop_listings` + `offers` (source=`shop_upload`) statt `shop_owner_products` + `shop_owner_offers`. EAN-Match gegen `items.ean`.

**T10 — Intake-Processor Umbau**
`ingestor/ingestion/product_processor.py`: `Product` → `Item`, `Offer` (alt) → `ShopListing` + `Offer` (unified). Scraper-Schutzregel (§7.2, §7.3) einbauen. Fotos via `item_photos`. Attribute via `item_attributes`.

**T11 — Spotted-Worker Umbau**
`ingestor/workers/spotted_worker.py`: `_find_or_create_product` → `_find_or_create_item` + ShopListing (§5.1, §5.2).

**T12 — Kunden-API Compat-Layer**
`ingestor/api/product_query.py`: `FROM products` → `FROM items`, Thumbnail aus `item_photos`. `ingestor/api/shop_query.py`: evtl. ShopListing-basierte Aggregation.

**T13 — Partieller Unique-Index anlegen** (§7.4): Separate kurze Alembic-Migration nach T1 (kann parallel zu T2–T12 deployed werden).

**T14 — Admin-API aktualisieren**
`ingestor/api/admin/` — alle `SysAdminProduct`-Endpoints auf Items umstellen, `SysAdminOffer` unified.

**T15 — Tests**
`ingestor/tests/`: bestehende `product`-Tests auf `item`-Fixtures umschreiben. Neue Tests für: Scraper-Schutzregel (AC-6, AC-7), Preishistorie (AC-5), Fuzzy-Block (AC-13), Foto-Limit (AC-8). Integrations-Tests für den vollständigen Intake-Flow (scraper → item + shop_listing + offer).

---

## Anhang: Datei-Referenzen Backend-Repo

| Datei | Rolle in dieser Migration |
|-------|--------------------------|
| `ingestor/models/product.py` | Wird ersetzt durch `ingestor/models/item.py` |
| `ingestor/models/offer.py` | Wird ersetzt durch `ingestor/models/unified_offer.py` |
| `ingestor/models/product_attribute.py` | Wird ersetzt durch `ingestor/models/item_attribute.py` |
| `ingestor/models/shop_owner_product.py` | Entfällt (Testdaten-Tabelle) |
| `ingestor/models/shop_owner_offer.py` | Entfällt (in unified_offer aufgegangen) |
| `ingestor/models/shop_owner_product_image.py` | Entfällt (durch `item_photo.py` ersetzt) |
| `ingestor/models/price_tier.py` | Entfällt (price_tiers als JSONB in offers) |
| `ingestor/models/spotted.py` | Angepasst (§5.3) |
| `ingestor/ingestion/product_processor.py` | Umbau T10 |
| `ingestor/ingestion/product_dedup.py` | Umbau T5 |
| `ingestor/api/product_intake.py` | Bleibt unverändert (Adapter-Layer) |
| `ingestor/api/shop_owner_products.py` | Entfällt (ersetzt durch `shop_owner_items.py`) |
| `ingestor/api/shop_owner_offers.py` | Umbau T8 |
| `ingestor/api/shop_owner_import.py` | Umbau T9 |
| `ingestor/api/main.py` | Router-Registrierung aktualisieren (T6, T7) |
| `ingestor/schemas/shop_owner.py` | Neue/geänderte Schemas T3 |
| `ingestor/schemas/product_intake.py` | `ProductIntakeResponse` erweitern T3 |
| `ingestor/workers/spotted_worker.py` | Umbau T11 |
| `ingestor/db/migrations/versions/` | Neue Migration T1, T13 |
