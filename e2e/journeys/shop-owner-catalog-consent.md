---
id: shop-owner-catalog-consent
title: Katalog-Onboarding-Zustimmung im Wizard und im Portal (F5980 AC1)
status: implemented
spec-file: e2e/journeys/shop-owner-catalog-consent.spec.ts
priority: P1
owner-agent: coder
proposed-in-spec: 2026-10-16-consent-capture-sla
touches-modules:
  - src/components/shop-admin/catalog-consent/**
  - src/components/shop-admin/onboarding/StepContact.tsx
  - src/components/shop-admin/onboarding/OnboardingWizard.tsx
  - src/lib/onboarding/**
  - src/lib/i18n/shop-admin-catalog-consent.ts
  - src/app/(shop-admin)/shop-admin/(portal)/catalog-review/**
touches-roles:
  - shop-owner
touches-states:
  - CatalogConsent:none
  - CatalogConsent:given
  - CatalogCase.status:consent_given
status-changed-at: 2026-10-16T19:40:00Z
status-changed-by-spec: 2026-10-16-consent-capture-sla
last-run: 2026-10-16T19:34:00Z
last-result: PASS
---

# Journey: shop-owner-catalog-consent

**Status:** implemented (5/5 PASS am 2026-10-16 gegen 3500/8500; Flip `proposed` → `implemented` durch den Coder gemäß 02-architecture T14)
**Priority:** P1
**Proposed in:** 2026-10-16-consent-capture-sla

## Purpose

F5980 AC1: explizite Consent-Checkbox zum Katalog-Onboarding im Registrierungs-Wizard und als Karte im Portal
(`/shop-admin/catalog-review`); der Consent löst idempotent genau einen `catalog_case` aus (sobald der Owner `approved` ist).

## Pre-conditions

- Test backend 8500 mit Migration `f5980consent01`, Test frontend 3500 (Standalone-Build)
- `@pundo.com`-Auto-Approve aktiv (Testinstanz `pundo_test`)

## Runbook (Ebene 1, synthetisch, kein Skip)

| Schritt | Aktion | Erwartung |
|---|---|---|
| W1 | Wizard-Entwurf bis "Kontakt" fortsetzen; Website tippen/leeren | Checkbox nur mit Website, nie vorangehakt, Leeren setzt zurück |
| W2 | Wie W1 mit Cookie `app_lang=ar` | Checkbox in `dir=rtl`-Container |
| E1 | Onboarding-API (E-Mail-Pfad, `…@pundo.com`) mit `catalog_consent` | Status `approved`, Consent + Case, Portal zeigt "Consent received" und die Zustimmungszeile |
| P1 | Portal: Shop ohne Website → Hinweis; mit Website → Formular → Zustimmen | Karte wird zur Zeile, 1 Case; zweiter POST `200 created=false`, weiter 1 Case; unbekannte Version 422 |
| A1 | Portal mit `app_lang=ar` | Karte `dir=rtl`, arabischer Button |

Aufräumen: `TestDataTracker` (Owner → Shop) und `shop.destroy()`.
