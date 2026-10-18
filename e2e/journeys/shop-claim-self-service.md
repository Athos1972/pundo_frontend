---
id: shop-claim-self-service
title: Shop-Claim per Self-Service (Domain-/Mail-/Code-Nachweis), Admin-Entscheid, Superseded (F5970)
status: implemented
spec-file: e2e/journeys/shop-claim-self-service.spec.ts
priority: P1
owner-agent: e2e-tester
proposed-in-spec: 2026-10-17-claim-self-service-dispute
touches-modules:
  - src/components/shop/**
  - src/app/(customer)/[lang]/shops/[slug]/**
  - src/app/(shop-admin)/shop-admin/**
  - src/components/shop-admin/**
  - src/app/(system-admin)/admin/(portal)/**
  - src/lib/shop-admin-api.ts
  - src/lib/system-admin-api.ts
  - src/proxy.ts
  - src/app/api/shop-admin/[...path]/route.ts
  - src/lib/i18n/shop.ts
  - src/lib/shop-admin-claim-client.ts
  - src/app/(shop-admin)/shop-admin/verify-email/**
  - src/components/system-admin/claims/**
touches-roles:
  - guest
  - shop-owner
  - admin
touches-states:
  - ClaimRequest.status:open
  - ClaimRequest.status:verified
  - ClaimRequest.status:accepted
  - ClaimRequest.status:rejected
  - ShopOwner.status:approved
  - Shop.is_claimed:false
  - Shop.is_claimed:true
  - ShopOwner.status:pending
last-run: 2026-10-18T08:45:00Z
last-result: PASS
status-changed-at: 2026-10-18T08:45:00Z
status-changed-by-spec: 2026-10-17-claim-self-service-dispute
---

# Journey: shop-claim-self-service

**Status:** implemented (12/12 PASS am 2026-10-18 gegen 3500/8500, Spec-Datei `shop-claim-self-service.spec.ts`)
**Priority:** P1
**Proposed in:** 2026-10-17-claim-self-service-dispute

## Purpose

F5970 Szenario A: Gast findet die Claim-CTA auf der Shop-Seite, beantragt die Inhaberschaft (Domain-Nachweis, Code an die
öffentliche Shop-Adresse), Admin entscheidet, der zweite Antrag wird `superseded`, der neue Owner arbeitet im Portal.

## Pre-conditions

- Test-Backend 8500 mit Migration `f5970claim01`, Test-Frontend 3500 (Standalone-Build, Turnstile-Test-Sitekey), kein TURNSTILE_SECRET_KEY am Backend.
- `SHOP_CLAIM_UPLOAD_PATH` am Test-Backend gesetzt (nur für die Dispute-Journey nötig).
- Kein DB-Reset; alle Daten tragen den Marker `E2E-<run>-CLAIM-SELF-…` und werden per `TestDataTracker` entfernt.

## Runbook (Ebene 1, synthetisch, kein Skip)

| Schritt | Aktion | Erwartung (AC) |
|---|---|---|
| 1 | Gast öffnet `/en/shops/<slug>` | CTA sichtbar, Link `rel=nofollow` auf `/shop-admin/claim?shop=<slug>`, Claim-Seite ohne Login (AC 1) |
| 2 | `ar` und `he` | CTA + Claim-Wizard `dir=rtl`, übersetzt (AC 1, 44) |
| 3 | Freemail-Konto im Wizard | Methode „E-Mail-Domain" fehlt, Werte maskiert, Pflicht-Haken (AC 4, 6) |
| 4 | Person A: Wizard, Methode `email_domain`; Token per psql → `/shop-admin/verify-email` | Status `verified` (AC 5) |
| 5 | Person A sendet erneut | derselbe Antrag, Hinweis, kein Duplikat (AC 10) |
| 6 | Person B: `shop_email_code`; 5 falsche Codes, Sperre, Neuanforderung, Code per psql | `verified`; Status-Seite `ar`/`he` RTL (AC 7, 8, 44) |
| 7 | Admin `/admin/claims`: Badge „2 Anträge", Annahme ohne/mit Begründung | Pflichtfeld, Owner `approved` (AC 13, 16, 36) |
| 8 | Admin in Griechisch | Titel, Tab, Status übersetzt (AC 36) |
| 9 | Antrag B | `rejected(superseded)`, Audit vollständig (AC 15, 39) |
| 10 | Neuer Owner loggt ein | Shop im Portal, Consent-Karte `none`, kein Case (AC 13, 14) |
| 11 | Shop-Seite | Melde-Link statt CTA, `is_claimed` ohne Owner-Felder (AC 2, 3) |
| 12 | Zugriffsschutz | `/shop-admin/claim` öffentlich, `/admin/claims` + Admin-Proxy nur Admin, Konto mit Shop wird geblockt (AC 11) |

## Notes

- Code-Injektion per psql nach Architektur §5.3 (kein Test-Hintertürchen im Backend).
- Mails werden nicht abgefangen: Das Test-Backend versendet nur, wenn `SMTP_HOST` gesetzt ist; die Spec prüft Audit-Ereignisse, keine Postfächer.
- Streaming-Hinweis: Auf Shop-Seiten liegt beim Laden kurz eine versteckte Kopie (`div#S:n[hidden]`) im DOM; Specs warten mit `toHaveCount(1)`.
- Nicht in diesem Lauf abgedeckt: Turnstile-Fehlerpfad und Rate-Limits (Test-Instanz lockert Limits ×40; belegt im E2E-Report per Strict-Lauf).
