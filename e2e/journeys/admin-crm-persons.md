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
  - src/components/system-admin/Combobox.tsx
  - src/components/system-admin/crm/crmFetch.ts
  - src/components/system-admin/crm/crmSearch.ts
  - src/types/system-admin.ts
touches-roles:
  - admin (editor)
touches-states:
  - CrmPersonOrgRole.valid_to
status-changed-at: 2026-10-23T21:24:19Z
status-changed-by-spec: 2026-10-24-crm-person-org-search
last-run: 2026-10-23T21:24:19Z
last-result: PASS
---

# F7600 CRM Stufe 3 — Personen und Rollen

Erzeugt drei isolierte Testorganisationen (davon zwei mit gleichem Namen in
Nicosia und Limassol), legt über die System-Admin-UI eine Person an, setzt Rollen
bei zwei Organisationen, indem die Organisation per Namenssuche gefunden und
gewählt wird (kein ID-Feld mehr), verknüpft einen Contact, indem die Person per
Suche gewählt wird, und beendet anschließend eine Rolle. Zusätzlich geprüft:
„No results“ bei Nicht-Treffer, Mindestlänge (Organisation 2, Person 3 Zeichen,
keine Anfrage darunter), lesbarer Fehlertext aus der aufgezeichneten
Backend-Antwort (`admin-crm-orgs-search-too-short`, mit Real-Test gegen 8500),
Dauer letzter Tastendruck bis Treffer (Ziel höchstens 1 s, Assertion 2 s;
gemessener Wert wird im Lauf ausgegeben). Die Journey verwendet ausschließlich die
Testports 3500/8500 und setzt die Testdatenbank nicht zurück.


**Geplante Erweiterung (F6110 Betroffenenrechte, Spec 2026-10-24-betroffenenrechte, bestätigt von Bernhard 2026-10-24):** Das Löschen einer Person läuft über den gemeinsamen Lösch-Orchestrator und legt einen Datenschutzfall an; das sichtbare Ergebnis in der CRM-Ansicht bleibt wie bisher.
