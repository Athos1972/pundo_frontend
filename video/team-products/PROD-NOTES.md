# team-products: Produktionsnotizen (Stand 2026-10-20, neu aufgenommen nach B8000-003/B8200-004)

Team-Video 4 „Maintaining products“ (F8960 T20, Thema 4). EN-Stimme, EN-Untertitel eingebrannt, EL nur `.el.srt`. **Kanal „pundo Team“, nicht gelistet, nicht hochgeladen.**
Status: **Entwurf** (EN-Text nicht freigegeben, EL nicht von Muttersprachler:in gelesen, F8960 O3). Reihenfolge/Begriffe folgen der SOP `products` in `src/lib/system-admin-help-content.ts`. Übersetzungen (Thema 4b) sind nur kurz erwähnt, am Ende Hinweis „Next: how translations come about“.

## Ergebnis
| Größe | Wert |
|---|---|
| Dateien | `out/team-products.en.mp4` (1920×1080, 30 fps, 12,6 MB), `out/upload.en.mp4` (7,0 MB, libx264 crf 27), `.en.srt` (40 Cues), `.el.srt` (60 Cues), `thumbnail.en.png` |
| Dauer | 213,4 s (3:33) |
| verify_output.py | OK |
| Kapitel (alle ≥ 10 s) | 0:00 Search first · 0:36 Create a product · 1:16 Save and check · 1:44 Edit a product · 2:21 Brands · 2:43 Categories |

## Bauen
`npm run dev:test` (:3500), Backend :8500, dann `video/build.sh team-products en [--rerecord]`; danach Dev-Server beenden. Kein Gate/E2E parallel.

## Testdaten
- Das Video legt „Team Demo Rye Bread“ an (Name, Slug, Marke, Kategorie); `prepare_team.py` löscht es zu Beginn jedes Laufs (Slug + EN-Name + source admin).
- Bearbeitet wird „Team Demo Sourdough Loaf“ (Name + „ 500 g“); der Upsert in `prepare_team.py` setzt Namen (EN+EL) zurück.
- **Demo-Marke id 1, Demo-Kategorie id -1 bleiben bewusst** (einmalig verschoben, idempotent). Nach B8200-004 nicht mehr nötig, aber ein Zurückziehen würde die gemeinsame `prepare_team.py` und die Adresszeile `/admin/categories/-1/edit` von team-translations ändern: kein Nutzen, also belassen. Löschen wird nie ausgeführt (kein Klick auf „Delete“); „Add new“ in Marken wird nur überfahren.

## Befunde im Produkt (Stand 2026-10-19; 1 und 3 sind inzwischen behoben)
**Behoben (lokal, uncommittet/unveröffentlicht je nach Stand):** Befund 1 durch Frontend `e28545e` (`getAll*` blättert durch alle Seiten), Befund 3 durch `e28545e` + Backend `4fc3f44` (Merge-PATCH). Das Video zeigt jetzt Verhalten, das mit echten Marken/Kategorien funktioniert; das Marken-Dropdown wird weiter nie geöffnet.

1. **Admin-Produktformular/-liste laden nur die ersten 1000 Marken/Kategorien (nach id):** `getAllBrands()`/`getAllCategories()` in `src/lib/system-admin-api.ts` mit `limit: 1000`; `pundo_test` hat 2074 Marken und 8508 Kategorien. Folgen: Marken mit Rang > 1000 sind im Formular nicht wählbar; die ersten 1000 Kategorien sind laut Stichprobe nur Dienstleistungs-Kategorien (Landwirtschaft, Business …), Produktkategorien fehlen; in der Produktliste erscheinen für alle anderen Zeilen rohe Zahlen statt Marken-/Kategoriename. Die Demo-Daten wurden deshalb in das Fenster gelegt, damit das Video den Ablauf zeigen kann. **Das Video zeigt also etwas, das mit echten Marken/Kategorien aktuell nicht funktioniert.** Vor Veröffentlichung Bug klären (Pagination/Suche per API im Formular). Kategoriebaum zeigt zusätzlich die Warnung „truncated“ (1000 von 8508), im Video nicht sichtbar, weil gescrollt/gefiltert.
2. **Kein Quellsprachen-Auswahlfeld:** `ProductForm` speichert den Namen immer als `names: { en: … }` (SOP sagt „in der Sprache, die Sie am besten kennen“). Narration sagt daher nur „keine Sprachauswahl, der Name ist der Quelltext“. ⚠️ ANNAHME: gewollt.
3. **Speichern überschreibt `names` komplett:** `PATCH` setzt `names` auf `{en}` (Backend `setattr`), vorhandene EL/DE/… Namen gehen verloren, bis die Übersetzung neu läuft. Beim Demo-Brot wird das durch den Upsert zurückgesetzt. Für echte Produkte relevant (Datenverlust-Risiko), mit Thema 4b klären.
4. Attribute gibt es erst auf der Bearbeiten-Seite (nicht beim Anlegen); Barcode/EAN ist im Formular nicht vorhanden, Suche im Video deshalb nur nach Name/ID.

