# Architecture — Shop-Owner Produktfoto-Upload

**Slug:** `2026-04-24-shop-admin-product-photo-upload`
**Autor:** Architect
**Datum:** 2026-04-24
**Design:** [01-design.md](01-design.md)

---

## 0. Scope-Abgrenzung (vom User bestätigt)

- **IN SCOPE:** Upload, CRUD, Reorder, Delete für Produktfotos am Shop-Owner-Produkt. Backend speichert in **separater Tabelle** `shop_owner_product_images`. Neuer Upload-Endpoint mit `require_shop_owner`. Backend erzeugt Varianten über bestehende `generate_variants`-Pipeline. GC-Job für orphan images.
- **OUT OF SCOPE (separates Ticket):** AC-4 — Kund:innen-Sichtbarkeit von Shop-Owner-Produkten im öffentlichen Katalog. Die existierende `product_query.py` liefert weiterhin nur `Product`-Daten. Architektur hier bereitet das Foto-Datenmodell nur vor; die Spiegelung bzw. UNION-Query auf `ShopOwnerProduct` bleibt für eine vorgelagerte Design-Session.
- Die AC-4-Assertion bleibt im Design erhalten, wird in diesem Ticket aber **nicht** getestet und nicht implementiert.

---

## 1. Affected modules / files

### Frontend (`/Users/bb_studio_2025/dev/github/pundo_frontend`)

| Pfad | Änderung |
|---|---|
| `src/components/shop-admin/ProductPhotoUpload.tsx` | **NEU** — Upload + Thumbnail-Liste + Remove + Pfeil-Reorder. Orientiert sich an `LogoUpload.tsx`. |
| `src/components/shop-admin/ProductForm.tsx` | **Geändert** — integriert `ProductPhotoUpload` zwischen Kategorie und `PriceTierEditor`; hält `images`-State; sendet Reihenfolge/Remove-Operationen nach Produkt-Speicher-Schritt. |
| `src/components/shop-admin/ProductList.tsx` | **Geändert** — Thumbnail-Spalte links vom Namen (erstes Bild, Fallback leerer Platzhalter). |
| `src/types/shop-admin.ts` | **Geändert** — neues Interface `AdminProductImage` und neues Feld `images: AdminProductImage[]` auf `AdminProduct`. |
| `src/lib/shop-admin-translations.ts` | **Geändert** — neue Keys in allen 6 Sprachen (`en/de/el/ru/ar/he`). |
| `src/app/api/shop-admin/[...path]/route.ts` | **Unverändert** — Multipart-Proxy funktioniert schon; keine neue Datei nötig. |
| `src/app/shop-admin/products/new/page.tsx` | **Unverändert** — lädt bereits `ProductForm`. |
| `src/app/shop-admin/products/[id]/edit/page.tsx` | **Geändert** — Lade-Code muss `images` aus Backend-Response mitübergeben (falls nicht schon generisch). |

**Clean-Boundary-Regeln (hart):**
- `ProductPhotoUpload.tsx` und `ProductForm.tsx` importieren ausschließlich aus `src/components/ui/`, `src/types/shop-admin.ts`, `src/lib/shop-admin-translations.ts` und React-/Next-Primitives. Kein Import aus `src/components/product/`, `src/components/map/`, `src/components/search/`, `src/components/shop/`, `src/types/api.ts`, `src/lib/api.ts`.

### Backend (`/Users/bb_studio_2025/dev/github/pundo_main_backend`)

