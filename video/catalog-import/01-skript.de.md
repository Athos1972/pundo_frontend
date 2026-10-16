# Skript — „Import your whole catalogue at once" (DE, freigegeben BB 2026-10-16)

**Art:** Tutorial der Serie „pundo for businesses", **Teil 9** (hinter Teil 8 „Shop-Profil" einsortieren, Playlists EN/EL manuell sortiert)
**Länge:** ~120–140 s (16:9) + Short 9:16 (~30 s)
**Sprachen:** EN + EL (RU optional später)
**Zielgruppe:** Händler mit vielen Artikeln aus unterschiedlichen Kategorien, die nicht jeden Artikel einzeln anlegen wollen (Lebensmittel bewusst nicht im Fokus, BB)
**Demo:** neuer Demo-Shop „Niko's Survival Shop" (Larnaca), freigeschaltet, noch ohne Angebote; Datei mit 24 Artikeln aus vielen Kategorien (Messer & Multitools, Lampen, Zelte & Schlafsäcke, Erste Hilfe, Wasserfilter, Powerbanks, Kocher, Seile), teils mit EAN, alle mit eigener Artikelnummer

## Was heute tatsächlich passiert (geprüft im Code, Stand F5920 + SKU-Nachtrag, live 2026-10-16)
1. Dashboard → Kachel „Import" → `/shop-admin/import`: Datei-Upload (.xlsx/.xls/.csv, bis 20 MB), „Vorlage herunterladen", Häkchen „Diese Datei ist meine komplette Liste", Google-Sheets-Verknüpfung, Feldkatalog.
2. Spalten: nur `name` ist Pflicht; dazu `sku`, `ean`, `price`, `currency`, `category`, `available`, `image_url`, `language`. Preis = Festpreis pro Stück (Staffeln/Aktionen im Portal).
3. Hochladen → Fortschritt (lesen → wiedererkennen → Kategorien/ähnliche Artikel → fertig) → **Vorschau, noch nichts gespeichert**: Kacheln Neu / Aktualisiert / Unverändert / Fehler / Mögliche Duplikate / Werden auf „nicht verfügbar“ gesetzt; je Zeile Kategorie (aus der Datei oder vorgeschlagen), Preis, Verfügbarkeit.
4. **Alles oder nichts:** Mit einer fehlerhaften Zeile lässt sich nichts übernehmen; die Zeile steht mit Fehlertext da (z. B. „Preis ist keine Zahl ab 0“).
5. Mögliches Duplikat: „Bestehenden Artikel verwenden" oder „Als neuen Artikel anlegen".
6. Übernehmen → „Import abgeschlossen": x neu, y mit bestehenden Katalog-Artikeln verknüpft, „neue Artikel werden in alle Sprachen übersetzt" → „Zu meinen Angeboten".
7. Erneuter Upload derselben Liste: Wiedererkennung über Artikelnummer → EAN → exakten Namen; keine Duplikate. Mit „komplette Liste" werden fehlende Artikel auf „nicht verfügbar" gesetzt, nichts gelöscht, Handangelegtes bleibt.
8. Google Sheets: Link einfügen → „Verknüpfen"; pundo synchronisiert sofort und danach automatisch alle 4 Stunden (oder „Jetzt synchronisieren"). Sheet muss „Jeder mit dem Link: Betrachter" sein. Ein Sheet gilt immer als komplette Liste.

---

## 0 · Hook (~6 s)
*Bild:* Vorschau mit Kacheln „24 Neu · 0 Fehler", Mauszeiger auf „Übernehmen".
*Callout:* **„200 Artikel? Nicht einzeln tippen."**
> Du hast Hunderte Artikel? Dann tipp sie nicht einzeln ein. Lade einfach deine Liste hoch.

## 1 · Vorlage & Spalten (~18 s)
*Bild:* Dashboard → Kachel „Import" → „Vorlage herunterladen" → Excel kurz zeigen (Spalten name, sku, ean, price …) → Feldkatalog auf der Seite runterscrollen.
*Callout:* **„Nur der Name ist Pflicht"**
> Hol dir die Vorlage. Pflicht ist nur der Name. Mit Artikelnummer, EAN und Preis wird's richtig gut: Daran erkennt pundo deine Artikel später wieder.

## 2 · Hochladen & Vorschau (~24 s)
*Bild:* Datei auswählen → Fortschrittsbalken → Vorschau: Kacheln (Neu 23, Mögliche Duplikate 1, Fehler 1), eine Zeile mit vorgeschlagener Kategorie heranzoomen.
*Callout:* **„Erst prüfen, dann speichern"**
> pundo prüft die Datei und zeigt dir eine Vorschau. Noch ist nichts gespeichert. Für jeden Artikel schlägt pundo eine Kategorie vor, außer du hast sie schon in der Datei.

