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

Öffne [http://localhost:3001](http://localhost:3001) im Browser.

---

## Verfügbare Scripts

```bash
npm run dev      # Entwicklungsserver (Turbopack, bindet auf 0.0.0.0)
npm run build    # Produktions-Build
npm run start    # Produktions-Server starten
npm run lint     # ESLint
```

---

## Umgebungsvariablen

| Variable | Scope | Pflicht | Beschreibung |
|---|---|---|---|
| `BACKEND_URL` | Server | Nein¹ | Absolute URL des Backends, z.B. `http://api:8000` |
| `NEXT_PUBLIC_API_URL` | Client + Server | Nein¹ | Relative API-Basis, default `/api/v1` |
| `ALLOWED_DEV_ORIGINS` | Server (dev only) | Nein | Komma-getrennte zusätzliche Dev-Origins |

¹ Default: `BACKEND_URL=http://localhost:8001`, `NEXT_PUBLIC_API_URL=/api/v1`

---

## Projektstruktur

```
src/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root-Layout (Fonts, Metadata, dir=rtl/ltr)
│   ├── page.tsx                # Startseite (Hero, Suche, Nearby Shops)
│   ├── search/                 # Suchergebnisse mit Karte
│   ├── products/[slug]/        # Produktdetailseite
│   └── shops/[id]/             # Shopdetailseite
├── components/
│   ├── map/                    # Leaflet-Karte (Client-only, dynamic import)
│   ├── product/                # ProductCard, OfferList, PriceHistory
│   ├── search/                 # SearchBar, FilterChips, CategoryChips
│   ├── shop/                   # ShopCard, NearbyShops
│   └── ui/                     # BackButton, LanguageSwitcher
├── lib/
│   ├── api.ts                  # API-Client (Server Components)
│   ├── lang.ts                 # Spracherkennung & Cookie
│   ├── translations.ts         # i18n-Strings (6 Sprachen)
│   └── utils.ts                # Hilfsfunktionen
└── types/
    └── api.ts                  # TypeScript-Interfaces für API-Responses
```

---

## Architektur-Entscheidungen

### Server Components (RSC) by default
Alle `app/`-Seiten sind Server Components. Datenfetching erfolgt direkt im Component via `async/await`. Der API-Client (`src/lib/api.ts`) ist serverseitig — er nutzt `BACKEND_URL` direkt ohne den Umweg über den Browser.

### Client Components nur wo nötig
`'use client'` wird nur für interaktive Komponenten gesetzt: `SearchBar` (Debounce, Keyboard-Nav), `LanguageSwitcher` (Cookie schreiben, `router.refresh()`), die Leaflet-Karte.

### Karte: Client-only via dynamic import
Leaflet manipuliert `window` und `document` — daher wird `ShopMapClient` mit `dynamic(() => import(...), { ssr: false })` geladen. Auf SSR-Seite erscheint ein Skeleton.

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