| Pfad | Änderung |
|---|---|
| `ingestor/models/shop_owner_product_image.py` | **NEU** — SQLAlchemy-Modell `ShopOwnerProductImage`. |
| `ingestor/models/shop_owner_product.py` | **Geändert** — Relationship `images` mit `order_by=sort_order` und `cascade="all, delete-orphan"`. |
| `ingestor/models/__init__.py` | **Geändert** — Export der neuen Klasse. |
| `ingestor/db/migrations/versions/h1b2c3d4e5f6_add_shop_owner_product_images.py` | **NEU** — Alembic-Migration (SHA/Timestamp frei wählbar; Revision-Chain fortsetzen). |
| `ingestor/schemas/shop_owner.py` | **Geändert** — `ProductImageResponse`, `ProductImagePatch` (sort_order), Extend `ProductResponse` um `images: list[ProductImageResponse]`. |
| `ingestor/api/shop_owner_products.py` | **Geändert** — `_to_response` liefert `images`; neue Sub-Endpoints `POST /products/{id}/images`, `DELETE /products/{id}/images/{image_id}`, `PATCH /products/{id}/images/{image_id}` (reorder). |
| `ingestor/api/shop_owner_products.py` | **Geändert** — globales Limit `MAX_IMAGES_PER_PRODUCT = 8`. |
| `ingestor/scripts/cleanup_orphan_images.py` | **Geändert** — zusätzliche SQL-Quelle: auch `shop_owner_product_images.url` als referenzierte Stems einsammeln (UNION mit `products.images`-JSONB). |
| `ingestor/tests/test_shop_owner_product_images_api.py` | **NEU** — pytest für neuen Endpoint. |
| `ingestor/tests/test_cleanup_scripts.py` | **Geändert** — Orphan-GC deckt auch Shop-Owner-Produktbilder ab. |

---

## 2. Data model changes

### 2.1 Neue Tabelle `shop_owner_product_images`

```sql
CREATE TABLE shop_owner_product_images (
    id            SERIAL PRIMARY KEY,
    product_id    INTEGER NOT NULL
                  REFERENCES shop_owner_products(id) ON DELETE CASCADE,
    url           TEXT NOT NULL,              -- card-variant URL (primär angezeigt)
    url_thumb     TEXT,                       -- 160px
    url_card      TEXT,                       -- 320px
    url_carousel  TEXT,                       -- 480px
    url_detail    TEXT,                       -- 1024px
    url_orig      TEXT,                       -- original (für Re-Processing)
    sort_order    INTEGER NOT NULL DEFAULT 0,
    sha256        CHAR(64),                   -- Dedup-Hash der Originalbytes
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_shop_owner_product_images_product_id
    ON shop_owner_product_images (product_id);
CREATE INDEX ix_shop_owner_product_images_sha256
    ON shop_owner_product_images (sha256);
CREATE UNIQUE INDEX ux_shop_owner_product_images_product_sort
    ON shop_owner_product_images (product_id, sort_order);
```

**Begründung:** Separate Tabelle (statt JSONB wie bei `Product.images` / `Shop.images`) — vom User explizit gewünscht, da sie zukünftige Erweiterungen (alt-text, published-status, pro-Bild-Metadaten, EXIF) ohne Migration erlaubt und stabile IDs für Edit/Delete pro Bild bereitstellt.

**Breaking change:** keiner — neue Tabelle, reine Erweiterung.

**Dateiablage:** Dateisystem-Pfad identisch zu bestehender Produktbild-Logik (`PRODUCT_IMAGE_DIR`, Default: `ingestor/product_images/`). SHA256-basierter Stem ermöglicht Dedup; Variants-Suffixe `_orig/_thumb/_card/_carousel/_detail`. Wiederverwendung von `ingestor.ingestion.product_image_ingestor.ingest_image` ist prüfenswert — dort Dedup+Variant-Pipeline schon implementiert; falls diese Funktion bereits alle fünf Varianten produziert, einfach aufrufen. Alternativ `generate_variants` direkt (wie in `shop_owner_shop.py`) mit vollem Variant-Set `{thumb,card,carousel,detail}`.

### 2.2 Änderung an `ShopOwnerProduct` Modell

```python
images: Mapped[list["ShopOwnerProductImage"]] = relationship(
    "ShopOwnerProductImage",
    cascade="all, delete-orphan",
    order_by="ShopOwnerProductImage.sort_order",
    lazy="selectin",
)
```

### 2.3 Frontend-Type

```ts
export interface AdminProductImage {
  id: number
  url: string          // primäre Anzeige-URL (card-Variante)
  sort_order: number
}

export interface AdminProduct {
  id: number
  name: string
  category_id: number
  available: boolean
  price_tiers: PriceTier[]
  images: AdminProductImage[]   // NEU
}
```

