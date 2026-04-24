---
spec: 2026-04-24-unified-item-offer-model
author: coder
date: 2026-04-24
status: complete
---

# 03 – Implementation Handoff

```
╔══════════════════════════════════════════════════════╗
║  /coder → /e2e-tester  Übergabe-Protokoll            ║
╚══════════════════════════════════════════════════════╝
```

## Feature

Unified Item & Offer Model für pundo_frontend — Shop-Admin-Flows auf das neue Backend-Modell (Item → ShopListing → UnifiedOffer) migriert; 2-step OfferForm, ItemPickerModal mit EAN-Suche und Fuzzy-Match-Warnung, ItemCreateForm, ItemPhotoUpload, source-Badges in OfferList.

---

## Geänderte Dateien

### Types

| Datei | Art | Beschreibung |
|---|---|---|
| `src/types/shop-admin.ts` | geändert | Kompletter Rewrite: `ItemType`, `ItemSource`, `ItemStatus`, `AdminItemPhoto`, `AdminItem`, `ItemSearchResult`, `AdminShopListing`, `AdminShopListingList`, `PriceType`, neues `AdminOffer` (unified). Deprecated Aliases (`AdminProduct`, `AdminProductImage`, `AdminProductList`) für Legacy-Komponenten beibehalten. |
| `src/types/system-admin.ts` | geändert | `SysAdminProduct` → `SysAdminItem`, `SysAdminProductAttribute` → `SysAdminItemAttribute`, `SysAdminOffer` unified (shop_listing_id, price_tiers, source, offer_url). Deprecated Aliases beibehalten. |

### API-Client

| Datei | Art | Beschreibung |
|---|---|---|
| `src/lib/shop-admin-api.ts` | geändert | `getAdminProducts` entfernt. Neu: `searchItems`, `createItem`, `getAdminShopListings`, `createShopListing`. |
| `src/lib/system-admin-api.ts` | geändert | Import-Aliases aktualisiert (SysAdminProduct→SysAdminItem etc.); lokale Alias `SysAdminShopOwnerOffer = SysAdminOffer` für backward compat. |

### Translations

| Datei | Art | Beschreibung |
|---|---|---|
| `src/lib/shop-admin-translations.ts` | geändert | 25+ neue Keys in allen 6 Sprachen (en, de, el, ru, ar, he): item_picker_*, fuzzy_match_*, offer_step_*, offer_action_*, photo_*, source_* |

### Neue Komponenten

| Datei | Art | Beschreibung |
|---|---|---|
| `src/components/shop-admin/ItemPickerModal.tsx` | neu | EAN-Suche (100ms debounce), Text-Suche (300ms debounce), Fuzzy-Match-Warning-Block, inline ItemCreateForm. Erstellt ShopListing bei Auswahl via POST /api/shop-admin/shop-listings. |
| `src/components/shop-admin/ItemCreateForm.tsx` | neu | Eingebettet in ItemPickerModal. Felder: name_de, item_type (radio), category_id (select), ean. POST /api/shop-admin/items → POST /api/shop-admin/shop-listings → onCreated callback. |
| `src/components/shop-admin/ItemPhotoUpload.tsx` | neu | Max 8 Fotos, Size/Type-Validierung. Badge "von Pundo" wenn contributed_by_shop_id === null, "von Shop" sonst. Upload/Delete/SetMain via /api/shop-admin/items/{id}/photos. |

### Geänderte Komponenten

| Datei | Art | Beschreibung |
|---|---|---|
| `src/components/shop-admin/OfferForm.tsx` | geändert/rebuilt | 2-step Stepper: Step 1 = ItemPickerModal-Integration, Step 2 = PriceTierEditor + Metafelder. Edit-Modus zeigt ItemSummaryBadge (readonly). Payload: shop_listing_id statt product_id/price. |
| `src/components/shop-admin/OfferList.tsx` | geändert/rebuilt | sourceBadge() helper (5 Quellen mit Farben), formatDateRange(), getPriceDisplay() liest aus price_tiers[0].steps[0].price. |
| `src/components/shop-admin/AdminNav.tsx` | geändert | "Produkte"-Eintrag entfernt. |

