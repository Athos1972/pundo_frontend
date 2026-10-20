# team-catalog-basics: Produktionsnotizen (Stand 2026-10-20)

Team-Video 3b „Catalog basics: categories and brands“ (F8960, Thema `catalog-basics`). Kurz (2:38), Konzepte statt Feldlisten. EN-Stimme, EN-Untertitel eingebrannt, EL nur `.el.srt`. **Kanal „pundo Team“, nicht gelistet, nicht hochgeladen.** Status: **Entwurf** (EN-Text nicht freigegeben, EL nicht gegengelesen, F8960 O3). Video 4 (Produkte) wird danach separat auf Produkte gekürzt (nicht Teil dieses Auftrags).

## Ergebnis
| Größe | Wert |
|---|---|
| Dateien | `out/team-catalog-basics.en.mp4` (1920×1080, 30 fps, 9,2 MB), `out/upload.en.mp4` (5,1 MB, libx264 crf 27 preset slow, aac 128k, faststart), `.en.srt` (28 Cues), `.el.srt` (45 Cues), `thumbnail.en.png` |
| Dauer | 157,8 s (2:38), verify_output.py OK |
| Kapitel | 0:00 Categories · 1:11 Brands · 1:32 A new brand · 1:54 Edit a brand |

## Bauen
`npm run dev:test` (:3500), Backend :8500, dann `video/build.sh team-catalog-basics en --rerecord`; danach Dev-Server beenden. Kein Gate/E2E parallel. Kein `;` im Sprechtext. Szenen: tree, catname (deutscher Name getippt und gespeichert, eingefroren vor dem Klick), brands (Suche, „Add new“), newbrand (Marke „Team Demo Brand Two“ angelegt, Slug automatisch), brandlist, brandedit (nur angesehen, Save nur überfahren).
`prepare_team.py` löscht „Team Demo Brand Two“ am Anfang jedes Laufs (exakter Slug + Name + source NULL + kein Item darauf); Löschfunktion am 2026-10-20 getestet (removed_from_last_run: 1). Brand-ID in der Adresszeile (5532) und Kategorie-ID (53789) prüft `record.mjs` gegen die prepare-Ausgabe; nach `sync_prod_to_test.sh` nachziehen.

## Faktenbelege (Code, 2026-10-20)
- Slug-Feld nur beim Anlegen, aus dem Namen vorbelegt (a-z, 0-9, Bindestrich), editierbar; PATCH ohne Slug: `src/components/system-admin/BrandForm.tsx` (`toSlug`, `!isEdit`, `...(isEdit ? {} : { slug })`), B8100-001, Commit `91cfb9b`, Test `src/tests/brand-form-slug.test.tsx`. Slug eindeutig: `pundo_main_backend/ingestor/models/brand.py:21-24`. Backend verlangt `slug` beim Anlegen: `ingestor/schemas/admin.py:551-553`.
- Kategorienamen je Sprache: `PUT /admin/categories/{id}/translations` über `CategoryForm.tsx`; kein Job überschreibt sie, nur ein von Hand gestarteter Seed mit `--overwrite-names`: `ingestor/taxonomy/seed_taxonomy.py:15-18, 47-54, 265-268` (B5900-033). Prod-Stand O4 offen, daher „still being checked“.
- SOP: `src/lib/system-admin-help-content.ts` Thema `catalog-basics`; Verweis aus `products` Schritt 3.

## Datenschutz-QA
- Strikte Schranke 3500/8500; Privacy-Check **6 von 6 Szenen ok** (0 fremde E-Mails, 0 Passwortfelder). 0 Seitenfehler.
- Echte Kategorien und Marken nie lesbar: Init-Skript blurt Tabellenzeilen der Marken-Liste ohne „Team Demo“ und alle Zeilen des Kategorienbaums ohne „Team Demo“ vor dem ersten Paint; die Eltern-Kategorie-Auswahl der Kategorie-Bearbeitung (zeigt einen echten Namen) ist unscharf. Native Listen und die Combobox des Produktformulars werden nie geöffnet (Produktformular komplett weggelassen).
- Prüfung: OCR (tesseract) über 6-fps-Vollvideo und 15-fps-Fenster um alle Listen- und Szenenübergänge (Marken-Liste, Baum, Crossfades): nur UI-Wörter, Demo-Daten und OCR-Rauschen, kein echter Marken-/Kategoriename; zusätzlich Sichtprüfung der Übergangsframes (Crossfade catname→brands, Liste nach dem Speichern, Baum). Kein Frame mit lesbaren Echtdaten gefunden.

## Layout (ehrlich)
Desktop-Rahmen und Adresszeile je Szene korrekt (categories / …/53789/edit / brands / brands/new / brands / brands/5532/edit). Die Baum-Szene zeigt einen großen unscharfen Block (bewusst), der Banner „Showing first 1000 of …“ bleibt lesbar. In catname scrollt die Seite beim Überfahren von „Save“ minimal, die Überschrift sitzt dann an der Oberkante. Schrift der echten Seiten klein. Aussprache nicht gehört. EL ungeprüft. Kein Produktformular-Combobox-Bild (Entscheidung: weggelassen).
