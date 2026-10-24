---
id: privacy-erasure-cross-role
title: Löschung über alle Rollen — Kunde, CRM-Kontakt und Shop-Besitzer mit derselben Adresse, Vorschau, Abschlussmail, Wirkung je Kategorie (F6110)
status: approved
priority: P1
owner-agent: designer
proposed-in-spec: 2026-10-24-betroffenenrechte
touches-modules:
  - src/app/(customer)/account/**
  - src/components/account/DangerTab.tsx
  - src/components/account/DeleteAccountModal.tsx
  - src/app/(customer)/[lang]/privacy-request/**
  - src/app/(system-admin)/admin/(portal)/privacy-requests/**
  - src/components/system-admin/privacy/**
  - src/app/(customer)/[lang]/shops/[slug]/**
touches-roles:
  - customer
  - shop-owner
  - guest
  - admin
touches-states:
  - CustomerUser.exists:false
  - Review.is_visible:false
  - ShopOwner.status:erased
  - CrmContact.lifecycle_state:HARD_OPTOUT
status-changed-at: 2026-10-24T16:09:16Z
status-changed-by-spec: 2026-10-24-betroffenenrechte
last-run: never
last-result: N/A
---

### Journey: Löschung über alle Rollen

**Ziel:** Beweist, dass eine Löschung alle Kategorien der Datenlandkarte wirklich leert (nicht nur „lief durch“), Ausnahmen in der Abschlussmail nennt und öffentliche Geschäftsdaten ohne Personenbezug stehen lässt.

**Trigger-Regel:** Bei jeder Änderung an Lösch-Orchestrierung, Datenlandkarte, Konto-Löschung, CRM-Löschung, Shop-Besitzer-Deaktivierung oder Beweisarchiv-Anbindung (F6110 Betroffenenrechte, F3900 Kapitel K4c Beweisarchiv).

**Abgedeckte Akzeptanzkriterien (Design 2026-10-24-betroffenenrechte):** AC15 Kunden-Löschung vollständig, AC16 Abschlussmail nennt Ausnahmen, AC19 ein Fall für alle Rollen, AC20 Shop-Besitzer-Löschung, AC21 Vorschau vor Löschung. AC17 (Reihenfolge mit dem Beweisarchiv) und AC18 (Wiederaufnahme nach Teilfehler) prüft das Backend mit Integrationstests, weil sie Fehlerinjektion brauchen.

**Fixtures:**
| Fixture-Name | Was wird aufgebaut | Was wird damit geprüft |
|---|---|---|
| `customer-erase-self` | Kunde mit Daten in allen Kunden-Kategorien inkl. Foto, Avatar, Wallet | Pfad A: Selbstlöschung im Account |
| `person-all-roles` | eine lauf-eindeutige Adresse als Kunde (Review mit Foto), CRM-Kontakt und deaktivierter Shop-Besitzer mit Claim-Dokument | Pfad B: Formular-Löschung über den Admin |

**Schritte (Runbook):**
1. Pfad A: `customer-erase-self` löscht im Gefahrenbereich (Code aus dem Mail-Sink). Abschlussmail liegt vor der Löschung im Mail-Sink und nennt gelöschte Kategorien und jede behaltene mit Grund und Frist (AC16).
2. Nachprüfung je Kategorie über einen Prüf-Endpunkt oder die DB des Test-Backends: keine personenbezogenen Werte mehr, Foto- und Avatar-Dateien weg; Review auf der Shop-Seite nicht mehr sichtbar; Fall geschlossen mit Ergebnis je Kategorie (AC15).
3. Pfad B: `person-all-roles` stellt über `/en/privacy-request` eine Löschanfrage und bestätigt.
4. Admin öffnet den Fall: Vorschau zeigt je Kategorie Anzahl und Verhalten (löschen/anonymisieren/behalten mit Grund) über alle drei Rollen; ohne Bestätigung ändert sich nichts (AC21).
5. Admin bestätigt die Löschung → Ergebnis je Kategorie im Fall.
6. Nachprüfung: Kunden-, CRM- und Shop-Besitzer-Daten leer, Claim-Dokument-Datei weg, Adresse als Hash in der Unterdrückungsliste (AC19, AC20).
7. Öffentliche Shop-Seite des Shop-Besitzers bleibt erreichbar und zeigt keine Daten des Besitzers (AC20).
8. Ein Editor ohne Löschrecht sieht den Ausführen-Knopf nicht; die API lehnt ab (Teil von AC31).

**Known Risks:**
- Die Nachprüfung muss je Kategorie aus der Datenlandkarte laufen, nicht über eine feste Liste im Test — sonst fallen neue Kategorien durch.
- Fixtures sind nach dem Lauf gelöscht (das ist der Test); keine Prod-Kopie-Daten verwenden.
