---
id: shop-detail-attribute-matrix
title: Shop-Detail Attribut-Matrix (2 Datenvarianten)
status: approved
spec-file: e2e/journeys/shop-detail-attribute-matrix.spec.ts
priority: P2
owner-agent: coder
proposed-in-spec: unified-item-offer-model-20260424
touches-modules:
  - src/app/(shop-admin)/**
  - src/app/(customer)/[lang]/shops/[slug]/**
  - src/components/shop/**
  - src/lib/shop-admin-api.ts
  - src/lib/payment-methods.ts
touches-roles:
  - shop-owner
  - guest
touches-states:
  - Shop.phone:present
  - Shop.social_links:many
  - Shop.service_radius_km:present
  - Shop.delivers_island_wide:true
  - Shop.is_charity_supporter:approved
  - Shop.appointment_required:true
  - Shop.payment_methods:non-empty
status-changed-at: 2026-04-24T14:00:00Z
status-changed-by-spec: unified-item-offer-model-20260424
last-run: 1970-01-01T00:00:00Z
last-result: N/A
---

### Journey: Shop-Detail Attribut-Matrix

**Ziel:** Shop-Owner befüllt Profilfelder vollständig → Guest sieht alle Attribute korrekt auf der Shop-Detailseite. Ersetzt die zwei separaten Specs `shop-admin-profile` und `shop-admin-profile-phone-logo`.

**2 Datenvarianten (separate Fixtures, nie zusammenpappen):**

**Variante A — Telefon + WhatsApp + Standard Social Links:**
- Felder: Telefonnummer (als `tel:` Link), WhatsApp-Nummer, Instagram, Facebook
- Regeln: `tel:` Link nur wenn Telefon vorhanden; WhatsApp-Button nur wenn WhatsApp vorhanden
- Kunde sieht: `tel:` Link, WhatsApp-Button, Social-Icons

**Variante B — Viele Social Links (Standard + Erweitert):**
- Felder: alle Standard-Links (Insta, FB, Twitter/X) + erweiterte Links (TikTok, YouTube, etc.)
- Überprüft: alle Links erscheinen korrekt, kein Overflow, kein Link fehlt

**Wichtig:** KEIN separater E2E-Test nur für Telefonnummer. Die Telefonnummern-Logik wird in Variante A im Gesamtkontext "Shop anlegen → alle Attribute pflegen → in Kundenansicht verifizieren" getestet.

### F5300 / F3800 Phase 1a — Neue Szenarien (shop-self-service-attribute-batch-20260606)

**Variante C — Umkreis + Charity (approved) + Termin + Zahlungsarten:**

Owner-Phase:
- Owner setzt `service_radius_km=30` → speichert (AC-01)
- Owner aktiviert Charity-Toggle → speichert → sieht "In Prüfung" (AC-06)
- Owner setzt `appointment_required=true` → speichert (AC-11)
- Owner wählt `cash` + `card` → speichert (AC-13)

Consumer-Phase (Fixture-Shop mit `is_charity_supporter=true`, `service_radius_km=30`, `appointment_required=true`, `payment_methods=['cash','card']`):
- Shop-Detail zeigt Umkreis-Hinweis (AC-02)
- Shop-Detail zeigt Charity-Badge (AC-08)
- Shop-Detail zeigt Termin-Hinweis (AC-11)
- Shop-Detail zeigt Zahlungs-Chips (AC-14)
- Shop-Detail zeigt keinen Zahlungsarten-Block wenn `payment_methods=[]` (AC-15)

**Variante D — Charity pending → kein Badge:**
- Fixture-Shop mit `is_charity_supporter=false` (pending, nicht approved)
- Consumer-Sicht: kein Charity-Badge sichtbar (AC-07)

**Variante E — Island-wide:**
- Fixture-Shop mit `delivers_island_wide=true`
- Consumer-Sicht: "Liefert inselweit"-Hinweis sichtbar (AC-04)

**Hinweis Radius-Filter-Chip (AC-03):**
- Chip "Delivers to me" ist disabled solange keine Geolocation
- Mit Geolocation und aktivem Chip: Shops ohne Radius-Angabe ausgeblendet (AC-05)
