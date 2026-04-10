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
| Registrierung | `/shop-admin/register` | `POST /api/v1/shop-owner/register` |
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
├── register/               ← öffentlich
├── verify-email/           ← öffentlich
├── pending-approval/       ← öffentlich
└── (portal)/               ← Auth-Guard: JWT-Cookie erforderlich
    ├── layout.tsx          ← Prüft Cookie, rendert AdminShell
    ├── dashboard/          ← Willkommensseite
    ├── profile/            ← Shop-Profil + gesprochene Sprachen
    ├── hours/              ← Öffnungszeiten-Editor
    ├── products/           ← Produkt-Liste + Neu/Bearbeiten
    ├── offers/             ← Angebots-Liste + Neu/Bearbeiten
    ├── import/             ← Excel/CSV-Upload + Google Sheets
    └── api-keys/           ← API-Key-Verwaltung
```

Die `(portal)/layout.tsx` ist das **Auth-Guard** — sie prüft das Cookie und leitet unauthentifizierte Requests zu `/shop-admin/login` weiter.

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
