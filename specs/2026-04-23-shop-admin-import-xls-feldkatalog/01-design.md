# Shop-Admin Import — XLS-Support & Feldkatalog-Beschreibung

**Slug:** `2026-04-23-shop-admin-import-xls-feldkatalog`
**Datum:** 2026-04-23
**Betrifft:** `src/components/shop-admin/ImportPanel.tsx`, `src/app/(shop-admin)/shop-admin/(portal)/import/page.tsx`, `src/lib/shop-admin-translations.ts`, Backend: `ingestor/api/shop_owner_import.py`, `ingestor/ingestion/shop_owner_import.py`

---

## 1. Problem & Nutzer

Shop-Owner laden ihre Produktlisten per Datei-Upload ins Portal. Aktuell akzeptiert der Upload technisch zwar `.xlsx` **und** `.csv` — der User-Feedback sagt aber, die UI wirke CSV-only, und vor allem **fehlt jede sichtbare Erklärung**, wie die Datei aufgebaut sein muss. Ergebnis: Uploads schlagen fehl, weil Pflichtspalten fehlen oder Header anders heißen, und der Shop-Owner rät herum.

Ziel: (a) Auch das klassische **`.xls`**-Format akzeptieren (viele kleine Shops exportieren aus Alt-Excel / Buchhaltungs-Software noch `.xls`), und (b) einen klar lesbaren, **mehrsprachigen Feldkatalog** direkt neben dem Upload-Feld anzeigen — inkl. Pflichtfeldern, optionalen Feldern, Beispielzeile und Template-Download.

Zielgruppe: Shop-Owner ohne technisches Know-how, 6 Sprachen (en/de/el/ru/ar/he, inkl. RTL).

## 2. User Flows

### Happy Path — Shop-Owner lädt `.xls` hoch
1. Shop-Owner öffnet `/shop-admin/import`.
2. Im Upload-Panel liest er den **Feldkatalog**: Pflichtfeld `name`, optional `category`, `available`.
3. Er klickt **„Vorlage herunterladen"** → `.xlsx`-Template mit Headern + Beispielzeilen wird heruntergeladen.
4. Er exportiert aus seiner Buchhaltung als `.xls`, klickt das Upload-Feld an, wählt die Datei.
5. Backend erkennt `.xls`, parst via `xlrd`/`openpyxl`-Fallback → Erfolgs-Toast „12 Produkte importiert".

### Edge Case A — Fehlende Pflichtspalte
1. Shop-Owner lädt `.xlsx` hoch, bei dem die Spalte `name` fehlt (z.B. nur `Artikel` / `Produkt`).
2. Backend liefert pro Zeile einen Fehler `missing required column: name`.
3. UI zeigt amber Banner: „3 Zeilen mit Fehlern" + Liste. Zusätzlich **oberhalb** der Fehlerliste ein Hinweis: „Die Datei muss eine Spalte `name` enthalten. Siehe Feldkatalog unten."

### Edge Case B — Unbekanntes Dateiformat
1. Shop-Owner lädt `.ods`, `.pdf` oder `.numbers` hoch.
2. Backend antwortet `400 Unsupported file format. Use .xlsx, .xls or .csv`.
3. UI zeigt **formatspezifische** Fehlermeldung (nicht das generische `error_generic`), die die erlaubten Formate nennt.

### Edge Case C — `.xls` mit ungewöhnlichem Encoding / alter BIFF-Version
1. Datei ist `.xls` aus Excel 97–2003 (BIFF8).
2. Parser öffnet Datei; falls `xlrd` sie nicht lesen kann (BIFF5 oder älter), Fehler `400 xls file could not be read — please save as .xlsx or .csv`.

## 3. Screen- / Komponenten-Inventar

| Element | Typ | Zweck |
|---|---|---|
| `ImportPanel` (bestehend) | Client Component | Bekommt neuen Abschnitt „Feldkatalog" zwischen Upload-Area und Ergebnis-Banner. |
| `FieldCatalog` (neu) | Client Sub-Component in `ImportPanel.tsx` | Rendert Tabelle: Spalte · Pflicht? · Beschreibung · Beispiel. Klappbar (details/summary), default **offen**. |
| `<input accept="…">` | Erweiterung | Neu: `.xlsx,.xls,.csv` |
| „Vorlage herunterladen"-Button (neu sichtbar) | `<a href="/api/shop-admin/import/template" download>` | Bisher Text-Label ohne klickbaren Button. Wird zum sichtbaren Sekundär-Button neben dem Upload-Feld. |
| Translations-Keys (neu) | `shop-admin-translations.ts` | Feldkatalog-Strings (siehe unten). Alle 6 Sprachen. |
| Backend `parse_xls_bytes` (neu) | Python | Parst `.xls` via `xlrd` (Lib bereits in Dependencies? ❓ OFFEN). |
| Backend Upload-Handler | Erweiterung | Akzeptiert `.xls` zusätzlich; Fehlertext nennt alle drei Formate. |

### Feldkatalog-Inhalt (als strukturierte Daten, i18n)

| Spaltenname | Pflicht? | Beschreibung | Beispiel |
|---|---|---|---|
| `name` | **Ja** | Produktname, eindeutig pro Shop. Case-insensitive Dedup-Key. | `Royal Canin Adult Cat 5kg` |
| `category` | Nein | Freitext-Kategorie. Leer = keine. | `Cat Food` |
| `available` | Nein | Verfügbarkeit. Akzeptiert `true/false`, `1/0`, `ja/nein`, `yes/no`. Default: `true`. | `true` |

