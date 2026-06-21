---
id: admin-crm-contact-lifecycle
title: CRM Contact Lifecycle (Stufe 0+1) — Create → Edit → Channel Mgmt → Confirm Business → Suppress
status: implemented
spec-file: e2e/journeys/admin-crm-contact-lifecycle.spec.ts
priority: P1
owner-agent: e2e-tester
proposed-in-spec: 2026-06-20-crm-stufe1
touches-modules:
  - src/app/(system-admin)/admin/(portal)/crm/contacts/**
  - src/components/system-admin/crm/ContactForm.tsx
  - src/components/system-admin/crm/ContactEditForm.tsx
  - src/components/system-admin/crm/ChannelEditor.tsx
  - src/components/system-admin/crm/ContactDetailActions.tsx
  - src/components/system-admin/crm/LifecycleBadge.tsx
  - src/components/system-admin/crm/transitions.ts
touches-roles:
  - admin (superadmin)
touches-states:
  - CrmContact.lifecycle_state:SOURCED
  - CrmContact.lifecycle_state:HARD_OPTOUT
status-changed-at: 2026-06-21T00:00:00Z
status-changed-by-spec: 2026-06-20-crm-stufe1
last-run: 2026-06-21T00:00:00Z
last-result: PASS
---

### Journey: CRM Contact Lifecycle (Stufe 0+1)

**Ziel:** Sicherstellt dass ein System-Admin den vollständigen CRM-Kontakt-Lebenszyklus
über das Admin-UI durchführen kann: Kontakt anlegen mit Quellenauswahl, bearbeiten,
Kanäle hinzufügen/entfernen, Confirm Business und in Terminal-State supprimieren.
Abdeckt Stufe-0 (SOURCED, Suppress) und Stufe-1 (Edit, Channel-Mgmt, Source-Auswahl,
Superadmin-Features).

**Trigger-Regel:** Wenn `src/app/(system-admin)/admin/(portal)/crm/**` oder
`src/components/system-admin/crm/**` im Diff sind (P1).

**Test-Daten-Matrix:**

| Fixture | Was | Warum |
|---|---|---|
| `E2E CRM {uuid}` | Frisch angelegter Kontakt via UI | Testet Create-Form + Source-Dropdown |
| `+357 96 {uuid-short}` | Zweiter Kanal (Telefon) per API | Testet Channel-Add via ChannelEditor |

**Schritte (Runbook):**

1. Admin loggt sich ein (Cookie gesetzt) → CRM-Kontaktliste öffnen
2. Admin navigiert zu /admin/crm/contacts/new → Formular erscheint
3. Admin füllt Org-Name (mit UUID für Eindeutigkeit), E-Mail, wählt Quelle "manual"
4. Admin speichert → wird zu Detail-Page weitergeleitet, Status-Badge "SOURCED" sichtbar
5. Admin klickt Bearbeiten → ändert Stadt → speichert → Stadt aktualisiert
6. Admin fügt zweiten Kanal (Telefon) hinzu → erscheint in Kanal-Liste
7. Admin entfernt ersten Kanal → Kanal verschwindet (zweiter bleibt)
8. Admin klickt "Confirm Business" → bestätigt → business_status wechselt
9. Admin klickt "Suppress" → wählt hard_optout → bestätigt → Terminal-State, keine Action-Buttons mehr

**Akzeptanzkriterien:**

| AC | Was | Kriterium |
|---|---|---|
| AK1a | Source-Dropdown beim Anlegen | Quelle "manual" wählbar; gespeicherter Kontakt hat source=manual |
| AK1b | Default-Source | Ohne explizite Wahl ist business_card vorausgewählt |
| AK2a | Edit: Stadt ändern | PATCH 200, Detail-Page zeigt neue Stadt, kein State-Change |
| AK2b | Channel hinzufügen | POST /channels 201, Kanal erscheint in Liste |
| AK2d | Channel entfernen (2+) | DELETE /channels/{id} 200, Kanal weg, anderer bleibt |
| Stufe 0 | Confirm Business | business_status=confirmed nach Aktion |
| Stufe 0 | Suppress → HARD_OPTOUT | Terminal-State, keine Buttons mehr sichtbar |

**Cleanup:** Angelegte Kontakte werden via Suppress (HARD_OPTOUT) bereinigt.
Da CRM kein DELETE-Endpoint hat, bleibt der Kontakt in HARD_OPTOUT — kein Lösch-Müll in Prod-Daten.
