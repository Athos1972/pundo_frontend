---
id: admin-crm-contact-lifecycle
title: CRM Org-Lead-Lifecycle (F7600 Stufe 0+1, Org-Schnitt) — Anlegen → Bearbeiten → Org-Kanäle → Zentrale/Filiale → Confirm Business → Suppress
status: implemented
spec-file: e2e/journeys/admin-crm-contact-lifecycle.spec.ts
priority: P1
owner-agent: e2e-tester
proposed-in-spec: 2026-06-20-crm-stufe1
touches-modules:
  - src/app/(system-admin)/admin/(portal)/crm/orgs/**
  - src/components/system-admin/crm/OrgForm.tsx
  - src/components/system-admin/crm/OrgEditForm.tsx
  - src/components/system-admin/crm/OrgParentSection.tsx
  - src/components/system-admin/crm/ChannelEditor.tsx
  - src/components/system-admin/crm/OrgLeadActions.tsx
  - src/components/system-admin/crm/LifecycleBadge.tsx
  - src/components/system-admin/crm/transitions.ts
touches-roles:
  - admin (superadmin)
touches-states:
  - CrmOrg.lead_state:SOURCED
  - CrmOrg.lead_state:QUEUED
  - CrmOrg.lead_state:HARD_OPTOUT
  - CrmOrg.parent_org_id
  - CrmChannel.consent_state:optout
status-changed-at: 2026-06-21T00:00:00Z
status-changed-by-spec: 2026-06-20-crm-stufe1
last-run: 2026-10-25T10:48:30Z
last-result: PASS
last-run-sha: null
---

### Journey: CRM Org-Lead-Lifecycle (Stufe 0+1, Org-Schnitt)

**Ziel:** Ein System-Admin führt den Lebenszyklus einer Organisation mit Lead-Status über das Admin-UI durch: Organisation als Akquise-Ziel anlegen (Quellenauswahl), Stammdaten bearbeiten, Kanäle der Organisation hinzufügen und entfernen (Besitzer = Organisation), einer Filiale die Zentrale zuordnen (eine Ebene), Geschäft bestätigen und die Organisation sperren. Seit dem Org-Schnitt ([F7600 CRM-Backbone], Spec `2026-10-25-crm-person-contact-modell`) gibt es keinen Contact mehr: der Lead-Status liegt an der Organisation (`crm_org.lead_state`), die Route heißt `/admin/crm/orgs/**`, die Kanäle liegen in `crm_channel`. Ansprechpartner sind Beziehungen und werden nicht mehr als Freitext angelegt.

**Trigger-Regel:** P1, wenn `src/app/(system-admin)/admin/(portal)/crm/orgs/**` oder `src/components/system-admin/crm/{OrgForm,OrgEditForm,OrgParentSection,OrgLeadActions,ChannelEditor,LifecycleBadge}.tsx`/`transitions.ts` im Diff sind, oder im Backend `ingestor/api/admin/crm/orgs.py` bzw. `ingestor/lib/crm/{service,lifecycle,channels}.py`.

**Test-Daten-Matrix:**

| Fixture | Was | Warum |
|---|---|---|
| `E2E CRM {uuid}` | per UI angelegte Organisation (Akquise-Ziel, Org-Mail) | Anlegen mit Quelle, Bearbeiten, Kanäle, Confirm, Suppress |
| `+357 96 {uuid-short}` | zweiter Org-Kanal (Telefon) per UI | Kanal hinzufügen, Besitzer = Organisation |
| `E2E CRM HQ {uuid}` / Filiale / dritte Org | Stammdaten-Orgs ohne Lead | Zentrale zuordnen, Filialliste, zweite Ebene abgelehnt |

**Schritte (Runbook):**

1. `/admin/crm/orgs/new`: Organisationsname (mit UUID), E-Mail, Stadt, Quelle „manual“; „Acquisition target“ ist vorausgewählt; kein Ansprechpartner-Freitextfeld mehr.
2. „Create organisation“ → Detailseite: genau ein `h1` = Org-Name, Badge `SOURCED`; API `lead.state = SOURCED`, Quelle `manual`, Kanal `email` mit Besitzer `org`.
3. „Edit“ → Stadt ändern → „Save“ → Stadt aktualisiert, Lead-Status unverändert.
4. Im Bereich „Channels of the organisation“ ein Telefon hinzufügen → zwei Kanäle, beide mit Besitzer Organisation.
5. Org-Mail entfernen („Remove: …“) → Zeile weg, Telefon bleibt.
6. Zentrale zuordnen: an der Filiale „Belongs to (head office)“ per Suche → Anzeige „Belongs to: …“ mit Link; die Zentrale zeigt „Branches (1)“ mit Link (API `children = {count: 1}`); die Zentrale mit Filialen bietet kein Zentralen-Feld an; die Suche einer dritten Org bietet nur die Zentrale an (Filiale und sich selbst nicht); API-PATCH auf eine zweite Ebene → 422 `org_parent_has_parent`, `parent` bleibt `null`.
7. „Confirm business“ → bestätigen → `business_status = confirmed`, Lead-Status `QUEUED` (API und Badge).
8. „Suppress“ → „Hard opt-out“ → bestätigen → Endzustand („final lead status (Hard opt-out)“), keine Lead-Status-Aktionen mehr; der verbliebene Org-Kanal ist `consent_state = optout`, sein HMAC steht genau einmal in `crm_suppression`.

**Akzeptanzkriterien:**

| AC | Was | Kriterium |
|---|---|---|
| AK1a | Quellenauswahl | Quelle „manual“ wählbar; gespeicherte Org-Quelle = `manual` |
| AK1b | Default-Quelle | ohne Wahl ist `business_card` vorausgewählt (auch `POST /orgs` ohne Quelle) |
| AK2a | Stadt ändern | PATCH 200, neue Stadt sichtbar, kein Lead-Wechsel |
| AK2b | Kanal hinzufügen | 201, Kanal mit Besitzer Organisation in der Liste |
| AK2d | Kanal entfernen (2+) | DELETE 200, Kanal weg, anderer bleibt |
| v3 Zentrale | Zentrale/Filiale | „Belongs to“ und „Branches (1)“; zweite Ebene 422, nichts gespeichert (Design AC 42/43) |
| Stufe 0 | Confirm Business | `business_status = confirmed`, Lead `QUEUED` |
| Stufe 0 | Suppress → HARD_OPTOUT | Endzustand, Org-Kanal gesperrt (HMAC in `crm_suppression`) |

**Cleanup:** Angelegte Lead-Orgs enden per Suppress in `HARD_OPTOUT`. Stammdaten-Orgs ohne Lead-Status (`E2E CRM HQ/Third …`) bleiben stehen, weil das CRM keine Org löschen kann.

**Hinweis Video-Szenen:** Team-Video 5 „CRM“ (`video/team-crm/`) und die Admin-Tour zeigen dieselben Seiten; sie werden laut Architektur (T24b Team-Video 5 „CRM“ und Admin-Tour anpassen) nach dem Schnitt neu aufgenommen.

**Historie:** Bis 2026-10-25 hieß die Journey „CRM Contact Lifecycle (Stufe 0+1)“ und lief über `/admin/crm/contacts/**` mit `CrmContact.lifecycle_state`; umgestellt im Org-Schnitt (T19 Playwright-Specs anpassen, Doku durch den e2e-tester).
