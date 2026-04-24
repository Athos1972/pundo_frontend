# Architektur: Unified Item & Offer Model
**Feature-Slug:** `2026-04-24-unified-item-offer-model`
**Datum:** 2026-04-24
**Basis:** `01-design.md` (final, alle Designfragen entschieden)
**Status:** Bereit für /coder

---

## 1. Architektur-Kontext

### Kernbefund: Catch-All-Proxy vereinfacht alles

Der Route Handler `src/app/api/shop-admin/[...path]/route.ts` proxied **automatisch** jeden Request
`/api/shop-admin/<pfad>` → `BACKEND/api/v1/shop-owner/<pfad>`. Das bedeutet:

- **Keine neuen Route Handler nötig.** `POST /api/shop-admin/items` und
  `GET /api/shop-admin/shop-listings` funktionieren sobald das Backend die Endpoints hat.
- Der Coder muss nur: Types, API-Client-Funktionen, Komponenten und Seiten anpassen.
- Das Backend-Team muss seine Endpoints bereitstellen, bevor Frontend-Code deployed werden kann.

### Wichtige Abhängigkeit: Backend-First

**Blocker:** Das Frontend kann erst vollständig getestet werden, wenn folgende Backend-Endpoints live sind:
- `GET /api/v1/shop-owner/items?q=&ean=&limit=` (Item-Suche)
- `POST /api/v1/shop-owner/items` (Item anlegen)
- `GET /api/v1/shop-owner/shop-listings` (ShopListings auflisten)
- `POST /api/v1/shop-owner/shop-listings` (ShopListing anlegen)
- `GET/PATCH/DELETE /api/v1/shop-owner/shop-listings/{id}`
- `POST /api/v1/shop-owner/items/{id}/photos` (Foto-Upload)
- `PATCH /api/v1/shop-owner/offers` → erweiterte Payload (unified, mit `price_tiers`, `shop_listing_id`)

---

## 2. Modulstruktur — Deltas

### 2.1 Gelöschte Dateien

| Datei | Grund |
|-------|-------|
| `src/app/(shop-admin)/shop-admin/(portal)/products/page.tsx` | Produktverwaltung entfällt |
| `src/app/(shop-admin)/shop-admin/(portal)/products/new/page.tsx` | Entfällt |
| `src/app/(shop-admin)/shop-admin/(portal)/products/[id]/edit/page.tsx` | Entfällt |
| `src/components/shop-admin/ProductForm.tsx` | Ersetzt durch OfferForm (Stepper) |
| `src/components/shop-admin/ProductList.tsx` | Ersetzt durch OfferList (erweitert) |
| `src/components/shop-admin/ProductPhotoUpload.tsx` | Ersetzt durch ItemPhotoUpload |

### 2.2 Neue Dateien

| Datei | Typ | Zweck |
|-------|-----|-------|
| `src/components/shop-admin/ItemPickerModal.tsx` | Client Component | EAN-Suche, Freitext-Suche, Fuzzy-Match-Block, Neu-Anlegen |
| `src/components/shop-admin/ItemCreateForm.tsx` | Client Component | Inline-Formular im Modal |
| `src/components/shop-admin/ItemPhotoUpload.tsx` | Client Component | Multi-Upload bis 8 Fotos |

### 2.3 Geänderte Dateien

| Datei | Art der Änderung |
|-------|-----------------|
| `src/types/shop-admin.ts` | Typen umbauen (Details §3) |
| `src/types/system-admin.ts` | Typen umbenennen (Details §3) |
| `src/lib/shop-admin-api.ts` | Funktionen ersetzen (Details §4) |
| `src/lib/shop-admin-translations.ts` | Neue Keys für Item-Picker, Fuzzy-Match, Foto-Upload |
| `src/components/shop-admin/AdminNav.tsx` | `products`-Eintrag entfernen |
| `src/components/shop-admin/OfferForm.tsx` | Komplettumbau zu 2-Step-Stepper |
| `src/components/shop-admin/OfferList.tsx` | Source-Badge, "Preis bearbeiten"-Aktion |
| `src/app/(shop-admin)/shop-admin/(portal)/offers/page.tsx` | Neue Props, ShopListing-basiert |
| `src/app/(shop-admin)/shop-admin/(portal)/offers/new/page.tsx` | Übergibt Item-Picker-Props |
| `src/app/(shop-admin)/shop-admin/(portal)/offers/[id]/edit/page.tsx` | Unified Offer laden |
| `src/app/(system-admin)/admin/(portal)/products/page.tsx` | SysAdminItem-Typen |
| `src/app/(system-admin)/admin/(portal)/products/[id]/edit/page.tsx` | SysAdminItem-Typen |
| `src/app/(system-admin)/admin/(portal)/shop-owner-offers/page.tsx` | Unified Offers |
| `src/app/(system-admin)/admin/(portal)/shop-owner-offers/[id]/edit/ShopOwnerOfferEditForm.tsx` | Unified Payload |

