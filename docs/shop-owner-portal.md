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
    ├── reviews/            ← Kundenbewertungen ([id]/audit-log)
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
Zwei Import-Wege:

**Excel/CSV-Upload:**
- Upload einer `.xlsx` oder `.csv`-Datei
- Erwartete Spalten: `name`, `price`, `currency`, `unit`, `category`, `available`
- Antwort: Anzahl importierter Einträge + Fehler pro Zeile

**Google Sheets (Sync):**
- Öffentliche Google-Sheets-URL hinterlegen
- Automatischer Sync alle 4 Stunden (Backend-Cron)
- Manueller Re-Sync per Button
- Sync-Status (Zeitstempel, OK/Fehler) sichtbar

→ Backend-Details: [`pundo_main_backend/docs/shop-owner-portal.md`](../../pundo_main_backend/docs/shop-owner-portal.md) — Abschnitt "Import"

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

`src/components/shop-admin/` darf **nur** aus `src/components/ui/` importieren — keine Imports aus `map/`, `product/`, `search/`, `shop/`.

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
