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
| Tests | Vitest + Testing Library (Unit), Playwright (E2E) |

## Designprinzipien

- **Mobile-first**: App wird primär auf Mobilgeräten genutzt
- **Server Components by default**: Nur was Interaktivität/Browser-APIs braucht, wird Client Component
- **API-Proxy**: Kein direkter Backend-Zugriff vom Browser — alles via Next.js-Rewrites (`/api/v1/`, `/shop_logos/`, `/product_images/`, `/review_photos/`, `/brand_logos/`, `/avatars/`)
- **Mehrsprachig von Anfang an**: EN, DE, EL, RU, AR, HE — RTL (AR, HE) via Tailwind `rtl:`-Modifier
- **Backend als Quelle der Wahrheit**: Kategorien, Produkte, Shops kommen immer vom Backend; UI-Strings sind im Frontend statisch

## Route-Gruppen

```
src/app/
├── (customer)/          # Öffentliche Customer-Routen (lang-prefix via [lang]/)
│   ├── [lang]/          # Lokalisierte Seiten: search, products, shops, guides, help, …
│   ├── account/         # Bypass-Pfad (kein lang-Prefix): favorites, mcp
│   ├── auth/            # Bypass-Pfad: login, signup, callback, password-reset
│   ├── blog/            # Bypass-Pfad
│   ├── guides/          # Bypass-Pfad (legacy redirects)
│   └── …
├── (shop-admin)/        # Shop-Owner-Portal — Clean Boundary!
│   └── shop-admin/      # login, register, onboarding, (portal)/…
├── (system-admin)/      # System-Admin-Portal
│   └── admin/           # login, (portal)/…
├── (oauth)/             # OAuth 2.0 Authorization Server (F6600)
│   └── oauth/authorize/
├── sitemap.xml/         # Sitemap Route Handler → GET /sitemap.xml (custom, with XSLT PI)
└── api/                 # Next.js API Routes (nominatim-Proxy, og-image, …)
```

**i18n-Routing:** Customer-Pages unter `[lang]/` brauchen immer `localePath(lang, '/pfad')`. Bypass-Pfade (`/account`, `/auth`, `/api`, `/shop-admin`, `/admin`) haben keinen lang-Prefix.

## Modulstruktur

```
src/
├── components/
│   ├── map/             # Leaflet-Karte + SearchMapBottomSheet (Client-only, dynamic import)
│   ├── product/         # ProductCard, OfferList, RelatedProductsCarousel, PriceHistory*
│   ├── search/          # SearchBar, FilterChips, CategoryChips, ServiceResultCard, SearchSimilarButton
│   ├── shop/            # ShopCard, ShopOfferCard, NearbyShops, RelatedShopsWidget
│   ├── shop-admin/      # Isolierte Admin-Komponenten (nur ui/ importieren — Clean Boundary!)
│   ├── system-admin/    # System-Admin-Komponenten
│   ├── layout/          # Header, Footer, BottomTabBar
│   ├── activity-feed/   # ActivityFeed, LiveFeed
│   ├── recently-viewed/ # RecentlyViewed-Drawer
│   ├── spotted/         # SpottedGlobalButton, SpottedModal
│   ├── guides/          # Guide-Komponenten
│   └── ui/              # Generische Bausteine (shared, importierbar von allen)
├── lib/
│   ├── api.ts                   # API-Client für Server Components
│   ├── customer-api.ts          # Customer-spezifische Endpoints
│   ├── shop-admin-api.ts        # Shop-Admin API-Client (Clean Boundary)
│   ├── lang.ts                  # Spracherkennung, isRTL, Cookie-Utils
│   ├── translations.ts          # Customer-UI-Strings (6 Sprachen, kein i18n-Framework)
│   ├── shop-admin-translations.ts  # Shop-Admin UI-Strings
│   ├── system-admin-translations.ts
│   ├── routing.ts               # localePath(), stripLang(), buildHreflang()
│   ├── seo/                     # metadata-defaults, og-defaults, structured-data
│   ├── i18n/                    # common.ts, guides.ts (tCommon, tGuides)
│   └── price-history.ts         # aggregatePriceHistory(), computePriceStats()
└── types/
    ├── api.ts                   # TypeScript-Interfaces für Backend-Responses
    └── shop-admin.ts            # Separates Type-File für Shop-Admin (Clean Boundary)
```

