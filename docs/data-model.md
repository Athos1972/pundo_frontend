# Datenmodell (Frontend-Perspektive)

Das Frontend konsumiert Backend-Daten via REST-API. Alle TypeScript-Interfaces in `src/types/api.ts` und `src/types/shop-admin.ts` spiegeln die Backend-Response-Struktur.

**Backend-Referenz:** [`pundo_main_backend/docs/data-model.md`](../../pundo_main_backend/docs/data-model.md)

---

## Kern-Entitäten

### Shop (`ShopListItem` / `ShopDetailResponse`)

Ein Shop ist ein lokales Geschäft oder ein Online-Händler, der Produkte anbietet.

```typescript
// src/types/api.ts — Auszug (Kernfelder; maßgeblich ist die Typdatei)
interface ShopListItem {
  id: number
  slug: string             // URL-freundlicher Identifier, z.B. "pet-bazaar-b37f6b84"
  name: string | null
  address_raw: string | null
  location: { lat: number; lng: number } | null  // PostGIS → fehlt bei Online-Shops
  dist_km: number | null   // nur bei Geo-Suche befüllt
  phone: string | null
  whatsapp_number: string | null; whatsapp_url: string | null
  website: string | null
  // Keys "0".."6" (0 = Montag) -> { open, close, second_open?, second_close? } | null (B5950-001: optionales zweites Fenster/Mittagspause);
  // Legacy-Crawler-Format mon..sun wird als Fallback gelesen (src/lib/shop-opening-hours.ts::getInternalHoursRows)
  opening_hours: Record<string, unknown> | null
  status: string           // 'active' | 'inactive'
  product_count: number
  last_scraped: string | null
  // + optionale Enriched-/Self-Service-Felder: city, postal_code, review_stats, shop_type,
  //   spoken_languages, is_open_now, payment_methods, … (siehe src/types/api.ts)
}

// Detailseite erweitert um:
interface ShopDetailResponse extends ShopListItem {
  top_products: TopProduct[]
  opening_hours_raw?: OpeningHoursRaw | null
  description?: string | null
  images?: Array<{ url: string }> | null
}
```

`spoken_languages` enthält Großbuchstaben-Sprachcodes aus der festen Liste `EN | DE | EL | RU | AR | HE`.  
→ Siehe [`shop-languages.md`](./shop-languages.md)

---

### Produkt (`ProductListItem` / `ProductDetailResponse`)

Ein Produkt existiert unabhängig von Shops — es ist die abstrakte Beschreibung eines Artikels. Shops bieten Produkte zu bestimmten Preisen an (Offers).

```typescript
interface ProductListItem {
  id: number
  slug: string
  name: string              // vom Backend aufgelöst (lang → en → first), kein Frontend-Fallback
  brand: string | null
  category_id: number | null
  thumbnail_url: string | null
  images: ProductImages | null
  best_offer: BestOffer | null  // günstigstes aktuelles Angebot
}

interface ProductDetailResponse {
  id: number; slug: string
  names: Record<string, string>        // alle Sprachversionen: { en: "...", de: "..." }
  descriptions: Record<string, string> | null
  brand: { id: number; name: string | null } | null
  category: { id: number; name: string | null } | null
  images: unknown[] | null
  offers: OfferDetail[]     // alle Angebote (mehrere Shops möglich)
  price_history: PriceHistoryItem[]  // nur fixed-Preise
}
```

Produktnamen sind mehrsprachig — das Backend wählt anhand des `Accept-Language`-Headers aus. Der Frontend-API-Client setzt diesen Header automatisch.

---

### Angebot / Offer (`BestOffer` / `OfferDetail`)

Ein Offer verbindet ein Produkt mit einem Shop zu einem bestimmten Preis. Offers sind **append-only** im Backend — jede Preis-Beobachtung eines Crawlers erzeugt einen neuen Eintrag.

```typescript
interface BestOffer {
  price: string | null      // null wenn price_type ≠ 'fixed'
  currency: string          // ISO 4217, z.B. "EUR"
  price_type: PriceType     // 'fixed' | 'on_request' | 'free' | 'variable'
  price_note: string | null // optionaler Freitext, z.B. "pro Stunde"
  shop_id: number; shop_slug: string | null; shop_name: string
  dist_km: number | null
  is_available: boolean
  crawled_at: string | null // ISO 8601
  url: string | null        // Produkt-URL beim Shop — immer via sanitizeExternalUrl()
  shop_location: { lat: number; lng: number } | null
  shop_type?: 'local' | 'online_only'
  delivery_available?: boolean
}
```

