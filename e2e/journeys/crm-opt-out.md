---
id: crm-opt-out
title: CRM-Outreach-Mail kommt im Mail-Sink an, der Abmelde-Link (Token v2) sperrt nach Besitzer, ein Altlink bleibt ohne Wirkung
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
  - CrmOrg.lead_state:CONTACTED
  - CrmOrg.lead_state:HARD_OPTOUT
  - CrmChannel.consent_state:optout
  - CrmPerson.optout_at
status-changed-at: 2026-10-19T00:00:00Z
status-changed-by-spec: 2026-10-19-vertragsinventur
last-run: 2026-10-25T10:48:30Z
last-result: PASS
last-run-sha: null
---

### Journey: CRM-Outreach-Mail → Opt-out (Token v2, Opt-out nach Besitzer)

**Ziel:** Wirkung statt Durchlauf (B8950-016 T31/T32, seit dem Org-Schnitt von [F7600 CRM-Backbone] mit Token v2): Die Outreach-Mail wird wirklich per SMTP an den Mail-Sink der Testinstanz zugestellt (nicht gemockt), Teile, Links und Bilder stimmen, und der Abmelde-Link aus der Mail sperrt **nach Besitzer des Empfängerkanals**: Org-Kanal → Organisation `HARD_OPTOUT` und Org-Kanal gesperrt; Beziehungskanal → nur die Person (alle ihre Personen- und Beziehungskanäle), nicht die Organisation. Ein Link im Format vor dem Schnitt (`contact|channel|nonce`) bleibt ohne Wirkung, die Seite antwortet trotzdem neutral.

**Trigger-Regel:** P1, wenn `src/app/crm/opt-out/**`, `src/app/api/crm/opt-out/**`, `ingestor/lib/crm/outreach.py`, `ingestor/lib/crm/suppression.py`, `ingestor/lib/crm/service.py` (Opt-out, Outreach) oder `ingestor/email_templates/crm_outreach/**` im Diff sind.

**Voraussetzung:** Backend-Testinstanz über `start_test_server.sh` (Mail-Sink auf 1025, `SMTP_HOST`, Opt-out-Basis-URL `http://localhost:3500`) oder ein Worktree-Slot (Mail-Sink 1026–1029; die Basis-URL zeigt dort noch auf 3500, die Spec öffnet denselben Pfad auf der Slot-URL). Der Send-Cap `send_caps.email` (Standard 25 je 24 h) darf nicht ausgeschöpft sein, sonst 429.

**Test-Daten-Matrix:**

| Fixture | Was | Warum |
|---|---|---|
| Org `E2E OptOut {uuid}` / `e2e-optout-{uuid}@test-e2e.invalid` | Akquise-Ziel, Quelle business_card, bestätigt (`QUEUED`), Org-Mail = Empfänger | AC1–AC3: Org-Kanal → Org `HARD_OPTOUT` |
| Org `E2E OptOut Rel {uuid}` + Person (Rolle `manager`, nicht `owner`) mit Beziehungsmail | zweites Akquise-Ziel | AC4: Beziehungskanal → nur die Person gesperrt |

**Schritte (Runbook):**

1. Org per API anlegen und bestätigen; die Empfängerliste ist genau der Org-Kanal (`owner_type = org`, Default); Vorschau (EN) mit `recipient_channel_id`, Sendegate `approval_required = false`; senden.
2. Mail im Mail-Sink parsen: Betreff, From `care@pundo.cy`, Text- und HTML-Teil, `List-Unsubscribe` auf das Test-Frontend, Bilder absolut und per HEAD erreichbar; `crm_message` trägt Org und Empfängerkanal; Lead `CONTACTED`.
3. Token aus der Mail mit Backend-Code prüfen (v2 für genau diesen Kanal und diese Nachricht); einen Token im alten Format erzeugen, Seite damit öffnen und bestätigen → neutral 200 und Bestätigungsbox, aber Lead bleibt `CONTACTED`, Kanal nicht `optout`, kein `crm_suppression`-Eintrag.
4. v2-Link aus der Mail öffnen und bestätigen → Org `HARD_OPTOUT`, Kanal `optout`, genau eine Zeile in `crm_suppression`, Interaktion `suppression` an der Org.
5. Zweite Org mit Person in Rolle `manager` und Beziehungsmail; Empfängerliste enthält den Beziehungskanal; senden (`crm_message` mit `person_id`/`relation_id`); v2-Link → `crm_person.optout_at` gesetzt, Beziehungskanal `optout` und gesperrt, **Org bleibt `CONTACTED`**, Org-Mail weder `optout` noch gesperrt.

**Akzeptanzkriterien:**

| AC | Was | Kriterium |
|---|---|---|
| AC1 | Mail zugestellt | Betreff wie gerendert, From enthält care@pundo.cy, Text- und HTML-Teil, `List-Unsubscribe` auf das Test-Frontend, Bilder absolut (https) mit HEAD 200 `image/*`; Nachricht am Empfängerkanal |
| AC2 | Altlink ohne Wirkung (Design AC 5) | neutrale Seite, DB unverändert (Lead, Consent, Suppression) |
| AC3 | Org-Kanal-Link wirkt (Design AC 17) | Org `HARD_OPTOUT`, Kanal `optout`, HMAC einmal in `crm_suppression` |
| AC4 | Beziehungskanal-Link sperrt die Person, nicht die Firma (Design AC 15) | `optout_at`, Beziehungskanal gesperrt, Org `CONTACTED`, Org-Mail frei |

**Bezug:** Die UI-Seite von „Opt-out sperrt Person, nicht Firma“ (Badge „Opted out“, Empfängerliste) prüft `admin-crm-relation-channels`; der Widerspruch einer Inhaberin (Inhaber-Regel) ist im Backend und in der API-Abnahme des Testberichts belegt.

**Geplante Erweiterung (F6110 Betroffenenrechte, Spec 2026-10-24-betroffenenrechte, bestätigt von Bernhard 2026-10-24):** Die Opt-out-Seite verlinkt auf das Datenschutzformular; die Suppression bleibt unverändert und wird vom Widerspruchspfad in `privacy-restriction-and-objection` mitgenutzt.

**Historie:** Bis 2026-10-25 prüfte AC2 `crm_contact.lifecycle_state = HARD_OPTOUT` mit einem Token `contact|channel|nonce`; umgestellt im Org-Schnitt (T19 Playwright-Specs anpassen, Doku durch den e2e-tester).
