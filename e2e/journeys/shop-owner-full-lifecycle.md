---
id: shop-owner-full-lifecycle
title: Shop-Owner Full Lifecycle + UI-Kombinations-Matrix
status: implemented
spec-file: e2e/journeys/shop-owner-full-lifecycle.spec.ts
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
status-changed-at: 2026-04-23T15:00:00Z
status-changed-by-spec: journey-catalog-system-20260423
last-run: 2026-04-24T14:00:00Z
last-result: PASS
last-run-sha: bc4e8ac89c083856c0eb12e76a581461f768787b
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