Frontend braucht die Varianten-URLs nicht — Backend liefert bereits den card-Link, Kund:innen-Seiten (falls später) greifen direkt auf DB-Daten.

---

## 3. API contracts

Alle Endpoints hinter `require_shop_owner`. Basis-Prefix: `/api/v1/shop-owner`. Proxy-Route des Frontends bleibt die bestehende Catch-All `/api/shop-admin/[...path]`.

### 3.1 `POST /api/v1/shop-owner/products/{product_id}/images`

**Request:** `multipart/form-data`
- `file`: `image/jpeg | image/png | image/webp`, ≤ 5 MB

**Responses:**
- `201 Created`
  ```json
  { "id": 42, "url": "/product_images/<sha>_card.webp", "sort_order": 3 }
  ```
- `400` — leere Datei / Datei zu groß / MIME-Type nicht erlaubt
- `403` — product_id gehört anderem Shop
- `404` — product_id existiert nicht
- `409` — Produkt hat bereits 8 Bilder (Limit erreicht) — Body `{ "detail": "max_images_reached" }`
- `415` — alternativ bei falschem MIME (UI fängt beides mit `product_photos_type_error`)

**Sort-Order-Regel:** neuer Upload erhält `sort_order = max(existing) + 1`. Erstes Bild bekommt `sort_order = 0`.

**Dedup:** SHA256-Hash. Falls derselbe Hash **für dieselben `product_id`** bereits existiert → vorhandener Datensatz wird zurückgegeben (idempotent). Bei anderem Produkt mit gleichem Hash → Datei wird nicht neu geschrieben (Dedup auf Disk), aber ein neuer DB-Eintrag entsteht (zählt separat zum Limit).

### 3.2 `DELETE /api/v1/shop-owner/products/{product_id}/images/{image_id}`

**Response:**
- `204 No Content`
- `403 / 404` analog

**Nicht** löscht Dateien sofort — GC-Job (cleanup_orphan_images) räumt weg.

### 3.3 `PATCH /api/v1/shop-owner/products/{product_id}/images/{image_id}`

**Request:**
```json
{ "sort_order": 0 }
```

**Response:** `200 OK` mit aktualisiertem `ProductImageResponse`. Falls `sort_order` bereits belegt → Backend re-normalisiert und schiebt andere Einträge (Transaktion + zweistufig: alle auf temporäre Negativ-Werte, dann final).

**Alternative (einfacher):** `PUT /products/{id}/images/reorder` mit `{ "order": [image_id_1, image_id_2, ...] }` — führt atomar alle `sort_order`-Updates aus. **Empfohlen**, da das Pfeil-UI sowieso die Gesamtreihenfolge kennt und so keine Unique-Constraint-Kollisionen auftreten.

### 3.4 Erweitertes `GET/POST/PATCH /products[/{id}]`

`ProductResponse.images: list[ProductImageResponse]` wird in allen bestehenden Product-Endpoints mitgeliefert. Keine Breaking Changes am POST/PATCH-Body — Fotos werden über die neuen dedizierten Endpoints verwaltet, nicht inline.

### 3.5 Frontend-Flow (Save-Sequence in `ProductForm`)

Bei **Create**:
1. `POST /products` → bekommt `{id}` zurück.
2. Für jedes lokal gecachte File: `POST /products/{id}/images` (sequenziell oder max 4 parallel).
3. Redirect auf `/shop-admin/products`.

Bei **Edit**:
1. `PATCH /products/{id}` mit scalar fields.
2. Neue Uploads: `POST /products/{id}/images`.
3. Entfernte Bilder: `DELETE /products/{id}/images/{image_id}`.
4. Reorder: `PUT /products/{id}/images/reorder` mit finaler ID-Liste.
5. `saveTiers(...)` wie bisher.

Beim initialen Mount im Edit-Modus werden bereits hochgeladene Fotos direkt als Server-URLs angezeigt.

---

## 4. Dependencies & integration points

