---
id: admin-crm-relation-channels
title: F7600 CRM – Person mit zwei Firmenbeziehungen, Outreach an Beziehungsmail, Opt-out sperrt Person, nicht Firma
status: implemented
spec-file: e2e/journeys/admin-crm-relation-channels.spec.ts
priority: P1
owner-agent: e2e-tester
proposed-in-spec: 2026-10-25-crm-person-contact-modell
touches-modules:
  - src/app/(system-admin)/admin/(portal)/crm/orgs/**
  - src/app/(system-admin)/admin/(portal)/crm/persons/
  - src/components/system-admin/crm/PersonRelationEditor.tsx
  - src/components/system-admin/crm/OrgRelationList.tsx
  - src/components/system-admin/crm/OrgRelationSection.tsx
  - src/components/system-admin/crm/OutreachComposer.tsx
  - src/components/system-admin/crm/ChannelEditor.tsx
  - src/components/system-admin/crm/OrgList.tsx
  - src/components/system-admin/crm/SafetyPanel.tsx
  - src/components/system-admin/crm/crmFetch.ts
  - src/app/crm/opt-out/**
  - src/app/api/crm/opt-out/**
touches-roles:
  - admin (editor)
  - public (Mailempfaenger)
touches-states:
  - CrmOrg.lead_state:QUEUED
  - CrmOrg.lead_state:CONTACTED
  - CrmChannel.consent_state:optout
  - CrmPerson.optout_at
  - CrmSendApproval.used_message_id
status-changed-at: 2026-10-25T10:49:08Z
status-changed-by-spec: 2026-10-25-crm-person-contact-modell
last-run: 2026-10-25T10:48:30Z
last-result: PASS
last-run-sha: null
---

### Journey: Person mit zwei Firmenbeziehungen, Kanäle mit genau einem Besitzer, Opt-out nach Besitzer, Sendegate

**Ziel:** Beweist aus Admin- und Empfängersicht das neue Kanalmodell von [F7600 CRM-Backbone] (Spec `2026-10-25-crm-person-contact-modell`): Jeder Wert steht genau einmal im CRM (Organisation, Beziehung oder Person), die Organisationsseite trennt „Kanäle der Organisation“ von „Ansprechpartner“, der Outreach geht an die Beziehungsmail einer Person, ein Abmeldeklick sperrt die Person (alle Personen- und Beziehungskanäle), aber nicht die Firmen, eine Person ohne aktive Beziehung ist nicht wählbar, und die Rechtsstufe `red` blockiert den Versand bis zur Freigabe mit Begründung.

**Trigger-Regel:** P1, wenn `src/app/(system-admin)/admin/(portal)/crm/orgs/**`, `crm/persons/**`, `PersonRelationEditor.tsx`, `OrgRelationList.tsx`, `OutreachComposer.tsx`, `ChannelEditor.tsx`, `OrgList.tsx`, die Opt-out-Seite/-Route oder im Backend `ingestor/lib/crm/{channels,service,person_service,tier_gate,suppression}.py` bzw. `ingestor/api/admin/crm/{orgs,relations,channels,persons}.py` im Diff sind.

**Voraussetzung:** Test-Backend über `start_test_server.sh` bzw. Worktree-Slot-Backend (Mail-Sink, `SMTP_HOST`). Der globale Send-Cap `send_caps.email` (Standard 25 je 24 h) darf in der Test-DB nicht ausgeschöpft sein, sonst antwortet der Versand 429 `send_cap_reached` (siehe Known Risks).

**Test-Daten-Matrix:**

| Fixture | Was wird aufgebaut | Was wird damit geprüft |
|---|---|---|
| Org `E2E RelCh A <run>` (Nicosia) | Akquise-Ziel `SOURCED`, Org-Mail `info-a`; Beziehung zu Maria (Manager) mit Beziehungsmail `maria-a` (API) | AC 6/7: Org-Kanal getrennt vom Beziehungskanal; bleibt nach Marias Opt-out `SOURCED` |
| Org `E2E RelCh B <run>` (Limassol) | Akquise-Ziel `QUEUED`, Org-Mail `info-b`; Beziehung zu Maria (Advisor) per UI | AC 14/15: Outreach an `maria-b`, Opt-out sperrt nur die Person |
| Org `E2E RelCh C <run>` | Akquise-Ziel `QUEUED`, Org-Mail `info-c`, per UI auf Rechtsstufe `red` | AC 49/50: Sendegate, Freigabe, eine Freigabe = eine Sendung |
| Org `E2E RelCh Plain <run>` | kein Akquise-Ziel (Lead-Status leer) | AC 26: Filter „nur Akquise-Ziele“ |
| Person `E2E RelCh <run> Maria` | private Nummer (Personenkanal, per UI) | AC 6–10, 14, 15 |
| Person `E2E RelCh <run> Peter` | eigene Mail als Personenkanal | AC 10: fremder Wert wird abgelehnt |
| Person `E2E RelCh <run> Stranger` | nur Personenkanal, keine Beziehung | AC 41: nicht wählbar, Direktversand 422 |
| Person `E2E RelCh <run> Elena` | Geburtstag 14.03. ohne Jahr, Beziehung zu A ohne Rolle | AC 23a/36 auf Griechisch |

**Schritte (Runbook):**

1. Personenseite Maria: Beziehung zu Org B per Namenssuche anlegen (Rolle Advisor), im Beziehungskasten die Beziehungsmail `maria-b` und unter „Persönliche Kanäle“ die private Nummer eintragen. Wirkung: je Wert genau eine Zeile in `crm_channel` mit genau einem Besitzer (Beziehung bzw. Person).
2. Org-Seiten A und B (AC 6/7/8): genau ein `h1` = Org-Name; „Kanäle der Organisation“ enthält nur die Org-Mail; im Bereich „Ansprechpartner“ steht bei Maria nur die Beziehungsmail dieser Firma als Kanalzeile (die Org-Mail höchstens als Verweis-Option „bevorzugter Kanal“), die private Nummer erscheint bei beiden Firmen als „Personal“; die Mail der jeweils anderen Firma kommt auf der Seite nicht vor; die private Nummer hat genau eine Zeile.
3. Personenseite (AC 10, AC 9): Peters Mail als Beziehungskanal von Maria → Hinweis „This value belongs to another person, so it is a shared channel. Keep it at the organisation.“, keine neue Zeile. Die A-Beziehungsmail bei der B-Beziehung eintragen → Dialog „Keep as personal channel“ → bestätigen → der Wert ist Personenkanal (eine Zeile) und bei A und B als „Personal“ sichtbar.
4. Org-Seite B, Outreach (AC 14/41): Empfängerliste enthält die Org-Mail und „Maria · maria-b (relation)“, nicht den Stranger; Direktversand an den Stranger-Kanal → 422 `outreach_recipient_invalid`, Mail-Sink leer. Maria wählen, Vorschau (EN), senden → Mail im Mail-Sink; `crm_message` trägt Org B, Empfängerkanal, Person und Beziehung; Org B `CONTACTED`.
5. Abmelde-Link aus dieser Mail im Browser öffnen und bestätigen (AC 15): `crm_person.optout_at` gesetzt, alle drei Kanäle Marias `optout` und ihre HMACs in `crm_suppression`; Org A bleibt `SOURCED`, Org B `CONTACTED`, beide Org-Mails weder `optout` noch gesperrt; Org-Seite B zeigt „Opted out“ bei Maria, Maria fehlt in der Empfängerliste; eine Mail an die Org-Mail von B kommt im Mail-Sink an.
6. Org-Seite C, Sendegate (AC 49/50): Rechtsstufe des Org-Kanals auf „Red“ → Warnkasten „Legal tier Red: sending only after admin approval.“, Tier-Badge „Legal tier: Red“, „Send email“ deaktiviert; Backend antwortet auf Direktversand 422 `outreach_tier_approval_required` (`tier: red`), keine `crm_message`, Mail-Sink leer. „Approve“ → Begründung unter 10 Zeichen hält den Knopf deaktiviert → gültige Begründung → Kasten „Approved by admin #… until …“; `crm_send_approval` (1 Zeile, `red`, unverbraucht) und Interaktion `send_approval`. Senden → Mail im Sink, `used_message_id` = diese Nachricht; danach ist wieder eine Freigabe nötig (422).
7. Org-Liste (AC 26): Suche nach der Lauf-ID zeigt die vier Orgs mit Namen und Lead-Status, „Plain“ als „No acquisition target“, kein „—“-Name; „Only acquisition targets“ blendet „Plain“ aus.
8. Griechisch (AC 23a/36, System-Admin EN/EL): Cookie `app_lang=el`; Personenseite Elena zeigt „14 Μαρτίου“ ohne Jahr (nirgends „2000“); Org-Seite A zeigt „Κανάλια του οργανισμού“, „Υπεύθυνοι επικοινωνίας“ und bei Elenas Beziehung „Λείπει ρόλος“.

**Cleanup:** Personen werden gelöscht (`DELETE /persons/{id}`), Lead-Orgs per Suppress geschlossen. Das CRM kann Orgs nicht löschen; Stammdaten-Org „Plain“ bleibt stehen.

**Known Risks:**
- Send-Cap: In einer langlebigen Test-DB (Worktree-Slot) zählt der globale Cap alle Outreach-Mails der letzten 24 h; nach etwa zwölf Läufen der Mail-Journeys (`crm-opt-out`, diese) ist der Standard 25 erreicht, und die Sendeschritte enden mit 429. Abhilfe im Slot: Cap über `PUT /admin/crm/config` anheben und danach zurücksetzen (Entscheidung offen, siehe Testbericht).
- Der Inhaber-Fall (Opt-out einer `owner`-Person sperrt die Firma, Schalter `owner_optout_rule`) ist hier bewusst nicht enthalten; er ist im Backend-Integrationstest und in der API-Abnahme des Testberichts belegt.
- **Video-Szenen nachziehen:** Team-Video 5b „CRM people and roles“ ([F8960 Team-SOPs & Admin-Hilfe]) nutzt dieselben Bildschirme (Beziehungen, Personenkanäle, Empfängerwahl). Wer diese Journey ändert, prüft, ob die Szenen in `video/team-crm-persons/` nachziehen müssen.
