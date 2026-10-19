---
id: crm-opt-out
title: CRM-Outreach-Mail kommt im Mail-Sink an und der Abmelde-Link wirkt (Mail → Opt-out → Suppression)
status: implemented
spec-file: e2e/journeys/crm-opt-out.spec.ts
priority: P1
owner-agent: e2e-tester
proposed-in-spec: 2026-10-19-vertragsinventur
touches-modules:
  - src/app/crm/opt-out/**
  - src/app/api/crm/opt-out/**
touches-roles:
  - admin (superadmin)
  - public (Mailempfaenger)
touches-states:
  - CrmContact.lifecycle_state:CONTACTED
  - CrmContact.lifecycle_state:HARD_OPTOUT
status-changed-at: 2026-10-19T00:00:00Z
status-changed-by-spec: 2026-10-19-vertragsinventur
last-run: 2026-10-19T00:00:00Z
last-result: PASS
---

### Journey: CRM-Outreach-Mail → Opt-out

**Ziel:** Wirkung statt Durchlauf (B8950-016 T31/T32): die Outreach-Mail wird wirklich per SMTP an den lokalen Mail-Sink der
Testinstanz zugestellt (nicht gemockt), ihre Teile, Links und Bilder stimmen, und der Abmelde-Link aus der Mail setzt
die Unterdrueckung in der Datenbank.

**Trigger-Regel:** Wenn `src/app/crm/opt-out/**`, `src/app/api/crm/opt-out/**`, `ingestor/lib/crm/outreach.py` oder
`ingestor/email_templates/crm_outreach/**` im Diff sind (P1).

**Voraussetzung:** Backend-Testinstanz ueber `start_test_server.sh` (startet den Mail-Sink auf 1025, setzt SMTP_HOST und die
Opt-out-Basis-URL auf `http://localhost:3500`).

**Test-Daten-Matrix:**

| Fixture | Was | Warum |
|---|---|---|
| `E2E OptOut {uuid}` / `e2e-optout-{uuid}@test-e2e.invalid` | Kontakt, QUELLE business_card, bestaetigt | Outreach-Versand braucht QUEUED |

**Schritte (Runbook):**

1. Admin legt den Kontakt per API an, bestaetigt "business", rendert die Vorschau (EN) und sendet.
2. Der Test wartet auf die `.eml` im Mail-Sink und parst sie.
3. Der Test oeffnet den Link aus `List-Unsubscribe` im Browser und bestaetigt die Abmeldung.

**Akzeptanzkriterien:**

| AC | Was | Kriterium |
|---|---|---|
| AC1 | Mail zugestellt | Betreff wie gerendert, From enthaelt care@pundo.cy, Text- und HTML-Teil vorhanden, `List-Unsubscribe` zeigt auf das Test-Frontend, jede Bild-URL absolut (https) und liefert per HEAD 200 mit `image/*` |
| AC2 | Opt-out wirkt | Link oeffnen, Button bestaetigen, Bestaetigungsbox sichtbar, `crm_contact.lifecycle_state = HARD_OPTOUT`, Interaction `suppression` vorhanden |