- **Keine neuen Frontend-Libs** (kein DnD-Paket — Pfeil-Buttons MVP).
- **Backend:** `Pillow` ist bereits vorhanden (`generate_variants`). Keine neue Dependency.
- **Static serving:** Backend mountet bereits `/product_images` (siehe `main.py`); neue Bilder landen im selben Verzeichnis und sind ohne Zusatzkonfiguration öffentlich erreichbar.
- **Auth:** `require_shop_owner` (Cookie `shop_owner_token` → Proxy hängt `Authorization: Bearer` an).
- **Feature-Flag:** keiner — Feature ist additiv, Ausrollen über Deploy.
- **i18n:** 8 neue Keys × 6 Sprachen = 48 String-Einträge in `shop-admin-translations.ts`. RTL-Layout implizit via Tailwind `rtl:`-Modifier (flex-row-reverse für Thumbnail-Anordnung + Pfeil-Buttons).
- **GC-Job:** `cleanup_orphan_images.py` muss erweitert werden. Script bisher scannt nur `products.images` JSONB. Neu:
  - zweite SQL-Query auf `shop_owner_product_images` (Spalten `url`, `url_orig`, `url_thumb`, `url_card`, `url_carousel`, `url_detail`).
  - beide Stem-Sets werden vereinigt, dann Vergleich gegen `PRODUCT_IMAGE_DIR`.

---

## 5. Risks & mitigations

| Risiko | Mitigation |
|---|---|
| Upload bricht nach Produkt-Create ab → Produkt existiert ohne Foto, obwohl User es gewählt hat. | UI zeigt pro Foto Status (spinner/error); Retry auf einzelne Uploads möglich; Produkt wird nicht zurückgerollt (Foto ist optional, AC-2 erlaubt ≤ 10 s). |
| Unique-Constraint `(product_id, sort_order)` kollidiert bei naivem Reorder. | Reorder-Endpoint verwendet Zweistufen-Transaktion (temp-negativ, dann final) oder `PUT .../reorder` mit deferred constraint. Siehe §3.3. |
| GC-Job löscht versehentlich Bilder, die nur in `shop_owner_product_images` referenziert sind. | GC-Query erweitern (§4). Unit-Test in `test_cleanup_scripts.py` der explizit eine Shop-Owner-Bild-URL fixture anlegt und prüft, dass Datei nicht gelöscht wird. |
| 8-Bild-Limit am Backend wird durch schnelle parallele Uploads überschritten. | Transaktionaler Check: `SELECT COUNT(...) FOR UPDATE` im selben Tx-Scope wie INSERT; bei Race → 409. |
| Frontend rendert Blob-URL-Previews nach Server-Success nicht frei → Memory-Leak. | `URL.revokeObjectURL` im Cleanup der useEffect/onSuccess. |
| RTL-Pfeil-Buttons vertauschen „hoch/runter" oder „links/rechts" für `ar/he`. | Pfeil-Buttons sind **„hoch/runter"** (nicht „links/rechts"), da Liste vertikal gerendert. RTL ändert nur horizontale Thumbnail-Anordnung im Edit-Grid. |
| Breaking: bestehende `ProductResponse`-Consumers (z.B. OfferForm) brechen durch neues Feld. | Additives Feld mit Default `[]` — Pydantic akzeptiert Abwärtskompatibilität. Typescript: optional (`images: AdminProductImage[]` wird mit `?? []` initialisiert im Reader). |
| AC-4 (Kund:innen-Sichtbarkeit) wird vergessen. | Design-Doc hält AC-4 explizit als OUT-OF-SCOPE; separate Designer-Session wurde im Gespräch vereinbart. Architekt-Doc markiert das hier zusätzlich (§0). |

---

## 6. Task breakdown

Tasks in Ausführungsreihenfolge. Abhängigkeiten explizit vermerkt.

### Backend

**T1 — Model + Migration** *(deps: —)*
- `ingestor/models/shop_owner_product_image.py` anlegen.
- Relationship in `ShopOwnerProduct` + Export in `models/__init__.py`.
- Alembic-Migration `h…_add_shop_owner_product_images.py` mit Tabelle, Indexen, Unique-Constraint.
- `alembic upgrade head` lokal + auf `pundo_test` (Port 8500/DB pundo_test) verifizieren.

