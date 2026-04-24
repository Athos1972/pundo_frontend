# Shop-Owner Produktfoto-Upload

**Slug:** `2026-04-24-shop-admin-product-photo-upload`
**Autor:** Designer
**Datum:** 2026-04-24

---

## 1. Problem & Benutzer

Shop-Owner legen Produkte im Portal (`/shop-admin/products/new`) manuell an. Das bestehende Formular ([ProductForm.tsx](src/components/shop-admin/ProductForm.tsx)) unterstützt nur Name, Kategorie, Preis-Tiers und Verfügbarkeit — **keinen Bild-Upload**. Manuell angelegte Produkte erscheinen dadurch für Endkund:innen ohne Foto, während per Scraper oder XLS-Import erzeugte Produkte Bilder tragen (Feld `images` vom Typ [`ProductImages`](src/types/api.ts:3)). Das Ziel: Shop-Owner können Produktfotos hochladen; die manuell angelegten Produkte sehen in Listen, Karten und Detailansichten **visuell identisch** zu gescrapten/importierten Produkten aus (thumbnail, card, carousel, detail).

Zielnutzer:
- **Shop-Owner** (primär) — legen neue Produkte via Portal an und wollen ein oder mehrere aussagekräftige Fotos hinzufügen.
- **Endkund:innen** (sekundär) — erwarten in Produktlisten, Shop-Detailseiten und Produktdetail ein Foto, unabhängig von der Herkunft des Datensatzes.

---

## 2. User Flows

### 2.1 Happy Path — Foto beim Anlegen hochladen

1. Shop-Owner öffnet `/shop-admin/products/new`.
2. Im Formular ist zwischen „Kategorie" und „Preis-Tiers" ein neuer Block **„Produktfotos"** sichtbar.
3. Owner klickt den Upload-Button → Dateiauswahl öffnet sich (Accept: `image/jpeg, image/png, image/webp`).
4. Owner wählt ein Foto (≤ 5 MB).
5. Lokale Vorschau erscheint sofort; im Hintergrund läuft Upload über `/api/shop-admin/products/images` (Proxy-Route).
6. Nach Erfolg wird die zurückgegebene URL in einer Bild-Liste am Formular-State gehalten; die Vorschau wechselt von Blob auf Server-URL.
7. Owner klickt „Speichern". Produkt wird mit `images: [{url, sort_order}, ...]` angelegt, Redirect auf `/shop-admin/products`.
8. In der Produktliste (Admin) erscheint das Thumbnail; in allen Kund:innen-Ansichten erscheint das Foto in gleicher Form wie bei gescrapten Produkten.

### 2.2 Foto nachträglich ergänzen / ersetzen

1. Owner öffnet `/shop-admin/products/[id]` (Edit).
2. Bereits hochgeladene Fotos werden als Thumbnails mit Entfernen-Button angezeigt; Reihenfolge per Drag oder Pfeil-Buttons änderbar.
3. Owner kann weitere Fotos hinzufügen (bis Max) oder einzelne entfernen.
4. Speichern → `PATCH /products/{id}` mit aktualisiertem `images`-Array.

### 2.3 Edge Cases

- **Datei zu groß (> 5 MB):** Inline-Fehler unter dem Upload-Feld (Reuse-Text `logo_upload_size_error`-Analog). Keine Vorschau. Formular bleibt absendbar (Foto optional).
- **Falscher MIME-Type:** Browser-Filter via `accept=`, Backend validiert zusätzlich. Bei 415 inline-Fehler.
- **Upload-Netzwerkfehler:** Vorschau wird entfernt, inline-Fehler, Retry möglich. Restliches Formular bleibt unberührt.
- **Produkt speichern ohne Foto:** weiterhin erlaubt — Kund:innen-Ansicht fällt auf vorhandenes Kategorie-/Placeholder-Bild zurück (wie heute). ⚠️ ANNAHME: Foto bleibt optional, nicht required.
- **Mehrere Uploads gleichzeitig:** Queue; UI zeigt pro Bild Spinner. ⚠️ ANNAHME: paralleler Upload max. 4 gleichzeitig.
- **Bereits existierendes Foto (SHA256-Dedup im Backend):** UI merkt nichts, erhält dieselbe URL zurück.

---

## 3. Screen / Component Inventory

