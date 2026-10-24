---
id: privacy-self-service-export
title: Selbstbedienung Datenkopie für Kunde und Shop-Besitzer, Fremdzugriff gesperrt, Ablauf nach 7 Tagen (F6110)
status: approved
priority: P1
owner-agent: designer
proposed-in-spec: 2026-10-24-betroffenenrechte
touches-modules:
  - src/app/(customer)/account/**
  - src/components/account/**
  - src/app/(shop-admin)/shop-admin/(portal)/settings/**
  - src/components/shop-admin/privacy/**
  - src/lib/shop-admin-api.ts
  - src/app/api/**
touches-roles:
  - customer
  - shop-owner
  - guest
touches-states:
  - PrivacyExport.status:pending
  - PrivacyExport.status:ready
  - PrivacyExport.status:expired
status-changed-at: 2026-10-24T16:09:16Z
status-changed-by-spec: 2026-10-24-betroffenenrechte
last-run: never
last-result: N/A
---

### Journey: Datenkopie in Selbstbedienung

**Ziel:** Beweist, dass Kunde und Shop-Besitzer ihre Daten vollständig und nur ihre eigenen Daten herunterladen, dass niemand sonst an die Datei kommt und dass sie abläuft.

**Trigger-Regel:** Bei Änderungen an Account-Tabs, Shop-Admin-Einstellungen, Export-Erzeugung, Datenlandkarte oder Download-Endpunkten (F6110 Betroffenenrechte).

**Abgedeckte Akzeptanzkriterien (Design 2026-10-24-betroffenenrechte):** AC10 Kunden-Export, AC11 keine Daten Dritter, AC12 Download nur in eigener Sitzung, AC13 Export läuft ab, AC14 Shop-Besitzer-Export, AC30 Sprache (Lauf in `he`, RTL), AC35 i18n.

**Fixtures:**
| Fixture-Name | Was wird aufgebaut | Was wird damit geprüft |
|---|---|---|
| `customer-maximal` | Kunde mit Review inkl. Foto, Avatar, Favorit, Alert, Progression-Ereignis | alle Kategorien im Export, Dateien im ZIP |
| `customer-other` | zweiter Kunde, stimmt über das Review ab | AC11 (keine fremden Kennungen), AC12 (Fremdzugriff) |
| `shop-reply` | Shop-Antwort auf das Review | AC11 (Shop-Antwort ohne Personenbezug) |
| `owner-with-claim` | Shop-Besitzer mit Claim-Antrag und Dokument; zweiter Claimer am selben Shop | AC14 |

**Schritte (Runbook):**
1. `customer-maximal` meldet sich an, öffnet `/account` → Tab „Datenschutz“ → „Kopie meiner Daten anfordern“; Status „in Arbeit“, dann „bereit bis <Datum>“.
2. Mail „bereit“ im Mail-Sink, ohne Daten und ohne Link (AC10).
3. ZIP laden: JSON-Werte stichprobenartig gegen das Test-Backend (Review-Text, Favorit, Alert, Progression); Foto und Avatar als Dateien enthalten (AC10).
4. Im JSON keine E-Mail, kein Name, keine ID von `customer-other`; Shop-Antwort höchstens ohne Personenbezug (AC11).
5. `customer-other` und eine nicht angemeldete Sitzung rufen die Download-Adresse auf → keine Datei (AC12).
6. Ablauf: Export auf älter als 7 Tage stellen (Test-Hook laut Architektur) und Fristen-Job auslösen → Datei weg, Tab zeigt „abgelaufen“ (AC13).
7. `owner-with-claim` im Shop-Admin → Einstellungen → „Meine Daten“ → Kopie: Konto, Kontaktdaten, Claim und eigenes Dokument enthalten, nichts vom zweiten Claimer (AC14).
8. Schritt 1 bis 2 in `he`: RTL-Layout, Mail auf Hebräisch (AC30).

**Known Risks:**
- Hintergrund-Erzeugung: auf Status warten (Polling mit Timeout), nicht fest schlafen.
- Ablauf-Test braucht einen Test-Hook für Zeit oder Job; der Architekt legt ihn fest.
