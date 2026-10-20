# video/ - wiederverwendbare Video-Pipeline

Erzeugt 16:9-Tutorialvideos (1920x1080, 30 fps, H.264 + AAC) mit Handy-Aufnahme der App, Callouts, Sprecherstimme
(edge-tts), eingebrannten Untertiteln + `.srt`, Intro/Outro, optionaler Musik und YouTube-Thumbnail.

**SSOT fuer Kanal, veroeffentlichte Videos (Links), Backlog und Upload-Einstellungen:** Vault
`Pundo-Plattform/20 Features/FG7 Marketing & Community/N7900 YouTube-Kanal & Tutorial-Videos.md`.
Dieses README beschreibt nur die Technik.

```
video/
  build.sh                 Ein Kommando: video/build.sh <slug> [en|el] [--rerecord] [--no-record]
  _branding/               wiederverwendbar fuer ALLE Videos
    brand.yml              Farben, Fonts, Stimmen, Aussprache, Layout, Timing, Musik
    tts.py                 scenes.yml -> Audio je Szene + Wort-/Satz-Timings (edge-tts)
    render.mjs             Branding-Layer: Szenen-Basis, Geraeterahmen, Untertitel-PNGs, Intro, Outro, Thumbnail
    compose.py             generisch: Intro + Szenen + Outro, Crossfades, Musik-Ducking, Loudnorm, SRT
    lib/record-lib.mjs     Playwright-Screencast-Helfer (scharfe Frames, Tap-Ripple, Scroll, Tippen, pause/resume;
                           Desktop: Mauszeiger, click/moveTo, adminLogin, mask; strenger Modus)
    lib/guard.mjs          Schranke 3500/8500, Lock-Pruefung, Datenschutz-Mailfilter, Admin-Login (reine Funktionen, Vitest)
    formats.py             meta.format-Merge (default/vertical/desktop), voice_langs/subtitle_langs
    subtitles.py           Untertitel-Sprachen: Text auf die Zeitspanne der gesprochenen Spur verteilen
    verify_output.py       Ausgabepruefung fuer Desktop-Videos (Aufloesung, SRT, Frames, Kapitel >= 10 s) + Kapitelliste
    tests/                 Python-Tests (unittest) + regression.py (Regressionsvergleich, Baselines in tests/baseline/)
    music/                 Hintergrundmusik (+ CREDITS.md)
    youtube-channel/       Kanal-Branding: render.mjs (Banner, Profilbild, Wasserzeichen) + README (Kanaltexte)
  <slug>/
    scenes.yml             Single Source of Truth: Szenen, Callouts, Sprechtext (EN/EL/...)
    record.mjs             slug-spezifischer Aufnahme-Ablauf (Playwright)
    01-skript.de.md        freigegebener deutscher Skript-Entwurf (nur Review, wird nicht produziert)
    assets/                z. B. cover.jpg / product-photo.jpg
    out/                   <slug>.<lang>.mp4, .srt, thumbnail.<lang>.png, frames/<lang>/ (QA)  [gitignored]
    .cache/                Zwischenstaende                                                    [gitignored]
    .recording-accounts.json  Test-Zugangsdaten der Aufnahmen                                  [gitignored]
```

