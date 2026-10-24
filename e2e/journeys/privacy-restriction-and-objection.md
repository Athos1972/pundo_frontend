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
  - CrmContact.lifecycle_state:HARD_OPTOUT
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