**T2 — Schemas** *(deps: T1)*
- `ProductImageResponse`, `ProductImageReorder` Schemas in `ingestor/schemas/shop_owner.py`.
- `ProductResponse.images: list[ProductImageResponse] = []` ergänzen.
- `_to_response(product)` in `shop_owner_products.py` liefert `images`.

**T3 — Upload-Endpoint** *(deps: T2)*
- `POST /shop-owner/products/{id}/images` in `shop_owner_products.py`.
- Validierung: MIME-Type, ≤ 5 MB, Limit 8 Bilder, Ownership-Check.
- SHA256-Hash berechnen, `generate_variants(...)` mit Default-Variant-Set, DB-Insert mit `sort_order = current_max + 1`.
- Rückgabe `ProductImageResponse`.

**T4 — Delete- und Reorder-Endpoints** *(deps: T3)*
- `DELETE /shop-owner/products/{pid}/images/{iid}`
- `PUT /shop-owner/products/{pid}/images/reorder` mit `{ order: [id, ...] }` (atomar mit Deferred-Constraint oder Zweistufen-Update).

**T5 — pytest** *(deps: T4)*
- `ingestor/tests/test_shop_owner_product_images_api.py` — deckt Happy-Path, Limit, Ownership-403, Dedup, Reorder, Delete, 400/415-Cases.
- Gegen `pundo_test` laufen lassen.

**T6 — GC-Erweiterung** *(deps: T1)*
- `cleanup_orphan_images.py` UNION-Query gegen `shop_owner_product_images`.
- `test_cleanup_scripts.py` erweitern: Fixture mit Shop-Owner-Foto darf nicht gelöscht werden.

### Frontend

**T7 — Types + Translations** *(deps: —, parallel zu T1)*
- `src/types/shop-admin.ts`: `AdminProductImage`, `images`-Feld auf `AdminProduct`.
- `src/lib/shop-admin-translations.ts`: neue Keys in allen 6 Sprachen:
  - `product_photos`, `product_photos_add`, `product_photos_remove`, `product_photos_move_up`, `product_photos_move_down`, `product_photos_size_error`, `product_photos_type_error`, `product_photos_upload_error`, `product_photos_hint`, `product_photos_limit_error` (für 409).

**T8 — `ProductPhotoUpload` Komponente** *(deps: T7)*
- Datei `src/components/shop-admin/ProductPhotoUpload.tsx` — Client-Komponente.
- Props: `productId?: number` (optional bei Create — dann Upload erst nach Save), `images: AdminProductImage[]`, `onChange(images)`, `lang`.
- Intern: File-Picker (`accept="image/jpeg,image/png,image/webp"`), lokale Blob-Preview-Queue, Thumbnail-Liste mit Remove-Button und Up/Down-Pfeilen, Inline-Fehler.
- Nur Imports aus `src/components/ui/`, `@/lib/shop-admin-translations`, `@/types/shop-admin` (AC-10).
- Clean-up: `URL.revokeObjectURL` für Blob-Previews bei Unmount/Success.

**T9 — Integration in `ProductForm`** *(deps: T8)*
- Rendern zwischen Kategorie und `PriceTierEditor`.
- Upload-Strategie:
  - **Create:** Fotos zunächst lokal im State halten (`pendingFiles: File[]`), nach erfolgreichem `POST /products` die Uploads sequenziell `POST /products/{id}/images` absetzen.
  - **Edit:** sofortiges Upload möglich (productId vorhanden). Diff-Operationen (new/removed/reorder) werden beim Save-Button-Klick an Backend synchronisiert.
- Reorder-Call am Ende via `PUT .../reorder`.

**T10 — ProductList Thumbnail** *(deps: T7)*
- `src/components/shop-admin/ProductList.tsx`: Thumbnail-Spalte vor Name. `product.images[0]?.url` oder leerer 48×48-Placeholder.
- RTL: Thumbnail springt dank Flex-Order nach rechts.

