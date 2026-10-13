---
id: customer-offer-price-tiers
title: Staffelpreise & Einheiten in der Kundensicht — Produktseite + Shop-Seite, mit/ohne Aktion, 6 Sprachen, RTL, 390 px (F5200)
status: implemented
spec-file: e2e/journeys/customer-offer-price-tiers.spec.ts
priority: P2
owner-agent: e2e-tester
proposed-in-spec: 2026-10-13-staffelpreise-kundensicht
touches-modules:
  - src/components/product/**
  - src/components/shop/**
  - src/app/(customer)/[lang]/products/[slug]/**
  - src/app/(customer)/[lang]/shops/[slug]/**
  - src/types/api.ts
  - src/lib/price-tiers.ts
  - src/lib/structured-data.ts
touches-roles:
  - shop-owner
  - guest
touches-states:
  - Offer.promo:active
  - Offer.promo:absent
status-changed-at: 2026-10-13T00:00:00Z
status-changed-by-spec: 2026-10-13-staffelpreise-kundensicht
last-run: 2026-10-13T16:22:00Z
last-result: PASS (11/11)
last-run-sha: —
---

# Journey: customer-offer-price-tiers

**Status:** implemented
**Priority:** P2

## Purpose

Der Shop-Owner pflegt Preisstaffeln/Einheiten (Owner-API), der Gast sieht sie auf Produktseite und Shop-Seite: Hauptpreis + Einheiten-Suffix, Staffelblock, Aktion ersetzt Staffel, Einklappen ab > 3 Zeilen, kompakte ShopOfferCard, JSON-LD `priceSpecification`, 6 Sprachen (ar/he RTL), 390 px.

## Spec

`e2e/journeys/customer-offer-price-tiers.spec.ts` (Quelle der Wahrheit). Szenarien: S1 AK1/AK16, S2 AK4/JSON-LD, S3 AK2/AK3/JSON-LD Aktion, S4 AK5/AK8, S5 AK6/AK7/AK10/AK11/AK12, S6 AK9, S7 AK13/AK14/AK15 (en, el, ru, ar, he).

## Testdaten

Worker-Shop, Marker `E2E-<RUN>-F5200-…`; zwei Items (Brot mit Staffel, Legacy-Einheit `piece`). Jede Preisänderung per PATCH archiviert das Offer und legt ein neues an, die Spec führt die aktuelle Offer-ID mit. Aufräumen via `workerShop.cleanupSpecData()`.
