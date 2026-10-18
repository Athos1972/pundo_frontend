---
id: shop-claim-dispute
title: Dispute gegen bestehenden Owner, Eigentuemerwechsel, Angebote zu pruefen (F5970)
status: implemented
spec-file: e2e/journeys/shop-claim-dispute.spec.ts
priority: P1
owner-agent: e2e-tester
proposed-in-spec: 2026-10-17-claim-self-service-dispute
touches-modules:
  - src/components/shop-admin/claim/**
  - src/app/(shop-admin)/shop-admin/(portal)/offers/**
  - src/app/(system-admin)/admin/(portal)/shops/[id]/edit/**
  - src/components/shop-admin/OfferList.tsx
  - src/lib/i18n/shop-admin-offers.ts
  - src/components/shop-admin/AdminShell.tsx
  - src/app/(shop-admin)/shop-admin/(portal)/layout.tsx
  - src/components/system-admin/AssignOwnerDialog.tsx
  - src/components/system-admin/ShopOwnerSection.tsx
  - src/app/api/admin/[...path]/route.ts
  - src/app/(system-admin)/admin/(portal)/shop-owners/**
  - src/app/(shop-admin)/shop-admin/claim/**
  - src/components/system-admin/claims/**
  - src/components/shop-admin/UnverifiedOffersBanner.tsx
  - src/proxy.ts
touches-roles:
  - guest
  - shop-owner
  - admin
touches-states:
  - ClaimRequest.kind:dispute
  - ShopOwner.status:suspended
  - CatalogCase.status:cancelled
  - Offer.unverified:true
  - CatalogConsent:withdrawn
  - ShopOwner.status:approved
  - Offer.unverified:false
  - ClaimRequest.status:verified
  - ClaimRequest.status:accepted
  - ClaimRequest.status:rejected
last-run: 2026-10-18T08:45:00Z
last-result: PASS
status-changed-at: 2026-10-18T08:45:00Z
status-changed-by-spec: 2026-10-17-claim-self-service-dispute
---

# Journey: shop-claim-dispute

**Status:** implemented (14/14 PASS am 2026-10-18 gegen 3500/8500, Spec-Datei `shop-claim-dispute.spec.ts`)
**Priority:** P1
**Proposed in:** 2026-10-17-claim-self-service-dispute

## Purpose

F5970 Szenario B: Dispute gegen einen bestehenden Owner mit Dokument-Upload und Rückruf, Owner-Wechsel mit Sperre,
Ausblenden der Angebote in allen öffentlichen Kanälen, Bestätigen/Archivieren durch den neuen Owner, Consent/Case-Folgen,
Ablehnung, `assign-owner` und Matching-Tab.

## Pre-conditions

- Wie `shop-claim-self-service`; zusätzlich `SHOP_CLAIM_UPLOAD_PATH` am Test-Backend (privater Scratch-Pfad, wird nicht ausgeliefert).
- Alter Owner: Onboarding-API mit `…@pundo.com` (Auto-Approve) inklusive Katalog-Consent (aktiver Consent + Case) und zwei Items/Angeboten.

## Runbook (Ebene 1, synthetisch, kein Skip)

| Schritt | Aktion | Erwartung (AC) |
|---|---|---|
| 1 | Ausgangslage | Angebote in Detail/Suche sichtbar, Melde-Link, Wizard im Dispute-Modus ohne Methodenwahl (AC 2, 18) |
| 2 | Wizard: `.txt` (Browser-Vorprüfung), HTML als `fake.png` (Magic Bytes), dann PNG + Rückruf-Haken | Fehlertexte übersetzt, kein Konto/Antrag bei Abweisung, Dispute `open` (AC 18, 19) |
| 3 | Während der Prüfung | alter Owner `approved`, nichts markiert, Consent aktiv, Portal arbeitsfähig, keine Benachrichtigung (AC 20) |
| 4 | Admin-Detail | Dispute-Badge, aktueller Owner, „Annehmen" erst nach „geprüft", Dokument als `<img>` auf Klick, Proxy-Header, Nicht-Admins 401/403, Abruf auditiert (AC 21, 36, 37) |
| 5 | Rückruf-Code, „erreicht", Code im Status-Tab des Antragstellers | `verified`, Protokoll mit Zeit und Admin-ID (AC 9) |
| 6 | Annahme „und Owner wechseln" | Folgenliste, alter Owner `suspended` ohne Shop, neuer Owner `approved`, Consent zurückgezogen, Case `cancelled`, 2 Angebote markiert, nichts gelöscht (AC 22, 26, 27) |
| 7 | Alter Owner | Login 401 neutral, JWT auf `require_shop_owner` und `…_or_pending` 403, Portal → Login (AC 23) |
| 8 | Öffentliche Kanäle | Shop-Detail, `/products?shop_id`, Produktseite, Suche, Sitemap ohne Angebote; Shop/Profil sichtbar; DB unverändert (AC 24) |
| 9 | Neuer Owner | Banner „2", „Zu prüfen", Bestätigen → sichtbar, Archivieren → archiviert, Banner weg (AC 25) |
| 10 | Consent | startet bei `none`, genau ein neuer Case, alter bleibt `cancelled`, Owner sieht ihn nie (AC 14, 26) |
| 11 | Zweiter Dispute abgelehnt | Owner/Angebote/Consent unverändert, Begründung im Audit, keine interne Notiz an die Person (AC 28) |
| 12 | `assign-owner` in der Shop-Bearbeitung | 409 `owner_has_other_shop` → Option; 409 `shop_has_owner` → Option; 422 `owner_not_assignable`; 404; Pflicht-Begründung (AC 29–32) |
| 13 | Matching-Tab | „Ohne Zuweisung erledigen" (Pflicht-Begründung) und „Owner zuweisen" schließen die Prüfung (AC 33) |
| 14 | `/admin/shop-owners?status=suspended` | gesperrtes Konto mit Badge (AC 40) |

## Notes

- Nicht im Browser abgedeckt: PDF-Viewer (Link in neuem Tab; API-seitig geprüft), Google-OAuth für `suspended` (nur Backend-Integrationstest mit Mock).
- Mails: nur Audit-Ereignisse (`notification_sent`/`notification_failed`), kein Postfach.
