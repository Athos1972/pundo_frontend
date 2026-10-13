# shop-profile: Produktionsnotizen (Stand 2026-10-14)

Teil 7 von „pundo for businesses“ (Ergänzung nach dem Serienende in Teil 6): „Keep your shop profile up to date“ (EN 1:48, EL 1:52). Freigegebenes DE-Skript: `01-skript.de.md`.
Veröffentlicht 2026-10-14: EN https://youtu.be/diyI6i8TI04 · EL https://youtu.be/9LQAaIuNA7I (SRT, Thumbnail, Kapitel, Playlists, Endscreen Playlist + Abo). Details: Vault N7900.
Upload: EL-Datei > 10 MB → Ton auf 128k neu kodiert (`ffmpeg -c:v copy -c:a aac -b:a 128k`, `out/*.up.mp4`).

## Voraussetzung
Bug [[B5950-001]] (zweites Öffnungszeitfenster in Kundensicht und `is_open_now`), behoben 2026-10-13 (Backend `adc536a`, Frontend `4f50afd`). Ohne den Fix zeigt die Shop-Seite nur „07:00 – 14:00“.

## Dateien
| Datei | Inhalt |
|---|---|
| `scenes.yml` | meta (`demo.*`: Zeiten, Beschreibung je Sprache, Sprachen, Zahlungsarten, Umkreis; `thumbnail_scene: languages-payment`) + 7 Szenen EN/EL |
| `record.mjs` | Dashboard → Menü „Opening Hours“ → Mo–Fr „Closed“ abwählen, 07:00–14:00 + „Second time slot“ 16:30–19:00, Sa 07:00–14:00, So geschlossen → „Save hours“ → „Shop Profile“: Beschreibung, Sprachen EN/EL/RU, Zahlungsarten Bar/Karte/Revolut, Umkreis 10 km, Social Media hervorheben → Speichern → Shop-Seite (Pause/Resume): Beschreibung, Sprachen, Liefergebiet, Zahlungsarten, Öffnungszeiten |
| `prepare_profile.py` | läuft mit dem **Backend-venv**: leert im Demo-Shop **der aufgenommenen Sprache** Beschreibung, Sprachen, Zahlungsarten, Umkreis, Öffnungszeiten, Social Links. Nur `pundo_test`, `--dry-run` = ROLLBACK. Wird von `record.mjs` aufgerufen. |

## Bauen
```
video/build.sh shop-profile [en|el] [--rerecord]
```

## Befunde & Lösungen
1. **Zweites Zeitfenster unsichtbar** → Bug B5950-001, vor dem Video behoben (Entscheidung BB).
2. Nach `prepare_profile.py` liefert der Shop-Admin alle Tage als „Closed“ (keine Zeitfelder) → `record.mjs` wählt „Closed“ zuerst ab.
3. Öffnungszeiten-Editor hat kein „auf alle Tage übernehmen“ → Di–Fr werden im Video zügig ausgefüllt (UX-Idee).
4. EN-Aufnahme-Browser steht auf en-US → Zeitfelder im Shop-Admin zeigen „07:00 AM“; Kundenansicht 24h.
5. `pundo_test` wurde am 2026-10-13 neu synchronisiert → Demo-Shops neu angelegt (`anna-s-bakery`, `o-phournos-tes-annas`).
6. Andere Sessions starteten 3500 neu bzw. hatten halbfertige Module im Working Tree → Aufnahme erst nach Absprache; bei „Module not found“ trotz vorhandener Datei Dev-Server neu starten (Turbopack-Cache).

## Offene Punkte
- Aussprache nicht nach Gehör geprüft.