---

## 3. Datenmodell — TypeScript-Typen

### 3.1 `src/types/shop-admin.ts` — vollständige Neudefinition

```typescript
// ─── Gemeinsame Enums ────────────────────────────────────────────────────────

export type ItemType   = 'product' | 'service'
export type ItemSource = 'scraper' | 'admin' | 'shop_manual' | 'shop_upload' | 'spotted'
export type ItemStatus = 'active' | 'inactive'

// ─── Item (globaler Katalog) ─────────────────────────────────────────────────

export interface AdminItemPhoto {
  id: number
  item_id: number
  contributed_by_shop_id: number | null
  url: string
  thumbnail_url: string | null
  sort_order: number
}

export interface AdminItem {
  id: number
  slug: string
  item_type: ItemType
  names: Record<string, string>
  descriptions: Record<string, string> | null
  category_id: number
  brand_id: number | null
  ean: string | null
  status: ItemStatus
  source: ItemSource
  photos: AdminItemPhoto[]
  created_at: string
}

// Leichtgewichtige Variante für Item-Picker-Suchergebnisse
export interface ItemSearchResult {
  id: number
  slug: string
  item_type: ItemType
  name: string           // lokalisiert, ein String
  category_id: number
  ean: string | null
  photo_url: string | null
}

// ─── ShopListing (junction) ──────────────────────────────────────────────────

export interface AdminShopListing {
  id: number
  item_id: number
  shop_id: number
  item: AdminItem          // embedded vom Backend in Listen-Response
  available: boolean
  source: ItemSource
  sku: string | null
  shop_url: string | null
  created_at: string
}

export interface AdminShopListingList {
  items: AdminShopListing[]
  total: number
}

// ─── Offer (unified, Preis + optionaler Aktionszeitraum) ────────────────────

export interface AdminOffer {
  id: number
  shop_listing_id: number
  title: string | null
  description: string | null
  price_type: PriceType          // bestehender Typ bleibt
  price_tiers: PriceTier[]       // bestehender Typ bleibt
  currency: string
  valid_from: string | null
  valid_until: string | null
  source: ItemSource
  offer_url: string | null
  archived: boolean
  crawled_at: string | null
  created_at: string
}

export interface AdminOfferList {
  items: AdminOffer[]
  total: number
}

// ─── Beibehalten (unverändert) ───────────────────────────────────────────────
// ShopOwner, AdminShop, OpeningHours, PriceUnitOption, PriceTierStep,
// PriceTier, PriceType, ApiKey, ApiKeyCreated, ImportStatus, ImportUploadResult,
// AdminReviewPhoto, AdminReview, AuditLogEntry
```

**Entfernt:** `AdminProduct`, `AdminProductList` (kein Ersatz — werden durch `AdminShopListing` + `AdminOffer` abgedeckt).

### 3.2 `src/types/system-admin.ts` — Umbenennung

| Alt | Neu | Felder-Delta |
|-----|-----|-------------|
| `SysAdminProduct` | `SysAdminItem` | `+status`, `+item_type`, `-item_type?` (war optional) |
| `SysAdminProductAttribute` | `SysAdminItemAttribute` | `item_id` statt `product_id` |
| `SysAdminOffer` (gescrapt) | `SysAdminOffer` | `+shop_listing_id`, `-product_id`+`-shop_id` (jetzt via ShopListing) |
| `SysAdminShopOwnerOffer` | **entfällt** | Wird durch `SysAdminOffer` (unified) abgedeckt |

