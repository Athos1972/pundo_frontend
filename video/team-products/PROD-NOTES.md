# team-products: Produktionsnotizen (Stand 2026-10-20, neu geschnitten: nur Produkte)

Team-Video 4 „Maintaining products“ (F8960 T20, Thema `products`). Entscheidung BB 2026-10-20: Kategorien und Marken stehen in Video 3b (`team-catalog-basics`), Video 4 deckt nur Produkte ab, damit bei Änderungen an Kategorien/Marken nur das kurze Video angefasst wird. EN-Stimme, EN-Untertitel eingebrannt, EL nur `.el.srt`. **Kanal „pundo Team“, nicht gelistet, nicht neu hochgeladen** (`youtubeId` in `registry.json` ist noch die der alten Fassung). Status: **Entwurf** (EN-Text nicht freigegeben, EL nicht gegengelesen, F8960 O3).
Struktur: Find products (Suche Name/Marke/Barcode, „Add new“) → Create a product (Namen je Sprache, Slug, Barcode, Marke + Kategorie über die Such-Combobox, Save) → Save and check (Liste, Team-Lead bei Dubletten) → Edit a product (andere Sprachen bleiben, Feld leeren = Sprache weg, Attribute) → Abschluss mit Verweis auf 4b.

## Ergebnis
| Größe | Wert |
|---|---|
| Dateien | `out/team-products.en.mp4` (1920×1080, 30 fps, 9,6 MB), `out/upload.en.mp4` (5,4 MB, libx264 crf 27 preset slow, aac 128k, faststart), `.en.srt` (29 Cues), `.el.srt` (41 Cues), `thumbnail.en.png` |
| Dauer | 147,7 s (2:28), verify_output.py OK |
| Kapitel (alle ≥ 10 s) | 0:00 Find products · 0:32 Create a product · 1:07 Save and check · 1:32 Edit a product |

## Bauen
`npm run dev:test` (:3500, frisch gestartet), Backend :8500, dann `video/build.sh team-products en --rerecord`; danach Dev-Server beenden. Kein Gate/E2E parallel (der Recorder bricht bei aktivem E2E-Lock ab; ein Lauf der anderen Session hat einen Versuch gestört, der Rerun war sauber). Narrations-Anker in `record.mjs` über `when(szene, "Satzanfang")`. **Kein `;` im Sprechtext.**

## Testdaten / Demo-IDs
Unverändert: Marke 5532, Kategorie 53789, Item 329578; `record.mjs` bricht ab, wenn die Adresszeile der Edit-Szene nicht zur `prepare_team.py`-Ausgabe passt. Nach einem `sync_prod_to_test.sh` IDs in `scenes.yml` nachziehen. Das Video legt „Team Demo Rye Bread“ an (Barcode `2099900000023`; `prepare_team.py` löscht es beim nächsten Lauf) und hängt „ 500 g“ an den EN-Namen des Demo-Brots (Upsert setzt zurück). Beleg im Lauf (per API): Brot hat danach `ar,de,el,en,he,ru`, EN endet auf „500 g“. `prepare_team.py` nicht geändert.

## Faktenbelege (Code)
- Formular: `src/components/system-admin/ProductForm.tsx`: `name_<lang>`/`description_<lang>` je Sprache, mindestens ein Name (`validate()`), Slug Pflicht, Barcode `^\d{8,14}$`, `collect()` sendet geleerte Sprache als `''` (Backend entfernt sie, letzter Name bleibt), Marke/Kategorie = `Combobox` mit `loadItems` und serverseitiger Suche (`searchAdmin`, Limit 50, Debounce 250 ms in `Combobox.tsx`; Commit 6e9a1c1).
- SOP `products` (`src/lib/system-admin-help-content.ts`) deckt den Sprechtext; der Slug steht dort nicht (das Video nennt ihn in einem Satz, weil das Formular ohne Slug nicht speichert). SOP nicht geändert.

## Datenschutz-QA
- Strikte Schranke 3500/8500; Privacy-Check je Szene: **5 von 5 `privacy ok`** (0 fremde E-Mails, 0 Passwortfelder; sichtbar nur e2e-admin@pundo-e2e.io). 0 Seitenfehler.
- Produktliste: alle Zeilen ohne „Team Demo“ (inkl. Barcode-Spalte) per MutationObserver-Init-Script vor dem ersten Paint unscharf. **Neu:** Dropdown-Einträge (`role=option`) der Marken-/Kategorie-Combobox ohne „Team Demo“ ebenfalls unscharf (die ungefilterte Startliste zeigt echte Einträge, bis die getippte Suche sie auf die Demo-Einträge einengt). Native Listen kommen nicht mehr vor.
- Prüfung: 6-fps-Frames der Dropdown-Phase (Marke + Kategorie) einzeln gesichtet: ein verwaschener Balken (echter Treffer) + Demo-Eintrag, kein lesbarer echter Name; OCR über 15 fps der Dropdown-Phase (0:50 bis 1:04): nur UI-Wörter, Demo-Daten und Rauschen aus unscharfen Zeilen; OCR über 6 fps der Listenabschnitte (0:00 bis 0:32, 1:07 bis 1:32, 1:58 bis 2:28): keine lesbare Echtzeile. Zustände unter 1/15 s nicht einzeln gesichtet (Blur greift vor dem Paint).

## Layout (ehrlich)
Adresszeile je Szene eine Seite, korrekt (Suchparameter fehlen in der Leiste). Schrift im Fenster klein (ca. 12 px). Das lange Formular scrollt in der Create-Szene; die Seitenleiste ist beim gescrollten Formular leer (nur „Sign out“ sichtbar, weil sie mit der Seite mitscrollt). Das Dropdown ragt aus dem kurzen Fenster, daher wird nach dem Öffnen ganz nach unten gescrollt (Einträge vollständig sichtbar). Der Pfad-Untertitel der Demo-Kategorie im Dropdown zeigt Taxonomie-Codes (`86000000 > … > px-cooking`), keine Echtdaten. Die Hilfetexte unter dem Slug-Feld nennen „royal-canin-adult“ als Beispiel (Produkt-UI-Text). Aussprache nicht gehört; EL ungeprüft.

## Pipeline
Keine Pipeline-Dateien geändert (nur `team-products/*`, `registry.json`), kein Regressionsvergleich.
