# Shop-Owner Portal

Das Shop-Owner Portal ermöglicht Ladenbesitzern, ihren Shop eigenständig auf Pundo zu verwalten: Profil, Produkte, Angebote, Öffnungszeiten, Importe und API-Keys.

Das Portal lebt unter `/shop-admin/*` im Frontend und nutzt eigene Backend-Endpunkte unter `/api/v1/shop-owner/*`.

**Backend-Referenz:** [`pundo_main_backend/docs/shop-owner-portal.md`](../../pundo_main_backend/docs/shop-owner-portal.md)

---

## Nutzer-Journey

```
1. Registrierung (/shop-admin/register)
      ↓ E-Mail-Verifizierung (/shop-admin/verify-email?token=...)
2. Warten auf Admin-Freischaltung (/shop-admin/pending-approval)
      ↓ Admin genehmigt via Backend-CLI / Admin-API
3. Login (/shop-admin/login)
      ↓
4. Portal: Dashboard → Profil → Öffnungszeiten → Produkte → Angebote → Import → API-Keys
```

---

## Auth-Flow

| Schritt | Route | Backend-Endpunkt |
|---|---|---|
| Registrierung (Onboarding-Wizard) | `/shop-admin/onboarding` (`/shop-admin/register` leitet dorthin um) | `POST /api/v1/shop-owner/onboarding` (via `/api/shop-admin/onboarding`) |
| E-Mail bestätigen | `/shop-admin/verify-email` | `POST /api/v1/shop-owner/verify-email` |
| Warten auf Freischaltung | `/shop-admin/pending-approval` | — |
| Login | `/shop-admin/login` | `POST /api/v1/shop-owner/login` |
| Logout | (Button in Sidebar) | `POST /api/v1/shop-owner/logout` |

**Cookie:** Nach Login setzt das Backend einen HttpOnly-Cookie `shop_owner_token` (JWT, 7 Tage).  
Das Frontend liest diesen Cookie **nicht per JavaScript** — Next.js Route Handler lesen ihn via `next/headers` und leiten ihn als `Authorization: Bearer`-Header ans Backend weiter.

**Status-Codes:**
- `401` → nicht eingeloggt → Redirect zu `/shop-admin/login`
- `403` → eingeloggt, aber noch nicht freigeschaltet → Redirect zu `/shop-admin/pending-approval`

---

## Route-Struktur

```
src/app/(shop-admin)/shop-admin/
├── login/                  ← öffentlich, kein Auth-Guard
├── register/               ← öffentlich (Redirect → onboarding; check-email/)
├── onboarding/             ← öffentlich: Registrierungs-Wizard
├── auth/callback/          ← öffentlich: Google-OAuth-Callback
├── verify-email/           ← öffentlich
├── pending-approval/       ← öffentlich
└── (portal)/               ← Auth-Guard: JWT-Cookie erforderlich
    ├── layout.tsx          ← Prüft Cookie + Owner-Status, rendert AdminShell
    ├── dashboard/          ← Startseite mit Kacheln
    ├── profile/            ← Shop-Profil + gesprochene Sprachen
    ├── hours/              ← Öffnungszeiten-Editor
    ├── offers/             ← Produkte/Dienstleistungen + Preise (Item+Offer-Modell), Neu/Bearbeiten
    ├── products/           ← Legacy-Routen (nicht mehr in der Navigation)
    ├── catalog-review/     ← Katalog-Review-Fälle ([caseId])
    ├── import/             ← Excel/CSV-Upload + Google Sheets
    ├── api-keys/           ← API-Key-Verwaltung
    ├── reviews/            ← Bewertungen des Shops und seiner Produkte (?scope=shop|products)
    ├── settings/           ← Einstellungen
    └── help/               ← Hilfe
```

Die Navigation ist in `src/components/shop-admin/AdminNav.tsx` (`navItems`) definiert — bei neuen Seiten dort abgleichen.

Zusätzlich fängt `src/proxy.ts` Requests ohne `shop_owner_token` ab (Ausnahmen: `PUBLIC_SHOP_ADMIN_PATHS`). Die `(portal)/layout.tsx` ist das **Auth-Guard** — sie prüft das Cookie bzw. den Owner-Status und leitet weiter (`pre_signup` → onboarding, `pending` → pending-approval, sonst → `/shop-admin/login`).

