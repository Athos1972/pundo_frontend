---
id: shop-admin-offers
title: Shop-Admin Angebote CRUD (UI + API)
status: implemented
spec-file: e2e/journeys/shop-admin-offers.spec.ts
priority: P1
owner-agent: e2e-tester
proposed-in-spec: shop-admin-offers-catalogued-20260424
touches-modules:
  - src/app/(shop-admin)/**
  - src/components/shop-admin/**
  - src/lib/shop-admin-api.ts
  - src/lib/shop-admin-translations.ts
  - src/types/shop-admin.ts
touches-roles:
  - shop-owner
  - guest
touches-states:
  - Offer.status:active
  - Offer.status:archived
status-changed-at: 2026-05-19T14:00:00Z
status-changed-by-spec: 2026-05-19-offer-list-item-details
last-run: 2026-05-19T14:45:00Z
last-result: PASS
last-run-sha: 312ae62
---

### Journey: Shop-Admin Angebote CRUD

**Ziel:** Shop-Owner legt Angebote an (6 Kombinationen), bearbeitet und archiviert sie. Kunde sieht aktive Angebote auf der Shop-Seite.

**Gruppen:** A (Create 6 Kombinationen), B (Edit 4 Cases), C (Archive + Delete), D (Customer-Visibility), E (Item-Details, Filter & Dashboard-Aufräumen).

**Finding F1 (offen):** `POST /shop-owner/products` Legacy-Endpoint versucht INSERT in `shop_owner_products` (Tabelle entfernt) → HTTP 500. Fixture-Setup schlägt fehl. Spec braucht Rewrite auf `/shop-owner/items` + `/shop-owner/shop-listings`.

---

## Gruppe E — Item-Details, Filter & Dashboard-Aufräumen (2026-05-19-offer-list-item-details)

Implementierte Änderungen: Dashboard ohne Produkte-Kachel (AC-1), OfferList mit Item-Name (AC-2–4), Kategorie-Chip (AC-5–6), Description (AC-7–8), Thumbnail (AC-9–10), Textsuche (AC-11–15), Pagination-Fix (AC-16), Edit-Page Detail-Endpoint (AC-17), H1 mit Item-Name (AC-18), Item-Header-Block (AC-19), RTL-Layout (AC-20), neue i18n-Keys (AC-22), `nav_products` entfernt (AC-24).

### E1: Dashboard zeigt keine Produkte-Kachel (AC-1)

**Precondition:** Shop-Owner ist eingeloggt, navigiert zu `/shop-admin`.
**Steps:**
1. GET `/shop-admin` → Dashboard-Seite laden.
2. Quick-Links-Grid auslesen.
**Expected:**
- Kachel "Products" / "Produkte" ist **nicht** vorhanden.
- Die Kacheln Profile, Hours, Offers, Import, API Keys sind weiterhin sichtbar.
**Backend-Abhängigkeit:** Keine — reine Frontend-Änderung.
**Test-ID:** E1

### E2: Offer-Liste zeigt Item-Namen (AC-2–4)

**Precondition:** Mindestens ein aktives Angebot mit `item`-Embed im Backend.
**Steps:**
1. GET `/shop-admin/offers` → OfferList laden.
2. Ersten Offer-Eintrag prüfen.
**Expected (wenn item-Embed vorhanden):**
- AC-2: Item-Name wird als `<p class="font-medium">` angezeigt (nicht Offer-Titel oder `#id`).
- AC-3: Falls item kein Embed hat, wird `offer.title` oder `Offer #<id>` als Fallback gezeigt (kein Crash).
- AC-4: Namen in User-Sprache priorisiert (lang-Präferenz).
**Backend-Abhängigkeit:** AC-2/AC-4 benötigen item-Embed im Backend (`GET /offers` mit item-Feld). Fallback-Test (AC-3) läuft ohne Backend-Deployment.
**Test-ID:** E2

### E3: Offer-Liste zeigt Kategorie-Chip (AC-5–6)

**Precondition:** Angebot mit `item.category_name` im Embed.
**Steps:**
1. `/shop-admin/offers` → Offer-Zeile aufsuchen.
2. Kategorie-Chip suchen.
**Expected:**
- AC-5: Chip mit `category_name` sichtbar (blau-grau, rounded-full).
- AC-6: Kein Chip wenn `category_name` null ist (kein leerer Chip).
**Backend-Abhängigkeit:** Wie E2.
**Test-ID:** E3

### E4: Offer-Liste Thumbnail (AC-9–10)

**Precondition:** Angebot mit und ohne `item.photos[0]`.
**Steps:**
1. `/shop-admin/offers` → Thumbnails prüfen.
**Expected:**
- AC-9: `<img>` 48×48 sichtbar wenn Foto vorhanden.
- AC-10: Fallback-SVG-Platzhalter sichtbar wenn kein Foto.
**Backend-Abhängigkeit:** AC-9 benötigt Foto-Embed; AC-10 (Fallback-SVG) läuft immer.
**Test-ID:** E4

### E5: Textsuche (AC-11–15)

**Precondition:** Mehrere Angebote in der Liste.
**Steps:**
1. `/shop-admin/offers` → Suchfeld ausfüllen.
2. Text eingeben → gefilterte Liste prüfen.
3. Text leeren → alle zurück.
4. Kategorie-Dropdown wechseln.
**Expected:**
- AC-11: Suchfeld sichtbar (type=search, placeholder vorhanden).
- AC-12: Eingabe eines bekannten Item-Namens → nur passende Einträge sichtbar.
- AC-13: Leeres Suchfeld → alle Einträge wieder sichtbar.
- AC-14: Kategorie-Filter + Textsuche kombinierbar.
- AC-15: Filter-Ergebnis leer → Meldung "No offers match the filter." (kein Crash, kein leeres Div).
**Backend-Abhängigkeit:** Keiner — rein client-seitig (in-memory Filter). Läuft sofort.
**Test-ID:** E5

### E6: Edit-Page mit Item-Header (AC-18–19)

**Precondition:** Gültiger Offer mit `id`.
**Steps:**
1. GET `/shop-admin/offers/<id>/edit`.
2. H1 + Item-Header-Block prüfen.
**Expected:**
- AC-18: `<h1>` enthält Item-Name (wenn item-Embed verfügbar) oder `#<id>` als Fallback.
- AC-19: Item-Header-Block (`bg-gray-50 rounded-xl border`) ist sichtbar wenn item-Embed vorhanden; fehlt graceful wenn Backend kein Embed liefert.
- Kein Crash in beiden Szenarien.
**Backend-Abhängigkeit:** Vollständig (AC-18/19 mit Embed); Fallback-Test ohne Embed läuft sofort.
**Test-ID:** E6

### E7: RTL-Layout in Offer-Liste (AC-20)

**Precondition:** App-Sprache `ar` oder `he` (RTL).
**Steps:**
1. Cookie `app_lang=ar` setzen → `/shop-admin/offers` laden.
2. `<html dir="rtl">` prüfen.
3. Offer-Zeile: `flex-row-reverse` auf Zeilen-Container.
**Expected:**
- AC-20: Offer-Zeile kehrt flex-Richtung um (`rtl:flex-row-reverse`).
- Thumbnail links, Text rechts (visuelle RTL-Logik).
**Backend-Abhängigkeit:** Keine — reine CSS-Klassen-Prüfung.
**Test-ID:** E7