### Seiten

| Datei | Art | Beschreibung |
|---|---|---|
| `src/app/(shop-admin)/shop-admin/(portal)/offers/new/page.tsx` | geändert | getAdminProducts-Call entfernt. Nur noch getAdminPriceUnits. |
| `src/app/(shop-admin)/shop-admin/(portal)/offers/[id]/edit/page.tsx` | geändert | getAdminProducts-Call entfernt. Extrahiert preloadedItem aus offer-Response. |
| `src/app/(shop-admin)/shop-admin/(portal)/products/page.tsx` | redirect | → /shop-admin/offers |
| `src/app/(shop-admin)/shop-admin/(portal)/products/new/page.tsx` | redirect | → /shop-admin/offers/new |
| `src/app/(shop-admin)/shop-admin/(portal)/products/[id]/edit/page.tsx` | redirect | → /shop-admin/offers |
| `src/app/(system-admin)/admin/(portal)/shop-owner-offers/[id]/edit/ShopOwnerOfferEditForm.tsx` | geändert | Felder auf unified SysAdminOffer (offer_url, valid_from/until, title, description). |
| `src/app/(system-admin)/admin/(portal)/shop-owner-offers/page.tsx` | geändert | Spalten: shop_listing_id, source (neu), price entfernt. |
| `src/app/(system-admin)/admin/(portal)/offers/page.tsx` | geändert | shop_listing_id, title, source, price_type, archived. Alte Felder (shop_id, product_id, price, is_available) entfernt. |
| `src/app/(system-admin)/admin/(portal)/offers/new/OfferForm.tsx` | geändert/rebuilt | shops/products Props entfernt. shop_listing_id, title, description, offer_url, price_type, currency. |
| `src/app/(system-admin)/admin/(portal)/offers/new/page.tsx` | geändert | getAllShops/getAllProducts Calls entfernt. |
| `src/app/(system-admin)/admin/(portal)/offers/[id]/edit/page.tsx` | geändert | getAllShops/getAllProducts Calls entfernt. |

### Tests

| Datei | Art | Beschreibung |
|---|---|---|
| `src/tests/unified-item-offer-model.test.tsx` | neu | 20+ Tests: Translation Keys (6 Sprachen), ItemPickerModal (render/EAN/CTA/backdrop), ItemCreateForm (render/cancel/validation), ItemPhotoUpload (0 Fotos/max 8/badges/size-error), OfferList source badges (5 Quellen), Type-Shape-Validierung |
| `src/tests/shop-admin.test.tsx` | geändert | AdminNav: nav_products NICHT mehr sichtbar, nav_offers sichtbar. OfferList-Fixtures auf neues AdminOffer-Shape angepasst. |
| `src/tests/api-and-components.test.tsx` | geändert | makeOffer-Helper auf neues AdminOffer-Shape (shop_listing_id, price_type, price_tiers, currency, source, offer_url, crawled_at, created_at). |

---

## Qualitätsstatus

| Check | Ergebnis |
|---|---|
| Unit-Tests | **957/957 bestanden** |
| TypeScript (`npx tsc --noEmit`) | **0 Fehler** |
| ESLint (`npm run lint`) | **0 Fehler**, 45 Warnings (alle pre-existing) |

---

## Journeys

Keine `approved`-Einträge für Spec `2026-04-24-unified-item-offer-model` im CATALOG.md gefunden — Journey-Implementierung übersprungen.

---

## Backend-Abhängigkeiten

Backend ist laut Ausgangslage fertig (Port 8500). Die folgenden Endpunkte werden genutzt und müssen verfügbar sein:

| Endpunkt | Zweck |
|---|---|
| `GET /api/v1/shop-owner/items?ean=&q=&limit=` | Item-Suche (EAN + Text) |
| `POST /api/v1/shop-owner/items` | Item anlegen |
| `GET /api/v1/shop-owner/items/{id}/photos` | Fotos eines Items |
| `POST /api/v1/shop-owner/items/{id}/photos` | Foto hochladen |
| `PATCH /api/v1/shop-owner/items/{id}/photos/{photoId}` | sort_order setzen (main photo) |
| `DELETE /api/v1/shop-owner/items/{id}/photos/{photoId}` | Foto löschen |
| `GET /api/v1/shop-owner/shop-listings?q=&limit=&offset=` | ShopListings laden |
| `POST /api/v1/shop-owner/shop-listings` | ShopListing anlegen |
| `GET /api/v1/shop-owner/categories` | Kategorien für ItemCreateForm |

HTTP 409 bei Fuzzy-Match: Response muss `{ similar_items: ItemSearchResult[] }` enthalten, sonst wird der Warning-Block nicht angezeigt.

HTTP 409 bei dupliziertem ShopListing: Response muss `{ id: number }` oder `{ shop_listing_id: number }` enthalten, sonst wird kein shopListingId übergeben.

---

## Offene Risiken / Hinweise für E2E

1. **OfferForm Step 2 — preloadedItem im Edit-Modus:** Item wird aus `offer.item` extrahiert falls vorhanden. Falls das Backend dieses Feld nicht liefert, zeigt Edit-Modus nur "Offer #id" als Titel. E2E-Test sollte prüfen ob das Backend `item` embedded zurückgibt.

2. **Fuzzy-Match-Block:** Wird nur angezeigt wenn Backend HTTP 409 mit `similar_items` liefert. Bei HTTP 200 oder anderem Error-Format wird der Block nie sichtbar. E2E sollte einen Fixture-Datensatz anlegen der den Fuzzy-Match auslöst (Score ≥ 85).

3. **Legacy-Komponenten ProductForm / ProductList / ProductPhotoUpload:** Diese Komponenten kompilieren durch die deprecated Aliases weiterhin, werden aber durch die redirects auf /products-Seiten nicht mehr navigiert. Sie können in einem Folge-Sprint entfernt werden.

4. **source-Badge Farben:** Aktuell inline CSS-Klassen (gray/green/blue/purple/yellow). Wenn Tailwind-JIT purgt, können Klassen fehlen wenn kein source-Badge im initialen Render vorhanden ist. In der Prod-Config sollte `safelist` die Badge-Klassen aufnehmen oder sie in einer statisch analysierbaren Datei vorkommen.

5. **ItemPhotoUpload-Endpoint-Pfad:** Setzt voraus dass `/api/shop-admin/items/{id}/photos` über den Catch-All-Proxy (`/api/shop-admin/[...path]/route.ts`) korrekt weitergeleitet wird. Testen mit echtem Upload im E2E.

6. **RTL-Layout:** Alle neuen Komponenten nutzen Tailwind `rtl:`-Modifier via `start`/`end`-Klassen (`end-3`, `text-start`). E2E sollte mit `lang=ar` oder `lang=he` testen.

---

## Empfehlung an E2E-Tester

- **Kernflow:** Shop-Admin → Angebot erstellen → ItemPickerModal öffnen → Item per EAN-Scan suchen → auswählen → Step 2 Preis eingeben → speichern
- **Fuzzy-Match:** Item anlegen mit ähnlichem Namen, beim zweiten Anlegen Fuzzy-Warning erscheinen lassen und bestätigen
- **Edit-Modus:** Bestehendes Angebot editieren — ItemSummaryBadge muss sichtbar sein, Item-Picker darf nicht öffnen
- **Redirects:** /shop-admin/products → /shop-admin/offers (301)
- **Foto-Upload:** Min. 1 Foto hochladen, als Hauptfoto setzen, löschen
- **Source-Badges:** OfferList muss Badge je nach `source`-Wert korrekt einfärben
- **RTL:** ar + he separat prüfen (ItemPickerModal, OfferForm Stepper)
- **Mobile Breakpoints:** ItemPickerModal ist `max-w-lg`, auf kleinen Screens prüfen
- **Backend muss laufen:** Alle E2E-Tests gegen Port 3500 (Frontend) + 8500 (Backend/Test-DB)
