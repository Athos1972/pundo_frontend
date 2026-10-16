# catalog-import: Produktionsnotizen (Stand 2026-10-16)

Tutorial #12, **Teil 9** von „pundo for businesses“: „Import your whole catalogue at once“ (EN 1:58, EL 2:04). Freigegebenes DE-Skript: `01-skript.de.md`.
Short: `../short-catalog-import/` (EN 0:30, EL 0:33). Neu gebaut 2026-10-16 mit Produktfotos und echtem Google Sheet; noch nicht freigegeben, nicht hochgeladen, nichts committet.

## Dateien
| Datei | Inhalt |
|---|---|
| `scenes.yml` | meta (`demo.files`, `demo.sheet_url`, `demo.share_card` je Sprache, `thumbnail_scene: hook`, `timing.tail_s: 1.6`) + 8 Szenen EN/EL |
| `record.mjs` | Ablauf siehe Szenen; Labels direkt aus `src/lib/i18n/shop-admin-{import,catalog}.ts` (Node 26 entfernt die TS-Typen). Tabellenansicht = statisches HTML aus `catalog-data.json` (`page.setContent`, Schnitte per `sess.pause()/resume()`) |
| `photo-urls.json`, `photos/` | Drive-IDs je SKU (BB, Draw Things) bzw. lokale Kopien; `image_url` = `https://drive.google.com/uc?export=download&id=<ID>` |
| `niko-sheet.csv` | lokale Kopie des öffentlichen Test-Sheets (Stand nach Szene 5, 23 Zeilen) |
| `catalog-data.json` | SSOT der 24 Demo-Artikel (inkl. `image_url`) (Messer/Multitools, Lampen, Zelte, Schlafsäcke, Erste Hilfe, Wasserfilter, Powerbanks, Kocher, Seil), Fehlerzeile, Update-Änderungen |
| `make_catalog_files.py` | baut `niko-catalog.xlsx` (Zeile 14 Preis „2,5O“), `niko-catalog-fixed.xlsx`, `niko-catalog-update.xlsx` (Kocher 27.90 → 24.90, Sommerschlafsack entfernt). Spalten = Vorlage (`sku, name, language, ean, category, available, price, currency, image_url`) |
| `prepare_catalog_import.py` | Backend-venv, **nur pundo_test** (bricht sonst ab). Legt beide Demo-Shops + Owner an bzw. setzt sie zurück (Listings, Offers, eigene `shop_upload`-Items, Import-Previews/-Runs/-Status inkl. Sheet-Link, Auto-Assign-Skips), legt Zweit-Shop „Outdoor Supplier (demo)“ (inaktiv) mit Katalog-Artikel „Victorinox Huntsman Pocket Knife“ an und prüft mit der Import-eigenen Ähnlichkeitssuche, dass **nur** die Victorinox-Zeile ein Duplikat ist (88 %) und die Vorschlagszeilen eine Kategorie bekommen. `--dry-run` = ROLLBACK |
| `.recording-accounts.json` | Zugangsdaten der beiden Demo-Owner (gitignored, vom Prepare erzeugt) |

Demo-Shops: `niko-s-survival-shop` „Niko's Survival Shop“ (EN) und `to-katastema-epiviosis-tou-nikou` „Το κατάστημα επιβίωσης του Νίκου“ (EL), Ermou 50, Larnaca, freigeschaltet. **Beide** werden bei jedem Lauf zurückgesetzt, weil beide Sprachen dieselbe Datei importieren (Reste der anderen Sprache würden jede Zeile zum Duplikat bzw. per EAN zur Verknüpfung machen).

