---
id: category-discovery
title: Category Discovery Flow (F2350)
status: approved
spec-file: e2e/journeys/category-discovery.spec.ts
priority: P2
owner-agent: designer
proposed-in-spec: kategoriesuche-leerzustand-20260522
touches-modules:
  - src/app/(customer)/[lang]/search/**
  - src/components/search/CategoryChips.tsx
  - src/components/search/CategoryEmptyState.tsx
  - src/lib/api.ts
touches-roles:
  - guest
touches-states:
  - Product.availability:available
status-changed-at: 2026-05-22T00:00:00Z
status-changed-by-spec: kategoriesuche-leerzustand-20260522
last-run: 1970-01-01T00:00:00Z
last-result: N/A
---

### Journey: Category Discovery Flow

**Ziel:** Ein Gast tippt einen Kategorie-Chip an, sieht Produkte dieser Kategorie — oder bei leerer Kategorie einen hilfreichen Leerzustand mit verwandten Vorschlägen, denen er folgen kann.

**Trigger-Regel:** Pflicht wenn `src/components/search/CategoryChips.tsx`, `CategoryEmptyState.tsx` oder `src/app/(customer)/[lang]/search/**` im Diff (P2).

**Schritte (Runbook):**

**Happy Path — Kategorie mit Produkten:**
1. Startseite öffnen
2. Kategorie-Chip anklicken (z.B. „🐾 Pet Supplies")
3. URL enthält `?category_id=<id>&category_name=Pet+Supplies`
4. Kategorienamen-Überschrift „Pet Supplies" ist sichtbar
5. Mindestens 1 ProductCard erscheint
6. Klick auf ProductCard → Produkt-Detailseite lädt korrekt

**Edge Case — Leere Kategorie mit Vorschlägen:**
1. Navigiere direkt zu `/{lang}/search?category_id=<leere_id>&category_name=Empty+Cat`
2. Kein ProductCard erscheint
3. Text „Currently no products in this category." sichtbar
4. Mindestens 1 verwandter Kategorie-Link sichtbar
5. Klick auf Vorschlags-Link → navigiert zur Kategoriesuche der verwandten Kategorie

**Edge Case — Leere Kategorie ohne Vorschläge (Backend-Fallback):**
1. Navigiere zu `/{lang}/search?category_id=<id_ohne_verwandte>`
2. Leerzustands-Text sichtbar
3. Fallback-Link „Browse all categories" sichtbar und führt zur Startseite

**Fixtures/Preconditions:**
- Test-Backend auf Port 8500 muss laufen
- `GET /api/v1/categories/{id}/related-with-products` muss deployed sein
- Mindestens 1 Kategorie mit Produkten in pundo_test
- Mindestens 1 Kategorie ohne Produkte in pundo_test (für Leerzustand)

**Known Risks:**
- Backend-Endpoint `related-with-products` noch nicht deployed — Fallback-Verhalten testen bis dahin
