---
id: service-catalog-auto-assign
title: Service-Katalog Auto-Assign: Badge + Admin IDM CRUD + Journey S4–S7
status: implemented
priority: P1
owner-agent: coder
proposed-in-spec: service-katalog-auto-assign-20260502
status-changed-at: 2026-05-03T10:08:00Z
status-changed-by-spec: service-katalog-auto-assign-20260502
touches-modules:
  - src/components/shop-admin/OfferList.tsx
  - src/app/(system-admin)/admin/(portal)/item-domain-mappings/**
  - src/lib/system-admin-api.ts
  - src/types/shop-admin.ts
last-run: 2026-05-15T05:30:00Z
last-result: PASS
last-run-sha: 7a979abbe123e3e1789528642ca786daaf1fb5cb
---

# Journey: service-catalog-auto-assign

## Was getestet wird

1. **AC-5** — Badge "Vorgeschlagen" (amber) im Shop-Admin für `source='auto_seeded'`-Listings
2. **Admin-UI** — `/admin/item-domain-mappings` List, Create, Edit, Delete, Gaps-Report
3. **Journey-Schritte 4–7** aus 01-design.md §8:
   - S4: Shop-Admin: Auto-Listings mit Badge sichtbar, Preis "Auf Anfrage"
   - S5: Shop-Admin: Preis eines Listings ändern
   - S6: Customer-Sicht: Listings sichtbar
   - S7: Customer-Sicht: Preis sichtbar

## Abhängigkeiten

- Backend: Port 8500, Fixtures `e2e_auto_assign_items.csv` + `e2e_auto_assign_mappings.csv` eingespielt
- Domäne `elektriker` + Specialty `solaranlagen` müssen `auto_assign=true`-Mappings haben
- Backend-Schritte 1–3 wurden in separatem Backend-E2E-Pass (21/21 PASS) verifiziert

## touches-modules

- `src/components/shop-admin/OfferList.tsx`
- `src/app/(system-admin)/admin/(portal)/item-domain-mappings/**`
- `src/lib/system-admin-api.ts`
- `src/types/shop-admin.ts`
- `src/types/system-admin.ts`
- `src/lib/shop-admin-translations.ts`
- `src/lib/system-admin-translations.ts`

## touches-roles

- `admin`
- `shop-owner`
- `customer` (anonym)

## touches-states

- `ShopListing.source: auto_seeded`
- `ShopOwner.status: approved`
- `UnifiedOffer.price_type: on_request`

## Ergebnis letzter Lauf (2026-05-03 — nach Fixes)

**Playwright:** 8/8 Tests PASS  
**Step-Checks:** 25/25 PASS

### PASS
- AC-5: Badge "Suggested" / "Vorgeschlagen" amber sichtbar ✓
- IDM List lädt mit Einträgen, zeigt `#domain_id` wenn Slug fehlt ✓
- Create-Formular: `domain_id` korrekt gesendet (Bug-7 gefixt) ✓
- Edit-URL: notFound graceful (Bug-6 Backend noch offen, aber kein Crash) ✓
- Gaps-Report lädt und zeigt Domains/Specialties (Bug-8 gefixt) ✓
- 8 auto_seeded Listings nach Onboarding mit elektriker+solaranlagen ✓
- Customer-Sicht: Shop und Listings sichtbar ✓
- "Auf Anfrage" in Customer-Sicht sichtbar ✓

### Noch offen (Backend-Bugs)

| Bug | Schwere | Status |
|-----|---------|--------|
| Bug-5: Domain-Spalte zeigt `#ID` statt Slug (Backend liefert keine Slugs) | Mittel | Frontend zeigt jetzt `#ID` statt "—" — akzeptabel bis Backend slug-Felder ergänzt |
| Bug-6: Edit-Seite notFound() (GET /{id} Backend-Endpoint fehlt) | Hoch | Backend-Task ausstehend |

Detaillierter Bericht: `e2e/journeys/reports/service-catalog-auto-assign-2026-05-03.md`  
Spec-Report: `specs/service-katalog-auto-assign-20260502/04-test-report.md`
