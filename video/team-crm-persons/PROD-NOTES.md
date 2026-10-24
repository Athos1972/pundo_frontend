# team-crm-persons: Produktionsnotizen (Stand 2026-10-24, nach der Namenssuche)

Team-Video 5b „CRM: people and roles“ (Feature „Team-SOPs & Admin-Hilfe“, Thema `crm-persons`). Ergänzt das CRM-Video (Kontakte, Outreach, Opt-out, Sicherheit) um Personenverwaltung (CRM Stufe 3). EN-Stimme, EN-Untertitel eingebrannt, EL nur `.el.srt`. **Kanal „pundo Team“, nicht gelistet, noch nicht hochgeladen.** Status: **Entwurf** (EN-Text nicht freigegeben, EL nicht gegengelesen).

## Ergebnis
| Größe | Wert |
|---|---|
| Dateien | `out/team-crm-persons.en.mp4` (1920×1080, 30 fps, ca. 9 MB), `out/upload.en.mp4` (5,5 MB, libx264 crf 27), `.en.srt` (32 Cues), `.el.srt` (46 Cues), `thumbnail.en.png` (Szene „roles“) |
| Dauer | 167,4 s (2:47) |
| verify_output.py | OK |
| Kapitel | 0:00 Contacts and people · 0:28 Search first · 0:55 Add a person · 1:17 Roles · 1:57 Link a contact |

## Bauen
`npm run dev:test` (:3500), Backend :8500, dann `video/build.sh team-crm-persons en [--rerecord]`; danach Dev-Server beenden. Kein Gate/E2E parallel. `prepare_team.py` läuft vor der Aufnahme selbst (nur pundo_test).

## Was das Video tut / nie tut
- Tut (nur pundo_test): Person „Team Demo Anna“ (E-Mail `anna@pundo-e2e.io`, ohne Adresse) anlegen (POST persons); Rolle „owner“ bei „Team Demo Bakery“ (Organisation per Namenssuche „Team Demo“ gewählt, nicht per ID) an die Demo-Person „Team Demo Petros“ hängen (POST roles) und beenden (POST roles/<id>/end); Demo-Kontakt „Team Demo Contact“ per Personensuche „Team Demo“ mit Petros verknüpfen (POST persons/<id>/contacts/<id>). Die Aufnahme bricht ab, wenn die Suchtreffer eine Organisation/Person ohne „Team Demo“ enthalten (Datenschutz). Am Ende muss die Liste der CRM-Schreibaufrufe genau diese vier sein (im Lauf bestätigt).
- Tut nie: „Suppress / Opt-out“ klicken (nur überfahren; Opt-out wirkt auf Person und alle verknüpften Kontakte und ist nicht umkehrbar), Mails senden, „Confirm business“, Sicherheitseinstellungen ändern. Schutz: `fetch`-Wrapper verwirft Schreibaufrufe auf `outreach/send`, `suppress`, `confirm-business`, `crm/config`.

## Testdaten (`prepare_team.py` erweitert)
Vor jedem Lauf: löscht „Team Demo Anna“ (exakter Name + exakter E-Mail-HMAC; Identifier/Rollen kaskadieren, verknüpfte Kontakte werden entkoppelt). Seedet „Team Demo Petros“ einmalig (stabile ID, E-Mail `petros@pundo-e2e.io`) und setzt sie zurück: keine Rollen, kein verknüpfter Kontakt. Der Demo-Kontakt wird vom CRM-Video-Reset ebenfalls entkoppelt. IDs der Adresszeile (Person 9, Kontakt 7413, Organisation 7413) prüft `record.mjs` gegen `scenes.yml`; nach einem erneuten Prod-Kopie-Sync der Test-DB ändern sie sich, dann `window_path` in `scenes.yml` anpassen.

## Datenschutz-QA
- Strikte Schranke 3500/8500; Privacy-Check je Szene: 5 von 5 ok (0 fremde E-Mails, 0 Passwortfelder), 0 Seitenfehler.
- Kontakt- und Personenliste (Prod-Kopie): `armMask` blurt jede Tabellenzeile ohne „Team Demo“ (Aufnahme prüft: nur 1 Demo-Zeile, übrige unscharf; Suche findet genau 1 Treffer). Sichtprüfung der 4-s-Kontaktbögen: nur unscharfe Fremdzeilen. Person- und Kontaktseite zeigen nur Demo-Daten.

## Hinweis zur Serie
Das CRM-Video (Thema 5) sagt am Anfang „This is the last video of the series“ und verweist am Ende auf die Hilfe-Seite; das stimmt seit den Videos 6 und 7 und diesem Video nicht mehr. Neuaufnahme nur, wenn BB es will (reine Textänderung).