## Bauen
```
cd ~/dev/github/pundo_frontend && node scripts/e2e-frontend.cjs start      # Standalone-Build :3500 (kein next dev)
# LLM-Gateway Testinstanz :8600 ohne Worker (sonst fehlt die Übersetzungszeile im Ergebnis, s. u.):
cd ~/dev/github/pundo_llm_gateway && DATABASE_URL=<DATABASE_URL_TEST aus .env> INTERNAL_API_KEY=test-key .venv/bin/uvicorn gateway.main:app --port 8600
video/build.sh catalog-import [en|el] [--rerecord]
video/build.sh short-catalog-import [en|el] [--rerecord]
```
Upload-Dateien (> 10 MB) neu kodiert: `out/yt/catalog-import.{en,el}.mp4` (`libx264 -crf 23 -preset slow`; EN Ton kopiert, 9,4 MB; EL Ton AAC 128k, 9,0 MB, mit kopiertem Ton waren es 10,07 MB).

## Abweichungen vom Skript / Befunde
1. **Google Sheets (echt):** öffentliches Test-Sheet von BB (`demo.sheet_url`, Inhalt = Stand nach Szene 5). Szene 6: Karte „Share → Anyone with the link: Viewer“ → Link einfügen → „Connect“ → „Last sync … · OK“, 0 New / 0 Updated / 0 not available / 0 Errors (Backend meldet 23 unverändert, Sync ~1 s). Vorher gegen 8500 geprüft. `record.mjs` entfernt die Verknüpfung nach der Aufnahme per API, `prepare_catalog_import.py` beim nächsten Lauf ebenfalls. Achtung: ein Sheet gilt immer als komplette Liste; weicht sein Inhalt ab, werden Niko-Artikel deaktiviert.
1a. **Produktfotos:** `image_url` in allen drei Dateien und in der Tabellenansicht (Spalte I). Der Import lädt die 24 Drive-Bilder im Hintergrund nacheinander (~40–50 s). `record.mjs` wartet am Ende von Szene 4 nach „Go to my offers“ darauf (`untimed()`: Bild eingefroren, die Wartezeit wird danach aus `frames.json` herausgeschnitten), lädt die Angebotsliste neu und zeigt sie mit Fotos; Szene 7 zeigt die Kundenseite mit Fotos. Der Short wartet im Prep der Kundenszene. Der Katalog-Artikel „Victorinox Huntsman Pocket Knife“ startet ohne Foto (Prepare löscht dessen Fotos), Nikos Import ergänzt es. Jeder Lauf legt 24 neue Bilddateien im Backend-Bildspeicher (pundo_test) an; die DB-Einträge verschwinden mit den Items beim nächsten Reset.
2. **Übersetzungszeile braucht das Gateway:** ohne laufendes Test-Gateway (:8600) überschreibt das Backend `translation_queued` mit 0 und die Zeile „… werden in alle Sprachen übersetzt“ fehlt. Für die Aufnahmen wurde die Gateway-Testinstanz kurz gestartet (ohne Worker, `worker.prod.yml` unberührt) und danach gestoppt; die `translate.item`-Jobs (23 je Lauf) liegen in `pundo_llm_gateway_test`.
3. **Zahlen im Bild** (echt, statt Platzhalter im Skript): Hook 23 Neu · 1 Mögliches Duplikat · 0 Fehler; Szene 2 22 Neu · 1 Duplikat · 1 Fehler; Duplikat „88 % similar“ (Skript „9x %“); Ergebnis „24 new · 1 linked to existing catalogue articles · 23 new articles are being translated“.
4. **„Weitere Datei hochladen“** gibt es in einer Vorschau mit Fehlern nicht → Szene 3 tippt „Cancel“, korrigiert in der Tabelle und lädt die korrigierte Datei hoch.
5. **Kategorie-Vorschläge (B5900-031):** Das laufende Backend :8500 (Start 08:56) schlägt schwächer vor als der aktuelle Working Tree (eine andere Session ändert `category_picker.py`, uncommitted). Getestet gegen :8500 sind nur zwei Vorschläge plausibel → ohne `category` in der Datei: „Mummy Sleeping Bag“ → Sleeping Bags (im Bild), „Gas Camping Stove“ → Portable Cooking Stoves. Der Prepare-Check nutzt den Working-Tree-Code; `record.mjs` loggt die Vorschlagszeile aus der echten Vorschau.
6. **Sprechtext „barcode“ statt „EAN“** (EN/EL), damit die TTS-Stimme kein „Ean“ spricht; inhaltlich gleich.
7. Artikelnamen in beiden Sprachen englisch (`language = en`, Markenartikel); die EL-Kundenseite zeigt daher englische Namen, Kategorien und UI griechisch.
8. Szene 1 zeigt statt der leeren Vorlage gleich Nikos ausgefüllte Datei (gleiche Spalten).
9. Szene 3 („errors“) läuft ~2,5 s länger als der Sprechtext (stilles Halten nach „fertig“); `meta.timing.tail_s: 1.6` für mehr Luft zwischen den Schritten.
10. UI-Beobachtung: die Vorschau zeigt Preise ohne zweite Nachkommastelle („54.9 EUR“, „149 EUR“). Kundenseite korrekt („54.90 EUR“).
11. Thumbnail: Badge „Free · ≤ 5 min“ kommt aus dem Brand-Default und passt nur bedingt zum Import-Thema.

