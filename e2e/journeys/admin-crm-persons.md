---
id: admin-crm-persons
title: F7600 CRM Stufe 3 — Personen und Rollen
status: implemented
spec-file: e2e/journeys/admin-crm-persons.spec.ts
priority: P1
owner-agent: e2e-tester
proposed-in-spec: 2026-10-23-crm-stufe3-personen-adressen
touches-modules:
  - src/app/(system-admin)/admin/(portal)/crm/persons/
  - src/app/(system-admin)/admin/(portal)/crm/contacts/[id]/page.tsx
  - src/components/system-admin/crm/PersonRoleEditor.tsx
  - src/components/system-admin/crm/ContactPersonLink.tsx
touches-roles:
  - admin (editor)
touches-states:
  - CrmPersonOrgRole.valid_to
status-changed-at: 2026-10-23T21:24:19Z
status-changed-by-spec: 2026-10-23-crm-stufe3-personen-adressen
last-run: 2026-10-23T21:24:19Z
last-result: PASS
---

# F7600 CRM Stufe 3 — Personen und Rollen

Erzeugt zwei isolierte Testorganisationen, legt über die System-Admin-UI eine
Person an, setzt Rollen bei beiden Organisationen, verknüpft einen Contact und
beendet anschließend eine Rolle. Die Journey verwendet ausschließlich die
Testports 3500/8500 und setzt die Testdatenbank nicht zurück.