| Slug | Inhalt | Aufnahme gegen |
|---|---|---|
| `shop-signup` | Teil 1: Shop registrieren (legt Demo-Konten an) | Test-Instanz 3500/8500 |
| `product-create-new` | Teil 2: erstes Produkt mit Foto + Preis; `prepare.sh` bereitet `pundo_test` vor (siehe `PROD-NOTES.md`) | Test-Instanz 3500/8500 |
| `product-from-catalog` | Teil 3: Katalogprodukt per Barcode/Name übernehmen; `prepare_catalog.py` (Backend-venv) legt ein fiktives Katalog-Item an (siehe `PROD-NOTES.md`) | Test-Instanz 3500/8500 |
| `service-create-new` | Teil 4: Dienstleistung neu anlegen (Backkurs, Preis pro Session); `prepare_service.py` (Backend-venv) räumt den Kurs früherer Läufe auf; braucht Kategorie `px-cooking` | Test-Instanz 3500/8500 |
| `service-from-catalog` | Teil 5: Katalog-Dienstleistung „Catering / events“ übernehmen, Preis „Auf Anfrage“; `prepare_catalog_service.py` (Backend-venv) | Test-Instanz 3500/8500 |
| `pricing` | Teil 6 (Serienende): Brot-Angebot bearbeiten, Staffel „ab 6 Stück“, Aktionspreis mit Zeitraum, Kundensicht (braucht F5200 „Staffelpreise Kundensicht“); `prepare_pricing.py` (Backend-venv) | Test-Instanz 3500/8500 |
| `shop-profile` | Teil 7: Öffnungszeiten mit Mittagspause (braucht B5950-001), Beschreibung, Sprachen, Zahlungsarten, Liefer-Umkreis, Social Links kurz, Kundenansicht; `prepare_profile.py` (Backend-venv) | Test-Instanz 3500/8500 |
| `short-shop-signup` | Short S1 (9:16): Shop anmelden; legt je Lauf einen Wegwerf-Account an (Details: `shorts/00-konzept.de.md`) | Test-Instanz 3500/8500 |
| `short-product-create-new` | Short S2 (9:16): Produkt neu; nutzt `../product-create-new/prepare.sh` | Test-Instanz 3500/8500 |
| `short-product-from-catalog` | Short S3 (9:16): Produkt aus Katalog; nutzt `../product-from-catalog/prepare_catalog.py` | Test-Instanz 3500/8500 |
| `short-service-create-new` | Short S4 (9:16): Dienstleistung neu; nutzt `../service-create-new/prepare_service.py` | Test-Instanz 3500/8500 |
| `short-service-from-catalog` | Short S5 (9:16): Dienstleistung aus Katalog; nutzt `../service-from-catalog/prepare_catalog_service.py` | Test-Instanz 3500/8500 |
| `short-pricing` | Short S6 (9:16, `meta.format: vertical`): Staffel, Kundensicht, Aktion; nutzt `../pricing/prepare_pricing.py`. Konzept aller Shorts: `shorts/00-konzept.de.md` | Test-Instanz 3500/8500 |
| `short-shop-profile` | Short S7 (9:16): Profil/Öffnungszeiten (braucht B5950-001); nutzt `../shop-profile/prepare_profile.py` | Test-Instanz 3500/8500 |
| `pitch` | „Why pundo?“ (Pitch vor der Serie, nur Kundenseite, keine Anmeldung): russische Suche „хлеб“, Shop-Seite EN→EL→RU, Aktion, Öffnungszeiten, WhatsApp, Registrierungs-Einstieg; `prepare_pitch.py` (Backend-venv) | Test-Instanz 3500/8500 |
| `short-pitch` | Short (9:16) zum Pitch: Suche, Sprachen, Kontakt, kostenlos; nutzt `../pitch/prepare_pitch.py` | Test-Instanz 3500/8500 |
| `first-steps` | Teil 2 „Die ersten 10 Minuten“: Vorschläge übernehmen / Preis setzen / archivieren, Profil, eigene Produkte, Kundensicht; `prepare_first_steps.py` (Backend-venv) | Test-Instanz 3500/8500 |
| `short-first-steps` | Short (9:16) zu Teil 2: Vorschläge, Übernehmen, Preis, Kundensicht; nutzt `../first-steps/prepare_first_steps.py` | Test-Instanz 3500/8500 |
| `catalog-import` | Teil 9: Katalog-Import (Excel-Vorschau, Fehler, Duplikat, Update mit „komplette Liste“, öffentliches Test-Sheet, Produktfotos aus Drive); `prepare_catalog_import.py` (Backend-venv), Dateien aus `catalog-data.json` (`make_catalog_files.py`); Übersetzungszeile braucht Test-Gateway :8600 (siehe `PROD-NOTES.md`) | Test-Instanz 3500 (Standalone)/8500 |
| `short-catalog-import` | Short (9:16) zu Teil 9: Vorschau, Upload, Übernehmen, Kundensicht; nutzt `../catalog-import/prepare_catalog_import.py` | Test-Instanz 3500/8500 |
| `reviews` | Teil 10: Bewertungen beantworten (Dashboard „3 neu“, Liste, Danke-Antwort, Antwort auf Kritik, Spam melden, „Meine Produkte“, Kundensicht); `prepare_reviews.py` (Backend-venv) legt 4 Demo-Bewertungen in den Niko-Shops aus Teil 9 an (siehe `PROD-NOTES.md`) | Test-Instanz 3500 (Standalone)/8500 |
| `short-reviews` | Short (9:16) zu Teil 10: Dashboard, Antwort auf Kritik, Kundensicht; nutzt `../reviews/prepare_reviews.py` | Test-Instanz 3500/8500 |
| `team-admin-tour` (F8960, Thema 1) | Team-Video „Admin-Rundgang“ (`meta.format: desktop`, EN-Stimme + EL-Untertitel, streng 3500/8500, Admin-Login per API); `../team-common/prepare_team.py` (Backend-venv) legt die synthetischen Demo-Daten an (siehe `PROD-NOTES.md`). Weitere `team-*`-Videos folgen. Kanal „pundo Team“, **nicht gelistet**; Details F8960 im Vault (nicht N7900) | Test-Instanz 3500/8500, **streng** |
| `team-catalog-quality` (F8960, Thema 7) | Team-Video „Katalog-Qualität“: Attribut-Definitionen je Kategorie + Service-Mappings inkl. Lückenliste (desktop, EN-Stimme + EL-Untertitel, streng 3500/8500); `../team-common/prepare_team.py` legt „Team Demo Service“ an und räumt Demo-Definition/-Mapping beim nächsten Lauf ab (siehe `PROD-NOTES.md`). Kanal „pundo Team“, **nicht gelistet** | Test-Instanz 3500/8500, **streng** |
| `channel-trailer` | Kanaltrailer ~48 s (Kundenseite + Shops + Abo) | **pundo.cy nur lesend** (Testdaten haben keine Produktbilder); `VIDEO_BASE_URL` ueberschreibbar |