---

## API-Proxy

Client-seitige Mutations (PATCH, POST, DELETE) aus dem Portal gehen **nicht direkt** an das Backend, sondern durch einen Next.js Route Handler:

```
Browser → POST /api/shop-admin/shop
  ↓ (Next.js Route Handler: src/app/api/shop-admin/[...path]/route.ts)
  liest shop_owner_token aus next/headers
  ↓ Forward als Authorization: Bearer <token>
Backend: PATCH /api/v1/shop-owner/shop
```

So bleibt der JWT-Token im HttpOnly Cookie — er verlässt nie den Server-seitigen Code.

---

## Portal-Bereiche

### Profil (`/shop-admin/profile`)
- Shop-Name, Beschreibung, Logo-URL, Adresse
- Gesprochene Sprachen (Toggle-Chips) → [`shop-languages.md`](./shop-languages.md)
- PATCH `/api/v1/shop-owner/shop`

### Öffnungszeiten (`/shop-admin/hours`)
- 7 Wochentage + optionaler zweiter Zeitslot (z.B. Mittagspause)
- "Geschlossen"-Toggle pro Tag
- PUT `/api/v1/shop-owner/shop/hours` (vollständiges Ersetzen — kein Partial-Update)

### Produkte (`/shop-admin/products`)
- Liste aller Produkte des Shops
- Anlegen, Bearbeiten, Löschen
- Felder: Name, Kategorie, Preis, Währung, Einheit, Verfügbarkeit
- Endpunkte: `GET/POST/PATCH/DELETE /api/v1/shop-owner/products`

### Angebote (`/shop-admin/offers`)
- Aktive und abgelaufene Angebote (Tab-Switcher)
- Angebote mit Gültigkeitsfenster (`valid_from`, `valid_until`)
- Archivieren statt Löschen (aktive Angebote können nicht direkt gelöscht werden)
- Endpunkte: `GET/POST/PATCH/DELETE /api/v1/shop-owner/offers`

### Fotos zu Produkten/Dienstleistungen (B5900-009)
- Ort: Schritt 2 „Preis & Details“ des Angebotsformulars (`OfferForm`) — für Neuanlage (nach „Neues Item anlegen“ / Item-Auswahl) und auf `/shop-admin/offers/[id]/edit`. Komponenten: `OfferItemPhotos` (lädt Fotos) → `ItemPhotoUpload` (UI).
- Limits: max. 8 Fotos pro Item, JPEG/PNG/WebP, 5 MB. Große Handyfotos werden clientseitig verkleinert (`src/lib/shop-admin-image-resize.ts`, max. 2560 px). Mehrfachauswahl möglich; mobil Kamera und Galerie (kein `capture`).
- Regeln: Das erste Foto ist das Titelbild für Kunden. Löschen / „Als Titelbild“ nur bei Fotos des eigenen Shops (`contributed_by_shop_id === shop_id`). „Als Titelbild“ nur, wenn alle Fotos des Items eigene sind (gemeinsam genutzte Items: Hinweis statt Button).
- Endpunkte (über Proxy `/api/shop-admin/items/...`): `GET /items/{id}`, `POST /items/{id}/photos` (multipart `file`), `DELETE|PATCH /items/{id}/photos/{photo_id}`.

