---
id: admin-crm-persons
title: F7600 CRM Stufe 3 — Personen, Beziehungen und Rollen (Org-Schnitt v3: Namensteile, Anrede, Geburtstag, Rollen ohne Datum)
status: implemented
spec-file: e2e/journeys/admin-crm-persons.spec.ts
priority: P1
owner-agent: e2e-tester
proposed-in-spec: 2026-10-23-crm-stufe3-personen-adressen
touches-modules:
  - src/app/(system-admin)/admin/(portal)/crm/persons/
  - src/app/(system-admin)/admin/(portal)/crm/orgs/[id]/page.tsx
  - src/components/system-admin/crm/PersonRelationEditor.tsx
  - src/components/system-admin/crm/OrgRelationList.tsx
  - src/components/system-admin/crm/PersonForm.tsx
  - src/components/system-admin/crm/PersonEditForm.tsx
  - src/components/system-admin/crm/BirthDateField.tsx
  - src/components/system-admin/crm/crmPersonName.ts
  - src/components/system-admin/Combobox.tsx
  - src/components/system-admin/crm/crmFetch.ts
  - src/components/system-admin/crm/crmSearch.ts
  - src/types/system-admin.ts
touches-roles:
  - admin (editor)
touches-states:
  - PersonOrgRelation.valid_to
  - CrmRelationRole.role
  - CrmPerson.birth_year_unknown:true
status-changed-at: 2026-10-23T21:24:19Z
status-changed-by-spec: 2026-10-24-crm-person-org-search
last-run: 2026-10-25T10:48:30Z
last-result: PASS
last-run-sha: null
---

# F7600 CRM Stufe 3 — Personen, Beziehungen und Rollen (Org-Schnitt)

Erzeugt drei isolierte Testorganisationen (zwei mit gleichem Namen in Nicosia und Limassol, eine dritte), legt über die
System-Admin-UI eine Person an und führt sie durch das neue Modell aus [F7600 CRM-Backbone] (Spec
`2026-10-25-crm-person-contact-modell`, v3). Die Journey verwendet nur die Testports (3500/8500 bzw. die Ports eines
Worktree-Slots) und setzt die Testdatenbank nicht zurück.

**Schritte (Runbook):**

1. Real-Backend-Vertrag: `GET /orgs/search?q=a` antwortet mit genau dem Body der aufgezeichneten Datei `admin-crm-orgs-search-too-short` (der Mock in Schritt 4 nutzt dieselbe Datei).
2. Person anlegen (v3): „First name“/„Last name“ ausfüllen → „Name“ zeigt die Ableitung und ist schreibgeschützt („Built from first and last name.“); Anrede „Ms“; Geburtstag 14. März mit „Year unknown“ (das Jahresfeld verschwindet); persönliche Mail. Wirkung: `display_name` abgeleitet, `name_derived`, `salutation = ms`, `birth_date = 2000-03-14` nur mit `birth_year_unknown = true`, Personenkanal mit Besitzer `person`; Seite: genau ein `h1`, Geburtstag „14 March“ ohne Jahr und ohne Alter.
3. Beziehung per Namenssuche (AC1/AC2/AC3/AC5 der Stufe 3): Organisation über die Combobox finden (kein ID-Feld), gleiche Namen über die Stadt unterscheiden, Rolle „Owner“ ohne Datum, Notiz „Region West“ → „Add relation“; die Karte zeigt Org-Link, „Remove role Owner“ und die Notiz. Zweite Beziehung **ohne Rolle** → „Role missing“ (Entscheidung E22 Beziehung ohne Rolle), danach Rolle „IT“ hinzufügen.
4. Fehlerpfad (AC4/AC9): kein Treffer → „No results“; Mock mit der aufgezeichneten 422-Antwort → lesbarer Fehlertext, das Formular bleibt nutzbar.
5. Ansprechpartner auf der Org-Seite (AC7/AC8): unter 3 Zeichen keine Anfrage, Treffer mit persönlicher Mail und `#id`, Rolle „Manager“ → Beziehung in der API; die Karte zeigt den Personen-Link und den persönlichen Kanal mit Kennzeichnung „Personal“; „Active relations: 1“.
6. Bevorzugter Kanal als **Verweis** (Design E18 Kanalregeln): „Preferred channel“ = Org-Mail „(Organisation)“ → `preferred_channel_id` zeigt auf den Org-Kanal, weiterhin genau eine Kanalzeile für den Wert.
7. Rolle entfernen und Beziehung beenden: „Remove role IT“ → „Role missing“, API `roles = []`; „End relation“ + Bestätigung → Karte „Ended“ ohne Bedienelemente, API `active = false`, `valid_to` gesetzt, Rollen bleiben (Rollen haben kein Datum, nur die Beziehung).

**Ergänzend abgedeckt:** Nachträgliches Zerlegen eines freien Namens mit Ersetzen-Hinweis und PII-freiem Audit (Design AC 32, Randfall R7) läuft in `admin-crm-relation-channels`; Namensableitung „nur Nachname“, freier griechischer Name, direkte `display_name`-Sperre und Geburtstag 29.02. prüft die API-Abnahme im Testbericht.

**Hinweis Video-Szenen:** Team-Video 5b „CRM people and roles“ ([F8960 Team-SOPs & Admin-Hilfe]) nutzt dieselben Testdaten und Bildschirme; es wird laut Architektur (T24 Team-Video 5b neu) nach dem Schnitt neu aufgenommen. Wer diese Journey ändert, prüft, ob die Szenen in `video/team-crm-persons/` nachziehen müssen.

**Geplante Erweiterung (F6110 Betroffenenrechte, Spec 2026-10-24-betroffenenrechte, bestätigt von Bernhard 2026-10-24):** Das Löschen einer Person läuft künftig über den gemeinsamen Lösch-Orchestrator und legt einen Datenschutzfall an; Baustein ist `PersonService.erase` des Org-Schnitts. Das sichtbare Ergebnis in der CRM-Ansicht bleibt gleich.

**Historie:** Bis 2026-10-25 setzte die Journey Rollen mit Zeitraum (`CrmPersonOrgRole.valid_to`, „End role“) und verknüpfte einen Contact („Link person“, `contact.person_id`); umgestellt im Org-Schnitt (T19 Playwright-Specs anpassen, Doku durch den e2e-tester).
