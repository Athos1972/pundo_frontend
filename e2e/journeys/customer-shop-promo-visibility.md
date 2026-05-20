---
id: customer-shop-promo-visibility
title: Kunden-Sicht Shop-Aktionen (Aktionsblock vs. Produktblock)
status: implemented
spec-file: e2e/journeys/customer-shop-promo-visibility.spec.ts
priority: P2
owner-agent: e2e-tester
proposed-in-spec: offer-price-model-and-display-20260520
touches-modules:
  - src/app/(customer)/shops/[slug]/**
  - src/components/shop/**
  - src/lib/api.ts
  - src/types/api.ts
touches-roles:
  - guest
touches-states:
  - Offer.promo:active
  - Offer.promo:absent
status-changed-at: 2026-05-20T15:10:00Z
status-changed-by-spec: offer-price-model-and-display-20260520
last-run: 1970-01-01T00:00:00Z
last-result: N/A
---

### Journey: Kunden-Sicht Shop-Aktionen

**Ziel:** Auf der Shop-Detailseite erscheinen Angebote mit aktiver Aktion im Block „Aktuelle Angebote" (im Produkt-Stil mit Badge), während Standard-Listings ausschließlich im Block „Produkte" landen. Kein Angebots-Block wenn keine aktive Aktion.

**Voraussetzung:** Backend-Deployment BE-1–BE-4 (promo_price_tiers, neuer offers-Endpoint) abgeschlossen.

### P1: Kein Angebotsblock ohne aktive Aktion (AC-7)

**Precondition:** Shop hat Offers, aber keine mit aktivem Aktionszeitraum (alle ohne `promo_valid_from`/`promo_valid_until` oder Zeitraum abgelaufen).
**Steps:**
1. GET `/shops/<slug>` (lang=en).
2. DOM nach Section mit `tr.shop_offers`-Heading suchen.
**Expected:**
- Block „Current offers" / Heading `h2` für shop_offers ist **nicht** im DOM.
- Block „Products" ist sichtbar (Standard-Listings erscheinen dort).
**Backend-Abhängigkeit:** Vollständig — Endpoint liefert leere Liste für Shop ohne aktive Aktionen.
**Test-ID:** P1

### P2: Angebotsblock mit aktiver Aktion — Produkt-Stil-Karte (AC-8)

**Precondition:** Shop hat mindestens ein Offer mit aktivem Aktionszeitraum (heute ∈ `[promo_valid_from, promo_valid_until]`).
**Steps:**
1. GET `/shops/<slug>` → Angebotsblock laden.
2. Erste `ShopOfferCard` im DOM prüfen.
**Expected:**
- `<img>` (Thumbnail) sichtbar mit `src` gesetzt.
- Item-Name als Link (oder Text, wenn `item_slug` null).
- Brand-Text sichtbar wenn `item_brand` vorhanden.
- Preis-Zeile vorhanden (nicht leer).
**Backend-Abhängigkeit:** Vollständig.
**Test-ID:** P2

### P3: Preis ohne 4-Nachkommastellen (AC-9)

**Precondition:** Backend liefert `promo_price: "7.9900"` oder `standard_price: "12.5000"`.
**Steps:**
1. GET `/shops/<slug>` → Preistext auslesen.
**Expected:**
- Angezeigter Preis endet nicht auf mehr als 2 Dezimalstellen: `7.99`, nicht `7.9900`.
**Backend-Abhängigkeit:** Keine zusätzliche — reine `fmtPrice()`-Logik im Frontend.
**Test-ID:** P3

### P4: Aktions-Badge mit Datum (AC-10)

**Precondition:** Aktives Offer mit `promo_valid_until` gesetzt.
**Steps:**
1. GET `/shops/<slug>` → Angebotsblock.
2. Badge-Element in ShopOfferCard prüfen.
**Expected:**
- Badge sichtbar mit Klassen `bg-red-50 text-red-600` (oder äquivalent per Design-System).
- Badge-Text enthält Datum aus `promo_valid_until` (lokalisiert).
- Durchgestrichener Standard-Preis sichtbar neben Aktionspreis (`<s>` oder `line-through`-Klasse).
**Backend-Abhängigkeit:** Vollständig.
**Test-ID:** P4

### P5: Alle 6 Sprachen — neue Keys vorhanden (AC-11)

**Precondition:** Aktives Offer vorhanden.
**Steps:**
1. Für jede Sprache `[en, de, el, ru, ar, he]`: Cookie `app_lang=<lang>` setzen → GET `/shops/<slug>`.
2. Badge-Text + „Normalpreis"-Label prüfen.
**Expected:**
- Kein leerer String, kein fehlender Key (kein `undefined` im DOM).
- AR + HE: `<html dir="rtl">`, Badge-Position gespiegelt (`rtl:` Tailwind-Klassen aktiv).
**Backend-Abhängigkeit:** Keine.
**Test-ID:** P5