## Datenschutz-QA (AK 13)
- Strikte Schranke 3500/8500; Privacy-Check je Szene: **6 von 6 `privacy ok`** (0 fremde E-Mails, 0 Passwortfelder; sichtbar nur e2e-admin@pundo-e2e.io in der Seitenleiste). 0 Seitenfehler.
- Alle Tabellenzeilen ohne „Team Demo“ (Produkte, Marken) per MutationObserver-Init-Script vor dem ersten Paint unscharf. Kategoriebaum = Taxonomie, lesbar (keine Personen-/Produkt-/Markennamen). Das native Marken-`<select>` wird nie geöffnet (würde echte Marken listen); gewählt wird per `selectOption`.
- Sichtprüfung: 3-s-Kontaktbogen über das ganze Video; 6-fps-Bögen an Start Produktliste (find), Save → Liste (saved), edit → Marken, Start Marken: keine lesbare Echtzeile, nur unscharfe Zeilen und Logo-Flecken. Zwischenzustände < 1/6 s nicht einzeln gesichtet; Kategorie-Combobox nicht in 6-fps gesichtet (nur Taxonomie).

## Layout (ehrlich)
- Adresszeile je Szene eine Seite, korrekt (Suchparameter fehlen in der Leiste). Schrift im Fenster klein (ca. 12–13 px). Szenenende friert auf dem Klick ein, danach Überblendung. Aussprache nicht gehört. Die Szene „categories“ dauert 38,6 s (mit Ausblick auf 4b); Kategoriebaum zeigt im Moment der Suche die Standardansicht (Dienstleistungs-Kategorien).
- Brands-Szene: Überleitung zu „Categories“ per Seitenleistenklick am Szenenende.

## Pipeline
Keine Pipeline-Dateien geändert, daher kein Regressionsvergleich.

## Neuaufnahme 2026-10-20
- Sprechtext an SOP `products` (EN/EL) angeglichen: „Save“ erzeugt keine anderen Sprachen sofort, Übersetzungslauf später; Name auf Englisch; alle Marken/Kategorien wählbar; Warnung „bei geänderter EN-Fassung Team-Lead informieren“ (andere Sprachen bleiben, werden nicht aktualisiert). Entfernt: „appear after a short time“, „reword this source text and save again“.
- Edit-Szene umgebaut: Warnsätze vor „Then click Save“, Zeiger auf dem Namensfeld; Save-Klick am Szenenende.
- Backend 8500 war vor der Aufnahme veraltet (Start 03:23, Commit `4fc3f44` 08:19): Test-PATCH verlor `el` (Beleg), nach Neustart (`start_test_server.sh`, nur 8500) blieb `el` erhalten. Nach der Aufnahme per API geprüft: Demo-Brot hat `{el, en: "… 500 g"}`.
- Datenschutz: je Szene 6/6 `privacy ok`, 0 Seitenfehler. 6-fps-Bögen (find 0–32 s, saved, brands) gesichtet: nur Demo-Zeilen lesbar (Brands-Liste: Demo-Marke id 1 lesbar, übrige unscharf), keine Echtzeile. Kategoriebaum = Taxonomie. Edit-Szene und Kategorie-Combobox nicht in 6 fps gesichtet.
- Layout: unverändert wie oben; Aussprache nicht gehört; EL ungeprüft (Cues satzgenau, 60).
