# team-catalog-quality: Produktionsnotizen (Stand 2026-10-20)

Team-Video 7 „Catalog quality: attributes and service mappings“ (F8960, Thema `catalog-quality`), letztes Video von Phase 2. 2:53, Konzepte/Entscheidungsfragen statt Feldlisten. EN-Stimme, EN-Untertitel eingebrannt, EL nur `.el.srt`. **Kanal „pundo Team“, nicht gelistet, nicht hochgeladen.** Status: **Entwurf** (EN-Text nicht freigegeben, EL nicht gegengelesen, F8960 O3).

## Ergebnis
`out/team-catalog-quality.en.mp4` (1920×1080, 30 fps, 10,5 MB), `out/upload.en.mp4` (5,7 MB, libx264 crf 27 slow, aac 128k, faststart), `.en.srt` (36 Cues), `.el.srt` (48), `thumbnail.en.png`. Dauer 172,9 s, verify_output.py OK.
Kapitel: 0:00 Two tools · 0:29 Attribute definitions · 1:41 Service mappings · 2:24 Gap list.

## Bauen
`npm run dev:test` (:3500), Backend :8500, dann `video/build.sh team-catalog-quality en --rerecord`; danach Dev-Server beenden. Kein Gate/E2E parallel (ein Push-Gate beendete beim ersten Lauf den Dev-Server mitten in der Aufnahme: neu gestartet). `prepare_team.py` legt das Demo-Dienstleistungs-Item „Team Demo Service“ an und löscht zu Beginn jedes Laufs die Demo-Attributdefinition (`team_demo_size` auf der Demo-Kategorie) und alle Mappings dieses Items. `record.mjs` prüft die Seitenzahl in der Adresszeile von `mapresult` (`?page=4`, hängt an der Mapping-Anzahl; bei Abweichung Abbruch mit Hinweis).

## Datenschutz-QA
Strikte Schranke 3500/8500, Privacy-Check 9 von 9 Szenen ok, 0 Seitenfehler. Init-Skript blurt jede Kategorie-Zeile ohne „Team Demo“, jede Mapping-Zeile außer dem Demo-Mapping, jede Lückenlisten-Zeile (43 von 43). OCR (tesseract) über das 6-fps-Vollvideo (1038 Frames): nur UI und Demo-Daten, einzige Adresse e2e-admin@pundo-e2e.io; Sichtung aller Szenen per Kontaktbogen.

## Layout (ehrlich)
Desktop-Rahmen, Adresszeile je Szene korrekt. Schrift der echten Seiten klein; Listen großteils unscharf (gewollt). Die Seite scrollt in `maps`/`gaps` leicht (Kopfzeile aus dem Bild). Aussprache nicht gehört, EL ungeprüft.