| Element | Typ | Zweck |
|---|---|---|
| `ProductPhotoUpload` | neue React-Komponente in `src/components/shop-admin/` | Upload + Thumbnail-Liste + Entfernen + Sortieren. Orientiert sich an [`LogoUpload.tsx`](src/components/shop-admin/LogoUpload.tsx). |
| `ProductForm.tsx` | geändert | Integration von `ProductPhotoUpload` zwischen Kategorie und PriceTierEditor. Hält `images: {url, sort_order}[]` im State; sendet beim POST/PATCH mit. |
| `AdminProduct` Typ | geändert in [src/types/shop-admin.ts](src/types/shop-admin.ts) | Neues Feld `images: AdminProductImage[]` (Minimal: `{url: string; sort_order: number}`). |
| `AdminProductImage` | neu | `{url: string; sort_order: number}` — flaches Shape, keine Varianten-URLs im Owner-Portal (Backend liefert Varianten). |
| `ProductList.tsx` | geändert | Thumbnail-Spalte in der Admin-Liste zeigt erstes Foto (analog zu ShopList). |
| Proxy-Route `/api/shop-admin/products/images` | keine neue Datei nötig | Bereits abgedeckt durch bestehenden Catch-All-Proxy [\[...path\]/route.ts](src/app/api/shop-admin/[...path]/route.ts); leitet Multipart 1:1 weiter. |
| Translation-Keys | geändert in `src/lib/shop-admin-translations.ts` | Neue Keys: `product_photos`, `product_photos_add`, `product_photos_remove`, `product_photos_reorder`, `product_photos_size_error`, `product_photos_type_error`, `product_photos_upload_error`, `product_photos_hint`. Alle 6 Sprachen (en/de/el/ru/ar/he). |
| Backend (separates Repo) | siehe §5 OFFEN | Modell `ShopOwnerProduct` braucht ein `images`-Feld; Endpoint für Upload + CRUD. |
| Customer-Oberflächen | unverändert | Nutzen weiterhin [`ProductImages`](src/types/api.ts:3) + [`pickImg`](src/lib/utils.ts) — manuelle Produkte liefern identische Shape, damit [`ProductCard.tsx`](src/components/product/ProductCard.tsx), [`ProductHeroImage.tsx`](src/components/product/ProductHeroImage.tsx) usw. sie nicht unterscheiden. |

---

## 4. Acceptance Criteria (testbar)

**AC-1 — Upload-Block im Neu-Formular sichtbar**
GIVEN Shop-Owner ist eingeloggt
WHEN Owner `/shop-admin/products/new` öffnet
THEN ist ein Block mit Label „Produktfotos" und Button „Bild hochladen" sichtbar, zwischen Kategorie-Auswahl und Preis-Tiers.

**AC-2 — Foto-Upload erfolgreich**
GIVEN Owner hat eine gültige JPG/PNG/WebP-Datei ≤ 5 MB
WHEN Owner die Datei auswählt
THEN erscheint innerhalb von 500 ms eine lokale Vorschau UND binnen ≤ 10 s die Server-URL als Thumbnail in der Liste
AND die Vorschau bleibt nach Wechsel der Quelle (blob→http) bestehen.

**AC-3 — Produkt mit Foto speichern**
GIVEN Owner hat ≥ 1 Foto hochgeladen
WHEN Owner das Formular mit Name absendet
THEN wird das Produkt angelegt
AND `GET /api/shop-admin/products/{id}` liefert das Feld `images` mit der Foto-URL in richtiger `sort_order`.

**AC-4 — Kund:innen-Ansicht zeigt Foto identisch**
GIVEN ein manuell angelegtes Produkt mit Foto-URL `X`
WHEN ein:e Endkund:in das Produkt in Liste oder Detail aufruft
THEN wird das Foto via denselben Komponenten gerendert wie bei gescrapten Produkten (`ProductCard`, `ProductHeroImage`) — gleiche Größe, gleicher Platzhalter-Fallback, keine sichtbare Unterscheidung in DOM-Struktur oder CSS-Klasse.

**AC-5 — Foto im Edit-Modus entfernen**
GIVEN Produkt hat 2 Fotos
WHEN Owner im Edit-Formular auf „Entfernen" bei Foto 1 klickt und speichert
THEN liefert `GET /products/{id}` nur noch Foto 2 mit `sort_order=0`.

**AC-6 — Reihenfolge ändern**
GIVEN Produkt hat 3 Fotos
WHEN Owner Foto 3 an Position 1 zieht (oder per Pfeil hochordnet) und speichert
THEN entspricht `images[0].url` dem ursprünglich dritten Foto.

**AC-7 — Validierung Dateigröße**
GIVEN Owner wählt eine Datei > 5 MB
THEN erscheint inline die Fehlermeldung `product_photos_size_error`
AND keine Vorschau wird angezeigt
AND kein Request ging raus.

