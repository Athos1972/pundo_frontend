# team-shops: Produktionsnotizen (Stand 2026-10-19)

Team-Video 3 „Maintaining shops“ (F8960 T19, Thema 3). EN-Stimme, EN-Untertitel eingebrannt, EL nur `.el.srt`. **Kanal „pundo Team“, nicht gelistet, nicht hochgeladen.**
Status: **Entwurf** (EN-Text nicht von Bernhard freigegeben, EL nicht von Muttersprachler:in gelesen, F8960 O3). Reihenfolge/Begriffe folgen der SOP `shops` in `src/lib/system-admin-help-content.ts`.

## Ergebnis
| Größe | Wert |
|---|---|
| Dateien | `out/team-shops.en.mp4` (1920×1080, 30 fps, 16,8 MB), `out/upload.en.mp4` (8,6 MB, libx264 crf 27 – crf 23 ergab 10,65 MB, über dem 10-MB-Limit), `.en.srt` (36 Cues), `.el.srt` (55 Cues), `thumbnail.en.png` |
| Dauer | 188,3 s (Ziel 200 s) |
| verify_output.py | OK |
| Kapitel (alle ≥ 10 s) | 0:00 Search first · 0:29 Create a shop · 0:49 Location on the map · 1:05 Opening hours · 1:23 Save and check · 1:40 Edit a shop · 2:02 Deleting is permanent · 2:32 Shop types |

## Bauen
`npm run dev:test` (:3500), Backend :8500, dann `video/build.sh team-shops en [--rerecord]`; danach Dev-Server beenden. ca. 5 min. Während der Aufnahme darf kein Gate/E2E-Lauf aktiv sein (er beendet den Dev-Server auf :3500; passierte hier zweimal, Aufnahme brach mit ERR_CONNECTION_REFUSED ab, Wiederholung nach Ende des Gates).

## Testdaten
- `prepare_team.py` löscht zu Beginn jedes Laufs den im Video angelegten Shop (exakt Slug `team-demo-taverna` UND Name „Team Demo Taverna“; Kaskaden treffen nur Zeilen dieses Shops). Das Video legt ihn neu an (Name, Adresse, Typ „Restaurant & Bar“, Koordinaten, Öffnungszeiten, Sonntag geschlossen, Montag mit zweitem Zeitfenster).
- Bearbeitet wird „Team Demo Bakery“ (Adresse, „, ground floor“); der Upsert in `prepare_team.py` setzt sie beim nächsten Lauf zurück. Id 96279 wird gegen `scenes.yml` geprüft.
- Hard-Delete nur gezeigt: Dialog geöffnet (Vorschau-GET), Namensfeld nie befüllt, Recorder bricht ab, wenn der Bestätigen-Button nicht disabled ist, dann Cancel. „Manage shop operations“ nie berührt.
- Die Adresssuche der Karte wird nicht benutzt (externer Geocoder); Koordinaten werden per Karten-Klick und Eingabe gesetzt.

## Datenschutz-QA (AK 13)
- Strikte Schranke 3500/8500, Privacy-Check je Szene: **9 von 9 `privacy ok`** (0 fremde E-Mails, 0 Passwortfelder).
- Alle Tabellenzeilen ohne „Team Demo“ werden von einem MutationObserver als **Init-Script** (vor dem ersten Paint jeder Seite, plus 25-ms-Sweep) unscharf gemacht. Ausnahme `/admin/shop-types` (Taxonomie, keine Personen-/Shopdaten).
- Sichtprüfung: Kontaktbögen alle 3 s über das ganze Video, 6-fps-Bögen über Shop-Liste (Szene find), Start/Ende von „saved“, Ende von „edit“ und „delete“: keine lesbare Echtzeile, keine Echt-Mail. Zwischenzustände < 1/6 s nicht einzeln gesichtet. Reale Shop-Namen/Adressen der Prod-Kopie erscheinen nur unscharf.
- Gefundener Fehler im ersten Lauf: Der Observer warf 10x „parameter 1 is not of type Node“ (kein `documentElement` zur Init-Zeit) → behoben, Lauf 3 hatte 0 Seitenfehler.

## Layout-/Qualitätsbefunde (ehrlich)
- Adresszeile: pro Szene genau eine Seite, jetzt korrekt (außer Suchparameter `?q=` in „find“/„saved“, die Leiste zeigt `/admin/shops`). Möglich, weil der Klick am Szenenende vor dem Seitenwechsel einfriert; die Folgeszene setzt fort. Preis: Das Klicken auf „Shops“ in der Seitenleiste und auf „Edit“ nach dem Speichern ist nur am Szenenrand zu sehen.
- **Leaflet-Karte:** Ursache der kaputten Kacheln im Claims-Video: im Next-Dev-Server wird `leaflet.css` durch Tailwind-Output ersetzt (kein einziges `leaflet-container`-Regel), Tiles/Netz sind in Ordnung. Lösung nur im Recorder: echtes `leaflet.css` per Init-Script injizieren, kein `route()`. In einem Prod-Build sind die Leaflet-Regeln vorhanden (`.next/static`-Stichprobe); nicht live geprüft. Karte rendert jetzt sauber (Kacheln, Pin, Attribution). Braucht Internet (OSM-Tiles, Marker von unpkg).
- Formularseiten scrollen die ganze Seite; die Seitenleiste scrollt mit raus (links weiße Fläche). Schrift klein (ca. 12–13 px im 1080p-Bild).
- Shop-Types-Liste zeigt in der Spalte „Name“ deutsche Bezeichnungen, obwohl die UI auf Englisch steht; nicht untersucht (mögliches Auflösungsproblem).
- Letzte Szenen-Sekunden stehen eingefroren auf dem Klick (Freeze), danach Überblendung.
- Aussprache nicht gehört (TTS; „Restaurant & Bar“, „slug“).

## Regression
Keine Pipeline-Dateien geändert (`_branding/`, `brand.yml`, `build.sh`), daher kein Regressionsvergleich.
