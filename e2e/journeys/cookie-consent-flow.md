---
id: cookie-consent-flow
title: Cookie Consent Gate + Meta-Pixel Load/Block
status: implemented
spec-file: e2e/journeys/cookie-consent-flow.spec.ts
priority: P1
proposed-in-spec: meta-pixel-consent-20260531
touches-modules:
  - src/components/consent/**
  - src/lib/consent.ts
  - src/lib/meta-pixel.ts
  - src/app/(customer)/layout.tsx
  - src/components/layout/FooterLinks.tsx
touches-roles:
  - customer
last-run: 2026-05-31
last-result: PASS
last-run-sha: 6f12f563d4e430cbff5e854bb814a7df9dc40b12
status-changed-at: 2026-05-31T18:55:00Z
status-changed-by-spec: meta-pixel-consent-20260531
---

# Cookie Consent Gate + Meta-Pixel Load/Block

## Ziel

Stellt sicher, dass der Meta/Facebook Pixel ausschließlich nach explizitem Marketing-Opt-in geladen wird und bei Ablehnung vollständig unterdrückt bleibt. Deckt DSGVO-konforme Consent-Mechanik, Cookie-Persistenz und RTL-Darstellung ab.

## Acceptance Criteria (aus 01-design.md)

- **AC-1:** Erstbesucher ohne Cookie → Banner sichtbar, kein facebook.com-Request, kein `_fbp`-Cookie
- **AC-2:** Opt-in → fbevents.js geladen, Banner weg, Consent-Cookie `marketing:true`
- **AC-3:** Ablehnen → kein Pixel, Cookie `marketing:false`
- **AC-4:** Cookie gesetzt → kein Banner beim nächsten Besuch
- **AC-6:** Nach Ablehnen → kein `meta-pixel-init`-Script im DOM
- **AC-8:** Arabisch → `html[dir=rtl]`, arabische Strings im Banner
- Footer-Link: „Cookie-Einstellungen" öffnet Banner erneut

## Fixtures

Keine Daten-Fixtures nötig — anonymer Besucher, keine Backend-Daten.

## Runbook

1. Consent-Cookie löschen
2. Startseite aufrufen → Banner prüfen, keine facebook.com-Requests
3. „Alle akzeptieren" → Banner weg, Pixel geladen
4. Neuer Besuch → Banner bleibt weg
5. Cookie löschen, ablehnen → Cookie `marketing:false`, kein Pixel
6. Footer-Button → Banner öffnet sich
7. Arabisch: Banner auf RTL korrekt
