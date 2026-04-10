# Pundo Frontend

Web-App zum Finden von Produkten in lokalen Läden in Larnaca, Zypern.  
Gebaut mit **Next.js 16 App Router**, **React 19**, **Tailwind CSS v4** und **Leaflet**.

---

## Tech Stack

| Bereich | Technologie |
|---|---|
| Framework | Next.js 16.2 (App Router, RSC-first) |
| UI | React 19, Tailwind CSS v4 |
| Karten | Leaflet 1.9 + react-leaflet 5 |
| Sprache | TypeScript 5 (strict) |
| Fonts | Space Grotesk (Display), DM Sans (Body) |
| Deployment | Docker / Standalone-Build |

---

## Voraussetzungen

- Node.js ≥ 20
- Ein laufendes Pundo-Backend (API) — Standard: `http://localhost:8001`

---

## Lokale Entwicklung

### 1. Abhängigkeiten installieren

```bash
npm install
```

### 2. Umgebungsvariablen anlegen

```bash
cp .env.local.example .env.local
```

`.env.local` anpassen:

```env
# Vom Browser genutzte API-URL (relativ, wird vom Next.js Rewrite weitergeleitet)
NEXT_PUBLIC_API_URL=/api/v1

# Server-seitige Backend-URL (nur serverseitig, nie im Browser)
BACKEND_URL=http://localhost:8001
```

> **Hinweis:** Der Dev-Server leitet `/api/v1/*` automatisch an `BACKEND_URL` weiter.  
> LAN-IPs werden automatisch als erlaubte Dev-Origins erkannt — mobile Geräte im selben WLAN können die App direkt aufrufen.

### 3. Dev-Server starten

```bash
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000) im Browser.

---

## Verfügbare Scripts

```bash
npm run dev      # Entwicklungsserver (Turbopack, bindet auf 0.0.0.0)
npm run build    # Produktions-Build
npm run start    # Produktions-Server starten
npm run lint     # ESLint
npm run test     # Unit-Tests (Vitest)
npm run test:e2e # E2E-Tests (Playwright)
```

---

## Tests

### Unit-Tests (Vitest)

```bash
npm run test          # Einmalig
npm run test -- --watch   # Watch-Mode
npm run test -- --coverage  # Mit Coverage-Report
```

144 Tests in `src/tests/` — kein Backend nötig, kein Browser.

### E2E-Tests (Playwright)

Vollständige Anleitung: **[docs/e2e-testing.md](docs/e2e-testing.md)**

Kurzversion:

**Port-Konvention (PFLICHT — niemals mischen):**
| Umgebung | Backend | Frontend |
|---|---|---|
| Produktion / Dev | 8001 | 3000 |
| E2E-Tests | **8002** | **3002** |

Das Test-Backend wird **automatisch** gestartet — kein manueller Start nötig.  
Port 8001 wird explizit abgelehnt (Schutz vor versehentlichem Zugriff auf Produktion).

```bash
# E2E-Tests — Backend startet automatisch auf Port 8002
npx playwright test

# Oder mit explizitem Backend-Port:
BACKEND_URL=http://localhost:8002 npx playwright test
```

---

## Umgebungsvariablen

### Runtime

| Variable | Scope | Pflicht | Beschreibung |
|---|---|---|---|
| `BACKEND_URL` | Server | Nein¹ | Absolute URL des Backends, z.B. `http://api:8000` |
| `NEXT_PUBLIC_API_URL` | Client + Server | Nein¹ | Relative API-Basis, default `/api/v1` |
| `ALLOWED_DEV_ORIGINS` | Server (dev only) | Nein | Komma-getrennte zusätzliche Dev-Origins |

¹ Default: `BACKEND_URL=http://localhost:8001`, `NEXT_PUBLIC_API_URL=/api/v1`

### E2E-Tests

| Variable | Default | Beschreibung |
|---|---|---|
| `BACKEND_URL` | **Pflicht** | Test-Backend-URL — muss auf Port 8002 zeigen (8001 = Produktion, wird abgelehnt) |
| `FRONTEND_URL` | `http://localhost:3002` | Frontend-URL für Playwright `baseURL` |
| `E2E_FRONTEND_PORT` | `3002` | Port für den E2E-Frontend-Server |
| `BACKEND_REPO` | `/Users/bb_studio_2025/dev/github/pundo_main_backend` | Pfad zum Backend-Repo |
| `E2E_ADMIN_SECRET` | `pundo-admin-dev-secret` | Bearer-Token für Admin-Approve-API |

---

## Projektstruktur

```
src/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root-Layout (Fonts, Metadata, dir=rtl/ltr)
│   ├── page.tsx                # Startseite (Hero, Suche, Nearby Shops)
│   ├── (customer)/             # Route Group: Customer-Facing
│   │   ├── search/             # Suchergebnisse mit Karte
│   │   ├── products/[slug]/    # Produktdetailseite
│   │   └── shops/[slug]/       # Shopdetailseite
│   └── (shop-admin)/           # Route Group: Shop-Admin Portal
│       └── shop-admin/
│           ├── login/          # Öffentlich (kein Auth-Guard)
│           ├── register/       # Öffentlich
│           └── (portal)/       # Auth-Guard-Gruppe (JWT-Cookie erforderlich)
│               ├── dashboard/
│               ├── profile/
│               ├── hours/
│               ├── products/
│               ├── offers/
│               └── api-keys/
├── components/
│   ├── map/                    # Leaflet-Karte (Client-only, dynamic import)
│   ├── product/                # ProductCard, OfferList, PriceHistory
│   ├── search/                 # SearchBar, FilterChips, CategoryChips
│   ├── shop/                   # ShopCard, NearbyShops
│   ├── shop-admin/             # AdminNav, HoursEditor, ProductList, ...
│   └── ui/                     # BackButton, LanguageSwitcher, PriceFilterToggle
├── lib/
│   ├── api.ts                  # API-Client (Server Components)
│   ├── shop-admin-api.ts       # API-Client (Shop-Admin, isoliert)
│   ├── lang.ts                 # Spracherkennung & Cookie
│   ├── translations.ts         # i18n-Strings (6 Sprachen, Kunden-Seite)
│   ├── shop-admin-translations.ts  # i18n-Strings (6 Sprachen, Shop-Admin)
│   └── utils.ts                # Hilfsfunktionen (formatPriceOrLabel, ...)
├── types/
│   ├── api.ts                  # TypeScript-Interfaces für API-Responses (inkl. PriceType)
│   └── shop-admin.ts           # TypeScript-Interfaces für Shop-Admin
└── tests/                      # Vitest Unit-Tests
```

