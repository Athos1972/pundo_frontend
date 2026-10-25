# team-crm-persons: Produktionsnotizen (Stand 2026-10-25, Neuaufnahme nach dem CRM-Modellumbau)

Team-Video 5b „CRM: people and relations“ (Feature „Team-SOPs & Admin-Hilfe“, Thema `crm-persons`), neu aufgenommen nach dem
Modellumbau von „CRM-Backbone“ (Pflicht laut Akzeptanzkriterium 48: Name abgeleitet/frei mit Überschreib-Hinweis, Anrede, Geburtstag
mit „Year unknown“, drei Kanal-Besitzer, Verweis auf einen Organisationskanal statt Kopie, Notiz an der Beziehung, Zentrale/Filiale und
Gebietsleitung über Beziehungen; keine „Contacts“, keine ID-Eingabe, keine Rollen mit Datum). EN-Stimme, EN-Untertitel eingebrannt,
EL nur `.el.srt`. **Kanal „pundo Team“, nicht gelistet, noch nicht hochgeladen.** Status: **Entwurf** (EN-Text nicht freigegeben,
EL nicht gegengelesen; griechische UI-Begriffe vorläufig). Titel jetzt wie das Hilfethema „CRM: people and relations“ (vorher „… and roles“).

## Ergebnis (Aufnahme 2026-10-25)
| Größe | Wert |
|---|---|
| Dateien | `out/team-crm-persons.en.mp4` (1920×1080, 30 fps, 18,8 MB), `.en.srt` (38 Cues), `.el.srt` (58 Cues), `thumbnail.en.png` (Szene „relations“) |
| Dauer | 212,8 s (3:33), Ziel 220 s |
| verify_output.py | OK |
| Kapitel (alle ≥ 10 s) | 0:00 People · 0:31 Add a person · 1:01 Name built or free · 1:31 Relations, roles and notes · 2:11 Channels: owner and reference · 2:52 Rules that are easy to forget |

## Bauen
Dev-Server dieses Repos auf :3500 (`npm run dev:test`), Backend :8500, dann `video/build.sh team-crm-persons [--rerecord]`; danach
Dev-Server beenden. Kein Gate/E2E parallel. `prepare_team.py` läuft vor der Aufnahme selbst (nur pundo_test). Die letzte Szene zeigt die
Hilfe-Seite `/admin/help/crm-persons`, also den SOP-Stand des Arbeitsbaums.

## Was das Video tut / nie tut
- Tut (nur pundo_test): Person „Anna Team Demo“ (Vor-/Nachname, Anrede „Ms“, Geburtstag 14. März mit „Year unknown“, `anna@pundo-e2e.io`)
  anlegen (POST persons); freien Namen „Team Demo Nikos“ durch „Nikos Team Demo“ ersetzen („Replace name“, PATCH persons/68); bei Petros
  eine Beziehung zu „Team Demo Accounting Office“ ohne Rolle anlegen (POST relations, Organisation per Namenssuche), Rolle „Advisor“
  ergänzen (POST roles) und die Beziehung beenden (POST end); `info.bakery@pundo-e2e.io` als Beziehungskanal versuchen (422, keine Kopie)
  und stattdessen als bevorzugten Kanal setzen (PATCH relations/{id}). Am Ende muss die Liste der CRM-Schreibaufrufe genau diese sieben
  sein (im Lauf bestätigt). Abbruch, wenn eine Suche eine Organisation ohne „Team Demo“ zeigt.
- Tut nie: Widerspruch, Löschen einer Person, Kanal umhängen, Senden, Einstellungen. Schutz: `fetch`-Wrapper verwirft diese Schreibaufrufe.

## Testdaten
Siehe `../team-common/prepare_team.py` (Abschnitt CRM) und `../team-crm/PROD-NOTES.md`. Personen-IDs der Adresszeile (Petros 9,
Nikos 68) prüft `record.mjs` gegen `scenes.yml`; nach einem neuen Prod-Kopie-Sync ggf. `window_path` anpassen.

## Datenschutz-QA
- Strikte Schranke 3500/8500; Privacy-Check je Szene 6 von 6 ok (0 fremde E-Mails, 0 Passwortfelder), 0 Seitenfehler.
- Personenliste (Prod-Kopie, 8 Zeilen): 5 Fremdzeilen geblurrt; Suche „Team Demo“ = genau 3 Demo-Personen. Org-Suche: 1 Treffer (Demo).
- Sichtprüfung: Mittelbilder aller Szenen, 1-fps-Kontaktbögen der Szenen people und channels: keine lesbare Fremdzeile.
