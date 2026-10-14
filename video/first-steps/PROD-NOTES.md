# PROD-NOTES — first-steps „Your first 10 minutes on pundo" (Tutorial #10, 2026-10-14)

- Skript: `01-skript.de.md` (BB freigegeben). In der Serie **Teil 2** (direkt nach „Shop anmelden"); Playlists manuell sortiert, Serien-Block in allen Beschreibungen neu nummeriert.
- Build: `./build.sh first-steps en|el --rerecord` (EN 1:35, EL 1:41), Short: `./build.sh short-first-steps en|el --rerecord` (~30 s).
- `prepare_first_steps.py` (nur pundo_test): drei Bäckerei-Vorschläge des Demo-Shops zurück auf „gerade freigeschaltet" (`auto_seeded`, verfügbar, „Auf Anfrage", ohne Skip-Eintrag); ältere Angebote werden archiviert.
  Achtung: setzt auch das Brot aus dem Pitch (2,50) zurück. Das Video setzt es wieder auf 2,50, der Short ebenfalls.
- Vor der Aufnahme gefundene und behobene Bugs (alle über die Spec-Kette, SHIP):
  - B5910-007: Vorschläge nicht freigeschalteter/abgelehnter Shops in der Kundensuche; Knopf „Aktivieren" → „Übernehmen/Keep".
  - B5900-016: Shop-Seite zeigte im Produktraster Preise anderer Shops; Archivieren nimmt das Produkt jetzt von der Seite.
  - B5900-017: Angebotsliste auf dem Handy (Knöpfe überlagerten Namen bei EL/RU), „on request"/„free"/Datum/Toast übersetzt.
  - Datenkorrektur: 5 Backwaren-Vorlagen aus „Cafeteria & Meal Services" in Google-Kategorien (pundo_test erledigt, Prod per to-prod-Nachricht).
- Aktive Vorschläge kann man nicht löschen, nur archivieren (Löschen nur für archivierte/abgelaufene Angebote).
- Recorder: Zeilen über `div.px-4.py-3` (bzw. `data-testid="offer-row"`), Sprach-Hinweis F6310 per Cookie `lang_hint_dismissed` in `record-lib.mjs` ausgeblendet.
