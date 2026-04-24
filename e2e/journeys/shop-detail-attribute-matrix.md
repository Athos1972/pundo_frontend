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
  - src/app/(customer)/shops/[id]/**
  - src/components/shop/**
  - src/lib/shop-admin-api.ts
touches-roles:
  - shop-owner
  - guest
touches-states:
  - Shop.phone:present
  - Shop.social_links:many
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