**T11 — E2E-Test** *(deps: T9, T10, T4)*
- Neue Datei `e2e/journeys/shop-admin-product-photo-upload.spec.ts` (oder erweitert bestehende `shop-admin-product-offer-ui.spec.ts`, je nach e2e-tester-Bewertung — siehe §7).
- Läuft gegen Port 3500/8500.
- Steps: Login Shop-Owner → `/shop-admin/products/new` → Upload JPG → Save → verifiziere Thumbnail in `/shop-admin/products` → Edit: Reorder → Verifiziere via `GET /api/shop-admin/products/{id}`.
- Validierungs-Cases: > 5 MB, falscher MIME.

**T12 — Smoke in den 6 Sprachen** *(deps: T9)*
- Erweiterung von `e2e/language-smoke.spec.ts` um einen Durchlauf auf `/shop-admin/products/new`, das die Upload-Label-Strings pro Sprache prüft (AC-9). Kein echter Upload nötig.

---

## 7. Journey-Deltas (e2e catalog)

Gelesen: `/Users/bb_studio_2025/dev/github/pundo_frontend/e2e/journeys/CATALOG.md`.

**Betroffene existierende Journeys:**

- **`shop-owner-full-lifecycle`** (implemented, P1) — deckt Shop-Owner-Lifecycle inkl. UI-Kombi-Matrix und hält bereits Fixture `product-fixed` („Produkt MIT Foto") bzw. `product-on-request` („Produkt OHNE Foto"). Der Foto-Upload-Pfad im Shop-Admin-Portal wird dort **nicht** getestet (Fotos sind dort nur Backend-seitig gesetzt). → **touches-modules erweitern** um `src/components/shop-admin/ProductPhotoUpload.tsx` und `src/components/shop-admin/ProductForm.tsx` — Drift-Risiko.

**Vorschlag neuer Journey-Eintrag** (vom Coder nach Heuristik H4/H2 anzulegen, mit User-Bestätigung):

```yaml
id: shop-admin-product-photo-upload
title: Shop-Admin Produktfoto-Upload (CRUD + Reorder)
status: proposed
priority: P2
owner-agent: architect
proposed-in-spec: 2026-04-24-shop-admin-product-photo-upload
touches-modules:
  - src/components/shop-admin/ProductPhotoUpload.tsx
  - src/components/shop-admin/ProductForm.tsx
  - src/components/shop-admin/ProductList.tsx
  - src/app/shop-admin/products/**
  - src/app/api/shop-admin/[...path]/route.ts
touches-roles:
  - shop-owner
```

**Body (Runbook):**
1. Login Shop-Owner, navigiere zu `/shop-admin/products/new`.
2. Upload JPG ≤ 5 MB → Preview erscheint → Backend-URL ersetzt Preview innerhalb 10 s.
3. Produkt speichern → in Liste ist Thumbnail sichtbar.
4. Edit öffnen → zweites Bild hochladen → Pfeil-up auf Bild 2 → speichern.
5. `GET /api/shop-admin/products/{id}` liefert `images[0].id == second_uploaded_id`.
6. Edge: Datei 6 MB → Inline-Fehler, kein Request.
7. Edge: 9. Upload → 409 + `product_photos_limit_error`.

**Fixtures:** `product-photo-happy` (Shop-Owner approved + Shop + Category).

**Hinweis an e2e-tester:** Eintrag in `e2e/journeys/CATALOG.md` ergänzen, Journey-Datei `e2e/journeys/shop-admin-product-photo-upload.md` nach Lifecycle-Regeln anlegen (proposed → approved durch User-Bestätigung → erst Coder darf auf implemented setzen nach Commit).

---

## 8. Offene Punkte für den Coder

Keine blockierenden. Hinweise:
- Prüfe, ob `ingestor.ingestion.product_image_ingestor.ingest_image` genau die gewünschten fünf Varianten erzeugt — falls ja: wiederverwenden statt `generate_variants` direkt aufzurufen.
- Revision-ID der Alembic-Migration an die aktuelle Kette anhängen (letzte laut `versions/` ist `g0a1b2c3d4e5`; neuer Chain-Head `h…`).
- Endpoint-Pfad `PUT /products/{id}/images/reorder` statt per-Bild-`PATCH` bevorzugen, um Unique-Constraint-Races zu vermeiden.

---

Architecture complete at `specs/2026-04-24-shop-admin-product-photo-upload/02-architecture.md`. Ready for coder.