Zusätzlicher Hinweistext (i18n): „Header sind **case-insensitive**. Leerzeichen und Bindestriche in Headern werden ignoriert. Preis und Einheit werden **nicht** per Import gepflegt — diese legst du nach dem Import als Preisstufen im Portal an."

## 4. Akzeptanzkriterien

1. **AC-1 (XLS-Upload):** Given ein Shop-Owner auf `/shop-admin/import` · When er eine gültige `.xls`-Datei (BIFF8, Excel 97–2003) mit Header `name` und 3 Zeilen hochlädt · Then zeigt die UI „3 Produkte importiert" und in der DB existieren die 3 Produkte zum Shop.
2. **AC-2 (XLSX weiterhin):** `.xlsx`-Upload funktioniert unverändert wie vor dieser Änderung.
3. **AC-3 (CSV weiterhin):** `.csv`-Upload funktioniert unverändert.
4. **AC-4 (Accept-Attribut):** Das `<input type="file">` hat `accept=".xlsx,.xls,.csv"` — der Datei-Dialog zeigt entsprechend alle drei Formate als auswählbar.
5. **AC-5 (Format-Ablehnung):** Upload einer `.pdf` oder `.ods` · Then HTTP 400 mit Text, der alle drei erlaubten Formate nennt, und UI zeigt genau diesen Text (nicht `error_generic`).
6. **AC-6 (Feldkatalog sichtbar):** Auf `/shop-admin/import` ist ein Abschnitt „Feldkatalog" / „Field reference" sichtbar (oder per `<details>` aufklappbar, default offen) mit drei Zeilen: `name` (Pflicht), `category` (optional), `available` (optional) — jeweils mit Beschreibung und Beispiel.
7. **AC-7 (i18n, 6 Sprachen):** Feldkatalog-Strings sind in allen 6 Sprachen (en/de/el/ru/ar/he) in `shop-admin-translations.ts` gepflegt. Switch zu `ar` rendert den Abschnitt mit `dir="rtl"`-korrekter Ausrichtung (Tabellen-Spalten gespiegelt).
8. **AC-8 (Template-Download-Button):** Neben dem Upload-Feld existiert ein sichtbarer, fokussierbarer Button/Link „Vorlage herunterladen" · When angeklickt · Then startet ein Download von `pundo_import_template.xlsx` mit Header-Zeile `name, category, available` und mindestens einer Beispielzeile.
9. **AC-9 (Pflichtfeld-Fehler zeigt Hinweis):** Wenn mindestens eine Fehlermeldung `missing required column: name` enthält · Then zeigt die UI zusätzlich zum bestehenden Banner einen Hinweis-Text, der auf den Feldkatalog verweist (Translation-Key, nicht hardcoded).
10. **AC-10 (Clean Boundary):** `ImportPanel.tsx` importiert weiterhin nur aus `@/components/ui/*`, `@/lib/shop-admin-*`, `@/types/shop-admin`. Keine neuen Imports aus customer-facing Code.
11. **AC-11 (Keine Regressionen Google-Sheets):** Der Google-Sheets-Abschnitt (Connect / Sync / Remove) bleibt funktional unverändert.

## 5. Offene Fragen & Annahmen

- ❓ **OFFEN:** Soll `.xls` wirklich backend-seitig via `xlrd` gelesen werden? `xlrd ≥ 2.0` kann **kein** `.xlsx` mehr und liest nur noch `.xls`. Dependency muss explizit ergänzt werden. **Alternative:** `.xls` ablehnen, aber mit freundlicher Fehlermeldung „bitte als `.xlsx` speichern". Architect entscheidet.
- ❓ **OFFEN:** Ist `xlrd` (oder eine Alternative wie `pyexcel-xls`) bereits in `pyproject.toml` / `uv.lock`? Falls nein, neue Dependency im Backend-Repo — gehört in die Architecture-Phase.
- ❓ **OFFEN:** Sollen **Aliase** für Header akzeptiert werden (z.B. `produktname` / `artikel` → `name`, `kategorie` → `category`)? Das würde Upload-Erfolgsrate drastisch erhöhen, erweitert aber Scope. Empfehlung: **nicht** in diesem Spec — separate Feature-Runde.
- ❓ **OFFEN:** Maximale Dateigröße? Aktuell kein explizites Limit im Frontend erkennbar. Sollte in Architecture festgelegt werden (Vorschlag: 5 MB, gleich wie Logo-Upload).
- ⚠️ **ANNAHME:** User meint mit „XLS" das **klassische `.xls`-Format** (Excel 97–2003, BIFF). Falls er eigentlich nur „alles außer CSV" meint → aktueller Code akzeptiert `.xlsx` bereits; dann wäre der reale Fehler nur die fehlende **Feldkatalog-Beschreibung** + unsichtbarer Template-Button. Bitte im Zweifel rückfragen.
- ⚠️ **ANNAHME:** Der MIME-Type-Check in der Upload-Route prüft **nur die Dateiendung** (`filename.endswith(".xlsx")`). Bei `.xls` muss ein eigener Zweig hinzu — kein Content-Sniffing nötig.
- ⚠️ **ANNAHME:** Der Feldkatalog wird als statische React-Tabelle im Panel gerendert, **nicht** per Backend-Endpoint ausgeliefert — Inhalt ist stabil und gehört in `shop-admin-translations.ts`.
- ⚠️ **ANNAHME:** Der bestehende Translation-Key `download_template` existiert bereits in allen 6 Sprachen, wird aber nur als reiner Text („`.xlsx, .csv — Download template`") gerendert. Er wird zum klickbaren Button umgewidmet.

---

Design complete at `specs/2026-04-23-shop-admin-import-xls-feldkatalog/01-design.md`. Ready for /architect.