→ Vollständige Preis-Semantik: [`price-types.md`](./price-types.md)  
→ Backend: [`pundo_main_backend/docs/data-model.md`](../../pundo_main_backend/docs/data-model.md) — Abschnitt "Offer-Modell"

---

### Kategorie (`CategoryItem`)

Kategorien sind hierarchisch (Baum-Struktur). Ein Filter auf eine Kategorie schließt alle Unterkategorien ein.

```typescript
interface CategoryItem {
  id: number
  parent_id: number | null  // null = Wurzel-Kategorie
  taxonomy_type: string     // 'google' | 'unspsc'
  external_id: string
  level: string | null
  name: string | null       // im Accept-Language der Anfrage
  child_count: number
}
```

Die App nutzt Google Product Taxonomy (für Konsumgüter) und UNSPSC (für Services wie Tierpflege, Hundetraining etc.).

→ Backend: [`pundo_main_backend/docs/taxonomy.md`](../../pundo_main_backend/docs/taxonomy.md)

---

## Shop-Admin Typen (`src/types/shop-admin.ts`)

Die Admin-Typen sind **strikt getrennt** von den öffentlichen API-Typen. Grund: Clean Boundary (spätere Auslagerung in separates Repo).

Maßgeblich ist `src/types/shop-admin.ts` — hier nur das Modell im Überblick:

| Typ | Zweck |
|---|---|
| `AdminShop` | Shop-Profil, das der Owner bearbeitet (inkl. `spoken_languages`, `social_links`, Self-Service-Attribute) |
| `AdminItem` | Produkt/Dienstleistung (`item_type: 'product' \| 'service'`), mehrsprachig: `names` / `descriptions` als `Record<lang, string>` |
| `AdminShopListing` | Verknüpfung Item ↔ Shop (Verfügbarkeit, SKU, Shop-URL) |
| `AdminOffer` | Preis am Listing: `price_type` + `price_tiers` (Staffeln, F5200), optionaler Aktionspreis (`promo_*`) |
| `OpeningHours` | Öffnungszeiten je Tag (`day` 0 = Montag), optionales zweites Fenster (`second_open` / `second_close`) |
| `Onboarding*`, `CatalogCase*`, `AdminReview`, `ApiKey`, `Import*` | Onboarding, Katalog-Review, Bewertungen, API-Keys, Import |

`AdminProduct`, `AdminProductImage` und `AdminProductList` sind `@deprecated` (ersetzt durch `AdminShopListing` + `AdminOffer`).

---

## Zwei-Typen-System: öffentlich vs. Admin

| Bereich | Datei | Genutzt von |
|---|---|---|
| Öffentliche API | `src/types/api.ts` | Customer-Frontend, Server Components |
| Shop-Admin | `src/types/shop-admin.ts` | Shop-Admin Portal, Client Components |

`AdminShop` und `ShopDetailResponse` beschreiben denselben Shop, aber aus verschiedenen Perspektiven:
- `ShopDetailResponse`: was öffentliche Nutzer sehen (read-only, begrenzte Felder)
- `AdminShop`: was der Shop-Owner bearbeiten kann (mehr Felder, schreibbar)

---

## Preis-Typen

| TypeScript-Typ | Werte |
|---|---|
| `PriceType` | `'fixed' \| 'on_request' \| 'free' \| 'variable'` |

→ Vollständige Beschreibung: [`price-types.md`](./price-types.md)

---

## Backend-Referenzen

- Vollständiges DB-Schema: [`pundo_main_backend/docs/data-model.md`](../../pundo_main_backend/docs/data-model.md)
- Kategorie-Taxonomie: [`pundo_main_backend/docs/taxonomy.md`](../../pundo_main_backend/docs/taxonomy.md)
- REST-API-Endpunkte: [`pundo_main_backend/docs/api.md`](../../pundo_main_backend/docs/api.md)
