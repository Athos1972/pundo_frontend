# Architektur-Übersicht

## Systemzweck

Price- und Produktlocator-App: Findet Produkte und lokale Dienstleistungen in der Nähe.  
Das Frontend ist die User-facing Next.js-App; das Backend (`pundo_main_backend`) liefert alle Daten via REST-API.

## Tech Stack

| Bereich | Technologie |
|---|---|
| Framework | Next.js 16 (App Router, RSC-first; Version siehe `package.json`) |
| UI | React 19, Tailwind CSS v4 |
| Karten | Leaflet 1.9 + react-leaflet 5 |
| Sprache | TypeScript 6 (strict) |
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
│   ├── [lang]/          # Lokalisierte Seiten: search, products, shops, guides, blog, help, …
│   ├── account/         # Bypass-Pfad (kein lang-Prefix): favorites, mcp
│   └── auth/            # Bypass-Pfad: login, signup, callback, password-reset, verify-email
├── (shop-admin)/        # Shop-Owner-Portal — Clean Boundary!
│   └── shop-admin/      # login, register, onboarding, claim (F5970, oeffentlich), (portal)/…
├── (system-admin)/      # System-Admin-Portal
│   └── admin/           # login, (portal)/…
├── (oauth)/             # OAuth 2.0 Authorization Server (F6600)
│   └── oauth/authorize/
├── crm/opt-out/         # CRM-Opt-out (Bypass-Pfad)
├── sitemap.xml/         # Sitemap-Index Route Handler → GET /sitemap.xml (custom, with XSLT PI)
├── sitemap-*.xml/       # Teil-Sitemaps (static, products, shops, shop-cities, guides, blog)
└── api/                 # Next.js Route Handler: admin, contact, crm, customer, nominatim, revalidate-sitemap, shop-admin
```

**i18n-Routing:** Customer-Pages unter `[lang]/` brauchen immer `localePath(lang, '/pfad')`. Bypass-Pfade (u. a. `/account`, `/auth`, `/api`, `/shop-admin`, `/admin`, `/oauth`, `/crm`) haben keinen lang-Prefix — maßgeblich ist `I18N_BYPASS_PREFIXES` in `src/proxy.ts`.

## Proxy (`src/proxy.ts`)

Next 16 nennt die Middleware „Proxy“. `src/proxy.ts` erledigt pro Request:

- **i18n-Redirects:** Pfade ohne Sprach-Prefix → `307` auf `/{lang}/…` (Sprache aus Cookie `app_lang` bzw. `Accept-Language`, `Vary: Accept-Language, Cookie`); falsche Schreibweise (`/EN/…`) → `308` auf Kleinschreibung. Setzt `x-lang` und synchronisiert das Cookie.
- **Brand-Erkennung:** `getBrandConfig(host)` → Request-Header `x-brand-slug`.
- **Auth-Gate:** `/shop-admin/**` ohne `shop_owner_token` → `/shop-admin/login?next=…`; `/admin/**` ohne `admin_token` → `/admin/login` (öffentliche Ausnahmen: `PUBLIC_SHOP_ADMIN_PATHS`, `PUBLIC_ADMIN_PATHS`).
- **CSP mit Nonce + Security-Header:** pro Request neuer Nonce (`x-nonce`), brand-spezifische CSP; `Cache-Control` für öffentliche SEO-Seiten.

Der `matcher` am Dateiende schließt u. a. `/_next`, `/api` und Prefetch-Requests aus.

## Modulstruktur

```
src/
├── components/
│   ├── map/             # Leaflet-Karte + SearchMapBottomSheet (Client-only, dynamic import)
│   ├── product/         # ProductCard, OfferList, PriceTierSummary (F5200 Staffelblock), RelatedProductsCarousel, PriceHistory*
│   ├── search/          # SearchBar, FilterChips, CategoryChips, ServiceResultCard, SearchSimilarButton
│   ├── shop/            # ShopCard, ShopOfferCard, NearbyShops, RelatedShopsWidget
│   ├── shop-admin/      # Isolierte Admin-Komponenten (nur ui/ importieren — Clean Boundary!); u. a. CategoryPicker (Kategorie-Auswahl, B5900-011)
│   ├── system-admin/    # System-Admin-Komponenten
│   ├── layout/          # Header, Footer, BottomTabBar
│   ├── activity-feed/   # ActivityFeed, LiveFeed
│   ├── recently-viewed/ # RecentlyViewed-Drawer
│   ├── spotted/         # SpottedGlobalButton, CameraView, AuthModal
│   ├── guides/          # Guide-Komponenten
│   └── ui/              # Generische Bausteine (shared, importierbar von allen)
├── lib/
│   ├── api.ts                   # API-Client für Server Components
│   ├── customer-api.ts          # Customer-spezifische Endpoints
│   ├── shop-admin-api.ts        # Shop-Admin API-Client (Clean Boundary)
│   ├── shop-admin-categories.ts # Kategorie-Picker-Client (Browser-Fetch via /api/shop-admin, B5900-011)
│   ├── lang.ts                  # Spracherkennung, isRTL, Cookie-Utils
│   ├── translations.ts          # Barrel über src/lib/i18n/*.ts (6 Sprachen, kein i18n-Framework)
│   ├── shop-admin-translations.ts  # Shop-Admin UI-Strings
│   ├── system-admin-translations.ts
│   ├── price-tiers.ts           # F5200: Staffelpreis-View-Model (Hauptpreis/Suffix/Zeilen) + JSON-LD priceSpecification
│   ├── routing.ts               # localePath(), stripLang(), buildHreflang()
│   ├── seo/                     # metadata-defaults, og-defaults, static-page-metadata, …
│   ├── structured-data.ts       # JSON-LD-Builder (Product, Shop, BreadcrumbList, …)
│   ├── i18n/                    # UI-Strings je Namespace (common, search, shop, shop-admin-*, …)
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

## Client-IP-Weitergabe (B6220-002)

Backend-Rate-Limits sind pro Client-IP. Damit nicht alle Nutzer einen Bucket teilen (Peer = Frontend-Container), senden die Next.js-Route-Handler (`src/app/api/**/route.ts`, jeder mit `BACKEND_URL`) die IP weiter:

- Helper `src/lib/proxy/client-ip.ts`: `getClientIp(headers)` liest den **rechtesten** Eintrag von `x-forwarded-for` (von nginx gesetzt, vertrauenswuerdig), validiert ihn per `node:net.isIP`, Header > 1024 Zeichen oder ungueltiger Eintrag -> `undefined` (kein Rueckfall auf linkere Eintraege oder `cf-connecting-ip`). `clientIpForwardHeaders(headers)` liefert `{ 'X-Forwarded-For': ip }` oder `{}`.
- Ans Backend geht ausschliesslich dieser eine `X-Forwarded-For`; `CF-Connecting-IP`, `X-Real-IP` und `Forwarded` des Clients werden nie weitergereicht. Turnstile wird nur noch im Backend geprueft (siehe unten) und nutzt dort denselben Wert als `remoteip`.
- `next.config.ts`-Rewrites (`/api/v1/*`) reichen Client-Header unveraendert durch; sie sind nur sicher, weil nginx `X-Forwarded-For`/`X-Real-IP`/`CF-Connecting-IP` mit `$remote_addr` ueberschreibt (prod, `snippets/proxy-client-ip.conf`).
- Backend wertet `X-Forwarded-For` nur von Peers in `FORWARDED_ALLOW_IPS` aus (siehe Backend `docs/api.md`, "Client-IP (B6220-002)").
- Neue Route-Handler mit `BACKEND_URL` muessen den Helper einbinden; `src/tests/proxy-client-ip-routes.test.ts` prueft das statisch.

## Besucher-User-Agent an das Backend (F6998)

Das Backend loggt Activity-Events (`price_comparison_viewed`, `shop_discovered`, `search_performed`) nicht fuer Bots. SSR-Fetches kommen aber mit dem Node-UA (`node`) an; deshalb senden wir den UA des **eingehenden** Requests als `X-Forwarded-User-Agent`.

- Helper `src/lib/proxy/forward-user-agent.ts` (`forwardedUserAgentHeaders(headers)`): Wert immer aus dem eingehenden `user-agent` (ein eingehender `X-Forwarded-User-Agent` wird nie gelesen), max. 512 Zeichen, nur druckbares ASCII, leer bleibt `''` (leer = Bot).
- `src/lib/api.ts`: opt-in per `apiFetch(path, lang, init, { forwardUserAgent: true })`, nur in `getProduct`, `getShop`, `searchAll` und `searchProducts` (nur `noStore` + `q`). `next/headers` wird dynamisch importiert (api.ts wird auch von Client-Komponenten genutzt); ausserhalb eines Request-Scopes (Build, Sitemap) entfaellt der Header.
- **Nur mit `cache: 'no-store'`** (sonst wirft `apiFetch`): Mit Data-Cache wuerde der Header den Cache-Key aufspalten.
- **Memoization:** `getProduct`/`getShop` laufen in `generateMetadata` und Page; Next memoisiert nur bei identischen URL und Options. Der Header entsteht daher immer aus `headers()` mit fester Key-Reihenfolge. Nie seitenspezifische Zusatzheader an diese Funktionen haengen, sonst zwei Events pro Seitenaufruf.
- Die Route `src/app/api/customer/[...path]/route.ts` reicht den UA ebenfalls weiter.
- Wirkung im Backend: ausschliesslich Unterdrueckung des Loggings (Status/Body unveraendert).
- **Link-Prefetch (B6998-001):** Next-Link-Prefetch rendert Detailseiten (`getShop`/`getProduct`) ohne Besuch. `next-router-prefetch`/`rsc` sind weder in `headers()` noch im Proxy lesbar (Next 16.4 entfernt sie; geprueft). `api.ts` liest deshalb `isPrefetchRequest` aus dem Work-Store des Renders (`next/dist/server/app-render/work-async-storage.external`, intern) und sendet bei Prefetch zusaetzlich `X-Forwarded-Prefetch: 1`; das Backend unterdrueckt das Event. Ohne Prefetch bleibt der Request unveraendert (Memoization). Guard: `src/tests/next-prefetch-flag.test.ts` + Playwright P8/P9/P10; bei einem Next-Update pruefen.

## Turnstile (B6220-003)

- **Widget im Browser, Pruefung nur im Backend.** `src/components/ui/TurnstileWidget.tsx` (generisches Primitive, Props `loadingText`, `resetKey`; kein Customer-Import, auch im Shop-Admin nutzbar) liefert den Token. Turnstile-Tokens sind einmalig; eine Pruefung im Route-Handler wuerde die Backend-Pruefung scheitern lassen. `src/lib/turnstile-server.ts` existiert deshalb nicht mehr.
- **Token-Feld** `turnstile_token` im JSON-Body von `POST /api/contact`, `POST /api/customer/customer/auth/signup` und `POST /api/shop-admin/onboarding` (nur E-Mail-Pfad; Google-Pfad ohne Captcha). Die Route-Handler reichen den Body unveraendert durch.
- **Fehlervertrag:** Backend `400 {detail:"captcha_failed"}` -> Contact/Signup-Route `400 {error:"captcha_failed"}`; Backend `429` -> `429 {error:"rate_limited"}`; Onboarding (Catch-all, Body unveraendert) -> `onboardingApi.ts` mappt auf `CAPTCHA_FAILED` / `RATE_LIMITED`. Nach jedem Fehlschlag wird `resetKey` erhoeht (neuer, einmaliger Token ohne Seiten-Reload).
- **Build/E2E:** `NEXT_PUBLIC_TURNSTILE_SITEKEY` wird zur Build-Zeit eingebettet. `scripts/e2e-frontend.cjs` baut den E2E-Standalone mit Cloudflares Test-Sitekey `1x00000000000000000000AA`, falls nichts gesetzt ist; das Test-Backend (`pundo_test`, kein Secret) laesst den Dummy-Token zu.
- **Deploy-Reihenfolge:** Frontend vor Backend (sonst verbraucht das alte Frontend den Token vor der Backend-Pruefung).

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

Jede Brand (`pundo`, `naidivse`) hat eine Config in `src/config/brands/<brand>.ts` mit Theme, Assets, Features-Flags (`catsfirst`, `homesickTeaser`, `activityFeed`, `mcp`, …). Die aktive Brand wird im Frontend per `getBrandConfig(host)` aus `src/config/brands/` ermittelt (Host-Header, in `src/proxy.ts` als `x-brand-slug` weitergereicht; Server Components nutzen `getBrandFromHeaders()`); `src/config/brands/index.ts` ist der Barrel.

## z-index-Skala (verbindlich)

Alle `fixed`- und `sticky`-Elemente folgen dieser Skala. Kein Element darf einen Wert außerhalb dieser Levels verwenden ohne expliziten Architektur-Entscheid.

| Level | z-Wert | Elemente |
|---|---|---|
| Sticky/Static Nav | `z-20` | `Header` (sticky top), SearchContent-Sticky |
| Relative Dropdowns | `z-30` | `LanguageSwitcher`-Dropdown, `UserMenu` |
| Permanente Fixed-Nav | `z-40` | `BottomTabBar` nav |
| Nicht-modale Hinweise | `z-[44]` | `LanguageHint` (über der Fixed-Nav, unter FABs/Consent-Banner) |
| FABs | `z-[45]` | `SearchSimilarButton`, `SpottedGlobalButton` |
| FAB-Popout | `z-[47]` | `FABOnboardingPopout` (absolute über FAB) |
| Modale / Overlays | `z-50` | Alle portalierten Modale, `BottomTabBar`-Drawer |
| Kritische Overlays | `z-[60]` | — (frei; `LanguagePickerOverlay` 2026-10-14 durch `LanguageHint` ersetzt) |

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

**E2E-Infrastruktur (B8950-012):** Playwright-`webServer` startet das Frontend (`scripts/e2e-frontend.cjs`, Standalone-Build mit Fingerabdruck-Cache oder `E2E_FRONTEND_MODE=dev`; das Gate `scripts/test-gate.sh` erzwingt den Standalone-Build); das Global Setup prüft nur, startet nichts. Schreibende Specs laufen in einem Shop pro Worker (`e2e/journeys/_helpers/worker-shop.ts`, Admin-Create + Impersonation) bzw. in eigenen Spec-Shops; Testdaten tragen den Marker `E2E-<RUN>-…`, der globalTeardown (`e2e/cleanup-run.ts`, nur als Lock-Inhaber) räumt per Backend-Skript `scripts/e2e_test_data.py` auf. Details: [E2E-Testing](./e2e-testing.md).

**Technische Dokumentation:**
- [i18n & RTL](./i18n.md)
- [Price Types](./price-types.md)
- [E2E-Testing](./e2e-testing.md)
- [Analytics](./analytics.md)
