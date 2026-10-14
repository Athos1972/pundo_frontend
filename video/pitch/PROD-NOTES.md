# PROD-NOTES — pitch „Why pundo?" (2026-10-14)

- Skript: `01-skript.de.md` (BB 2026-10-14 freigegeben, Hook mit russischer Suche). Nur belegbare Aussagen.
- Build: `./build.sh pitch en|el --rerecord`, Short: `./build.sh short-pitch en|el --rerecord`. EN 79 s, EL 78 s, Shorts ~30 s.
- `prepare_pitch.py` (nur pundo_test): „Fresh bread (daily)" (in allen 6 Sprachen übersetzt) 2,50 €, Sauerteig-Aktion 3,90 statt 4,50 (heute +7 Tage),
  Profil/Öffnungszeiten; blendet die Listings der Wegwerf-Shops aus den Short-Registrierungen (`video-short-*@pundo-e2e.io`) aus —
  deren Onboarding-Entwürfe („Preis auf Anfrage") haben sonst die Suche gewonnen.
- Startseite: Statistik-Leiste zeigt Platzhalterzahlen (TODO BB in `HomepageStatsStrip`) → im Hook per CSS ausgeblendet.
- Sprachen-Szene hebt „Fresh bread" hervor, nicht das Sauerteigbrot (das hat nur einen Namen in der Shop-Sprache).
- Beim Aufnehmen gefunden und behoben:
  - Kundensuche: veraltete Antwort (Larnaca-Fallback) konnte das Ergebnis mit echtem Standort überschreiben → Sequenz-Guard in `SearchContent.tsx`.
  - `record-lib.mjs`: `ctx.route()` (alter Carto-Kachel-Workaround) puffert jede gestreamte HTML-Antwort → ~7 s pro Navigation. Entfernt (ShopMap lädt OSM direkt).
  - edge-tts 7.2.8 → 403 bei Microsoft; `video/.venv` auf 7.3.1 aktualisiert.
- Upload: Pitch EN/EL normal (Thumbnail, SRT, Kapitel ≥ 10 s); Shorts „Ähnliches Video" = Pitch der gleichen Sprache.