### Kategorie-Auswahl (B5900-011)
- Ort: Formular „Neu anlegen“ (`ItemCreateForm`, im `ItemPickerModal`). Komponente: `CategoryPicker` (inline, kein verschachteltes Modal); Fetch-Helper `src/lib/shop-admin-categories.ts`; Texte `src/lib/i18n/shop-admin-category-picker.ts` (Präfix `category_picker_`).
- Taxonomie nach Typ: Produkt = Google Product Taxonomy, Dienstleistung = UNSPSC. Typwechsel verwirft eine gewählte Kategorie der anderen Taxonomie.
- Bedienung: (1) Vorschläge aus dem Artikelnamen (Debounce 400 ms, Tap wählt aus), (2) Suche (`type="search"`, ab 2 Zeichen, relevanzsortiert), (3) „Alle Kategorien durchsuchen“ (Drill-down, auch Zwischenebenen wählbar). Namen und Pfade in der UI-Sprache, `E2E-*`-Fixtures und die Wurzel „Mature“ sind ausgeblendet (per Suche/Vorschlag weiter erreichbar).
- Endpunkte (über Proxy): `GET /api/shop-admin/categories?item_type=&parent_id=&q=&limit=` und `GET /api/shop-admin/categories/suggest?name=&item_type=`. `POST /items` mit unbekannter `category_id` → 422 `invalid_category` (Auswahl wird zurückgesetzt).
- E2E-Helper: `e2e/journeys/_helpers/category-picker.ts` (`pickCategory`); Spec `e2e/journeys/b5900-011-category-picker.spec.ts`.

### Import (`/shop-admin/import`)
Zwei Import-Wege (F5920: wiederholbar, mit Vorschau):

**Excel/CSV-Upload (`ImportPanel`):**
1. Datei wählen (`.xlsx`, `.xls`, `.csv`, max. 20 MB). Optional **vorher** das Kästchen „Diese Datei ist meine komplette Liste“ setzen (dann werden Import-Artikel, die in der Datei fehlen, auf „nicht verfügbar“ gesetzt; nichts wird gelöscht).
2. `useImportPreview` lädt die Datei hoch (`POST /api/shop-admin/import/previews`, `full_list`, `default_lang` = UI-Sprache) und pollt die Analyse (`GET /import/previews/{id}`, Intervalle 1/2/3 s, Obergrenze 5 min). Es wird **nichts gespeichert**.
3. `ImportPreview`: Zähler-Kacheln (Neu · Aktualisiert · Unverändert · Fehler · Mögliche Duplikate · bei kompletter Liste „Werden auf ‚nicht verfügbar‘ gesetzt“), Statusfilter, Zeilen (Karten mobil, Tabellenraster ab `md`), Seiten à 100 mit „Mehr anzeigen“. Mögliche Duplikate: pro Zeile Auswahl „Bestehenden Artikel verwenden“ (Name, Foto, Ähnlichkeit) oder „Als neuen Artikel anlegen“ (Standard).
4. **Alles oder nichts:** Solange die Vorschau Fehlerzeilen enthält, ist „Übernehmen“ deaktiviert; jede Fehlerzeile zeigt ihre übersetzte Ursache (`row_error_<code>`).
5. „Übernehmen“ → `POST /import/previews/{id}/apply` mit `decisions`, Polling bis `applied`; `ImportResult` zeigt die Zähler und den Link „Zu meinen Angeboten“ (`/shop-admin/offers`, Bypass-Pfad ohne Sprachpräfix). „Abbrechen“ → `DELETE /import/previews/{id}`, leeres Formular.
- Spalten: `sku, name, language, ean, category, available, price, currency, image_url` (Feldkatalog `FieldCatalog`, Vorlage vom Backend). Wiedererkennung: SKU → EAN → exakter Name (eigener Shop).
- Fehler: Datei-Fehler kommen synchron als `detail.code` (`unsupported_format`, `xlsx_unreadable`, `xls_unreadable`, `csv_unreadable`, `missing_name_column`, `empty_file`, `too_many_rows` + `limit`, `file_too_large`, `preview_in_progress`), Job-Fehler als `error_code` (`job_lost`, `preview_stale`, `apply_failed`, `preview_failed`); alle Texte in `src/lib/i18n/shop-admin-import.ts` (6 Sprachen, Parität: `npm run lint:i18n`).
- Vorschau läuft 30 Minuten; danach „Vorschau abgelaufen, bitte erneut hochladen“ (410).