## Voraussetzungen
- ffmpeg/ffprobe (Homebrew), Node (Playwright aus dem Repo, Chromium installiert), Python 3.12 (`video/.venv` wird von build.sh angelegt: edge-tts, pyyaml, pillow, numpy).
- Fuer die Aufnahme: **Test-Instanz** laeuft - Frontend `npm run dev:test` (:3500), Backend `./scripts/start_test_server.sh` im pundo_main_backend (:8500). Niemals 3000/8000 (`record-lib` bricht ab). DB `pundo_test` wird nicht zurueckgesetzt.
- Auf 3500 muss der **Dev-Server dieses Repos** laufen (`lsof -iTCP:3500` -> `next dev`). E2E-Laeufe anderer Sessions starten dort einen Standalone-Build ohne lokale Aenderungen.
- **Keine parallelen Test-Laeufe** (pytest/Playwright) gegen `pundo_test` waehrend der Aufnahme: das Backend wird dann so langsam (Angebot speichern 8-17 s statt 30 ms), dass Szenen ins Stocken geraten.
- Internet: edge-tts (Microsoft; antwortet gelegentlich mit 403/Handshake-Fehler -> tts.py wiederholt automatisch, Ergebnisse werden gecacht), Nominatim/OSM-Kacheln waehrend der Aufnahme.

## Befehle
```
video/build.sh shop-signup            # EN + EL komplett (nimmt auf, falls noch keine Aufnahme existiert)
video/build.sh shop-signup el         # nur Griechisch
video/build.sh shop-signup --rerecord # Aufnahme neu (z. B. nach UI-Aenderung oder anderem Cover-Foto)
video/build.sh shop-signup --no-record# nur Texte/Stimme/Layout/Musik neu, Aufnahme wiederverwenden
node video/_branding/youtube-channel/render.mjs   # Kanal-Banner/Profilbild/Wasserzeichen neu
```
Nach Textaenderung in `scenes.yml`: `--rerecord` (Szenenlaengen haengen an der Audiodauer).