## 3 · Fehler korrigieren (~16 s)
*Bild:* Filter „Fehler" → Zeile 14 „Preis ist keine Zahl ab 0" („2,5O" mit O statt 0) → Hinweis „Übernehmen ist nur ohne Fehler möglich" → in Excel korrigieren → „Weitere Datei hochladen" → Fehler 0.
*Callout:* **„Alles oder nichts"**
> Eine Zeile ist fehlerhaft? Dann wird gar nichts übernommen, damit kein halber Katalog online geht. Zeile korrigieren, neu hochladen, fertig.

## 4 · Duplikat entscheiden & übernehmen (~20 s)
*Bild:* Zeile „Victorinox Huntsman Swiss Army Knife" → „Mögliches Duplikat, 9x % ähnlich" (Katalog: „Victorinox Huntsman Pocket Knife") → „Bestehenden Artikel verwenden" → „Übernehmen" → Ergebnis „24 neu … werden in alle Sprachen übersetzt" → „Zu meinen Angeboten".
*Callout:* **„Gibt's schon? Verknüpfen."**
> Kennt pundo einen Artikel schon, entscheidest du: bestehenden verwenden oder neu anlegen. Übernehmen, fertig. Und pundo übersetzt deine neuen Artikel automatisch in alle Sprachen.

## 5 · Später aktualisieren (~20 s)
*Bild:* Excel: einen Preis ändern, eine Zeile löschen → Häkchen „Diese Datei ist meine komplette Liste" → hochladen → Vorschau: „Aktualisiert 1 · Preis ändert sich", „1 Artikel wird auf ‚nicht verfügbar‘ gesetzt" → Übernehmen.
*Callout:* **„Gleiche Liste, neue Preise"**
> Preise ändern sich? Lad einfach dieselbe Liste wieder hoch. pundo erkennt jeden Artikel an der Artikelnummer, es entstehen keine Doppelten. Mit „komplette Liste“ wird, was fehlt, auf nicht verfügbar gesetzt, aber nie gelöscht.

## 6 · Google Sheets (~16 s)
*Bild:* Callout-Karte „Teilen → Jeder mit dem Link: Betrachter" → Link in „Google-Sheets-URL" → „Verknüpfen" → „Letzter Sync" + Status OK.
*Callout:* **„Automatisch alle 4 Stunden"**
> Du pflegst deine Liste in Google Sheets? Teil den Link, füg ihn ein, verknüpfen. pundo holt sich die Änderungen ab jetzt alle vier Stunden selbst.

## 7 · So sehen es Kunden + Outro (~10 s)
*Bild:* Kunden-Shopseite „Niko's Survival Shop" mit Artikelliste und Preisen; dann Outro-Karte.
*Callout:* **„Online. Mit einem Upload."**
> Und so sehen es deine Kunden. Alle Teile der Serie findest du in unserer Playlist.

---

## Short (9:16, ~30 s)
Szenen 0, 2 (gekürzt), 4 (nur „Übernehmen" + Ergebnis), 7. Hook-Karte „Ganzer Katalog in 1 Minute". „Ähnliches Video" = dieses Tutorial.

## Umsetzung
- Neuer Ordner `video/catalog-import/` (scenes.yml, record.mjs, `prepare_catalog_import.py`, Dateien `niko-catalog.xlsx` mit Fehler, `niko-catalog-fixed.xlsx`, `niko-catalog-update.xlsx`).
- Prepare (nur pundo_test): Demo-Shop anlegen bzw. zurücksetzen (Listings/Offers aus früheren Läufen entfernen, Import-Status und Sheet-Verknüpfung löschen); der Testkatalog hat keine Outdoor-Artikel (geprüft 2026-10-16) → Prepare legt in einem zweiten Demo-Shop den Katalog-Artikel „Victorinox Huntsman Pocket Knife" an, damit das Duplikat erscheint. ⚠️ Kategorie-Vorschläge sind schwach (B5900-031): die meisten Zeilen bekommen `category` in der Datei, nur 1–2 Zeilen zeigen einen Vorschlag; vor der Aufnahme prüfen, dass der Vorschlag im Bild plausibel ist.
- Excel im Bild: nachgebaute Tabellenansicht (statisches HTML im Browser, Spalten wie Vorlage). Google Sheets: keine Google-Oberfläche, nur Link einfügen + „Verknüpfen" in pundo mit einem öffentlichen Test-Sheet (BB 2026-10-16).
- Vertonung: edge-tts EN/EL wie bisher; Aufnahme mit Standalone-Build auf :3500 (kein `next dev`).

## Entscheidungen BB (2026-10-16)
1. Demo-Shop „Niko's Survival Shop“: viele Produkte, unterschiedliche Kategorien; Lebensmittel nicht im Fokus.
2. Excel nachgebaut, Google Sheets nur in pundo (kein Google-Konto im Bild).
3. Länge ~2:10 mit Fehler-Szene bleibt.
4. Skript freigegeben.