---

## 4. API-Client — `src/lib/shop-admin-api.ts`

### Entfernte Funktionen
- `getAdminProducts()` → weg

### Neue Funktionen

```typescript
// Item-Suche — für ItemPickerModal
export async function searchItems(
  params: { q?: string; ean?: string; limit?: number },
  lang: string,
): Promise<ItemSearchResult[]>
// → GET /api/v1/shop-owner/items?q=&ean=&limit=

// Item anlegen
export async function createItem(
  data: { name_de: string; item_type: ItemType; category_id: number; ean?: string; brand_id?: number },
  lang: string,
): Promise<AdminItem>
// → POST /api/v1/shop-owner/items

// ShopListings auflisten
export async function getAdminShopListings(
  params: { q?: string; limit?: number; offset?: number },
  lang: string,
): Promise<AdminShopListingList>
// → GET /api/v1/shop-owner/shop-listings

// ShopListing anlegen (nach Item-Wahl)
export async function createShopListing(
  data: { item_id: number; sku?: string; shop_url?: string },
  lang: string,
): Promise<AdminShopListing>
// → POST /api/v1/shop-owner/shop-listings
```

### Geänderte Funktion
- `getAdminOffers()` — Return-Type bleibt `AdminOfferList`, aber `AdminOffer` hat neue Felder (kein Breaking Change im Aufruf).

---

## 5. Komponentendesign

### 5.1 `ItemPickerModal` (neu, Client Component)

```
ItemPickerModal
├── EAN-Input (debounced 100ms → API-Suche)
│   └── Bei Treffer: ItemPreviewCard (Name, Kategorie, Foto) + "Auswählen"-Button
├── Freitext-Input (debounced 300ms → API-Suche)
│   └── Ergebnisliste: ItemPreviewCard[] → click → onSelect(item)
├── FuzzyMatchWarning (erscheint wenn Backend ähnliche Items liefert beim Anlegen)
│   └── Liste ähnlicher Items + "Trotzdem neu anlegen"-Button (blocked bis Liste dismissed)
└── "Neues Item anlegen" (CTA unten) → expandiert ItemCreateForm
```

**Props:**
```typescript
interface ItemPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (item: ItemSearchResult, shopListingId?: number) => void
  lang: string
}
```

**State-Logik:**
- `searchQuery` / `ean` → debounced fetch → `results: ItemSearchResult[]`
- `fuzzyMatches: ItemSearchResult[]` — wenn beim Neu-Anlegen Levenshtein-Match vom Backend kommt
- `showCreateForm: boolean`
- Wenn `onSelect` aufgerufen wird: Modal schließt sich, `OfferForm` bekommt `shop_listing_id`

### 5.2 `ItemCreateForm` (neu, Client Component)

Inline innerhalb `ItemPickerModal`. Formularfelder:

| Feld | Validierung | Pflicht |
|------|-------------|---------|
| `name_de` | min 2 Zeichen | Ja |
| `item_type` | Radio: Produkt / Dienstleistung | Ja |
| `category_id` | Select aus Backend-Kategorien | Ja |
| `ean` | numerisch, 8–14 Zeichen | Nein |
| `brand_id` | Autocomplete (optional) | Nein |

Submit → `POST /api/shop-admin/items` → danach automatisch `POST /api/shop-admin/shop-listings` mit der neuen `item_id` → `onSelect` aufrufen.

### 5.3 `OfferForm` (Umbau zu 2-Step-Stepper)

```
Step 1 — Item wählen
  └── ItemPickerModal öffnen → nach Auswahl: ItemSummaryBadge zeigt gewähltes Item
      (Anzeige: Foto-Thumbnail + Name + Kategorie + Quelle-Badge)

Step 2 — Preis & Details  [bestehender PriceTierEditor + neue Felder]
  ├── PriceTierEditor (bereits vorhanden, bleibt)
  ├── valid_from + valid_until (Date-Inputs, optional)
  ├── title (optional, Aktionsname)
  ├── description (optional, Aktionstext)
  └── offer_url (optional, URL-Input)
```