**Google Sheets (Sync):**
- Öffentliche Google-Sheets-URL hinterlegen (`default_lang` = UI-Sprache wird mitgeschickt; Namen ohne Spalte `language` werden in dieser Sprache gespeichert)
- Automatischer Sync alle 4 Stunden (Backend-Cron), manueller Re-Sync per Button (`?lang=`)
- Das Sheet muss öffentlich lesbar sein („Jeder mit dem Link: Betrachter“); sonst `error_code: sheet_not_public`
- Gleiche Wiedererkennung wie beim Datei-Import; im Sheet fehlende Import-Artikel werden **immer** auf „nicht verfügbar“ gesetzt. Mögliche Duplikate werden als neuer eigener Artikel angelegt und aufklappbar gemeldet.
- Sync-Status: „Letzter Sync: <Zeit> · OK“ plus Zähler (neu · aktualisiert · deaktiviert · Fehler) über `ImportCountTiles` (kompakt). Bei fehlerhaften Zeilen wird nichts importiert und nichts deaktiviert (Status `error`, `last_sync_result.errors` listet jede Zeile, max. 50).
- `GET /import/status` liefert `last_sync_result` { imported, created, updated, unchanged, deactivated, possible_duplicates, possible_duplicate_rows[{row,name}], row_count, error_count, errors[{row, code, message}], errors_truncated, image_download_pending, error_code }; Fehlercodes: `sheet_url_invalid | sheet_fetch_failed | sheet_not_public | rows_failed | sync_failed | empty_sheet | missing_name_column | too_many_rows`
- Bild-Status wird nach Übernehmen/Sync mit Backoff (max. 2 min) abgefragt

**Artikelnummer (SKU) im Angebot:** `OfferList` zeigt die SKU (`listing_sku`, `dir="ltr"`) und ein Badge „Nicht verfügbar“ (`listing_available === false`). `OfferForm` hat das Feld „Artikelnummer (SKU)“. **Bearbeiten:** Speichern per `PATCH /api/shop-admin/shop-listings/{id}` **vor** dem Angebot (zweistufig, AK 22). **Neu anlegen:** die SKU geht atomar im Body von `POST /api/shop-admin/offers` mit (nur wenn geändert; `null` = entfernen, fehlt = unverändert), es gibt keinen Listing-PATCH mehr, ein Abbruch oder Fehler hinterlässt keine verwaiste SKU. Hat der gewählte Artikel schon ein Listing (`409 listing_exists` im `ItemPickerModal`, Detail enthält `sku`), ist das Feld mit dessen SKU vorbelegt. In beiden Pfaden zeigt ein `409 sku_conflict` eine Feldmeldung und speichert nichts.

**System-Admin:** `/admin/offers` zeigt Artikel, Listing, SKU, Titel, Quelle, Archiv-Status und filtert nach `q`, `shop_listing_id` und `sku`; `/admin/offers/{id}/edit` ändert die SKU des Listings (409/422 als Feldfehler, EN/EL). Angebote werden dort nicht angelegt (`/admin/offers/new` zeigt nur einen Hinweis). `/admin/shop-owner-offers` zeigt Listing-ID und SKU (nur lesen).

→ Backend-Details: [`pundo_main_backend/docs/shop-owner-portal.md`](../../pundo_main_backend/docs/shop-owner-portal.md) — Abschnitt "Import"

### Bewertungen (`/shop-admin/reviews`, F5930)

Der Owner sieht die Bewertungen seines Shops (Tab „Mein Shop“) und der Artikel, die sein Shop listet (Tab „Meine Produkte“, alle Listings). Die Tabs sind Links (`?scope=shop|products`, SSR). **Antworten** gibt es nur auf Shop-Bewertungen (öffentlich, 1–1000 Zeichen, nicht übersetzt, bearbeiten/löschen möglich); Produktbewertungen kann der Owner nur **melden** (Grund `spam|offensive|legal|wrong_shop|other` + optionaler Kommentar, einmal pro Bewertung). **Ausblenden macht nur pundo** im System-Admin (`/admin/reviews`, Filter „Reported by shop owner“); eine von pundo ausgeblendete Antwort kann der Owner weder bearbeiten noch löschen (409 `reply_hidden`).