## Format `desktop` (Team-/Admin-Videos, F8960)
`meta.format: desktop` (`brand.yml -> formats.desktop`): 16:9-Canvas mit **Browserfenster** statt Handy (Leiste mit Adresse, Schatten),
Callout als Band ueber dem Fenster, Untertitel ueber die Fensterbreite, Thumbnail mit Fensterausschnitt + Pille „Team“.
Aufnahme: Viewport 1440x810 @2x (kein `isMobile`/`hasTouch`), sichtbarer Mauszeiger + Klick-Ripple.
`record.mjs`: `startSession({ lang, outDir, device: 'desktop', strict: true })`, dann `adminLogin(sess, account)`; Bedienung mit
`click(page, locator)` / `moveTo(...)` statt `tap`. `compose.py` bricht ab, wenn das Seitenverhaeltnis der Aufnahme nicht zur
Bildschirmflaeche (`screen_w/screen_h`) passt. Ohne `meta.format` bleibt alles wie bisher (Handy 390x844).
Szenenfelder: `window_path` (Text in der Adressleiste, je Szene; Host darf enthalten sein, z. B. `localhost:3500/admin/shops`), `window_highlight` (Rahmen um die Adresszeile), `chapter` (Kapitelstart fuer YouTube; sind keine gesetzt, ist jede Szene ein Kapitel).

## Untertitel-Sprachen (EL nur als `.srt`)
```yaml
meta: { format: desktop, voice_langs: [en], subtitle_langs: [el] }
scenes:
  - id: tour
    narration: { en: "..." }                       # nur die Stimme-Sprache
    subtitle:  { el: ["Satz 1.", "Satz 2."] }      # String oder Liste; gleiche Satzanzahl wie EN -> satzgenau, sonst proportional
```
`build.sh <slug>` baut ohne Sprachangabe nur `voice_langs`; `tts.py <slug> el` bricht mit Exit 2 ab („subtitle-only“).
`compose.py` schreibt neben `<slug>.en.srt` auch `<slug>.el.srt` (Timing aus dem EN-Audio, max. 2 Zeilen x 42 Zeichen, nicht eingebrannt).
Fehlt `subtitle.el` in einer vertonten Szene, bricht `tts.py` ab (kein stilles Weglassen). Greek-Timing vor dem Upload in YouTube sichten.

## Strenger Modus (`strict: true`) und Datenschutz
- Schranke **vor** jedem Loeschen/Browserstart: Frontend nur `http://localhost|127.0.0.1:3500`, Backend nur `:8500` mit `/health` = 200,
  kein laufender E2E-Lauf (`os.tmpdir()/pundo-e2e-run.lock`). Sonst Abbruch, `.cache/<lang>/rec/` bleibt unveraendert.
  Bestehende Videos laufen ohne `strict` weiter (z. B. `channel-trailer` liest pundo.cy); alte Pflichtschranke 3000/8000 gilt immer.
- `adminLogin`: POST `:8500/api/v1/admin/auth/login`, Cookie `admin_token`; landet `/admin/dashboard` auf dem Login, bricht es ab (3500 nutzt nicht 8500).
  Zugangsdaten nur in `video/<slug>/.recording-accounts.json` bzw. `team-common/.recording-accounts.json` (gitignored), nie im Bild (keine Login-Szene).
- `runScene` prueft zu Szenenbeginn und -ende Text + Eingabefelder: **E-Mail ausserhalb `@pundo-e2e.io` oder sichtbares Passwortfeld = Abbruch**.
  Listen mit Echtdaten (`pundo_test` ist eine Prod-Kopie!): filtern, Demo-Datensaetze nutzen oder `sess.mask(zeilenSelektor, demoMarker)` (nach jeder Navigation neu aufrufen).
  Log je Szene: `privacy ok (0 foreign emails, 0 password fields)`.

## Ausgabepruefung `verify_output.py`
`build.sh` ruft sie fuer `format: desktop` automatisch (manuell: `video/.venv/bin/python video/_branding/verify_output.py <slug> en`).
Prueft 1920x1080/30 fps/Audio, Dauer (Warnung ausserhalb 120-240 s bzw. +-25 % von `target_duration_s`), alle SRTs (parsebar, nicht leer, monoton, ohne Ueberlappung,
Cue-Anzahl = Timeline), Cues je vertonter Szene (EN und EL), Frames je Szene, `actual <= planned + 3 s`, **Kapitel >= 10 s**. Gibt die Kapitelliste fuer YouTube aus; Exit != 0 = nicht hochladbar.

