---
id: privacy-restriction-and-objection
title: Einschränkung und Widerspruch wirken — keine Outreach- und Benachrichtigungsmail, keine Retention-Löschung, Unterdrückungsliste (F6110)
status: approved
priority: P1
owner-agent: designer
proposed-in-spec: 2026-10-24-betroffenenrechte
touches-modules:
  - src/app/(system-admin)/admin/(portal)/privacy-requests/**
  - src/app/(system-admin)/admin/(portal)/crm/**
  - src/components/system-admin/privacy/**
  - src/app/crm/opt-out/**
touches-roles:
  - admin
  - guest
  - customer
touches-states:
  - PrivacyRestriction.active:true
  - PrivacyRestriction.active:false
  - CrmOrg.lead_state:HARD_OPTOUT
  - CrmPerson.optout_at
  - CrmChannel.consent_state:optout
status-changed-at: 2026-10-24T16:09:16Z
status-changed-by-spec: 2026-10-24-betroffenenrechte
last-run: never
last-result: N/A
---

### Journey: Einschränkung und Widerspruch

**Ziel:** Beweist die Wirkung der übrigen Rechte an den Stellen, an denen sie greifen müssen: Mails werden nicht versendet, Retention löscht nicht, die Markierung ist sichtbar.

**Trigger-Regel:** Bei Änderungen an CRM-Outreach, Benachrichtigungs-Mails, Retention-Jobs, Unterdrückungsliste oder Fallaktionen (F6110 Betroffenenrechte, F7600 CRM-Backbone).

**Abgedeckte Akzeptanzkriterien (Design 2026-10-24-betroffenenrechte):** AC22 Einschränkung wirkt, AC23 Widerspruch Direktwerbung.

**Fixtures:**
| Fixture-Name | Was wird aufgebaut | Was wird damit geprüft |
|---|---|---|
| `contact-restricted` | CRM-Kontakt plus Kunde mit Favoriten-Alert, Einschränkungsfall | AC22 |
| `contact-objection` | CRM-Kontakt im Status kontaktierbar, Kunde mit Benachrichtigungs-Einwilligung | AC23 |

**Schritte (Runbook):**
1. Admin setzt im Fall von `contact-restricted` die Einschränkung → Markierung in Fall, CRM-Kontakt- und Kundenansicht sichtbar.
2. Outreach-Lauf und Benachrichtigungslauf auslösen → keine Mail an die Adresse im Mail-Sink (Gegenprobe: Kontrollkontakt bekommt seine Mail).
3. Retention-Job mit einer Frist auslösen, die den Kontakt sonst träfe → Daten bleiben (AC22).
4. Einschränkung im Fall mit Notiz aufheben → nächster Lauf versendet wieder.
5. Widerspruch für `contact-objection` umsetzen → Adresse als Hash in der Unterdrückungsliste, Werbe- und Benachrichtigungs-Einwilligungen aus; folgender Outreach-Lauf versendet nichts (AC23).
6. Opt-out-Seite (`/crm/opt-out`) verlinkt auf das Datenschutzformular.

**Known Risks:**
- Gegenprobe mit Kontrollkontakt ist Pflicht, sonst ist „keine Mail“ nicht von „Lauf tat nichts“ zu unterscheiden (R2 Wirkungs-Assertion).

**Delta CRM-Org-Schnitt ([F7600 CRM-Backbone], Spec 2026-10-25-crm-person-contact-modell, Architektur §13 und Abweichung A12; Pflicht für die Umsetzung dieser Journey, Stand e2e-tester 2026-10-25):**
- Begriffe: „CRM-Kontakt“ ist jetzt entweder eine **Organisation** mit Lead-Status (`crm_org.lead_state`) oder eine **Person** mit Beziehungen. Die Fixtures `contact-restricted` und `contact-objection` werden als Person mit Beziehung zu einer Akquise-Organisation (`QUEUED`) und eigener Beziehungs- oder Personenmail angelegt; der Kontrollkontakt ist eine zweite Person bzw. der Org-Kanal derselben Firma.
- Schritt 5 (Widerspruch) prüft nach Besitzer: `crm_person.optout_at` gesetzt (Entscheidung EA17 Personensperre), alle Personen- und Beziehungskanäle `consent_state = optout` und ihre HMACs in `crm_suppression`; **die Organisation behält Lead-Status und Org-Kanäle**, ein folgender Outreach an den Org-Kanal kommt im Mail-Sink an, die Person fehlt in jeder Empfängerauswahl (`GET /orgs/{id}/outreach/recipients`).
- Inhaber-Regel (Entscheidung E3, Schalter `owner_optout_rule` in der CRM-Konfiguration, Standard an): widerspricht eine Person mit aktiver Rolle `owner`, steht ihre Firma zusätzlich auf `HARD_OPTOUT` und deren Org-Kanäle sind gesperrt; mit Schalter aus nicht. Eigene Fixture, nicht mit `contact-objection` zusammenlegen.
- Schritt 3 (Retention): Die Retention betrifft Personen (`crm_person_retention`, 36 Monate, Kandidat nur ohne aktive Beziehung zu einer lebenden Org); Org-Leads ohne Person sind weiter zurückgestellt. Achtung Testbericht des Org-Schnitts: Die Kandidatenabfrage ist dort fehlerhaft unkorreliert (Befund), eine Gegenprobe „Kandidat ohne Einschränkung wird gezählt“ ist daher Pflicht.
- Belegt sind die Opt-out-Wirkungen heute über `POST /api/v1/crm/opt-out` (Token v2) und `POST /admin/crm/persons/{id}/opt-out` (Journeys `crm-opt-out`, `admin-crm-relation-channels`, API-Abnahme AC 15/16/17); die Journey selbst ist noch nicht implementiert.
