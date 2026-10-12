# video/ - wiederverwendbare Video-Pipeline

Erzeugt 16:9-Tutorialvideos (1920x1080, 30 fps, H.264 + AAC) mit Handy-Aufnahme der App, Callouts, Sprecherstimme
(edge-tts), eingebrannten Untertiteln + `.srt`, Intro/Outro, optionaler Musik und YouTube-Thumbnail.

```
video/
  build.sh                 Ein Kommando: video/build.sh <slug> [en|el] [--rerecord] [--no-record]
  _branding/               wiederverwendbar fuer ALLE Videos
    brand.yml              Farben, Fonts, Stimmen, Layout, Timing, Musik
    tts.py                 scenes.yml -> Audio je Szene + Wort-/Satz-Timings (edge-tts)
    render.mjs             Branding-Layer: Szenen-Basis, Geraeterahmen, Untertitel-PNGs, Intro, Outro, Thumbnail
    compose.py             generisch: Intro + Szenen + Outro, Crossfades, Musik-Ducking, Loudnorm, SRT
    lib/record-lib.mjs     Playwright-Screencast-Helfer (scharfe Frames, Tap-Ripple, Scroll, Tippen)
    music/                 Hintergrundmusik (+ CREDITS.md)
  <slug>/
    scenes.yml             Single Source of Truth: Szenen, Callouts, Sprechtext (EN/EL/...)
    record.mjs             slug-spezifischer Aufnahme-Ablauf (Playwright)
    assets/                z. B. cover.jpg (Cover-Foto fuer Schritt 5; per COVER_PHOTO=... ueberschreibbar)
    out/                   <slug>.<lang>.mp4, .srt, thumbnail.<lang>.png, frames/<lang>/ (QA)  [gitignored]
    .cache/                Zwischenstaende                                                    [gitignored]
    .recording-accounts.json  Test-Zugangsdaten der Aufnahmen                                  [gitignored]
```

## Voraussetzungen
- ffmpeg/ffprobe (Homebrew), Node (Playwright aus dem Repo, Chromium installiert), Python 3.12 (`video/.venv` wird von build.sh angelegt: edge-tts, pyyaml, pillow, numpy).
- Fuer die Aufnahme: **Test-Instanz** laeuft - Frontend `npm run dev:test` (:3500), Backend `./scripts/start_test_server.sh` im pundo_main_backend (:8500). Niemals 3000/8000. DB `pundo_test` wird nicht zurueckgesetzt; die Aufnahme legt pro Sprache einen Test-Account `video-<lang>-<ts>@pundo-e2e.io` an.
- Internet: edge-tts (Microsoft; antwortet gelegentlich mit 403 -> tts.py wiederholt automatisch, Ergebnisse werden gecacht), Nominatim/OSM-Kacheln waehrend der Aufnahme.

## Befehle
```
video/build.sh shop-signup            # EN + EL komplett (nimmt auf, falls noch keine Aufnahme existiert)
video/build.sh shop-signup el         # nur Griechisch
video/build.sh shop-signup --rerecord # Aufnahme neu (z. B. nach UI-Aenderung oder anderem Cover-Foto)
video/build.sh shop-signup --no-record# nur Texte/Stimme/Layout/Musik neu, Aufnahme wiederverwenden
```
Nach Textaenderung in `scenes.yml`: `--rerecord` (Szenenlaengen haengen an der Audiodauer).

## Neues Video anlegen
1. `video/<slug>/scenes.yml` nach dem Muster von `shop-signup/scenes.yml` (meta: title/url/next_video je Sprache; scenes: `intro`, Szenen mit `callout` + `narration`, `outro`).
2. `video/<slug>/record.mjs` nach dem Muster von `shop-signup/record.mjs` (nutzt `runScene(id, dauer, prep, aktionen)`; Szenendauer = lead_in + Audio + tail).
3. `video/build.sh <slug>`.
Neue Sprache: Stimme in `brand.yml -> voices`, Texte in `scenes.yml`, ggf. UI-Labels in `record.mjs`.

## Musik
Datei in `video/_branding/music/` ablegen (mp3/wav/m4a) oder in `brand.yml -> music.file` setzen; `enabled: false` schaltet ab.
Loop mit 2-s-Crossfade am bestpassenden Loop-Punkt, Fade-in/-out, Sidechain-Ducking, -24 dB unter Sprache in den Szenen,
-10 dB in Intro/Outro. Endmix: Zwei-Pass-Loudnorm auf -14 LUFS, True Peak <= -1 dBTP.

## Bekannte Eigenheiten
- Die Kartenkacheln der Wizard-Karte (Carto "voyager") liefern aktuell ein "API KEY REQUIRED"-Wasserzeichen; die Aufnahme tauscht sie per Routing gegen OSM-Kacheln.
- Haendler-Domains haben im Katalog keine Spezialitaeten -> der optionale Spezialitaeten-Screen taucht im Video nicht auf.