- **Datenfluss:** `page.tsx` (Server) lädt `getShopReviews({scope, limit: 20, offset: 0}, lang)` und `getShopReviewSummary(lang)` aus `shop-admin-api.ts` (`GET /api/v1/shop-owner/reviews`, `/summary`, Owner-Token). Der Client (`components/shop-admin/reviews/ShopReviewList`) lädt weitere Seiten, antwortet und meldet über den Proxy `/api/shop-admin/reviews/…` und schickt `Accept-Language` **explizit** mit (der Proxy reicht sonst die Browser-Sprache durch).
- **Badge „neu“:** `(portal)/layout.tsx` lädt die Summary und gibt `reviewsNewCount` über `AdminShell` an `AdminNav`. Das Öffnen der Liste sendet einmal `POST /api/shop-admin/reviews/mark-seen {seen_until: generated_at}` und feuert `SHOP_REVIEWS_SEEN_EVENT` (`reviews/events.ts`); `AdminNav` setzt das Badge darauf auf 0, weil das Layout bei Client-Navigation nicht neu rendert. Die „Neu“-Markierungen bleiben in der geladenen Ansicht stehen. Ohne gespeicherten Zeitpunkt gelten alle sichtbaren Bewertungen als neu.
- **Dashboard:** eigene Kachel „Bewertungen“ (neu, Ø, Anzahl).
- **Texte:** `src/lib/i18n/shop-admin-reviews.ts` (6 Sprachen, `shop_reviews_*`); Hilfe-Abschnitt „Reviews“ in `shop-admin-help-content.ts`.
- **RTL:** nur logische Klassen; Kunden- und Antworttexte mit `dir="auto"`.
- **Entfallen:** `/shop-admin/reviews/[id]/audit-log` (404) und `ReviewModerationTable`; Moderation und Audit-Log liegen im System-Admin (`/admin/reviews`, `/admin/reviews/{id}/audit-log`, `components/system-admin/ReviewModerationList.tsx`, nur EN/EL).
- **Öffentlich:** `ReviewCard` zeigt die Antwort unter der Bewertung (`owner_reply`, Label `reviews_owner_reply_from`); `ReviewsPopover` zeigt sie nicht.
- Journey: `e2e/journeys/shop-owner-reviews-reply-report.md`. Backend: `pundo_main_backend/docs/api.md`, Abschnitt „Bewertungen im Shop-Portal (F5930)“.

### API-Keys (`/shop-admin/api-keys`)
- Shop-Betreiber können eigene API-Keys für den Pundo-Scraper-Zugang erstellen
- Scopes: `read`, `write`, `read_write`
- Key-Wert wird **nur einmal** bei Erstellung angezeigt (danach nur noch Hash im Backend)
- Endpunkte: `GET/POST/DELETE /api/v1/shop-owner/api-keys`

---

## Clean Boundary — Architekturprinzip

Der gesamte Shop-Admin-Code ist **isoliert** vom Customer-Frontend:

| Was | Wo |
|---|---|
| Admin-Komponenten | `src/components/shop-admin/` |
| Admin-Typen | `src/types/shop-admin.ts` |
| Admin-API-Client | `src/lib/shop-admin-api.ts` |
| Admin-Übersetzungen | `src/lib/shop-admin-translations.ts` |

`src/components/shop-admin/` darf **nur** aus `src/components/ui/` importieren — keine Imports aus `map/`, `product/`, `search/`, `shop/`, `reviews/` (Guard: `tests/unit/guards/shop-admin-boundary.test.ts`, ESLint-Gruppe in `eslint.config.mjs`). Infrastruktur wie `@/lib/lang` und `@/lib/routing` (`localePath`) ist erlaubt.

**Warum:** Ermöglicht die spätere Auslagerung in ein separates Repo in Tagen statt Wochen.

→ Technische Details: [`architecture.md`](./architecture.md) — Abschnitt "Shop-Admin Clean Boundary"

---

## 1 Owner = 1 Shop

Im MVP gilt: Ein Shop-Owner verwaltet genau einen Shop. Multi-Shop-Verwaltung ist nicht vorgesehen.

---

## Backend-Referenzen

- Auth-Flow & Endpunkte: [`pundo_main_backend/docs/shop-owner-portal.md`](../../pundo_main_backend/docs/shop-owner-portal.md)
- Backend-Architektur: [`pundo_main_backend/docs/shop-owner-portal-architecture.md`](../../pundo_main_backend/docs/shop-owner-portal-architecture.md)
- Admin-Approval-API: [`pundo_main_backend/docs/admin-api.md`](../../pundo_main_backend/docs/admin-api.md)