## Server vs. Client Components

| Situation | Entscheidung |
|---|---|
| Datenabruf von Backend | **Server Component** |
| Suchformular mit onChange | **Client Component** |
| Leaflet-Karte | **Client Component** (`dynamic import, ssr: false`) |
| URL-Params lesen/schreiben | **Client Component** (`useSearchParams`) |
| FABs (SearchSimilarButton, SpottedGlobalButton) | **Client Component** (fixed-Position, Touch-Events) |
| Statische UI-Shell | **Server Component** |

**Faustregel:** Immer Server Component. `'use client'` nur wenn wirklich nötig.

## API-Routing

```
Browser → /api/v1/*  →  Next.js Rewrite (next.config.ts)  →  BACKEND_URL/api/v1/*
Browser → /shop_logos/*  →  Rewrite  →  BACKEND_URL/shop_logos/*
Browser → /product_images/*  →  Rewrite  →  BACKEND_URL/product_images/*
…
```

Server Components rufen `BACKEND_URL` direkt auf (kein Rewrite-Overhead).  
Client Components rufen `/api/v1/…` relativ auf (geht durch den Rewrite).

## Auth-Cookie-Architektur

### Cookie-Setzen

Der `customer_token`-Cookie wird vom Backend mit `Domain=<AUTH_COOKIE_DOMAIN>` gesetzt (Prod: `Domain=pundo.cy`). Es gibt zwei Pfade:

| Pfad | Domain-Attribut | Betrifft |
|---|---|---|
| Email/OTP-Login über Next.js-Proxy | **kein Domain** (Proxy strippt es) | host-only cookie |
| Google OAuth — Backend-Redirect direkt zum Browser | **Domain=pundo.cy** | domain-scoped cookie |

### Cookie-Löschen bei Logout

Da die zwei Pfade unterschiedliche Cookies erzeugen, sendet die dedizierte Logout-Route **zwei** `Set-Cookie`-Delete-Header:

```
Set-Cookie: customer_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax
Set-Cookie: customer_token=; Domain=pundo.cy; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure
```

Der zweite Header wird nur gesendet wenn `COOKIE_DOMAIN` gesetzt ist. Beide Brands (`pundo.cy`, `naidivse.cy`) verwenden `COOKIE_DOMAIN=pundo.cy` (spiegelt Backend `AUTH_COOKIE_DOMAIN`).

### Env-Variable `COOKIE_DOMAIN`

| Umgebung | Wert | Hinweis |
|---|---|---|
| Lokal (Studio) | `""` (leer) | Google OAuth lokal nicht testbar |
| Produktion (beide Brands) | `pundo.cy` | Muss im Hetzner-Deployment gesetzt sein |

> Siehe Bug B4800-001 für den Fix-Kontext (domain-scoped Cookie wurde nicht gecleared).

### Backend-Env-Variable `GOOGLE_SHOP_OWNER_REDIRECT_URI`

Steuert die `redirect_uri`, die das Backend beim Aufbau der Google-OAuth-Authorize-URL für Shop-Owner verwendet. Gesetzt im Backend-Deployment (Hetzner), nicht im Frontend.

| Umgebung | Wert | Hinweis |
|---|---|---|
| Lokal / Test | `http://localhost:8500/api/v1/shop-owner/auth/google/callback` | Default-Fallback im Code — muss nicht explizit gesetzt werden |
| Produktion (`pundo.cy`) | `https://api.pundo.cy/api/v1/shop-owner/auth/google/callback` | **Pflicht** — ohne diesen Wert fällt das Backend auf `localhost:8500` zurück → `redirect_uri_mismatch` |