**AC-8 — Validierung Dateityp**
GIVEN Owner wählt eine `.pdf`-Datei (über File-Dialog mit „alle Dateien")
THEN zeigt das Backend 415/400; UI zeigt `product_photos_type_error`.

**AC-9 — i18n vollständig**
GIVEN Sprache ist gesetzt auf `en|de|el|ru|ar|he`
THEN sind alle sichtbaren Strings des Upload-Blocks in genau dieser Sprache vorhanden (keine englischen Fallbacks außer `en`).
AND bei `ar|he` ist Layout RTL (Reihenfolge der Thumbnails und Remove-Button spiegeln).

**AC-10 — Clean Boundary gewahrt**
WHEN TypeScript kompiliert
THEN importieren `ProductPhotoUpload.tsx` und `ProductForm.tsx` nichts aus `src/components/product/`, `src/components/map/`, `src/components/search/`, `src/components/shop/` oder `src/types/api.ts` (nur `src/components/ui/`, `src/types/shop-admin.ts`, `src/lib/shop-admin-*`).

**AC-11 — Accessibility**
GIVEN Owner nutzt Tastatur-Navigation
THEN sind Upload-Button, jedes Thumbnail, Remove-Button und Reorder-Controls per Tab erreichbar und per Enter/Space bedienbar
AND Screenreader liest pro Thumbnail „Produktfoto {n} von {N}".

---

## 5. Offene Fragen / Annahmen

❓ **OFFEN 1 — Backend-Schema:** `ShopOwnerProduct` hat aktuell **keine `images`-Spalte** ([shop_owner_product.py](../../../pundo_main_backend/ingestor/models/shop_owner_product.py)). Entscheidung nötig:
  - (a) Neue JSONB-Spalte `images` (`[{url, sort_order}]`) am Modell; ODER
  - (b) separate Tabelle `shop_owner_product_images`.
  Empfehlung aus Designer-Sicht: (a) — konsistent mit `Product.images` JSONB-Feld.

BB/24.4.: Neue Tabelle würde uns mehr Möglichkeiten bieten für Erweiterungen für mehrere Fotos.

❓ **OFFEN 2 — Upload-Endpoint:** Soll der bestehende interne Endpoint [`POST /api/v1/products/images/`](../../../pundo_main_backend/ingestor/api/product_images.py) für Shop-Owner freigegeben werden (andere Auth-Scope!) oder ein neuer `POST /api/v1/shop-owner/products/images` angelegt werden? Empfehlung: **neuer Endpoint** mit `require_shop_owner` — verhindert Auth-Scope-Mischung.

BB/24.4.: Ja, neuer Endpoint macht Sinn!

❓ **OFFEN 3 — Kund:innen-Sichtbarkeit:** Manuell angelegte `ShopOwnerProduct`s fließen derzeit **nicht** in die öffentliche Produktsuche/-Liste ([product_query.py](../../../pundo_main_backend/ingestor/api/product_query.py) greift nur auf `Product`). Ist das Sichtbarmachen Teil dieser Aufgabe? Der Ticket-Text („sollen für Benutzer wie scraped aussehen") impliziert **Ja**. Falls ja: Architekturentscheidung, ob ShopOwnerProducts in `Product` gespiegelt werden oder per UNION-Query ausgeliefert. Das **verdoppelt den Scope** erheblich. → Muss vor /architect geklärt werden.

BB/24.4.: Aus User-Sicht ist es unerheblich, ob ein Shopowner das Produkt angelegt hat oder via Schnittstelle eingespielt wurde oder gescrape Datenquelle --> Shopowner-Produkte müssen sich aus Anwender-Sicht genau wie Produkte verhalten. Eventuell ist das eine separate, vorgelagerte Designer-Session?

❓ **OFFEN 4 — Max. Anzahl Fotos:** 1, 5, 10? ⚠️ ANNAHME (Designer): **max. 8 Fotos** pro Produkt — gleich zu gescrapten Produkten in der Praxis.

BB/24.4.: OK. 

❓ **OFFEN 5 — Drag & Drop fürs Sortieren:** Volles DnD (Bibliothek) oder nur Pfeil-Buttons (kein neuer Dep)? ⚠️ ANNAHME: Pfeil-Buttons v1, DnD v2.

BB/24.4.: Pfeil für MVP OK!

❓ **OFFEN 6 — Crop/Zuschnitt:** Kein Zuschnitt im Frontend; Backend erzeugt Varianten (thumb/card/carousel/detail/orig) wie bei Shop-Logo (siehe `shop_owner_shop.py` Logo-Pipeline). ⚠️ ANNAHME: Backend-seitiges Resizing bestehender Logo-Pipeline wird für Produktbilder wiederverwendet.

BB/24.4.: Ja.

❓ **OFFEN 7 — Löschung verknüpfter Dateien:** Wenn Owner Foto entfernt, soll die Datei sofort oder via GC-Job gelöscht werden? ⚠️ ANNAHME: GC-Job (orphan-cleanup-Analog existiert bereits).

BB/24.4.: GC-Job klingt gut!

---

Design complete at `specs/2026-04-24-shop-admin-product-photo-upload/01-design.md`. Ready for /architect.