## Kapitelmarken (aus `.cache/<lang>/compose.json`, alle ≥ 10 s)
| EN | EL |
|---|---|
| 0:00 Intro | 0:00 Εισαγωγή |
| 0:14 Template & columns | 0:15 Πρότυπο και στήλες |
| 0:27 Upload & preview | 0:28 Ανέβασμα και προεπισκόπηση |
| 0:39 Fix errors | 0:42 Διόρθωση λαθών |
| 0:54 Duplicates & apply | 0:57 Διπλότυπα και εφαρμογή |
| 1:08 Update later | 1:12 Ενημέρωση αργότερα |
| 1:26 Google Sheets | 1:30 Google Sheets |
| 1:39 What customers see | 1:44 Τι βλέπουν οι πελάτες |

## Beschreibung EN
Titel: **Import your whole catalogue at once**
```
Hundreds of items? Don't type them in one by one. Upload your Excel or CSV list to pundo, check the preview, fix errors, decide on duplicates and apply. Later, upload the same list again to update prices, or connect a Google Sheet that syncs every 4 hours.

0:00 Intro
0:14 Template & columns
0:27 Upload & preview
0:39 Fix errors
0:54 Duplicates & apply
1:08 Update later
1:26 Google Sheets
1:39 What customers see

Only the "name" column is required. With your own article number (sku), barcode (EAN) and price, pundo recognises every item when you upload the list again: no duplicates, and with "This file is my complete list" missing items are set to "not available", never deleted.

Start here: https://pundo.cy/shop-admin

pundo for businesses (series):
Part 1: Sign up your shop https://youtu.be/ojwtm1-a12c
Part 2: Your first 10 minutes https://youtu.be/5o_DmqJxPJA
Part 3: Add your first product https://youtu.be/bMvFGnlSPK4
Part 4: Add a product that's already on pundo https://youtu.be/sgnLYIeMkOk
Part 5: Add your services https://youtu.be/mZZliUsNsC8
Part 6: Add a service that's already on pundo https://youtu.be/OJY0ic_m1bk
Part 7: Prices, bulk discounts & promotions https://youtu.be/3gFK37esaIE
Part 8: Keep your shop profile up to date https://youtu.be/diyI6i8TI04
Part 9: Import your whole catalogue at once (this video)
Playlist: https://www.youtube.com/playlist?list=PLXolFhFOuBSI

Voice: AI text-to-speech. Demo shop and data are fictional.
```
Tags: `pundo, catalogue import, catalog import, excel import, csv import, product list upload, google sheets, bulk upload products, shop admin, cyprus shops, local business cyprus, pundo for businesses, tutorial`

