# team-translations: Produktionsnotizen (Stand 2026-10-20, neu geschrieben nach B8000-003/-004)

Team-Video 4b „How translations come about“ (F8960 T21). Erklärvideo, kein SOP. EN-Stimme, EN-Untertitel eingebrannt, EL nur `.el.srt`. **Kanal „pundo Team“, nicht gelistet, nicht hochgeladen.** Status: **Entwurf** (EN-Text nicht freigegeben, EL nicht gegengelesen, F8960 O3).
Die alte Prämisse „einziger Hebel ist der Quelltext“ ist weg. Kernaussagen: (a) Herkunft: Lauf `translate_products.py` bzw. automatisch nach Katalog-Import → LLM-Gateway → Worker → DB, nur fehlende Sprachen; (b) jede Sprachfassung im Produktformular direkt bearbeitbar, der Job überschreibt nie; (c) Kategorienamen je Sprache im Admin umbenennbar, kein automatischer Job überschreibt sie, nur ein von Hand gestarteter Seed mit `--overwrite-names`; Prod-Stand offen (O4) → vorsichtig formuliert; (d) kein Herkunftsmarker (F5983, Idee). Kapitel „Watch out when saving“ entfällt.

## Ergebnis
| Größe | Wert |
|---|---|
| Dateien | `out/team-translations.en.mp4` (1920×1080, 30 fps, 12,0 MB), `out/upload.en.mp4` (6,6 MB, libx264 crf 27 preset slow, aac 128k, faststart), `.en.srt` (33 Cues), `.el.srt` (51 Cues, satzgenau, geprüft), `thumbnail.en.png` |
| Dauer | 180,9 s (3:01) |
| verify_output.py | OK |
| Kapitel (alle ≥ 10 s) | 0:00 Where translations come from · 0:47 Edit languages directly · 1:37 Category names · 2:12 No marker |

## Bauen
`npm run dev:test` (:3500), Backend :8500, dann `video/build.sh team-translations en --rerecord`; danach Dev-Server beenden. Kein Gate/E2E parallel. Kein `;` im Sprechtext (Satzteiler der Untertitel). Szenen: chain (Grafik), product (echt, Demo-Brot, Felder je Sprache, Save nur überfahren, **nichts gespeichert**), merge (Grafik, neu: Vorher/Nachher eines Laufs), categories (echt, Demo-Kategorie, deutscher Name getippt und gespeichert, danach versteckter Reload als Beleg), marker (Grafik). Entfallen: Grafiken `steer` und `warning`.

## Bild
- Grafiken: `graphics.html` (lokal, `file://`, Branding aus `_branding`, kein CDN); Adresszeile „pundo team · explainer“; Schritte per `window.__step(n)` nach Wortzeiten. Demo-Werte fiktiv.
- Adresszeilen der echten Szenen: `/admin/products/329578/edit`, `/admin/categories/53789/edit` (normale IDs, `record.mjs` prüft gegen `prepare_team.py`; nach `sync_prod_to_test.sh` nachziehen).

## Faktenbelege (Code, 2026-10-20)
- Speichern startet keine Übersetzung: `pundo_main_backend/ingestor/api/admin/products.py` (create/PATCH ohne Dispatch).
- Automatisch nach Shop-Katalog-Import: `ingestor/ingestion/catalog_import/jobs.py:330` → `ingestor/translation/auto_dispatch.py`; sonst CLI `ingestor/scripts/translate_products.py`. Ob auf Hetzner ein Cron `translate_products` ruft, ist **nicht geprüft** (außerhalb des Repos).
- Handler überschreibt nie: `ingestor/lib/translation_handler.py:12-13` (Docstring Schritt 5) und `:159-166` („Merge names — do not overwrite existing (human-curated) translations“, nur `lang not in existing_names`); Beschreibungen `:168-179` (nur fehlende oder leere Slots).
- PATCH merged je Sprache, leerer String entfernt die Sprache, der letzte Name bleibt: `ingestor/api/admin/products.py:130-137` (Commit `4fc3f44`). Formular: `src/components/system-admin/ProductForm.tsx` (`name_<lang>`, `collect()`), Commit `7c0e82c`.
- Kategorien: `PUT /admin/categories/{id}/translations` (`CategoryForm.tsx`); `ingestor/taxonomy/seed_taxonomy.py:15-18, 47-54, 265-268`: Namen bleiben, außer mit `--overwrite-names` (B5900-033). Ob Prod den Stand hat: O4 offen, Video sagt „still being checked“.
- Kein Herkunftsmarker: F5983 (Idee, niedrige Priorität). SOP-Texte `products`/`translations` in `src/lib/system-admin-help-content.ts:132-202` sind mit dem Video deckungsgleich (inkl. „A later rework of generated translations could overwrite manual edits“).

## Datenschutz-QA
- Strikte Schranke 3500/8500; Privacy-Check je Szene: **5 von 5 ok** (0 fremde E-Mails, 0 Passwortfelder; sichtbar nur e2e-admin@pundo-e2e.io). 0 Seitenfehler. Echte Seiten zeigen nur Demo-Daten (kein Listenframe, keine Maske nötig). Marken-/Kategorie-`<select>` nie geöffnet. Das Speichern der Kategorie wird vor dem Klick eingefroren; die Kategorieliste (Weiterleitung) erscheint nie.
- Sichtprüfung: 3-fps-Bogen über die ganze Kategorie-Szene (nur Formularframes, kein Listenframe) und Einzelframes der Grafiken; **kein 6-fps-Bogen dieses Mal** (frühere Aufnahme: 6 fps um den Speichern-Klick, gleicher Ablauf). Der Klick-Frame ist per Freeze vor dem Klick abgesichert.

## Layout (ehrlich)
Desktop-Rahmen korrekt, Grafiken im Fenster lesbar, untere Fensterhälfte der Grafiken bleibt leer (Kette: nur 2 von 5 Kästen im Mittelframe, erscheinen nach dem Sprechtext Schritt für Schritt). Schrift der echten Seiten klein. Aussprache nicht gehört („translation script“ statt Dateiname gesprochen). EL ungeprüft.