## Tests und Regressionsvergleich (manuell, nicht im Pre-Push-Gate)
```
video/.venv/bin/python -m unittest discover video/_branding/tests          # Formate, Untertitel, verify_output, Regressions-Vergleichslogik
npx vitest run src/tests/video-record-guard.test.ts                         # Schranke/Lock/Mailfilter/Login (laeuft im Gate)
# Vor einer Pipeline-Aenderung Baseline (einmalig je Video; liegt schon fuer shop-signup/short-pricing in tests/baseline/):
video/.venv/bin/python video/_branding/tests/regression.py snapshot shop-signup en
# Nach der Aenderung: bestehende Mobil-Videos duerfen sich nicht aendern (Aufloesung, Dauer, Geometrie, Layer-Pixel, SRT):
video/.venv/bin/python video/_branding/tests/regression.py compare shop-signup en      # 16:9
video/.venv/bin/python video/_branding/tests/regression.py compare short-pricing en    # 9:16
```
`regression.py` baut mit `--no-record` neu (Stimme aus dem Cache, kein Netz), misst und stellt `out/` danach wieder her (veroeffentlichte Dateien bleiben unveraendert).

## Videos aktuell halten
`video/registry.json` listet je Team-Video `slug`, `topic` (Hilfe-Thema-ID aus `src/lib/system-admin-help.ts`), `youtubeId`, `recordedAtCommit`, `recordedAt` und `touches` (Quelldateien/Verzeichnisse der Admin-Oberflaeche, deren Aenderung das Video veralten lassen kann; bewusst ohne `system-admin-translations.ts` und `video/**`).
`npm run videos:stale` zeigt je Video die Commits auf `touches` seit der Aufnahme (Status "aktuell"/"pruefen"); `-- --strict` liefert Exit 1 bei "pruefen". "pruefen" heisst nur: ansehen, nicht neu aufnehmen.

Prinzipien:
- Die schriftliche SOP (`src/lib/system-admin-help-content.ts`) ist die Wahrheit und wird sofort angepasst.
- Videos zeigen Konzepte und Ablaeufe, kurz und modular (max. 3-4 min), ohne UI-Detailangaben im Sprechtext.
- Neuaufnahme nur, wenn sich der **Ablauf** aendert, nicht bei kosmetischen Aenderungen.
- Vor jedem Release/Feature an Admin-Seiten `npm run videos:stale` ansehen.
- Neue Videos tragen sich in `registry.json` ein (`recordedAtCommit` = Commit der Aufnahme/des Builds).
- Nach einer Neuaufnahme `recordedAtCommit`/`recordedAt`/`youtubeId` aktualisieren.

Backfill (2026-10-20): `recordedAtCommit` der 6 vorhandenen Videos ist eine Naeherung (`git log -1 --format=%H -- video/<slug>`, letzter Commit am Video-Ordner), nicht der exakte Aufnahmezeitpunkt; `touches` sind aus den in `record.mjs` besuchten Admin-Routen abgeleitet.

## Neues Video anlegen
1. Deutsches Skript `video/<slug>/01-skript.de.md` von Bernhard freigeben lassen.
2. `video/<slug>/scenes.yml` nach dem Muster von `product-create-new/scenes.yml` (meta: title/url/next_video je Sprache; scenes: `intro`, Szenen mit `callout` + `narration`, `outro`).
   Optionale `meta`-Felder: `thumbnail_scene: <scene-id>` (Handy-Frame fuers Thumbnail, `none` = kein Thumbnail),
   `timing: {intro_s, outro_s, tail_s, ...}` (ueberschreibt `brand.yml -> timing` fuer dieses Video, z. B. Trailer).
3. `video/<slug>/record.mjs` nach dem Muster der bestehenden Videos (nutzt `runScene(sess, id, dauer, prep, aktionen)`; Szenendauer = lead_in + Audio + tail; `prep` ist ungetaktet und landet nicht im Video).
4. `video/build.sh <slug>`, dann QA (unten), dann Upload (unten).
Neue Sprache: Stimme in `brand.yml -> voices`, Texte in `scenes.yml`, ggf. UI-Labels in `record.mjs`.