**State:**
```typescript
const [shopListingId, setShopListingId] = useState<number | null>(offer?.shop_listing_id ?? null)
const [selectedItem, setSelectedItem] = useState<ItemSearchResult | null>(null)
```

Im Edit-Modus: `offer.shop_listing_id` ist gesetzt → Item-Summary wird geladen und angezeigt
(readonly wenn `offer.source === 'scraper'`, editierbar wenn `source === 'shop_manual'`).

### 5.4 `OfferList` (Erweiterung)

Neue Spalten/Elemente pro Zeile:
- **Item-Name** (statt bisherigem product_name/title)
- **Source-Badge:** `scraper` → grau/Info-Badge; `shop_manual` → grün; `shop_upload` → blau; `spotted` → lila
- **"Preis bearbeiten"** Button: nur sichtbar wenn `source !== 'scraper'` ODER wenn User explizit Scraper-Offer übernehmen will (dann Hinweis: „ab jetzt manuell verwaltet")
- Spalte `valid_from/valid_until`: formatiert als „01.05.–31.05.2026" oder „–" (Dauerpreis)

### 5.5 `ItemPhotoUpload` (neu, Client Component)

- Zeigt alle existierenden Fotos des Items (max. 8)
- Multi-Datei-Auswahl via `<input type="file" multiple accept="image/*">`
- Upload via `POST /api/shop-admin/items/{itemId}/photos` (multipart)
- Löschen via `DELETE /api/shop-admin/items/{itemId}/photos/{photoId}`
- Sort-Order: Drag-not-needed — einfacher „Als Hauptfoto"-Button (setzt sort_order=0)
- Zeigt `contributed_by_shop_id` als Hinweis: „Von deinem Shop" vs. „Von Pundo"

---

## 6. Routing-Änderungen

### Redirect: `/shop-admin/products` → `/shop-admin/offers`

In `src/app/(shop-admin)/shop-admin/(portal)/products/page.tsx` (bevor gelöscht): temporäre `redirect()` eintragen, dann Datei löschen. Next.js App Router kennt keine statischen Redirects in `next.config.ts` für auth-geschützte Routen — stattdessen `redirect('/shop-admin/offers')` in der Page-Funktion selbst.

### Neue Nav-Struktur (`AdminNav.tsx`)

```typescript
const navItems: NavItem[] = [
  { href: '/shop-admin/dashboard', label: tr.nav_dashboard, icon: '⊞' },
  { href: '/shop-admin/profile',   label: tr.nav_profile,   icon: '🏪' },
  { href: '/shop-admin/hours',     label: tr.nav_hours,     icon: '🕐' },
  // { href: '/shop-admin/products', ... }  ← ENTFERNT
  { href: '/shop-admin/offers',    label: tr.nav_offers,    icon: '🏷️' },
  { href: '/shop-admin/import',    label: tr.nav_import,    icon: '⬆' },
  { href: '/shop-admin/api-keys',  label: tr.nav_api_keys,  icon: '🔑' },
  { href: '/shop-admin/reviews',   label: tr.nav_reviews,   icon: '★' },
  { href: '/shop-admin/help',      label: tr.nav_help,      icon: '?' },
]
```

---

## 7. Translations — Neue Keys

In `src/lib/shop-admin-translations.ts` für alle 6 Sprachen (`en`, `de`, `el`, `ru`, `ar`, `he`):

```typescript
// Item Picker
item_picker_title: string         // "Item auswählen"
item_picker_ean_label: string     // "EAN/Barcode"
item_picker_search_label: string  // "Nach Namen suchen"
item_picker_no_results: string    // "Keine Treffer"
item_picker_add_new: string       // "Neues Item anlegen"
item_picker_selected: string      // "Ausgewählt"

// Item Create
item_type_product: string         // "Produkt"
item_type_service: string         // "Dienstleistung"

// Fuzzy Match
fuzzy_match_warning: string       // "Ähnliche Items gefunden"
fuzzy_match_hint: string          // "Bitte wähle ein bestehendes Item oder bestätige, dass dein Item wirklich neu ist."
fuzzy_match_confirm: string       // "Dennoch neu anlegen"

// Offer Form (Stepper)
offer_step_item: string           // "1. Item wählen"
offer_step_price: string          // "2. Preis & Details"
offer_action_title: string        // "Aktionsname (optional)"
offer_action_description: string  // "Aktionsbeschreibung (optional)"
offer_url_label: string           // "Link zur Aktion"
offer_permanent: string           // "Dauerpreis (kein Ablaufdatum)"

// Source Badges
source_scraper: string            // "Automatisch"
source_shop_manual: string        // "Manuell"
source_shop_upload: string        // "Import"
source_spotted: string            // "Spotted"

// Photo Upload
photo_upload_label: string        // "Fotos"
photo_upload_limit: string        // "Maximal 8 Fotos"
photo_set_main: string            // "Als Hauptfoto"
photo_from_pundo: string          // "Von Pundo"
photo_from_shop: string           // "Von deinem Shop"
photo_delete: string              // "Löschen"

// Nav (ersetze nav_products)
// nav_products wird entfernt — nav_offers bleibt
```

---

## 8. Migration — Frontend-seitige Implikationen

Das Frontend trägt **keine** Datenmigrations-Logik. Alle Datenmigration läuft im Backend. Frontend-seitig:

1. **Nach Backend-Migration:** Alle alten `products/`-Endpoints (`/api/v1/shop-owner/products`) liefern 404. → Frontend muss vollständig auf neue Endpoints umgestellt sein **bevor** Backend deployed wird.

2. **Feature Flag Strategie (empfohlen):** Backend stellt neue Endpoints bereit, lässt alte parallel laufen, bis Frontend-Deployment abgeschlossen. Erst dann werden alte Endpoints abgeschaltet. → Rollback möglich ohne Frontend-Revert.

3. **Kunden-Frontend:** Bleibt **unverändert**. Backend serialisiert neue Tabellen in die bestehende Response-Form. Keine Änderungen in `src/types/api.ts`, `src/lib/api.ts`, oder Customer-Komponenten.

---

## 9. Risiken

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Backend-Endpoints nicht rechtzeitig | Hoch (großer Umbau) | Blockiert E2E-Tests | Feature-Flag-Strategie (§8); Mock-Backend für Dev |
| `OfferForm`-Stepper bricht bestehende Edit-Flows | Mittel | Offer-Bearbeitung kaputt | Task 8 enthält explizite Edit-Mode-Tests |
| Fuzzy-Match: Backend liefert keinen Score | Mittel | Hard-Block funktioniert nicht | Frontend zeigt Warnung nur wenn Backend ähnliche Items zurückgibt; kein UI-Block ohne Backend-Support |
| `nav_products` Translation Key bleibt in Codebase | Niedrig | Build-Warning | Task 15 räumt Translations auf |
| System-Admin-Seiten referenzieren alte Typen | Mittel | TypeScript-Fehler | Tasks 14 + 15 decken beide Type-Dateien ab |
| `shop-owner-full-lifecycle` Journey muss angepasst werden | Hoch | Journey läuft ins Leere | Siehe §10 Journey-Deltas |

---

## 10. Journey-Deltas

### 10.1 Validierung der Design-Vorschläge

Das Design-Dokument schlägt keine neuen Journey-Einträge vor. Keine Designer-Vorschläge zu validieren.

### 10.2 Drift-Check bestehender Journeys

**Betroffene Journeys (touches-modules schneiden mit diesem Feature):**

**`shop-owner-full-lifecycle`** — `touches-modules` enthält `src/app/(shop-admin)/**` und `src/lib/shop-admin-api.ts`. Beide Globs sind gültig (Pfade existieren). **Inhaltlich betroffen:** Schritte 3 des Runbooks legt Produkte via Shop-Admin an — diese Schritte werden nach der Migration ungültig, da `products/`-Routen entfallen. Journey-Spec-Datei (`shop-owner-full-lifecycle.spec.ts`) muss nach Coder-Implementierung aktualisiert werden (Fixture-Anlage via neue Offer/ShopListing-API). → **kein Drift in `touches-modules`**, aber **Runbook-Update nötig nach Implementation**.

**`admin-data-management`** — `touches-modules` enthält `src/app/(system-admin)/**`. Glob ist gültig. Die Journey testet Brands/Categories/Guides — keine direkten Produkt-Schritte. System-Admin-Produktseiten (`/admin/products/`) werden in diesem Feature auf Items umgestellt. Der Drift liegt im Glob (`system-admin/**` bleibt gültig), **keine Korrektur nötig**.

**`shop-admin-import-image-url`** — Importflow ist betroffen (Produkte → Items via Import). Journey-Status FAIL, Spec existiert als Journey-Datei. `touches-modules` enthält `src/app/(shop-admin)/**` (angenommen). Prüfung nach Coder-Implementation empfohlen.

**`import-page-ac-check`** — Referenziert als `import-page-ac-check.spec.ts` (nicht `.md`). Import-Logik ändert sich (neues Item-Matching). Diese Journey muss nach Implementation neu geprüft werden.

### 10.3 Vorgeschlagene Katalog-Anpassungen

```
Folgende Journey-Katalog-Anpassungen schlage ich vor:

1. shop-owner-full-lifecycle: Runbook-Schritte 3 (Fixture-Anlage via products-API)
   müssen nach Implementation auf neue ShopListing/Offer-API umgeschrieben werden.
   → Kein touches-modules-Drift, aber Spec-Datei shop-owner-full-lifecycle.spec.ts
     muss nach Task 12 (Routing) und Task 8 (OfferForm) aktualisiert werden.
   Bestätigen? (j/n)

2. shop-admin-import-image-url: Journey nach Implementation auf Item-Terminologie
   (statt product) prüfen und ggf. Runbook-Update.
   → Kein sofortiger Drift-Fix; Beobachtung nach Coder-Abschluss.
   Bestätigen? (j/n)
```

**Phase 1 — keine zusätzlichen Architekt-Heuristiken.** Nur Drift-Korrekturen und Validierung.

---

## 11. Nummerierte Aufgabenliste (für /coder)

> Reihenfolge ist wichtig: Types vor API-Client, API-Client vor Komponenten, Komponenten vor Seiten.

**T1 — Types: shop-admin.ts** (§3.1)
Entferne `AdminProduct`, `AdminProductList`. Füge `ItemType`, `ItemSource`, `ItemStatus`, `AdminItemPhoto`, `AdminItem`, `ItemSearchResult`, `AdminShopListing`, `AdminShopListingList` hinzu. Update `AdminOffer`: ersetze `product_id` durch `shop_listing_id`, ersetze `price: string` durch `price_tiers: PriceTier[]`, füge `source`, `offer_url`, `crawled_at` hinzu. Behalte `PriceTier`, `PriceTierStep`, `PriceUnitOption` unverändert.

**T2 — Types: system-admin.ts** (§3.2)
Rename `SysAdminProduct` → `SysAdminItem` (+`status`, +`item_type` required). Rename `SysAdminProductAttribute` → `SysAdminItemAttribute` (`product_id` → `item_id`). Entferne `SysAdminShopOwnerOffer`. Update `SysAdminOffer` zu unified version: entferne `product_id`+`shop_id` → `+shop_listing_id`.

**T3 — API-Client: shop-admin-api.ts** (§4)
Entferne `getAdminProducts`. Füge `searchItems`, `createItem`, `getAdminShopListings`, `createShopListing` hinzu. Return-Type von `getAdminOffers` auf neues `AdminOffer` updaten.

**T4 — Translations: shop-admin-translations.ts** (§7)
Füge alle neuen Keys aus §7 in allen 6 Sprachen hinzu. Entferne `nav_products` (oder behalte für Redirect-Periode — danach entfernen). Übersetze mit sinngemäßem Text für alle 6 Sprachen.

**T5 — Neue Komponente: ItemPickerModal.tsx** (§5.1)
Client Component. EAN-Input (debounced 100ms, fetch `GET /api/shop-admin/items?ean=`), Freitext-Suche (debounced 300ms, fetch `GET /api/shop-admin/items?q=`), Trefferliste mit `ItemPreviewCard` (Thumbnail + Name + Kategorie + EAN), Fuzzy-Match-Warnung wenn Backend ähnliche Items liefert beim Neu-Anlegen-Versuch, CTA "Neues Item anlegen" → expandiert `ItemCreateForm`. `onSelect(item, shopListingId)` Callback.

**T6 — Neue Komponente: ItemCreateForm.tsx** (§5.2)
Client Component (embedded in ItemPickerModal). Felder: `name_de` (required), `item_type` Radio (required), `category_id` Select (required, lädt Kategorien einmalig), `ean` (optional), `brand_id` (optional Freitext-ID). Submit: `POST /api/shop-admin/items` → danach `POST /api/shop-admin/shop-listings` → `onSelect` aufrufen.

**T7 — Neue Komponente: ItemPhotoUpload.tsx** (§5.5)
Client Component. Ersetzt `ProductPhotoUpload`. Multi-Upload (max 8, Überschuss blockiert), Thumbnails, Delete, "Als Hauptfoto" Button. Endpoints: `POST /api/shop-admin/items/{id}/photos`, `DELETE /api/shop-admin/items/{id}/photos/{photoId}`, `PATCH /api/shop-admin/items/{id}/photos/{photoId}` (sort_order).

**T8 — Komponente: OfferForm.tsx umbauen** (§5.3)
2-Step-Stepper. Step 1: ItemPickerModal integrieren (state: `shopListingId`, `selectedItem`). Step 2: bestehenden `PriceTierEditor` behalten, `valid_from`/`valid_until` als optionale Date-Inputs, `title`/`description`/`offer_url` als optionale Felder. Edit-Modus: `shop_listing_id` ist gesetzt → `ItemSummaryBadge` (readonly) anzeigen. `product_id` aus Payload entfernen.

**T9 — Komponente: OfferList.tsx erweitern** (§5.4)
Source-Badge je Offer. „Preis bearbeiten" für nicht-scraper-geschützte Offers. Item-Name als Hauptspalte (statt bisherigem title). `valid_from`/`valid_until` Spalte.

**T10 — Nav: AdminNav.tsx** (§6)
Entferne `nav_products`-Eintrag aus `navItems`-Array.

**T11 — Seiten: offers/ updaten**
`offers/page.tsx`: `getAdminShopListings` statt `getAdminProducts` als Props-Basis. `offers/new/page.tsx`: keine `products`-Prop mehr nötig (ItemPicker lädt selbst). `offers/[id]/edit/page.tsx`: neuen `AdminOffer`-Typ laden.

**T12 — Seiten: products/ entfernen**
Ersetze `products/page.tsx` durch `redirect('/shop-admin/offers')`. Lösche `products/new/page.tsx` und `products/[id]/edit/page.tsx`.

**T13 — System-Admin: Typen anpassen**
`/admin/products/page.tsx` + `[id]/edit/page.tsx`: `SysAdminProduct` → `SysAdminItem`. `/admin/shop-owner-offers/`: `SysAdminShopOwnerOffer` → `SysAdminOffer` (unified). `ShopOwnerOfferEditForm.tsx`: Payload auf `shop_listing_id` + `price_tiers` updaten.

**T14 — Unit-Tests**
Für alle neuen Komponenten (`ItemPickerModal`, `ItemCreateForm`, `ItemPhotoUpload`): Vitest-Tests für: EAN-Suche-Debounce, Fuzzy-Match-Warnung-Anzeige, Foto-Limit (max 8), Stepper-Navigation (Step 1 → Step 2).

---

## 12. Abhängigkeitsreihenfolge

```
T1 (Types shop-admin)
T2 (Types sys-admin)
  ↓
T3 (API-Client)
T4 (Translations)
  ↓
T5 (ItemPickerModal)  ←── T6 (ItemCreateForm, embedded in T5)
T7 (ItemPhotoUpload)
  ↓
T8 (OfferForm — braucht T5)
T9 (OfferList)
T10 (AdminNav)
  ↓
T11 (Offer-Seiten — braucht T8, T9)
T12 (Products-Seiten entfernen)
T13 (System-Admin)
  ↓
T14 (Unit-Tests — nach allen Komponenten)
```

T1–T4 können parallel laufen. T5+T6 sind verschränkt (T6 ist Teil von T5). T7 ist unabhängig von T5/T6.
