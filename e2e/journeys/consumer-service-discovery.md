---
id: consumer-service-discovery
title: Endkunden-Dienstleistung: Listing -> Kundensuche (6 Sprachen) -> Anbieterliste (F2970)
status: implemented
spec-file: e2e/journeys/consumer-service-discovery.spec.ts
priority: P1
owner-agent: coder
proposed-in-spec: 2026-10-13-consumer-service-categories
touches-modules:
  - src/components/search/ServiceResultCard.tsx
  - src/components/search/ResultCard.tsx
  - src/app/(customer)/[lang]/search/**
  - src/app/(customer)/[lang]/shops/**
  - src/components/shop-admin/onboarding/StepDomains.tsx
  - src/components/shop-admin/CategoryPicker.tsx
  - src/lib/i18n/search.ts
touches-roles:
  - shop-owner
  - guest
touches-states:
  - ShopOwner.status:approved
  - ShopListing.available:true
status-changed-at: 2026-10-13T10:30:00Z
status-changed-by-spec: 2026-10-13-consumer-service-categories
last-run: never
last-result: N/A
---

### Journey: Endkunden-Dienstleistung — Listing -> Kundensuche -> Anbieterliste (F2970)

**Freigabe:** vom Designer vorgeschlagen, durch Bernhard am 2026-10-13 freigegeben (Entscheidung E10/E12 im Spec
`2026-10-13-consumer-service-categories`); Glob-Korrektur laut Architektur §10: `src/lib/i18n/search.ts` ergänzt, `src/lib/api.ts` entfernt (F2970 ändert die Datei nicht).

**Ziel:** Jede Endkunden-Dienstleistung der Welle 1 ist über die Alltagswörter in allen 6 Sprachen als eigene, spezifische Karte auffindbar;
die Karte führt zu einer Anbieterliste, die Onboarding-, Listing- und Google-Ortstyp-Anbieter inklusive Unterkategorien enthält.

**Voraussetzung:** `scripts/seed_consumer_services.py --apply` ist auf `pundo_test` gelaufen. Test-Frontend 3500, Test-Backend 8500. Kein DB-Reset.

**Schritte (Runbook):**
1. AC15 — Für `Friseur` (de), `hairdresser`/`barber` (en), `κομμωτήριο` (el), `парикмахерская` (ru), `מספרה` (he), `حلاق` (ar): `/{lang}/search?q=…` zeigt als erste Service-Karte „Friseur & Barbier“ (Name in UI-Sprache) mit Anbietern > 0; keine Elternkarte davor.
2. AC16 — `Massage` / `массаж` → Karte „Massage“/„Массаж“, nicht „Gesundheitsschutz & Vorbeugung“.
3. AC17/AC18 — Shop-Owner legt „Herrenhaarschnitt“ (Typ Dienstleistung, Vorschlag „Herrenfriseur & Barbier“) an; der E2E-Shop erscheint in `/shops?service_category_id=` der Karte, der Elternkarte „Friseur & Barbier“ und „Schönheit, Wellness & Fitness“ — jeder Shop genau einmal; Klick auf die Karte führt zu `/de/shops?service=<id>`.
4. AC19 — „Reinigung“ zeigt getrennte Karten: Haushaltshilfe, Wäscherei, Gebäudereinigung.
   Die Haushaltshilfe erscheint über ein schwaches Synonym (`manual_weak`), nie als Top-1.
   Mehrdeutige Produktwörter (`κερί`, `wax`, `Wachs`, `воск`, `شمع`, `שעווה`; Liste `ingestor/taxonomy/ambiguous_search_terms.json` im Backend) liefern keine Waxing-Karte als Top-1.
5. AC22 — `he`/`ar` bei 390 px: `dir=rtl`, kein horizontaler Scroll.
6. O2 — Karten ohne Anbieter zeigen „Du bietest das an? Kostenlos eintragen“ → Link `/shop-admin/onboarding` (ohne Sprachpräfix).
7. AC26/AC21 — Regression (plumber, electrician, locksmith, Klempner, Schlüsseldienst, photographer; Katzenfutter ohne Service-Karte); identische API-Antwort unabhängig vom Marken-Host.

**Fixtures/Preconditions:** `e2e-owner@pundo-e2e.io` (`.test-state.json`); Service-Listing „Herrenhaarschnitt E2E-F2970-<ts>” — Teardown entfernt nur das Listing (Items sind für Owner nicht löschbar; ein Rest-Item blockiert per Fuzzy-Match → wird wiederverwendet).

**Known Risks:** Anbieterzahlen hängen am Datenstand in `pundo_test` (nach `sync_prod_to_test.sh` den Seed erneut anwenden). Die Ergebnisliste wird für Mobile-Sheet und Desktop-Panel doppelt gerendert — Selektoren nutzen `:visible`/Rollen.
