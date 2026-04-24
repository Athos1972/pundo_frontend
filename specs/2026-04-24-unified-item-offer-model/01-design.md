# Design: Unified Item & Offer Model
**Feature-Slug:** `2026-04-24-unified-item-offer-model`
**Datum:** 2026-04-24
**Status:** Bereit für /architect

---

## 1. Problem & Betroffene

Das System verwaltet Produkte und Dienstleistungen heute in zwei parallelen, inkompatiblen Welten:

- **Welt A (Scraper/Admin):** `SysAdminProduct` + `SysAdminOffer` — globaler Katalog, multi-language, mit Crawl-Zeitstempel, ohne Aktionszeiträume.
- **Welt B (Shop-Owner):** `AdminProduct` (mit `price_tiers`) + `AdminOffer` (mit `valid_from/until`, Einzelpreis, optionale `product_id`) — shop-lokal, single-language, ohne Historisierung.

Konsequenzen:
- Staffelpreise und Aktionszeiträume sind auf verschiedene Entitäten verteilt → eine „Aktion mit Staffelpreis" ist unmöglich.
- Shop-Owner können ihr manuell gepflegtes Angebot nicht mit einem Katalog-Item verknüpfen.
- Produkte und Dienstleistungen werden unterschiedlich behandelt, obwohl sie identische Merkmale teilen.
- Fünf Quellen (Scraper, Shop-Owner manuell, Shop-Owner Upload, Admin, Spotted) erzeugen je eigene Datenstrukturen.

**Betroffene:** Shop-Owner (primär), System-Admins, Kunden (readonly), Scraper (API-Schnittstelle).

---

## 2. Ziel-Datenmodell

### 2.1 Item (globaler Katalog, shopübergreifend)

Ein `Item` repräsentiert ein Produkt **oder** eine Dienstleistung. Es gehört keinem einzelnen Shop. Mehrere Shops können dasselbe Item anbieten.

| Feld | Typ | Notiz |
|------|-----|-------|
| `id` | int | |
| `slug` | string | URL-safe, global unique |
| `item_type` | `product` \| `service` | |
| `names` | `Record<lang, string>` | alle 6 Sprachen |
| `descriptions` | `Record<lang, string>` \| null | |
| `category_id` | int | Pflicht |
| `brand_id` | int \| null | |
| `ean` | string \| null | für Auto-Match |
| `status` | `active` \| `inactive` | globale Deaktivierung für alle Shops |
| `source` | `scraper` \| `admin` \| `shop_manual` \| `shop_upload` \| `spotted` | erste Quelle |
| `created_at` | datetime | |

⚠️ ANNAHME: `status=inactive` blendet das Item für alle Shops im Frontend aus, unabhängig von `ShopListing.available`. Nur Admin kann `status` setzen.

**ItemAttribute** (separate Tabelle, optionale Zusatzattribute auf Item-Ebene):

| Feld | Typ | Notiz |
|------|-----|-------|
| `id` | int | |
| `item_id` | int | FK → Item |
| `attribute_key` | string | z.B. `material`, `weight_kg`, `color` |
| `attribute_value` | jsonb | skalare Werte oder strukturierte Daten |
| `source` | string | Quelle des Attributs |
| `confidence` | float \| null | Scraper-Konfidenz (0–1) |
| `created_at` | datetime | |

Entspricht der heutigen `SysAdminProductAttribute`-Tabelle; wird ohne Datenverlust migriert.

**ItemPhoto** (separate Tabelle, mehrere Fotos pro Item, max. 8 pro Item):

| Feld | Typ | Notiz |
|------|-----|-------|
| `id` | int | |
| `item_id` | int | |
| `contributed_by_shop_id` | int \| null | null = vom Admin/Scraper |
| `url` | string | |
| `thumbnail_url` | string \| null | |
| `sort_order` | int | |

⚠️ ANNAHME: Das Haupt-Foto ist `sort_order = 0`. Shop-eigene Fotos (Phase 47) werden durch `contributed_by_shop_id != null` unterschieden.

### 2.2 ShopListing (Verknüpfungstabelle: Shop bietet Item an)