## QA vor dem Upload
- `out/frames/<lang>/<scene>.png` (Szenenmitte) sichten; bei Seitenwechseln zusaetzlich Einzelbilder ueber die ganze Szene ziehen
  (`ffmpeg -ss <t> -i out/<slug>.<lang>.mp4 -frames:v 1 ...`, Szenenstarts in `.cache/<lang>/compose.json`).
- Konsole: Zeilen mit `!!` und `scene X: planned ... actual ...` (actual >> planned = etwas hat gehangen).
- Aussprache neuer Begriffe nach Gehoer pruefen, ggf. `brand.yml -> pronunciation`.

## Upload auf YouTube (Einstellungen siehe N7900)
- **Team-Videos (`team-*`, F8960):** Kanal „pundo Team“, Sichtbarkeit **nicht gelistet** (kein Zugriffsschutz: keine Geheimnisse im Video), Kapitel aus `verify_output.py`, SRT EN + EL; Ablauf und Video-Tabelle stehen in der F8960-Feature-Datei im Vault.
- Titel/Beschreibung je Sprache, Kapitelmarken aus den Szenenstarts (`.cache/<lang>/compose.json -> starts`), Thumbnail `out/thumbnail.<lang>.png`,
  SRT `out/<slug>.<lang>.srt` (Studio -> Sprachen -> Untertitel bearbeiten -> Datei hochladen), Videosprache, Tags,
  Kategorie "Praktische Tipps & Styling", nicht fuer Kinder, KI-Verwendung "Ja".
- Upload ueber Claude in Chrome: Datei-Upload max. 10 MB je Datei. Bei groesseren Videos nur den Ton neu kodieren
  (Bild bleibt identisch): `ffmpeg -i in.mp4 -c:v copy -c:a aac -b:a 128k -movflags +faststart out/yt/<slug>.<lang>.mp4`.
- Erst **privat** hochladen und speichern, Untertitel/Endscreen setzen, nach Abschluss der Vorabpruefung ueber die Video-Detailseite auf "Oeffentlich" stellen (sonst warnt YouTube vor Verwarnung).
- Commits nur mit expliziten Pfaden (`git commit -m ... -- video/<slug> ...`): mehrere Sessions teilen sich den Git-Index.
- YouTube kann die Datei eines veroeffentlichten Videos nicht ersetzen: neue Fassung = neues Video (alte loeschen nur nach Freigabe), Links in N7900 nachziehen.

## Musik
Datei in `video/_branding/music/` ablegen (mp3/wav/m4a) oder in `brand.yml -> music.file` setzen; `enabled: false` schaltet ab.
Loop mit 2-s-Crossfade am bestpassenden Loop-Punkt, Fade-in/-out, Sidechain-Ducking, -24 dB unter Sprache in den Szenen,
-10 dB in Intro/Outro. Endmix: Zwei-Pass-Loudnorm auf -14 LUFS, True Peak <= -1 dBTP.
Content-ID meldet auf dem aktuellen Track einen Anspruch (ohne Auswirkung auf die Sichtbarkeit), siehe `music/CREDITS.md`.

## Bekannte Eigenheiten
- Haendler-Domains haben im Katalog keine Spezialitaeten -> der optionale Spezialitaeten-Screen taucht im Video nicht auf.
- Kein `ctx.route()`/`page.route()` in Aufnahmen: Playwright-Request-Interception puffert jede gestreamte HTML-Antwort
  -> ~7 s pro Navigation (frueher als "Dev-Server rendert langsam" fehlgedeutet; der alte Carto-Kachel-Workaround ist entfernt,
  alle Karten laden OSM direkt). Fuer Seitenwechsel trotzdem `sess.pause()` vor der Navigation und `sess.resume()` danach
  (das Video haelt das letzte Bild und schneidet dann).
- Native `<select>`-Popups erscheinen nicht im Screencast; Aufnahmen zeigen den Tipp-Ripple und setzen den Wert direkt.
