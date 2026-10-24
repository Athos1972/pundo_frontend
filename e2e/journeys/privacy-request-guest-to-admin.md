---
id: privacy-request-guest-to-admin
title: Datenschutzanfrage ohne Konto — Formular, Bestätigung, Admin-Fall, Export-Download, Negativauskunft (F6110)
status: approved
priority: P1
owner-agent: designer
proposed-in-spec: 2026-10-24-betroffenenrechte
touches-modules:
  - src/app/(customer)/[lang]/privacy-request/**
  - src/app/(customer)/[lang]/legal/privacy/**
  - src/app/(system-admin)/admin/(portal)/privacy-requests/**
  - src/components/system-admin/privacy/**
  - src/components/layout/**
  - src/app/api/**
touches-roles:
  - guest
  - admin
touches-states:
  - PrivacyRequest.status:unconfirmed
  - PrivacyRequest.status:open
  - PrivacyRequest.status:closed
status-changed-at: 2026-10-24T16:09:16Z
status-changed-by-spec: 2026-10-24-betroffenenrechte
last-run: never
last-result: N/A
---

### Journey: Datenschutzanfrage ohne Konto bis zum Download

**Ziel:** Beweist, dass eine Person ohne Konto über das öffentliche Formular eine bestätigte Anfrage stellt, der Admin sie fristgerecht bearbeitet und die Person ihre Datenkopie nur nach erneuter Bestätigung erhält — ohne dass das Formular verrät, ob Daten existieren.

**Trigger-Regel:** Bei jeder Änderung an Formular, Bestätigung, Download-Seite, Admin-Fallwerkzeug, Mail-Vorlagen oder Datenlandkarte (F6110 Betroffenenrechte).

**Abgedeckte Akzeptanzkriterien (Design 2026-10-24-betroffenenrechte):** AC4 keine Bestandsauskunft, AC5 Fall erst nach Bestätigung, AC6 Token einmalig und befristet, AC8 Begrenzung, AC25 Negativauskunft, AC30 Sprache und Marke der Mails (Lauf in `de` und `ar`), AC32 Protokoll ohne Inhalte, AC34 Datenschutzadresse in Fußzeile und Datenschutzerklärung, AC35 SEO und i18n der neuen Seiten.

**Fixtures:**
| Fixture-Name | Was wird aufgebaut | Was wird damit geprüft |
|---|---|---|
| `crm-contact-known` | CRM-Kontakt mit lauf-eindeutiger E-Mail, Kanal und Interaktion | Treffer, Export enthält genau diese Daten |
| `address-unknown` | lauf-eindeutige E-Mail ohne Daten | gleiche Formularantwort, Negativauskunft |

**Schritte (Runbook):**
1. Fußzeile und die Datenschutzerklärung unter `/{lang}/legal/privacy` zeigen die Datenschutzadresse der Marke und den Formular-Link (AC34).
2. `/de/privacy-request`: ein `h1`, eigener Titel, Canonical; Formular „Auskunft/Kopie“ mit `crm-contact-known` absenden → Meldung „Postfach prüfen“.
3. Dasselbe mit `address-unknown` → identische Meldung und identischer Antwort-Body (AC4); beide Bestätigungsmails im Mail-Sink.
4. Vor dem Klick: Admin-Fallliste enthält keinen Fall zu den Adressen (AC5).
5. Bestätigungslink von `crm-contact-known` öffnen → „bestätigt“; Eingangsbestätigung mit Fallnummer und Frist im Mail-Sink; zweiter Klick → „bereits bestätigt“, kein zweiter Fall (AC6).
6. Admin (superadmin) öffnet `/admin/privacy-requests`: Fall mit grüner Ampel; Falldetail zeigt Trefferübersicht (CRM-Kategorien mit Anzahl).
7. Export erzeugen und freigeben → Antwortmail in `de` mit Download-Link im Mail-Sink.
8. Download-Seite öffnen (`noindex`), E-Mail erneut bestätigen, ZIP laden: JSON enthält Kontakt, Kanal und Interaktion des Fixtures und keine fremden Kennungen.
9. Fall ist geschlossen; Protokoll listet Aktionen mit Bearbeiter und Zeit, aber keine Dateninhalte (AC32).
10. `address-unknown` bestätigen → Admin antwortet mit Vorlage „keine Daten gefunden“ → Mail im Mail-Sink, Fall geschlossen (AC25).
11. Wiederholung von Schritt 2 bis 5 in `ar`: `html[dir=rtl]`, Mails in Arabisch mit markenrichtigem Absender (AC30).
12. Begrenzung: mehr Anfragen als erlaubt für dieselbe Adresse → verständliche Meldung, keine weitere Mail (AC8).

**Known Risks:**
- Begrenzungszähler darf andere Läufe nicht blockieren: lauf-eindeutige Adressen verwenden, Zähler im Test-Backend isolieren.
- Antwortzeit-Gleichheit (AC4) nur grob prüfbar; Body-Gleichheit ist der harte Nachweis.
