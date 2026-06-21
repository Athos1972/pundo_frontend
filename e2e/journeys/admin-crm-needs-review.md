---
id: admin-crm-needs-review
title: CRM NEEDS_REVIEW Flow (Stufe 2) — Card Confirm + CardImageViewer Visibility
status: implemented
spec-file: e2e/journeys/admin-crm-needs-review.spec.ts
priority: P1
owner-agent: e2e-tester
proposed-in-spec: 2026-06-21-crm-stufe2-card-vision
touches-modules:
  - src/app/(system-admin)/admin/(portal)/crm/contacts/[id]/page.tsx
  - src/components/system-admin/crm/ContactDetailActions.tsx
  - src/components/system-admin/crm/CardImageViewer.tsx
  - src/components/system-admin/crm/transitions.ts
touches-roles:
  - admin (superadmin)
touches-states:
  - CrmContact.lifecycle_state:NEEDS_REVIEW
  - CrmContact.lifecycle_state:SOURCED
status-changed-at: 2026-06-21T00:00:00Z
status-changed-by-spec: 2026-06-21-crm-stufe2-card-vision
last-run: 2026-06-21T00:00:00Z
last-result: PASS
---

### Journey: CRM NEEDS_REVIEW Flow (Stufe 2)

**Ziel:** Sicherstellt dass die Stufe-2-Komponenten korrekt funktionieren:
- Ein Kontakt im State NEEDS_REVIEW zeigt die korrekten Lifecycle-Buttons
- "Karte bestätigen"-Button erscheint nur wenn `card_image_front_url` gesetzt ist (AK7)
- State-Transition NEEDS_REVIEW → SOURCED via UI funktioniert (AK4)
- CardImageViewer wird nicht gerendert wenn `card_image_front_url = null` (AK7)

**Setup-Strategie:** Der Telegram-Webhook-Pfad (Stufe-2-Happy-Path) kann im E2E nicht
vollständig durchgespielt werden (erfordert Telegram-Bot + Ollama-Worker). Stattdessen
legen wir NEEDS_REVIEW-Kontakte über zwei API-Calls an:
1. Ingest-Endpoint → SOURCED
2. Lifecycle-Endpoint → NEEDS_REVIEW

Damit wird der UI-seitige Stufe-2-Code vollständig abgedeckt ohne Bot-Infrastruktur.

**Trigger-Regel:** Wenn `src/components/system-admin/crm/ContactDetailActions.tsx`,
`CardImageViewer.tsx` oder `transitions.ts` im Diff sind (P1).

**Test-Daten-Matrix:**

| Fixture | Was | Warum |
|---|---|---|
| `E2E NR {uuid}` (kein Bild) | NEEDS_REVIEW via API, card_image_front_url=null | AK7: CardImageViewer nicht sichtbar |
| `E2E NR Card {uuid}` (kein Bild, confirm) | NEEDS_REVIEW → SOURCED via "Lifecycle"-Button | AK4: State-Transition |

**Schritte (Runbook):**

1. Kontakt mit card_image_front_url=null im NEEDS_REVIEW-State via API anlegen
2. Detail-Page öffnen: NEEDS_REVIEW-Badge sichtbar
3. CardImageViewer ist NICHT gerendert (keine Bilder-Section)
4. "Karte bestätigen"-Button ist NICHT sichtbar (da card_image_front_url=null)
5. Lifecycle-Transition-Button vorhanden (NEEDS_REVIEW → SOURCED möglich)
6. State-Transition NEEDS_REVIEW → SOURCED via Lifecycle-Dialog
7. Badge wechselt zu SOURCED; "Lifecycle"-Button-Palette ändert sich

**Akzeptanzkriterien:**

| AC | Was | Kriterium |
|---|---|---|
| AK4 | NEEDS_REVIEW → SOURCED | Lifecycle-Transition führt zu SOURCED-State |
| AK7 | Kein CardImageViewer ohne card_image_front_url | Section nicht sichtbar wenn URL=null |
| AK12 | "Karte bestätigen" nur mit card_image_front_url | Button fehlt bei null-URL |

**Cleanup:** Kontakte werden nach Test-Ende via Suppress (HARD_OPTOUT) bereinigt.
