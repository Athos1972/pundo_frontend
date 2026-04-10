# Architektur-Übersicht

## Systemzweck

Price- und Produktlocator-App: Findet Produkte und lokale Dienstleistungen in der Nähe.  
Das Frontend ist die User-facing Next.js-App; das Backend (`pundo_main_backend`) liefert alle Daten via REST-API.

## Tech Stack

| Bereich | Technologie |
|---|---|
| Framework | Next.js 16.2 (App Router, RSC-first) |
| UI | React 19, Tailwind CSS v4 |
| Karten | Leaflet 1.9 + react-leaflet 5 |
| Sprache | TypeScript 5 (strict) |
| Tests | Vitest + Testing Library |

## Designprinzipien

- **Mobile-first**: App wird primär auf Mobilgeräten genutzt
- **Server Components by default**: Nur was Interaktivität/Browser-APIs braucht, wird Client Component
- **API-Proxy**: Kein direkter Backend-Zugriff vom Browser — alles via `/api/v1/` Next.js-Rewrite
- **Backend als Quelle der Wahrheit**: Übersetzungen und RTL-Flag kommen vom Backend

## Modulstruktur

```
src/
├── app/
│   ├── (customer)/          # Öffentliche Customer-Routen
│   │   ├── page.tsx         # Startseite
│   │   ├── search/          # Suchergebnisse (SearchContent als Client Component)
│   │   ├── products/[slug]/ # Produktdetailseite
│   │   └── shops/[slug]/    # Shop-Detailseite
│   ├── (shop-admin)/        # Shop-Admin-Bereich (isoliert — Clean Boundary!)
│   │   └── shop-admin/      # Login, Dashboard, Produkte, Angebote, Öffnungszeiten
│   └── api/
│       └── shop-admin/      # API-Proxy für Shop-Admin-Requests
├── components/
│   ├── map/                 # Leaflet-Karte (Client-only, dynamic import)
│   ├── product/             # ProductCard, OfferList, ProductImage
│   ├── search/              # SearchBar, FilterChips, CategoryChips
│   ├── shop/                # ShopCard, NearbyShops
│   ├── shop-admin/          # Isolierte Admin-Komponenten (nur ui/ importieren!)
│   └── ui/                  # Generische Bausteine: BackButton, PriceFilterToggle, …
├── lib/
│   ├── api.ts               # API-Client für Server Components
│   ├── shop-admin-api.ts    # Separater API-Client für Shop-Admin
│   ├── lang.ts              # Spracherkennung, isRTL, Cookie-Utils
│   ├── translations.ts      # UI-Strings (6 Sprachen, kein i18n-Framework)
│   └── utils.ts             # Hilfsfunktionen inkl. formatPriceOrLabel
└── types/
    ├── api.ts               # TypeScript-Interfaces für Backend-Responses
    └── shop-admin.ts        # Separates Type-File für Shop-Admin
```

## Server vs. Client Components

| Situation | Entscheidung |
|---|---|
| Datenabruf von Backend | **Server Component** |
| Suchformular mit onChange | **Client Component** |
| Leaflet-Karte | **Client Component** (`dynamic import, ssr: false`) |
| URL-Params lesen/schreiben | **Client Component** (`useSearchParams`) |
| Filter-Toggle (PriceFilterToggle) | **Client Component** |
| Statische UI-Shell | **Server Component** |

**Faustregel:** Immer Server Component. `'use client'` nur wenn wirklich nötig.

## API-Routing

```
Browser → /api/v1/*  →  Next.js Rewrite  →  BACKEND_URL/api/v1/*
```

Server Components rufen `BACKEND_URL` direkt auf (kein Rewrite-Overhead).  
Client Components nutzen `NEXT_PUBLIC_API_URL` (relativ, geht durch den Rewrite).

## Shop-Admin Clean Boundary

**PFLICHT — keine Ausnahmen:**

- `src/components/shop-admin/` darf nur aus `src/components/ui/` importieren
- Keine Imports aus `map/`, `product/`, `search/`, `shop/`
- `src/lib/shop-admin-api.ts` — separates File, nicht in `api.ts` mischen
- `src/types/shop-admin.ts` — separates File, nicht in `types/api.ts` mischen

**Warum:** Ermöglicht Auslagerung in separates Repo in Tagen statt Wochen.

**Prüfung:** `grep -r "from.*components/(map|product|search|shop)" src/components/shop-admin/` → muss leer sein.

## Bekannte Trade-offs

| Entscheidung | Begründung |
|---|---|
| Kein i18n-Framework | Wenige statische Strings; Backend liefert übersetzte Inhalte |
| Eigener Fetch in `api.ts` | Kein Extra-Dependency, volle Kontrolle |
| Leaflet statt Google Maps | Open Source, keine API-Key-Pflicht |
| `output: 'standalone'` | Docker-freundlich |

## Weiterführende Docs

- [I18n & RTL](./i18n.md)
- [Price Types](./price-types.md)
