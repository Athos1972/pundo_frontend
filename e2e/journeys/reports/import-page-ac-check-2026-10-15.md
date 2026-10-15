# Journey-Report: import-page-ac-check (F5920)

**Datum:** 2026-10-15T19:48:57.478Z
**Frontend:** http://127.0.0.1:3500  **Backend:** http://localhost:8500
**Spec-Shop:** e2e-20261015194733-f5920-import-0031  **Katalog-Shop:** e2e-20261015194733-f5920-catalog-9504

| Schritt | Beschreibung | Status |
|---|---|---|
| AK1 | Vorschau-Zaehler Neu 3 / Aktualisiert 0 / Unveraendert 0 / Fehler 0 / Duplikate 0, keine Deaktivieren-Kachel | **PASS** |
| AK1 | nichts gespeichert: 0 Listings, 0 Offers, Kunden-Shop-Seite ohne die Artikel | **PASS** |
| AK2 | Abbrechen: Vorschau weg, Formular leer, Vorschau serverseitig verworfen | **PASS** |
| AK3 | Ergebnis „3 new“ + Link „Go to my offers“ | **PASS** |
| AK3 | Angebotsliste: 3 Zeilen mit Label „Import“ und SKU | **PASS** |
| AK3 | Kunden-Shop-Seite (Gast) zeigt die 3 Artikel | **PASS** |
| E13 | 3 Uebersetzungs-Jobs eingereiht (item_translation_status) und im Gateway als translate.item/queued sichtbar | **PASS** |
| AK4 | Vorschau: A-100 „Updated“ (erkannt per Artikelnummer), 2 Unveraendert | **PASS** |
| AK4 | Ergebnis „1 updated · 2 unchanged“, weiter genau 3 Listings, A-100 mit neuem Preis | **PASS** |
| AK7 | Preis-Historie: genau 1 neues Angebot (altes archiviert) | **PASS** |
| AK7 | dieselbe Datei erneut: alle 3 „Unchanged“, Uebernehmen legt kein Angebot an | **PASS** |
| AK5 | Fixture: eigener Artikel mit EAN und Listing | **PASS** |
| AK5 | Zeile ohne SKU, gleiche EAN -> Aktualisiert „Recognised by EAN“, kein neuer Artikel | **PASS** |
| AK6 | Zeile ohne SKU/EAN, gleicher Name in anderer Schreibweise -> erkannt „by name“, kein neuer Artikel | **PASS** |
| AK6 | Name aus der Datei wird uebernommen (nur Schreibweise geaendert) — A-200 danach wieder in Originalschreibweise | **PASS** |
| AK10 | Fixture: manuell angelegtes Angebot (Quelle shop_manual) | **PASS** |
| AK9 | ohne Haekchen: keine Deaktivieren-Kachel, nach Uebernehmen bleiben A-200/A-300 verfuegbar | **PASS** |
| AK8 | Vorschau: „2 werden auf nicht verfuegbar gesetzt“ (A-200, A-300), Liste aufklappbar | **PASS** |
| AK8 | Ergebnis „2 set to not available“; Listings A-200/A-300 available=false, nicht geloescht | **PASS** |
| AK10 | manuelles Angebot bleibt verfuegbar | **PASS** |
| AK8 | Angebotsliste: A-200/A-300 mit Badge „not available“; Kunden-Shop-Seite zeigt sie nicht mehr, A-100 und manuelles schon | **PASS** |
| AK11 | deaktivierter Artikel steht wieder in der Datei -> „available again“, nach Uebernehmen verfuegbar + sichtbar | **PASS** |
| AK12 | Fixture: Katalog-Artikel mit Foto in zweitem Shop | **PASS** |
| AK12 | beide Zeilen als „Possible duplicate“, Kandidat mit Name und Foto, Voreinstellung „Create as new article“ | **PASS** |
| AK12 | Zeile 2: „Use existing article“, Zeile 3 bleibt „Create as new“ -> Ergebnis „1 linked“ | **PASS** |
| AK13 | Spalte „category“ aufgeloest: Kategoriepfad „…Dog Food“ (from your file) in der Vorschau | **PASS** |
| AK13 | unbekannte Kategorie-Spalte: Hinweis in der Vorschau (not known to pundo) | **PASS** |
| AK13 | jede Zeile hat eine Kategorie ODER den Hinweis „No category could be suggested“ | **PASS** |
| AK13 | uebernommen: Artikel „Dog Food“ hat Kategorie und erscheint in der Kategorie-Suche | **PASS** |
| AK14 | language=el: Name als griechischer Name gespeichert, /el/ Kunden-Shop-Seite zeigt ihn | **PASS** |
| AK15 | ohne language-Spalte (UI englisch): Name als englischer Name, nicht „de“ | **PASS** |
| AK17 | beide Zeilen mit gleicher SKU als Fehler „Duplicate in the file“, 1 gueltige Zeile | **PASS** |
| AK23 | Uebernehmen deaktiviert + Sperr-Hinweis, nichts gespeichert | **PASS** |
| AK18 | Hinweis „The preview has expired. Please upload the file again.“, kein Ergebnis, nichts gespeichert | **PASS** |
| AK22 | SKU „B-200“ am manuellen Angebot setzen -> Liste zeigt B-200 | **PASS** |
| AK22 | zweites Angebot mit derselben SKU -> Fehlermeldung, nichts gespeichert | **PASS** |
| AK22 | Import mit SKU „B-200“ aktualisiert genau das manuelle Angebot (kein neuer Artikel) | **PASS** |
| AK20 | Vorlage enthaelt sku, name, language, ean, category, available, price, currency, image_url (Reihenfolge) | **PASS** |
| AK20 | Feldkatalog [en]: 9 Spalten (sku, language neu) + Wiedererkennungs-Reihenfolge | **PASS** |
| AK20 | Feldkatalog [de]: 9 Spalten (sku, language neu) + Wiedererkennungs-Reihenfolge | **PASS** |
| AK20 | Feldkatalog [el]: 9 Spalten (sku, language neu) + Wiedererkennungs-Reihenfolge | **PASS** |
| AK20 | Feldkatalog [ru]: 9 Spalten (sku, language neu) + Wiedererkennungs-Reihenfolge | **PASS** |
| AK20 | Feldkatalog [ar]: 9 Spalten (sku, language neu) + Wiedererkennungs-Reihenfolge | **PASS** |
| AK20 | Feldkatalog [he]: 9 Spalten (sku, language neu) + Wiedererkennungs-Reihenfolge | **PASS** |
| AK19 | Sync-Status: Zeitpunkt, „1 Updated“, „1 Will be set to not available“, 0 Fehler | **PASS** |
| AK19 | Sheets-Status [en]: Deaktiviert-Kachel in der Vergangenheitsform | **PASS** |
| AK19 | Sheets-Status [de]: Deaktiviert-Kachel in der Vergangenheitsform | **PASS** |
| AK19 | Sheets-Status [el]: Deaktiviert-Kachel in der Vergangenheitsform | **PASS** |
| AK19 | Sheets-Status [ru]: Deaktiviert-Kachel in der Vergangenheitsform | **PASS** |
| AK19 | Sheets-Status [ar]: Deaktiviert-Kachel in der Vergangenheitsform | **PASS** |
| AK19 | Sheets-Status [he]: Deaktiviert-Kachel in der Vergangenheitsform | **PASS** |
| AK23 | Sheet mit Fehlerzeile: Status „Error“ + Zeilenliste „Row 3 … Name is missing“ | **PASS** |
| AK21 | [el] dir, kein horizontaler Ueberlauf | **PASS** |
| AK21 | [el] Zaehler-Kacheln ueberlappen nicht | **PASS** |
| AK21 | [el] Karten untereinander ohne Ueberlagerung; Duplikat-Auswahl lesbar | **PASS** |
| AK21 | [el] „Apply“/„Cancel“ sichtbar im Viewport, ueberlappen weder sich noch die letzte Karte | **PASS** |
| AK21 | [ar] dir, kein horizontaler Ueberlauf | **PASS** |
| AK21 | [ar] Zaehler-Kacheln ueberlappen nicht, Reihenfolge gespiegelt | **PASS** |
| AK21 | [ar] Karten untereinander ohne Ueberlagerung; Duplikat-Auswahl lesbar | **PASS** |
| AK21 | [ar] „Apply“/„Cancel“ sichtbar im Viewport, ueberlappen weder sich noch die letzte Karte | **PASS** |
| AK3 | [el] Ergebnis: Titel, „1 neu“, Link zu den Angeboten uebersetzt | **PASS** |
| AK21 | [el] Ergebnis auf 390 px: dir=ltr, kein horizontaler Ueberlauf | **PASS** |
| AK3 | [ar] Ergebnis: Titel, „1 neu“, Link zu den Angeboten uebersetzt | **PASS** |
| AK21 | [ar] Ergebnis auf 390 px: dir=rtl, kein horizontaler Ueberlauf | **PASS** |
| AK12 | Tippfehler-Zeile ohne gemeinsames Wort -> „Possible duplicate“ mit dem Kandidaten | **PASS** |
| CSV | cp1253 + „;“ + Dezimalkomma: Namen unbeschaedigt, Preise 3.5 / 1234.5, 2 neu, 0 Fehler | **PASS** |
| E17 | Limit 3: Datei mit 5 Zeilen -> Meldung „more rows than allowed for your shop (3)“, keine Vorschau | **PASS** |
| E17 | Limit 3: Datei mit genau 3 Zeilen geht durch; import_runs schreibt kind=file, ok, row_count=3 | **PASS** |
| E17 | 12 MB Datei passiert den Frontend-Proxy (kein 413), 21 MB -> 413 + Meldung „File too large. Maximum size is 20 MB.“ | **PASS** |