**Außerdem in der Google Cloud Console** (OAuth-Client zu `GOOGLE_CLIENT_ID`): Unter „Authorized redirect URIs" müssen beide URIs registriert sein:
- `https://api.pundo.cy/api/v1/shop-owner/auth/google/callback` (Prod)
- `http://localhost:8500/api/v1/shop-owner/auth/google/callback` (Dev/Test)
- Die bestehende Customer-URI (`https://api.pundo.cy/api/v1/customer/...`) bleibt erhalten — alle URIs gleichzeitig registrieren.

> Spec: `oauth-redirect-uri-mismatch-20260604` (F5910)

## Shop-Admin Clean Boundary

**PFLICHT — keine Ausnahmen:**

- `src/components/shop-admin/` darf nur aus `src/components/ui/` importieren
- Keine Imports aus `map/`, `product/`, `search/`, `shop/`
- `src/lib/shop-admin-api.ts` — separates File, nicht in `api.ts` mischen
- `src/types/shop-admin.ts` — separates File, nicht in `types/api.ts` mischen

**Warum:** Ermöglicht Auslagerung in separates Repo in Tagen statt Wochen.

**Prüfung:** `grep -r "from.*components/(map|product|search|shop)" src/components/shop-admin/` → muss leer sein.

## Brand-Config-System

Jede Brand (`pundo`, `naidivse`) hat eine Config in `src/config/brands/<brand>.ts` mit Theme, Assets, Features-Flags (`catsfirst`, `homesickTeaser`, `activityFeed`, `mcp`, …). Die aktive Brand wird per Host-Header aus dem Backend ermittelt; `src/config/brands/index.ts` ist der Barrel.

## z-index-Skala (verbindlich)

Alle `fixed`- und `sticky`-Elemente folgen dieser Skala. Kein Element darf einen Wert außerhalb dieser Levels verwenden ohne expliziten Architektur-Entscheid.

| Level | z-Wert | Elemente |
|---|---|---|
| Sticky/Static Nav | `z-20` | `Header` (sticky top), SearchContent-Sticky |
| Relative Dropdowns | `z-30` | `LanguageSwitcher`-Dropdown, `UserMenu` |
| Permanente Fixed-Nav | `z-40` | `BottomTabBar` nav |
| FABs | `z-[45]` | `SearchSimilarButton`, `SpottedGlobalButton` |
| FAB-Popout | `z-[47]` | `FABOnboardingPopout` (absolute über FAB) |
| Modale / Overlays | `z-50` | Alle portalierten Modale, `BottomTabBar`-Drawer |
| Kritische Overlays | `z-[60]` | `LanguagePickerOverlay`, `SplashScreen` |

**Invariante:** FABs (z-45) > Fixed-Nav (z-40). Portaled Modale (z-50) > FABs. Kritische Overlays (z-60) > alles andere.

**Modale-Pflicht:** Jedes `fixed inset-0`-Modal muss via `ReactDOM.createPortal(content, document.body)` gerendert werden, damit sein z-50 im Root-Stacking-Context gilt — nicht relativ zu einem Eltern-Stacking-Context.

## Bekannte Trade-offs

| Entscheidung | Begründung |
|---|---|
| Kein i18n-Framework | Wenige statische Strings; Content kommt übersetzt vom Backend |
| Eigener Fetch in `api.ts` | Kein Extra-Dependency, volle Kontrolle |
| Leaflet statt Google Maps | Open Source, keine API-Key-Pflicht |
| `output: 'standalone'` | Docker-freundlich |
| Preisverlauf-Aggregation im Frontend | Backend liefert Rohdaten; Aggregat-Entscheid BB/22.5. |

## Weiterführende Docs

**Fachliche Dokumentation:**
- [Suche & Produktentdeckung](./search.md)
- [Datenmodell](./data-model.md)
- [Shop-Owner Portal](./shop-owner-portal.md)
- [Shop-Sprachen](./shop-languages.md)
- [SEO](./seo.md)

**Technische Dokumentation:**
- [i18n & RTL](./i18n.md)
- [Price Types](./price-types.md)
- [E2E-Testing](./e2e-testing.md)
- [Analytics](./analytics.md)