## Beschreibung EL
Τίτλος: **Εισήγαγε όλο τον κατάλογό σου με μία κίνηση**
```
Εκατοντάδες προϊόντα; Μην τα πληκτρολογείς ένα ένα. Ανέβασε τη λίστα σου σε Excel ή CSV στο pundo, έλεγξε την προεπισκόπηση, διόρθωσε τα λάθη, αποφάσισε για τα διπλότυπα και πάτα «Εφαρμογή». Αργότερα ανεβάζεις ξανά την ίδια λίστα για νέες τιμές ή συνδέεις ένα Google Sheet που συγχρονίζεται κάθε 4 ώρες.

0:00 Εισαγωγή
0:15 Πρότυπο και στήλες
0:28 Ανέβασμα και προεπισκόπηση
0:42 Διόρθωση λαθών
0:57 Διπλότυπα και εφαρμογή
1:12 Ενημέρωση αργότερα
1:30 Google Sheets
1:44 Τι βλέπουν οι πελάτες

Υποχρεωτική είναι μόνο η στήλη «name». Με δικό σου κωδικό προϊόντος (sku), barcode (EAN) και τιμή, το pundo αναγνωρίζει κάθε προϊόν όταν ανεβάζεις ξανά τη λίστα: χωρίς διπλότυπα, και με την «πλήρη λίστα» ό,τι λείπει γίνεται «μη διαθέσιμο», δεν διαγράφεται ποτέ.

Ξεκίνα εδώ: https://pundo.cy/shop-admin

pundo για επιχειρήσεις (σειρά):
Μέρος 1: Καταχώρισε το κατάστημά σου https://youtu.be/HzBPFSwfdYw
Μέρος 2: Τα πρώτα 10 λεπτά σου https://youtu.be/q3WBIdtg8cI
Μέρος 3: Πρόσθεσε το πρώτο σου προϊόν https://youtu.be/cRQcMGcr3ww
Μέρος 4: Πρόσθεσε ένα προϊόν που υπάρχει ήδη https://youtu.be/6JhpJabNF2E
Μέρος 5: Πρόσθεσε τις υπηρεσίες σου https://youtu.be/GvH9BTpISIU
Μέρος 6: Πρόσθεσε μια υπηρεσία που υπάρχει ήδη https://youtu.be/llOaO9dZko0
Μέρος 7: Τιμές, εκπτώσεις ποσότητας & προσφορές https://youtu.be/ikUN4_vj2ic
Μέρος 8: Κράτα ενημερωμένο το προφίλ σου https://youtu.be/9LQAaIuNA7I
Μέρος 9: Εισήγαγε όλο τον κατάλογό σου (αυτό το βίντεο)
Playlist: https://www.youtube.com/playlist?list=PLaLNgECVtogc

Φωνή: τεχνητή νοημοσύνη (text-to-speech). Το κατάστημα και τα δεδομένα είναι φανταστικά.
```
Tags: `pundo, εισαγωγή καταλόγου, εισαγωγή προϊόντων, excel, csv, google sheets, μαζική καταχώριση προϊόντων, κατάστημα, Κύπρος, τοπικές επιχειρήσεις, pundo για επιχειρήσεις, οδηγός`

## Short (`../short-catalog-import/`)
Titel EN „Whole catalogue in 1 minute #Shorts“, EL „Όλος ο κατάλογος σε 1 λεπτό #Shorts“; „Ähnliches Video“ = dieses Tutorial. Szenen: Hook (Vorschau-Kacheln, Apply), Upload gekürzt (ohne Fehlerdatei), Apply + Ergebnis (Duplikat bleibt auf Standard „Create as new“ → „24 new“), Kundenseite.

## Offene Punkte
- Aussprache nicht nach Gehör geprüft (EN „pundo“, „Google Sheets“; EL „barcode“, „playlist“, „online“).
- Playlists, Endscreen (Playlist-Element + Abo wie Teil 7/8), Serien-Block der Teile 1–8 um Teil 9 ergänzen, N7900 nachziehen.
