# Journey Catalog — pundo_frontend

> Quelle der Wahrheit. Pflegeregeln: siehe CATALOG_SCHEMA.md.
> Agents (designer/architect/coder/e2e-tester) lesen und schreiben diese Datei
> nach den dort festgelegten Rollen. User-Bestätigung (j/n) vor jeder
> Mutation außer last-run/last-result.

<!-- SCHEMA_VERSION: 1 -->

---
id: shop-owner-lifecycle
title: Shop-Owner Lifecycle
status: proposed
priority: P1
owner-agent: designer
proposed-in-spec: journey-catalog-system-20260423
touches-modules:
  - src/app/shop-admin/**
  - src/app/shops/[id]/**
  - src/lib/shop-admin-api.ts
touches-roles:
  - shop-owner
  - guest
touches-states:
  - Shop.status:active
  - Shop.status:inactive
status-changed-at: 2026-04-23T10:00:00Z
status-changed-by-spec: journey-catalog-system-20260423
last-run: never
last-result: N/A
---

### Journey: Shop-Owner Lifecycle

**Ziel:** Shop-Owner registriert sich, aktiviert den Shop, fügt Produkte hinzu — und ein Guest-Nutzer kann die Produkte dann in der Discovery finden. Nach Deaktivierung des Shops sind die Produkte nicht mehr sichtbar.

**Trigger-Regel:** Pflicht bei jedem Testlauf, wenn `touches-modules` im git-Diff sind (P1).

**Schritte (Runbook):**
1. Shop-Owner-Account anlegen (POST /api/v1/auth/register mit Rolle shop-owner)
2. Einloggen und JWT erhalten
3. Shop-Profil ausfüllen (Name, Adresse, Öffnungszeiten)
4. Shop aktivieren (status: active)
5. Produkt anlegen (POST /api/v1/shop-admin/products)
6. Als Guest: Suche nach dem Produkt — Ergebnis muss erscheinen
7. Als Guest: Shop-Detailseite aufrufen — Produkt muss sichtbar sein
8. Shop deaktivieren (status: inactive)
9. Als Guest: Suche wiederholen — Produkt darf nicht mehr erscheinen
10. Shop-Detailseite aufrufen — Shop zeigt "nicht verfügbar"
11. Cleanup: Shop-Owner-Account und Testdaten löschen

**Fixtures/Preconditions:**
- Test-Backend auf Port 8500 muss laufen
- Keine existierenden Testdaten mit gleicher E-Mail-Adresse

**Known Risks:**
- Step 6/9 kann durch Caching verzögert sein — ggf. kurzes Wait einbauen

---
id: customer-discovery
title: Customer Discovery Flow
status: proposed
priority: P2
owner-agent: designer
proposed-in-spec: journey-catalog-system-20260423
touches-modules:
  - src/app/page.tsx
  - src/app/search/**
  - src/app/products/[slug]/**
  - src/app/shops/[id]/**
  - src/app/map/**
  - src/lib/api.ts
touches-roles:
  - guest
  - customer
touches-states:
  - Product.availability:available
status-changed-at: 2026-04-23T10:00:00Z
status-changed-by-spec: journey-catalog-system-20260423
last-run: never
last-result: N/A
---

### Journey: Customer Discovery Flow

**Ziel:** Ein nicht-eingeloggter Besucher (Guest) sucht nach einem Produkt, findet es über die Suche oder Karte, öffnet die Detailseite und sieht Preise und Shop-Standort.

**Trigger-Regel:** Pflicht wenn `src/app/search/**`, `src/app/map/**` oder `src/lib/api.ts` im Diff (P2).

**Schritte (Runbook):**
1. Startseite öffnen — Suchleiste sichtbar
2. Suchbegriff eingeben (z.B. "Katzenfutter")
3. Suchergebnisse erscheinen — mindestens 1 ProductCard
4. Klick auf ProductCard → Produkt-Detailseite lädt
5. Produktname, Preis und Angebote sichtbar
6. "In der Nähe"-Karte zeigt Shop-Pin
7. Klick auf Shop-Pin → Shop-Detailseite lädt
8. Shop-Name, Adresse und Öffnungszeiten sichtbar
9. Back-Navigation funktioniert korrekt (History-Stack intakt)

**Fixtures/Preconditions:**
- Mindestens 1 aktiver Shop mit mindestens 1 Produkt in der Test-DB (pundo_test)
- Test-Backend auf Port 8500 muss laufen

**Known Risks:**
- Karte (Leaflet) braucht DOM — nur in echtem Browser testbar, nicht in JSDOM

---
id: shop-owner-full-lifecycle
title: Shop-Owner Full Lifecycle + UI-Kombinations-Matrix
status: proposed
priority: P1
owner-agent: designer
proposed-in-spec: journey-catalog-system-20260423
touches-modules:
  - src/app/(shop-admin)/**
  - src/app/(system-admin)/**
  - src/app/(customer)/shops/[id]/**
  - src/app/(customer)/search/**
  - src/app/(customer)/products/[slug]/**
  - src/components/shop/**
  - src/components/product/**
  - src/lib/shop-admin-api.ts
touches-roles:
  - shop-owner
  - admin
  - guest
touches-states:
  - ShopOwner.status:pending
  - ShopOwner.status:approved
  - Shop.status:active
  - Shop.status:inactive
status-changed-at: 2026-04-23T12:00:00Z
status-changed-by-spec: journey-catalog-system-20260423
last-run: never
last-result: N/A
---

### Journey: Shop-Owner Full Lifecycle + UI-Kombinations-Matrix

**Ziel:** Deckt den kompletten Shop-Owner-Lifecycle (Register → Approval → Setup → Sichtbarkeit → Deaktivierung) und verifiziert dabei alle UI-Kombinationen im Frontend — ShopCard-Icons, Language-Badges, Tooltips, alle price_type-Varianten, OfferList-CTAs, PriceHistory, RTL.

**Trigger-Regel:** Pflicht bei jedem Testlauf wenn shop-admin/**, shops/[id]/**, ShopCard, ProductCard oder shop-admin-api.ts im Diff sind (P1).

**Test-Daten-Matrix (was aufgebaut wird):**

Für vollständige UI-Abdeckung werden folgende Fixtures angelegt, weil sich manche Zustände gegenseitig ausschließen:

| Fixture | Was | Warum separat |
|---|---|---|
| `shop-A` | Shop MIT Logo, MIT allen 3 Icons (parking/delivery/online), 6 spoken_languages mit votes, is_open_now=true, 5-Sterne-Rating | Maximale ShopCard-Befüllung |
| `shop-B` | Shop OHNE Logo, OHNE Icons, OHNE languages, is_open_now=false, kein Rating | Minimale ShopCard — Fallbacks prüfen |
| `product-fixed` | Produkt MIT Foto, price_type=fixed, Offer MIT URL, MIT PriceNote, available=true | Fixed-Price CTA-Pfad |
| `product-on-request` | Produkt OHNE Foto (Fallback prüfen), price_type=on_request, Offer MIT Telefon, available=false | On-Request CTA + Unavailable-State |
| `product-free` | Produkt MIT Foto, price_type=free, kein Offer-CTA | Free-Label-Pfad |
| `product-variable` | Produkt MIT Foto, price_type=variable, 3 Preispunkte → PriceHistory sichtbar | Variable + PriceHistory-Chart |

**Schritte (Runbook):**

PHASE 1 — Setup (API-Calls gegen :8500)
1. Shop-Owner-Account anlegen (POST /api/v1/shop-owner/register), prefix: `e2e-lifecycle-{uuid}`
2. Admin-Login, Owner auf `approved` setzen
3. Owner-Login, alle 6 Fixtures anlegen (shop-A, shop-B, alle 4 Produkte mit Offers)
4. Geocoordinates für beide Shops setzen (Larnaca-Testkoordinaten)
5. Language-Votes für shop-A anlegen (mind. 1 Vote pro Sprache)

PHASE 2 — Öffentliche Sichtbarkeit als Guest (:3500)
6. Suche nach Fixture-Prefix → beide Shops erscheinen
7. ShopCard shop-A: alle Icons sichtbar, alle Language-Badges, Tooltip auf jedem Icon öffnet sich, Rating angezeigt
8. ShopCard shop-B: kein Logo (Fallback-Avatar), keine Icons, kein Rating, "Closed"-Badge
9. Produktliste shop-A: alle 4 Produkte mit korrekten price_type-Labels
10. Produktdetail product-fixed: Offer mit URL-CTA, PriceNote sichtbar, Available-Badge grün
11. Produktdetail product-on-request: kein Foto → Fallback-Bild; tel:-CTA; Available-Badge grau/rot
12. Produktdetail product-free: "Free"-Label, kein CTA
13. Produktdetail product-variable: PriceHistory-Chart sichtbar (≥2 Datenpunkte)
14. RTL-Wiederholung: Schritte 7-13 mit ?lang=ar → `<html dir=rtl>`, Layout gespiegelt

PHASE 3 — Deaktivierung
15. Owner deaktiviert shop-A (status: inactive)
16. Suche nach Prefix: shop-A nicht mehr sichtbar, shop-B noch sichtbar (war nie deaktiviert)
17. Direktaufruf /shops/shop-A-slug → 404 oder "nicht verfügbar"

PHASE 4 — Cleanup
18. Alle Fixtures löschen (DELETE /admin/shops + PATCH owner→rejected)

**Reporting-Anforderungen:**
- Pro Schritt: Expected (was soll sichtbar sein), Actual (was wurde gefunden), Status (PASS/FAIL/SKIP)
- Bei FAIL: Screenshot + exakter DOM-Selektor der nicht gefunden wurde
- Keine Testanpassung bei FAIL ohne vorherige RCA (siehe Journey-Prinzipien in CATALOG_SCHEMA.md)

---
id: customer-and-review-lifecycle
title: Customer Auth + Interaction + Review Lifecycle
status: proposed
priority: P2
owner-agent: designer
proposed-in-spec: journey-catalog-system-20260423
touches-modules:
  - src/app/(customer)/auth/**
  - src/app/(customer)/shops/[id]/**
  - src/app/(customer)/products/[slug]/**
  - src/components/shop/**
  - src/lib/api.ts
touches-roles:
  - customer
  - admin
  - guest
touches-states:
  - Customer.is_authenticated:false
  - Customer.is_authenticated:true
  - Review.status:pending
  - Review.status:approved
status-changed-at: 2026-04-23T12:00:00Z
status-changed-by-spec: journey-catalog-system-20260423
last-run: never
last-result: N/A
---

### Journey: Customer Auth + Interaction + Review Lifecycle

**Ziel:** Customer registriert sich, loggt sich ein, interagiert mit Shops (Review, Spotted), Shop-Owner verwaltet seinen API-Key, Admin moderiert Reviews — in einer zusammenhängenden Kette.

**Trigger-Regel:** Pflicht wenn auth/**, ReviewForm, ReviewSection, SpottedFeature oder api-keys im Diff (P2).

**Test-Daten-Matrix:**

Voraussetzung: mind. 1 aktiver Shop mit mind. 1 Produkt in pundo_test (entweder aus shop-owner-full-lifecycle oder eigener Fixture-Shop).

| Fixture | Was | Warum |
|---|---|---|
| `customer-account` | Frischer Customer-Account, unverifiziert → dann verifiziert | Auth-State-Transitions testen |
| `review-pending` | Review vom Customer, noch nicht moderiert | Moderation-Workflow testen |
| `review-approved` | Review nach Admin-Approval | Sichtbarkeit post-Approval |
| `api-key-active` | API-Key vom Shop-Owner | Generate/Revoke-Cycle |

**Schritte (Runbook):**

PHASE 1 — Customer-Auth
1. Customer registriert sich (/auth/register)
2. Vor E-Mail-Verify: geschützte Seiten leiten um → Pending-Seite korrekt angezeigt
3. E-Mail-Verifizierung (via Test-Endpoint oder Admin-Bypass)
4. Login → Redirect zu Account-Seite
5. Logout → public-only Zustand wiederhergestellt

PHASE 2 — Customer Interaction
6. Customer loggt sich wieder ein, navigiert zu einem Test-Shop
7. Review-Formular ausgefüllt und submitted → Review erscheint als "pending"
8. Spotted-Feature: Produkt als "vor Ort gesehen" markiert → Bestätigung erscheint
9. API-Key: Shop-Owner generiert Key → Key wird einmalig angezeigt → löschen → weg

PHASE 3 — Admin Moderation
10. Admin sieht pending Review in Moderation-Liste
11. Admin approved Review → erscheint jetzt öffentlich auf Shop-Detail
12. Admin rejected zweiten Review → verschwindet, Customer-Feedback angezeigt

**Reporting-Anforderungen:** (wie Journey 1)

---
id: admin-data-management
title: Admin Data Management Sweep
status: proposed
priority: P3
owner-agent: designer
proposed-in-spec: journey-catalog-system-20260423
touches-modules:
  - src/app/(system-admin)/**
  - src/app/(customer)/guides/**
  - src/components/ui/**
touches-roles:
  - admin
  - guest
touches-states:
  - Brand.exists:true
  - Category.has_children:true
  - Guide.status:published
status-changed-at: 2026-04-23T12:00:00Z
status-changed-by-spec: journey-catalog-system-20260423
last-run: never
last-result: N/A
---

### Journey: Admin Data Management Sweep

**Ziel:** Admin-User durchläuft alle wesentlichen Datenverwaltungs-Bereiche in einer Kette: Brands, Categories (Tree + CRUD), Shop-Owner-Moderation, Guides — und verifiziert dass die verwalteten Daten auf der public-facing Seite erscheinen.

**Trigger-Regel:** Wenn src/app/(system-admin)/**, guides/**, BrandCard, CategoryTree im Diff (P3).

**Test-Daten-Matrix:**

| Fixture | Was | Warum |
|---|---|---|
| `brand-with-logo` | Brand MIT Logo-Upload | Bild-Upload + Anzeige testen |
| `brand-without-logo` | Brand OHNE Logo | Fallback-Avatar testen |
| `category-parent` | Top-Level-Kategorie | Tree-Root-Rendering |
| `category-child` | Sub-Kategorie unter parent | Tree-Expand/Collapse |
| `guide-published` | Guide im Status published | Public-Sichtbarkeit |

**Schritte (Runbook):**

1. Admin legt brand-with-logo an → Logo erscheint in Brand-Übersicht
2. Admin legt brand-without-logo an → Fallback korrekt
3. Admin navigiert Category-Tree: parent expandieren → child sichtbar → collapse
4. Admin legt category-child unter parent an → erscheint im Tree
5. Admin öffnet Shop-Owner-Moderation: pending Owner ablehnen (mit Begründung)
6. Als Guest: /guides → guide-published erscheint in Listing
7. Guide öffnen → Inhalt + Navigation korrekt, RTL-Durchgang mit lang=ar
8. Cleanup: Alle Test-Fixtures löschen