| Feld | Typ | Notiz |
|------|-----|-------|
| `id` | int | |
| `item_id` | int | FK → Item |
| `shop_id` | int | FK → Shop |
| `available` | bool | sichtbar im Frontend |
| `source` | `scraper` \| `admin` \| `shop_manual` \| `shop_upload` \| `spotted` | letzte Quelle |
| `sku` | string \| null | shop-spezifische Artikelnummer |
| `shop_url` | string \| null | Deeplink zum Item auf der Shop-Webseite |
| `created_at` | datetime | |

**ShopListingAttribute** (optionale shop-spezifische Zusatzattribute an der Verknüpfung):

| Feld | Typ | Notiz |
|------|-----|-------|
| `id` | int | |
| `shop_listing_id` | int | FK → ShopListing |
| `attribute_key` | string | z.B. `available_colors`, `local_name` |
| `attribute_value` | jsonb | |

Felder sind **kategorie-definiert** (analog `SysAdminCategoryAttributeDef`) — kein Freitext. Erlaubte Keys und Werte werden durch die Kategorie des Items vorgegeben. Ermöglicht: Shop A hat „Haarschnitt Damen" mit kategorie-definiertem Attribut `available_lengths`, Shop B ohne — ohne das Item selbst aufzublähen.

### 2.3 Offer (Preis + optional Aktionszeitraum)

Ein `Offer` hängt am `ShopListing`. Es repräsentiert entweder einen Dauerpreis (`valid_from/until = null`) oder eine zeitlich begrenzte Aktion.

**Preishistorie entsteht automatisch:** Bei Preisänderung wird das aktuelle Offer archiviert, ein neues angelegt.