**Fachliche Docs:** [`docs/search.md`](./docs/search.md) · [`docs/data-model.md`](./docs/data-model.md) · [`docs/shop-owner-portal.md`](./docs/shop-owner-portal.md) · [`docs/shop-languages.md`](./docs/shop-languages.md)

**Technische Docs:** [`docs/architecture.md`](./docs/architecture.md) · [`docs/i18n.md`](./docs/i18n.md) · [`docs/price-types.md`](./docs/price-types.md) · [`docs/e2e-testing.md`](./docs/e2e-testing.md)

---

## Architektur-Entscheidungen

### Server Components (RSC) by default
Alle `app/`-Seiten sind Server Components. Datenfetching erfolgt direkt im Component via `async/await`. Der API-Client (`src/lib/api.ts`) ist serverseitig — er nutzt `BACKEND_URL` direkt ohne den Umweg über den Browser.

### Client Components nur wo nötig
`'use client'` wird nur für interaktive Komponenten gesetzt: `SearchBar` (Debounce, Keyboard-Nav), `LanguageSwitcher` (Cookie schreiben, `router.refresh()`), die Leaflet-Karte.

### Karte: Client-only via dynamic import
Leaflet manipuliert `window` und `document` — daher wird `ShopMapClient` mit `dynamic(() => import(...), { ssr: false })` geladen. Auf SSR-Seite erscheint ein Skeleton.

### Auth: JWT-Cookie + Route-Group-Guard
Shop-Admin-Seiten unter `(portal)/` sind durch ein Auth-Guard-Layout geschützt, das den `shop_owner_token`-Cookie prüft. Login/Register/etc. liegen außerhalb der `(portal)`-Gruppe und sind öffentlich. `src/proxy.ts` fängt unauthentifizierte Requests ab.

### Preis-Typen (`price_type`)

Angebote können einen Fixpreis haben oder auch nicht. Das `price_type`-Feld trägt die Semantik:

| Wert | Bedeutung | Preis-Feld |
|---|---|---|
| `fixed` | Konkreter Preis | `string` |
| `on_request` | Preis auf Anfrage | `null` |
| `free` | Kostenlos | `null` |
| `variable` | Variabler Preis | `null` |

`formatPriceOrLabel()` in `src/lib/utils.ts` übersetzt den Typ in ein sprachspezifisches Label.  
Vollständige Dokumentation: [`docs/price-types.md`](./docs/price-types.md)

### API-Routing
```
Browser → /api/v1/* → Next.js Rewrite → BACKEND_URL/api/v1/*
```
Server Components rufen `BACKEND_URL` direkt auf (kein Rewrite-Overhead).

---

## Internationalisierung

Unterstützte Sprachen: **en, de, ru, el, ar, he**  
RTL-Sprachen (automatisches `dir="rtl"` im HTML): **ar, he**

Sprachauswahl wird im Cookie `pundo_lang` (1 Jahr, SameSite=Lax) gespeichert.  
Server Components lesen die Sprache via `getLangServer()` aus dem Request-Cookie.

Vollständige Dokumentation: [`docs/i18n.md`](./docs/i18n.md)

---

## Design-System

Farbpalette (definiert in `src/app/globals.css` via `@theme`):

| Token | Hex | Verwendung |
|---|---|---|
| `accent` | `#D4622A` | Buttons, aktive Zustände |
| `accent-light` | `#FAE8DF` | Hintergründe, Chips |
| `accent-dark` | `#A04515` | Hover-Zustand |
| `bg` | `#F7F5F2` | Seiten-Hintergrund (Warmweiß) |
| `surface` | `#FFFFFF` | Karten, Inputs, Header |
| `surface-alt` | `#F0EDE8` | Hover-Flächen |
| `border` | `#E5E0D9` | Trennlinien |
| `text` | `#1A1714` | Fließtext |
| `text-muted` | `#7A736B` | Sekundärtext |
| `success` | `#2A8C5A` | Verfügbarkeit |

---

## Docker

### Image bauen

```bash
docker build -t pundo-frontend .
```

### Container starten

```bash
docker run -p 3000:3000 \
  -e BACKEND_URL=http://your-backend:8000 \
  pundo-frontend
```

Das Image nutzt einen **Multi-Stage-Build** (Builder → Runner auf `node:20-alpine`) mit `output: 'standalone'` — nur die nötigsten Dateien landen im finalen Image.

---

## PWA

Die App liefert ein Web-App-Manifest (`/public/manifest.json`) mit Theme-Color `#D4622A`. Icons für 192×192 und 512×512 unter `public/icons/` ablegen (noch ausstehend).
