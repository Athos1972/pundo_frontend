# team-moderation: Produktionsnotizen (Stand 2026-10-20)

Team-Video 6 „Moderation: reviews and social links“ (F8960, Thema `moderation`). 2:44, Konzepte/Entscheidungsfragen statt Feldlisten. EN-Stimme, EN-Untertitel eingebrannt, EL nur `.el.srt`. **Kanal „pundo Team“, nicht gelistet, nicht hochgeladen.** Status: **Entwurf** (EN-Text nicht freigegeben, EL nicht gegengelesen, F8960 O3). Video 7 (Katalog-Qualität) ist ein späterer Auftrag.

## Ergebnis
`out/team-moderation.en.mp4` (1920×1080, 30 fps, 10,0 MB), `out/upload.en.mp4` (5,5 MB, libx264 crf 27 slow, aac 128k, faststart), `.en.srt` (30 Cues), `.el.srt` (45), `thumbnail.en.png`. Dauer 163,8 s, verify_output.py OK.
Kapitel: 0:00 Reported reviews · 0:29 Hide a review · 0:57 Restore and audit log · 1:26 Social-link rules · 1:49 Add a rule.

## Bauen
`npm run dev:test` (:3500), Backend :8500, dann `video/build.sh team-moderation en --rerecord`; danach Dev-Server beenden. Kein Gate/E2E parallel. `prepare_team.py` (erweitert) setzt die Demo-Bewertung (ID in der Adresszeile der Audit-Szene, `record.mjs` prüft) auf den Anfangszustand zurück (sichtbar, 2 Meldungen, Audit = created + 2×reported) und löscht die Regel `team-demo-blocked.com` (Host + Quelle admin + Note „Team Demo…“). Demo-Host muss eine echte TLD haben: `.example` wird vom Backend abgelehnt (`normalize_host` → None → 422).

## Datenschutz-QA
Strikte Schranke 3500/8500, Privacy-Check 7 von 7 Szenen ok, 0 Seitenfehler. Init-Skript blurt jede Bewertungskarte ohne „Team Demo“ und jede Regelzeile ohne „team-demo“ (ca. 80 000 externe Zeilen) vor dem ersten Paint. In pundo_test gibt es derzeit keine gemeldeten/versteckten echten Bewertungen (Blur dort nicht „bewiesen“, nur Regeln-Liste). OCR (tesseract) über 6-fps-Vollvideo und 15-fps-Fenster an Übergängen: nur UI, Demo-Daten, OCR-Rauschen; Ankunftsframes der Regel-Liste gesichtet: alle echten Zeilen unscharf. Audit-Log-IP-Spalte: nur 127.0.0.1 (Skript bricht sonst ab). Kein E-Mail-Versand (Hide/Restore sendet keine Mail).

## Layout (ehrlich)
Desktop-Rahmen, Adresszeile je Szene korrekt. Schrift der echten Seiten klein, Bewertungsseite großteils leer (nur eine Karte). Aussprache nicht gehört, EL ungeprüft.