| Feld | Typ | Notiz |
|------|-----|-------|
| `id` | int | |
| `shop_listing_id` | int | FK → ShopListing |
| `title` | string \| null | Aktionsname (z.B. „Black Friday") |
| `description` | string \| null | z.B. „nur 1/Haushalt" |
| `price_type` | `fixed` \| `on_request` \| `free` \| `variable` | |
| `price_tiers` | `PriceTier[]` | leer erlaubt bei `on_request`/`free` |
| `currency` | string | ISO 4217 |
| `valid_from` | date \| null | null = dauerhaft gültig ab Erstellung |
| `valid_until` | date \| null | null = kein Ablaufdatum |
| `source` | `scraper` \| `admin` \| `shop_manual` \| `shop_upload` \| `spotted` | |
| `offer_url` | string \| null | Aktions-Deeplink (z.B. Landing Page einer Aktion) |
| `archived` | bool | true = historischer Datensatz |
| `crawled_at` | datetime \| null | nur für scraper-source |
| `created_at` | datetime | |

**Scraper-Schutzregel:**
- `source ∈ {shop_manual, shop_upload, admin}` → Scraper darf dieses Offer **nicht** überschreiben
- `source ∈ {scraper, spotted}` → Scraper überschreibt (archiviert altes, legt neues an)

---

## 3. User Flows

### Flow A — Shop-Owner: Neues Angebot anlegen (manuell)

1. Shop-Owner öffnet „Meine Angebote" → Button „Neues Angebot"
2. **Schritt 1 – Item wählen oder anlegen:**
   a. Eingabe von EAN → sofortiger 100%-Match → Item vorgeschlagen → Bestätigen
   b. Freitext-Suche (Name) → Trefferliste aus Katalog → Auswählen
   c. Kein Treffer → „Neu anlegen": Name (mind. Deutsch), `item_type`, `category_id` Pflicht; `brand_id`, EAN, weitere Sprachen optional
3. **Schritt 2 – Preis & Verfügbarkeit:**
   - `price_type` wählen; bei `fixed`/`variable`: `price_tiers` (mind. 1 Stufe)
   - `valid_from`/`valid_until` optional (leer = Dauerpreis)
   - Optional: `title`, `description` (Aktionstext)
   - Optional: Foto(s) hochladen (→ `ItemPhoto` mit `contributed_by_shop_id`)
4. Speichern → `ShopListing` + `Offer` (source=`shop_manual`) werden angelegt
5. Bestätigung & Rückkehr zur Angebotsliste

**Edge Case A1 — Item existiert, Shop-Owner ändert Preis:**
- Bestehende Offer wird archiviert, neue Offer mit `source=shop_manual` angelegt → Preishistorie erhalten

**Edge Case A2 — Scraper-Offer vorhanden, Shop-Owner übernimmt:**
- Shop-Owner sieht das gescrapte Offer in seiner Liste (readonly) → Button „Preis bearbeiten"
- Bestehende Scraper-Offer wird archiviert, neue `source=shop_manual`-Offer angelegt → ab jetzt scrapergeschützt

**Edge Case A3 — Shop-Owner erstellt neues Item (Dienstleistung ohne EAN):**
- Nur Name + Kategorie Pflicht; EAN leer → Item landet im Katalog und ist sofort für andere Shops suchbar

### Flow B — Shop-Owner: Angebote via XLSX/CSV importieren

1. XLSX/CSV enthält Zeilen mit Item-Bezeichnung (+ optional EAN, Kategorie, Preis)
2. Import-Logik: EAN-Match → direktes ShopListing; kein Match → neues Item anlegen
3. Alle importierten Offers erhalten `source=shop_upload`
4. Ergebnis-Report: X neue Items, Y gematchte Items, Z Fehlerzeilen

### Flow C — Spotted

1. Nutzer fotografiert Produkt/Preis an einem Ort
2. System legt Item (`source=spotted`) + ShopListing + Offer an
3. Kein Kuratierungsschritt erforderlich (⚠️ ANNAHME: das ist bereits so implementiert oder wird separat designed)
4. Bei nächstem Scrape-Lauf für denselben Shop: Offer wird überschrieben (source bleibt `spotted` → `scraper`)

### Flow D — Admin: Katalog pflegen

1. Admin sieht alle Items mit Quell-Info
2. Admin kann Item-Details editieren (Namen, Kategorien, Beschreibungen, Fotos)
3. Admin kann doppelte Items zusammenführen (Merge: ein Item behält alle ShopListings)
4. Admin kann Item-Status setzen (aktiv/inaktiv)

---

## 4. Screen- & Komponenten-Inventar

### Neue / geänderte Komponenten — Shop-Admin

| Komponente | Datei (neu oder ersetzt) | Zweck |
|-----------|--------------------------|-------|
| `ItemPickerModal` | `src/components/shop-admin/ItemPickerModal.tsx` | EAN-Scan / Freitext-Suche / Neu anlegen (Schritt 1 des Flows) |
| `ItemCreateForm` | `src/components/shop-admin/ItemCreateForm.tsx` | Inline-Formular innerhalb des Modals für neue Items |
| `OfferForm` *(ersetzt)* | `src/components/shop-admin/OfferForm.tsx` | Neu: Item-Picker integriert, `price_tiers`, optionaler Aktionszeitraum + Aktionstext |
| `OfferList` *(erweitert)* | `src/components/shop-admin/OfferList.tsx` | Zeigt gescrapte UND manuelle Offers, Quell-Badge, „Preis bearbeiten"-Aktion |
| `ItemPhotoUpload` *(ersetzt `ProductPhotoUpload`)* | `src/components/shop-admin/ItemPhotoUpload.tsx` | Multi-Foto-Upload, zeigt alle vorhandenen Item-Fotos |
| `ProductForm` *(entfällt)* | `src/components/shop-admin/ProductForm.tsx` | Wird durch OfferForm + ItemPickerModal ersetzt |
| `ProductList` *(entfällt)* | `src/components/shop-admin/ProductList.tsx` | Wird durch OfferList ersetzt |

### Neue / geänderte Seiten — Shop-Admin

| Route | Aktuell | Nach Refactor |
|-------|---------|---------------|
| `/shop-admin/offers` | Nur Shop-Owner-Aktionen | Alle Angebote (scraper + manuell), filterbar nach Quelle |
| `/shop-admin/offers/new` | Formular mit Pflicht-Datum | Stepper: Item wählen → Preis/Zeitraum |
| `/shop-admin/offers/[id]/edit` | Eingeschränkt | Vollständig editierbar inkl. Item-Wechsel |
| `/shop-admin/products` | Separate Produktverwaltung | **Entfällt** (merged in Offers) |
| `/shop-admin/products/new` | Separates Formular | **Entfällt** |
| `/shop-admin/products/[id]/edit` | Separates Formular | **Entfällt** |

### Geänderte Types — Frontend

| Datei | Änderung |
|-------|----------|
| `src/types/shop-admin.ts` | `AdminProduct` + `AdminOffer` → `AdminItem`, `AdminShopListing`, `AdminOffer` (unified) |
| `src/types/system-admin.ts` | `SysAdminProduct` + `SysAdminOffer` + `SysAdminShopOwnerOffer` → `SysAdminItem`, `SysAdminShopListing`, `SysAdminOffer` |
| `src/lib/shop-admin-api.ts` | Alle Produkt-Endpoints durch Item/ShopListing/Offer-Endpoints ersetzen |

### Admin-UI (System-Admin)

| Komponente/Route | Änderung |
|-----------------|----------|
| `/admin/products` | Zeigt Items (unified), Merge-Funktion |
| `/admin/shop-owner-offers` | Zeigt ShopListings + Offers, Quell-Filter |

---

## 5. Migration

⚠️ ANNAHME: Alle bestehenden Shop-Owner-Daten sind Testdaten → können verworfen werden.

**Was erhalten bleibt (kostbares Scraper-Erbe):**
- `SysAdminProduct` → wird zu `Item` (IDs/Slugs bleiben erhalten)
- `SysAdminOffer` → wird zu `ShopListing` + `Offer` (je ein Offer pro bisherigem SysAdminOffer, `source=scraper`)
- Kategorien, Übersetzungen, Brands → unverändert

**Was verworfen wird:**
- Alle `AdminProduct`-Datensätze (Testdaten)
- Alle `AdminOffer`-Datensätze (Testdaten)

**Backend-Anforderungen (für Architect/Backend-Team):**
- Neue Tabellen: `items`, `item_photos`, `shop_listings`, `offers` (mit `price_tiers` als JSONB oder Subtabelle)
- Migration: `products` → `items`, `scraped_offers` → `shop_listings`+`offers`
- Scraper-API: Endpoint-Vertrag muss `ShopListing`+`Offer` schreiben statt `product`+`offer`
- Neue Endpoints: `GET/POST /api/items?q=&ean=` (Item-Suche), `POST /api/shop-admin/shop-listings`, `POST /api/shop-admin/offers` (unified)

---

## 6. Backend-API-Impact

### 6.1 Scraper-API — kann sie bleiben?

**Empfehlung: Kurzfristig Adapter, mittelfristig versionieren.**

Der Scraper sendet heute (vermutlich) `{product: {...}, shop_id, price, sku, url, crawled_at}`. Die Semantik ändert sich kaum — es ist weiterhin „dieses Ding wird in diesem Shop zu diesem Preis angeboten". Das Backend kann mit einem **Adapter** die alte Payload auf die neuen Tabellen mappen:

| Alt (Scraper-Payload) | Neu (Tabelle) |
|-----------------------|--------------|
| `product.*` | `items.*` |
| `offer.sku` | `shop_listings.sku` |
| `offer.url` | `shop_listings.shop_url` |
| `offer.price` | `offers.price_tiers[0].steps[0].price` |
| `offer.stock_status` | `shop_listings.available` |
| `offer.crawled_at` | `offers.crawled_at` |

Vorteil: Scraper-Code bleibt unberührt. Nachteil: Adapter-Debt. Sobald stabil → neuer Endpoint `/api/v2/scraper/ingest` mit sauberem Vertrag, alter Endpoint wird deprecated.

### 6.2 Geänderte Backend-Endpoints (Übersicht)

| Endpoint alt | Endpoint neu | Änderung |
|-------------|-------------|---------|
| `GET /api/products` | `GET /api/items` | Umbenennung, gleiche Semantik |
| `GET /api/products/{slug}` | `GET /api/items/{slug}` | Umbenennung |
| `GET /api/shop-admin/products` | `GET /api/shop-admin/shop-listings` | Liefert ShopListings mit Item-Daten |
| `POST /api/shop-admin/products` | entfällt | Ersetzt durch Item-Suche + ShopListing-Anlage |
| `GET /api/shop-admin/products/{id}` | `GET /api/shop-admin/shop-listings/{id}` | |
| `PATCH /api/shop-admin/products/{id}` | `PATCH /api/shop-admin/shop-listings/{id}` | Nur noch `available`, `sku`, `shop_url` |
| `DELETE /api/shop-admin/products/{id}` | `DELETE /api/shop-admin/shop-listings/{id}` | |
| `GET /api/shop-admin/offers` | bleibt | Bietet jetzt unified Offers |
| `POST /api/shop-admin/offers` | erweitert | Pflicht-Feld `shop_listing_id` statt `product_id` |
| `PATCH /api/shop-admin/offers/{id}` | bleibt | Inkl. `price_tiers`, `offer_url` |
| — | `GET /api/items?q=&ean=&limit=` | **Neu:** Item-Suche für ItemPickerModal |
| — | `POST /api/items` | **Neu:** Item anlegen (Shop-Owner oder Admin) |
| — | `GET /api/items/{id}/attributes` | **Neu:** Attribute abrufen |
| — | `GET /api/shop-admin/shop-listings/{id}/attributes` | **Neu:** Shop-spezifische Attribute |

### 6.3 Customer-Facing API (Kunden-Frontend)

⚠️ ANNAHME: Die Kunden-API (`/api/products`, `/api/shops`) gibt Response-Shapes zurück, die unverändert bleiben können — Backend baut Views/Serializer die aus den neuen Tabellen die alte Response-Form liefern. Damit bleibt das Kunden-Frontend komplett unangetastet in dieser Phase.

❓ OFFEN: Gibt es bereits explizite API-Versioning-Strategie im Backend (`/api/v1/` vs unversioniert)? Das beeinflusst, wie der Scraper-Adapter gestaltet wird.

### 6.4 Spotted-Integration

Spotted ist vollständig implementiert (`spotted_worker.py`): Foto → EXIF+Vision → `_find_or_create_product()` → `Offer`. Schreibt heute direkt `Product` + `Offer` (altes Modell, ohne `ShopListing`-Layer).

Im Zuge dieser Migration muss `spotted_worker.py` auf das neue Modell umgestellt werden:
- `_find_or_create_product()` → `_find_or_create_item()` + `ShopListing` anlegen
- Spotted schreibt dann `Item` (source=`spotted`) + `ShopListing` + `Offer` (source=`spotted`)
- Falls Item per EAN/Name bereits existiert → nur `ShopListing` anlegen, kein neues Item

---

## 7. Acceptance Criteria

**AC-1 — Item-Suche per EAN:**
- Gegeben: Item mit EAN `4006381333931` im Katalog
- Wenn: Shop-Owner gibt EAN im Offer-Formular ein
- Dann: Item wird sofort vorgeschlagen, keine manuelle Suche nötig

**AC-2 — Item-Suche per Freitext:**
- Gegeben: Item mit Name „Fliesenlegung Standardformat" im Katalog
- Wenn: Shop-Owner sucht „Fliesen"
- Dann: Mind. 1 Treffer erscheint in der Vorschlagsliste

**AC-3 — Neues Item anlegen (ohne EAN):**
- Gegeben: Kein passendes Item gefunden
- Wenn: Shop-Owner klickt „Neu anlegen", gibt Name (DE) + Kategorie ein
- Dann: Neues Item mit `source=shop_manual` wird angelegt; sofort für andere Shops in der Suche sichtbar

**AC-4 — Offer mit Staffelpreis und Aktionszeitraum:**
- Gegeben: ShopListing für ein Item existiert
- Wenn: Shop-Owner erstellt Offer mit 2 Preis-Tiers + `valid_from=2026-05-01` + `valid_until=2026-05-31` + `title="Maifest"` 
- Dann: Offer wird gespeichert; Preis-Tiers und Validity sind im Frontend sichtbar

**AC-5 — Preishistorie erhalten:**
- Gegeben: Shop-Owner hat Offer mit Preis 10,00 €
- Wenn: Shop-Owner ändert Preis auf 12,00 €
- Dann: Altes Offer ist `archived=true`; neues Offer ist aktiv; Preishistorie zeigt beide Einträge

**AC-6 — Scraper-Schutz nach Shop-Owner-Edit:**
- Gegeben: Gescraptes Offer (source=scraper) für Shop A / Item B
- Wenn: Shop-Owner bearbeitet dieses Offer → neues Offer `source=shop_manual`
- Dann: Nächster Scraper-Lauf überschreibt dieses Offer **nicht**

**AC-7 — Scraper überschreibt ungeschütztes Offer:**
- Gegeben: Offer `source=scraper` für Shop A / Item B
- Wenn: Scraper sendet neuen Preis für dieselbe Shop/Item-Kombination
- Dann: Altes Offer archiviert, neues angelegt; kein Shop-Owner-Offer betroffen

**AC-8 — Multi-Foto-Upload:**
- Gegeben: Item mit 0 Fotos
- Wenn: Shop-Owner lädt 3 Fotos hoch
- Dann: Alle 3 Fotos in `ItemPhoto` mit `contributed_by_shop_id` gespeichert; im Frontend sichtbar

**AC-9 — Keine separate Produktverwaltung mehr:**
- Gegeben: Shop-Admin-Portal
- Wenn: Nutzer navigiert
- Dann: Es gibt keinen separaten `/shop-admin/products`-Bereich; alle Angebotsverwaltung läuft über `/shop-admin/offers`

**AC-10 — XLSX-Import mit Item-Matching:**
- Gegeben: XLSX mit 5 Zeilen, davon 2 mit bekannter EAN, 2 ohne Match, 1 fehlerhaft
- Wenn: Shop-Owner importiert die Datei
- Dann: Report zeigt: 2 gematcht, 2 neu angelegt, 1 Fehler; alle Offers `source=shop_upload`

**AC-11 — Bestehende Katalog-Items und Kategorien nach Migration erhalten:**
- Gegeben: X Items aus Scraper-Bestand vor Migration
- Nach Migration
- Dann: Alle X Items in `items`-Tabelle mit identischen Slugs/IDs; Kategorie-Zuordnungen erhalten

**AC-12 — Item-Attributes nach Migration erhalten:**
- Gegeben: Y `SysAdminProductAttribute`-Einträge vor Migration
- Nach Migration
- Dann: Alle Y Einträge in `item_attributes`-Tabelle mit identischer `item_id`, `attribute_key`, `attribute_value`

**AC-13 — Fuzzy-Match hard-block beim Item-Anlegen:**
- Gegeben: Item „Haarschnitt Damen kurz" im Katalog
- Wenn: Shop-Owner versucht „Haarschnitt Damen" neu anzulegen (kein EAN, Levenshtein-Distanz unter Schwellwert)
- Dann: System blockiert die Anlage und zeigt die ähnlichen Items zur Auswahl; Neu-Anlage ist erst möglich wenn kein Match mehr vorgeschlagen wird

**AC-14 — Item global deaktivieren:**
- Gegeben: Item mit `status=active`, das 3 ShopListings hat
- Wenn: Admin setzt `status=inactive`
- Dann: Item und alle zugehörigen Angebote sind im Kunden-Frontend nicht mehr sichtbar; ShopListings bleiben erhalten

**AC-15 — SKU auf ShopListing, nicht auf Item:**
- Gegeben: Shop A hat SKU `ABC-123` für Item „Fliese 30x30", Shop B dieselbe Fliese ohne SKU
- Dann: SKU ist an `ShopListing` von Shop A; Item hat keine SKU; Shop B's ShopListing bleibt davon unberührt

---

## 8. Entschiedene Designfragen (Protokoll)

| Frage | Entscheidung |
|-------|-------------|
| `ShopListingAttribute`-Schema | Kategorie-definierte Felder (analog `SysAdminCategoryAttributeDef`), nicht freitext |
| Fuzzy-Match Algorithmus | Levenshtein; System hard-block — kein Duplikat kann trotzdem angelegt werden |
| API-Versioning | Bleibt bei `/api/v1/`; kein Wechsel auf v2 in diesem Schritt |
| Spotted Schritt 3 | Vollständig implementiert; muss im Zuge dieser Migration auf neues Modell umgebaut werden |
| `Item.status=inactive` + neue ShopListings | ShopListing + Offer darf angelegt werden; solange `Item.status=inactive` bleibt, ist es für Kunden unsichtbar |

