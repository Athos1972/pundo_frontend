# team-crm: Produktionsnotizen (Stand 2026-10-25, Neuaufnahme nach dem CRM-Modellumbau)

Team-Video 5 „CRM: organisations and outreach“ (Feature „Team-SOPs & Admin-Hilfe“, Thema `crm`), neu aufgenommen nach dem Modellumbau
von „CRM-Backbone“ (Organisationen mit Lead-Status statt Contacts, Kanäle mit genau einem Besitzer, Beziehungen Person × Organisation,
Sendegate). EN-Stimme, EN-Untertitel eingebrannt, EL nur `.el.srt`. **Kanal „pundo Team“, nicht gelistet, noch nicht hochgeladen**
(der Hilfe-Link zeigt bis zum Upload noch das alte Video `0gdPz5DOLsk`). Status: **Entwurf** (EN-Text nicht freigegeben, EL nicht
gegengelesen; griechische UI-Begriffe vorläufig).

## Ergebnis (Aufnahme 2026-10-25)
| Größe | Wert |
|---|---|
| Dateien | `out/team-crm.en.mp4` (1920×1080, 30 fps, 23,4 MB), `.en.srt` (49 Cues), `.el.srt` (78 Cues), `thumbnail.en.png` (Szene „outreach“) |
| Dauer | 286,1 s (4:46), Ziel 260 s |
| verify_output.py | OK |
| Kapitel (alle ≥ 10 s) | 0:00 Organisations and lead status · 0:30 Search first · 0:52 Add an organisation · 1:19 The organisation page · 1:44 Confirm business · 2:09 Channels and their owner · 2:38 Outreach and the send gate · 3:16 Opt-out by owner · 3:43 Review list · 4:07 Safety settings |

## Bauen
Dev-Server dieses Repos auf :3500 (`npm run dev:test`), Backend :8500, dann `video/build.sh team-crm [--rerecord]`; danach Dev-Server
beenden. Kein Gate/E2E parallel (ein Push-Gate einer anderen Sitzung beendet den Dev-Server auf :3500 und bricht die Aufnahme ab).

## Was das Video tut / nie tut
- Tut (nur pundo_test): Organisation „Team Demo Cafe“ (Akquise-Ziel, `cafe@pundo-e2e.io`, Quelle „Direct contact“) anlegen
  (POST orgs); „Confirm business“ bei „Team Demo Bakery“ (NEEDS_REVIEW → QUEUED, POST confirm-business); eine Freigabe für den roten
  Beziehungskanal von Petros (POST outreach/approve, Begründung „Petros asked for our offer at the bakery fair (demo).“); eine Vorschau
  (POST outreach/preview). Am Ende muss die Liste der CRM-Schreibaufrufe genau diese vier sein (im Lauf bestätigt).
- Tut nie: „Send email“ (nur überfahren, nach der Freigabe aktiv), „Suppress / Opt-out“ (Dialog geöffnet, „Cancel“), Kanal- oder
  Beziehungsänderungen, Sicherheitseinstellungen ändern. Schutz: `fetch`-Wrapper verwirft Schreibaufrufe auf `outreach/send`,
  `suppress`, Org-Kanäle, `persons/{id}/opt-out`, `config`, `relations`, `channels`.

## Testdaten (`../team-common/prepare_team.py`, Abschnitt CRM)
Zentrale „Team Demo Bakery“ (#7413, Org des Demo-Shops, NEEDS_REVIEW, Kanäle `info.bakery@pundo-e2e.io` und `+35790000010`),
Filiale „Team Demo Bakery Larnaca“ (#7625, QUEUED), Arbeitgeber „Team Demo Accounting Office“ (#7626, ohne Lead-Status); Personen
„Petros Team Demo“ (#9, zwei Beziehungen „Manager“ mit Notiz „Region West“, roter Beziehungskanal `petros.bakery@pundo-e2e.io`),
„Team Demo Nikos“ (#68, Beziehung ohne Rolle), „Team Demo Eleni“ (#69, Widerspruch). Alles wird vor jedem Lauf zurückgesetzt, die
angelegte Organisation gelöscht; `crm_suppression` wird nie geschrieben. Die Org-ID der Adresszeile prüft `record.mjs` gegen `scenes.yml`
(nach einem neuen Prod-Kopie-Sync können sich die IDs ändern: dann `window_path` anpassen).

## Datenschutz-QA
- Strikte Schranke 3500/8500; Privacy-Check je Szene 10 von 10 ok (0 fremde E-Mails, 0 Passwortfelder), 0 Seitenfehler.
- Org-Liste (Prod-Kopie): `armMask` blurt jede Zeile ohne „Team Demo“ (47 von 50 bzw. 48 von 50); Suche „Team Demo“ = genau 3 Treffer.
  Prüfliste: jeder Eintrag ohne „Team Demo“ geblurrt (Altfälle 50 von 50, „Relations without role“ 4 von 5).
- Sichtprüfung: Mittelbilder aller Szenen und 1-fps-Kontaktbögen der Szenen list, search, outreach, review: keine lesbare Fremdzeile.
- Sichtbar echte Zahl: „21 of 25 sent in the last 24 h“ (Zähler, keine Person).
