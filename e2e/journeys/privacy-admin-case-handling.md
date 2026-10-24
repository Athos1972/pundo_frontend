---
id: privacy-admin-case-handling
title: Admin-Fallbearbeitung — E-Mail-Eingang, Fristen-Ampel, Erinnerung und Alarm, Verlängerung, Ablehnung, Berichtigung, Rollen, Kennzahlen (F6110)
status: approved
priority: P1
owner-agent: designer
proposed-in-spec: 2026-10-24-betroffenenrechte
touches-modules:
  - src/app/(system-admin)/admin/(portal)/privacy-requests/**
  - src/components/system-admin/privacy/**
  - src/lib/system-admin-translations.ts
touches-roles:
  - admin
  - guest
touches-states:
  - PrivacyRequest.status:open
  - PrivacyRequest.status:extended
  - PrivacyRequest.status:rejected
  - PrivacyRequest.status:closed
status-changed-at: 2026-10-24T16:09:16Z
status-changed-by-spec: 2026-10-24-betroffenenrechte
last-run: never
last-result: N/A
---

### Journey: Fallbearbeitung im System-Admin

**Ziel:** Beweist, dass Fristen sichtbar, erinnert und alarmiert werden, dass Verlängerung, Ablehnung und Berichtigung nur mit Begründung gehen und die Person informieren, und dass nur berechtigte Rollen Zugriff haben.

**Trigger-Regel:** Bei Änderungen an Fallwerkzeug, Fristen-Job, Rollen und Berechtigungen, Kennzahlen oder Mail-Vorlagen (F6110 Betroffenenrechte).

**Abgedeckte Akzeptanzkriterien (Design 2026-10-24-betroffenenrechte):** AC9 Admin-Fall aus E-Mail, AC24 Berichtigung, AC26 Ampel und Erinnerung, AC27 Überschreitungsalarm, AC28 Verlängerung, AC29 Ablehnung, AC31 Zugriff, AC33 Kennzahlen. System-Admin nur `en` und `el` (Lauf in beiden).

**Fixtures:**
| Fixture-Name | Was wird aufgebaut | Was wird damit geprüft |
|---|---|---|
| `cases-deadlines` | drei offene Fälle mit 10, 6 und 1 Tag Restfrist, einer mit abgelaufener Frist | Ampel, Erinnerung, Alarm, Kennzahlen |
| `editor-no-perm` / `editor-perm` | Editor ohne und mit Fall-Berechtigung | AC31 |

**Schritte (Runbook):**
1. Superadmin legt einen Fall „Kanal E-Mail“ mit Eingangsdatum gestern an → Frist ab gestern; Bestätigungslink an die Absenderadresse im Mail-Sink; Export- und Löschaktionen gesperrt bis zum Klick (AC9).
2. Fallliste: Ampel grün, gelb, rot und „überschritten“ für `cases-deadlines` (AC26).
3. Fristen-Job auslösen (Test-Hook laut Architektur): Erinnerungen bei 7 und 2 Tagen an Bearbeiter im Mail-Sink; genau ein Alarm für den überschrittenen Fall; Kennzahl „Überschreitungen“ steigt; zweiter Joblauf erzeugt keinen zweiten Alarm (AC26, AC27).
4. Verlängerung ohne Begründung abgelehnt; mit Begründung → Frist +2 Monate, Mitteilung im Mail-Sink; zweite Verlängerung nicht möglich (AC28).
5. Ablehnung ohne Begründung abgelehnt; mit Begründung → Mail nennt Beschwerderecht bei der zyprischen Aufsichtsbehörde (AC29).
6. Berichtigungsfall: Notiz zur Korrektur, Abschluss → Protokolleintrag und Abschlussmail (AC24).
7. Kennzahlen-Kopf: offene Fälle, Fälle je Recht, mittlere Bearbeitungsdauer, Überschreitungen stimmen mit den Fixtures (AC33).
8. `editor-no-perm`: Seite und API verweigert; `editor-perm`: bearbeiten möglich, Löschung ausführen nicht (AC31).
9. Oberfläche in `el`: alle Texte übersetzt, keine `de`-Texte.

**Known Risks:**
- Fristen-Fixtures brauchen gesetzte Zeitpunkte statt Warten; Alarmweg im Test auf einen Sink umleiten.
