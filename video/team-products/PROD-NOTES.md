# team-products: Produktionsnotizen (Stand 2026-10-20, neu strukturiert nach B8000-003/-004)

Team-Video 4 „Maintaining categories, brands and products“ (F8960 T20, Thema 4). EN-Stimme, EN-Untertitel eingebrannt, EL nur `.el.srt`. **Kanal „pundo Team“, nicht gelistet, nicht hochgeladen.** Status: **Entwurf** (EN-Text nicht freigegeben, EL nicht von Muttersprachler:in gelesen, F8960 O3).
Struktur (Entscheidung BB, Abhängigkeitsfluss): Kategorien (Baum, Demo-Kategorie öffnen, Russisch eintragen, Verweis auf 4b) → Marken (suchen, „Add new“ nur überfahren) → Produkte (Suche Name/Marke/Barcode, anlegen mit Namensfeldern je Sprache + Barcode + Marke + Kategorie, Speichern prüfen, bearbeiten: andere Sprachen bleiben, Team-Lead bei Bedeutungsänderung) → Ausblick auf 4b.

## Ergebnis
| Größe | Wert |
|---|---|
| Dateien | `out/team-products.en.mp4` (1920×1080, 30 fps, 15,3 MB), `out/upload.en.mp4` (8,3 MB, libx264 crf 27 preset slow, aac 128k, faststart), `.en.srt` (44 Cues), `.el.srt` (70 Cues, satzgenau: Satzzahl je Szene = gesprochene Sätze, per `subtitles.sentence_spans` geprüft), `thumbnail.en.png` |
| Dauer | 237,3 s (3:57) |
| verify_output.py | OK |
| Kapitel (alle ≥ 10 s) | 0:00 Categories · 0:53 Brands · 1:15 Find products · 1:42 Create a product · 2:26 Save and check · 2:55 Edit a product |

## Bauen
`npm run dev:test` (:3500), Backend :8500, dann `video/build.sh team-products en --rerecord`; danach Dev-Server beenden. Kein Gate/E2E parallel. Narrations-Anker in `record.mjs` über `when(szene, "Satzanfang")` (Wortzeiten aus `.cache/en/audio`). **Kein `;` im Sprechtext** (der Satzteiler von `subtitles.py` trennt daran, sonst stimmt die EL-Satzzahl nicht).

## Testdaten / Demo-IDs
- **Demo-IDs zurückgenommen:** Marke und Kategorie liegen wieder auf normalen IDs (Marke 5532, Kategorie 53789, Item 329578; `prepare_team.py::_ensure_normal_ids` verschiebt einmalig von 1 / -1 und bricht ab, wenn irgendeine andere Tabelle auf die alte ID zeigt; vor dem Umzug geprüft: nur Item + 3 Übersetzungen). Die IDs stehen im JSON von `prepare_team.py`; `record.mjs` bricht ab, wenn die Adresszeilen in `scenes.yml` (`/admin/categories/53789/edit`, `/admin/products/329578/edit`) nicht dazu passen. Bei einem `sync_prod_to_test.sh` (Demo-Daten weg, neue IDs) die IDs in beiden `scenes.yml` nachziehen.
- Demo-Produkt „Team Demo Sourdough Loaf“ hat jetzt Namen in allen 6 Sprachen, Beschreibung EN/DE und den fiktiven Barcode `2099900000015`; das Video legt „Team Demo Rye Bread“ (Barcode `2099900000023`) an; `prepare_team.py` löscht es zu Beginn jedes Laufs. Bearbeitet wird der EN-Name des Brots (+ „ 500 g“) und die RU-Fassung der Demo-Kategorie; der Upsert setzt alles zurück. Gelöscht wird nie.
- Belege nach dem Speichern (im Lauf per API geprüft, nicht im Bild): Brot hat danach `ar,de,el,en,he,ru`, EN endet auf „500 g“ (andere Sprachen blieben).

## Befunde im Produkt
1. **Marke anlegen schlägt fehl (nicht behoben, außerhalb des Auftrags):** `BrandForm.tsx` sendet `{names, logos, homepages}` ohne `slug`; `POST /api/v1/admin/brands` verlangt `slug` (`AdminBrandCreate`, `ingestor/schemas/admin.py:551`) und antwortet 422 (per API belegt: `Field required, loc body.slug`). Das Video überfährt „Add new“ nur und sagt „create it with its name“. **Vor Veröffentlichung klären** (Bug-Datei fehlt noch).
2. Attribute gibt es erst auf der Bearbeiten-Seite (nicht beim Anlegen).

## Datenschutz-QA (AK 13)
- Strikte Schranke 3500/8500; Privacy-Check je Szene: **8 von 8 `privacy ok`** (0 fremde E-Mails, 0 Passwortfelder; sichtbar nur e2e-admin@pundo-e2e.io in der Seitenleiste). 0 Seitenfehler.
- Alle Tabellenzeilen ohne „Team Demo“ **auf den Listenseiten /admin/products und /admin/brands** (inkl. Barcode-Spalte, Logos) per MutationObserver-Init-Script vor dem ersten Paint unscharf. **Korrektur während der Aufnahme:** die erste Fassung maskierte jede `tbody tr`, also auch die Übersetzungstabelle der Kategorie (Szene unlesbar); die Maske gilt jetzt nur auf den beiden Listen-Pfaden. Kategoriebaum = Taxonomie, lesbar. Das Marken-`<select>` und die Eltern-Kategorie-`<select>` werden nie geöffnet (Auswahl per `selectOption`).
- Sichtprüfung: 3-s-Kontaktbogen über das ganze Video; **6-fps-Bögen** (ca. 14–16 s je Szenenanfang) für find, brands, saved, wrap und catname: bis zur Suche nur unscharfe Zeilen, danach nur Demo-Zeilen; keine lesbare Echtzeile, kein lesbarer echter Barcode. Tree-Szene (Suche im Baum) und create/edit (Formulare ohne Listen) nur im Kontaktbogen und per Szenenmitte-Frame gesichtet; Zwischenzustände < 1/6 s nicht einzeln.

## Layout (ehrlich)
Adresszeile je Szene eine Seite, korrekt (Suchparameter fehlen in der Leiste). Schrift im Fenster klein (ca. 12–13 px). Das Formular ist lang (6 × Name + Beschreibung): die Szenen create/edit scrollen mit Zeiger, in der Szenenmitte sind die Felder lesbar, Slug/Barcode/Marke/Kategorie erscheinen erst nach dem Scrollen. Szenenende friert auf dem Klick ein, danach Überblendung. Szene create ist mit 44 s die längste. Dauer 3:57, knapp unter der 4-Minuten-Grenze. Aussprache nicht gehört; EL ungeprüft.

## Pipeline
Keine Pipeline-Dateien geändert (nur `team-common/prepare_team.py`, `team-products/*`), kein Regressionsvergleich.
