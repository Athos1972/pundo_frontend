# Architecture — Shop-Admin Import: XLS-Support & Feldkatalog

**Slug:** `2026-04-23-shop-admin-import-xls-feldkatalog`
**Design-Spec:** `01-design.md`
**Betroffene Repos:** `pundo_frontend` (primary), `pundo_main_backend`

---

## 0. Architect-Entscheidungen zu offenen Fragen

### 0.1 `.xls` via `xlrd` vs. freundliche Ablehnung — ENTSCHEIDUNG: `xlrd` integrieren

**Kontext:**
- `xlrd` ist **nicht** in `pundo_main_backend/pyproject.toml` vorhanden (siehe Zeilen 10–45 von `pyproject.toml`; keine Referenz in repo-weiter Grep-Suche).
- `xlrd >= 2.0.0` liest **ausschließlich** `.xls` (BIFF8, Excel 97–2003). `.xlsx`-Support wurde 2020 entfernt. Das bedeutet: die bestehende `.xlsx`-Pipeline via `openpyxl` bleibt unberührt — `xlrd` ist eine saubere Erweiterung, kein Konflikt.
- `xlrd 2.0.1` ist das aktuelle Release, maintained, MIT-lizensiert, keine transitive Abhängigkeits-Last. Wheel-only, installiert problemlos in allen 3.12-Environments.
- Design-Ziel ist explizit „Shop-Owner ohne technisches Know-how". Eine Fehlermeldung „bitte als .xlsx speichern" verlagert Arbeit auf den am schwächsten gerüsteten Nutzer — Anti-Goal.

**Entscheidung:** `xlrd >= 2.0` als neue Backend-Dependency. Parser-Funktion `parse_xls_bytes(content: bytes)` spiegelt `parse_xlsx_bytes` (gleiche Output-Shape: `list[dict[str, Any]]`).

**Fallback-Verhalten:** Wenn `xlrd` eine Datei nicht öffnen kann (z.B. BIFF5 oder älter, passwortgeschützt, korrupt), `HTTPException 400` mit Text `xls file could not be read — please save as .xlsx or .csv`. Dieser Text wird 1:1 aus dem Backend ins UI gespiegelt (siehe 3.1).

### 0.2 Header-Aliase (`produktname` → `name`, …)

**Out of Scope** für dieses Spec. Der Feldkatalog macht die korrekten Header sichtbar; Aliase sind eine eigene Feature-Runde. Keine Änderung an `_normalise_header`.

### 0.3 Maximale Dateigröße

**Entscheidung:** 5 MB (gleich wie Logo-Upload, konsistent). Check im Backend-Handler **vor** dem Parsen (`len(content) > 5 * 1024 * 1024` → 413). Frontend macht keinen Pre-Check (Upload ist klein, Round-Trip akzeptabel; Fehlertext wird angezeigt).

### 0.4 User-Meaning-Annahme

Die Design-Annahme „User meint klassisches `.xls`" wird übernommen. Wenn sich in E2E herausstellt, dass das gemeint war, ist kein Umbau nötig. Sollte sich zeigen, dass der User nur die UI-Sichtbarkeit meinte, ist der XLS-Support harmlose Zugabe.

---

## 1. Affected modules / files

### 1.1 Frontend (`pundo_frontend`)

| Pfad | Art | Änderung |
|---|---|---|
| `src/components/shop-admin/ImportPanel.tsx` | modify | `accept=".xlsx,.xls,.csv"`; neuer Sub-Component `<FieldCatalog>`; sichtbarer Template-Download-Button; spezifisches Error-Handling für 400 (Format-Fehler) statt `error_generic`; konditionaler Hint bei `missing required column: name`. |
| `src/components/shop-admin/FieldCatalog.tsx` | **new** | Eigene Datei, Client Component. Rendert `<details open>` mit i18n-Tabelle. Importiert nur `tAdmin` aus `@/lib/shop-admin-translations`. Nimmt `lang: string`. |
| `src/lib/shop-admin-translations.ts` | modify | Neue Keys in allen 6 Sprachen (siehe 4.1). Bestehender Key `download_template` bleibt. Hinweis-Strings `.xlsx, .csv` werden zu `.xlsx, .xls, .csv`. |
| `src/app/(shop-admin)/shop-admin/(portal)/import/page.tsx` | no change | `ImportPanel` wird unverändert eingebunden (FieldCatalog wird intern gemountet). |
| `src/types/shop-admin.ts` | no change | Keine neuen Types nötig — `ImportUploadResult` reicht. |

**Keine neuen Types, kein neuer API-Proxy.** Template-Download und Upload laufen über den bestehenden Catch-all `src/app/api/shop-admin/[...path]/route.ts`.

**Clean Boundary:** `FieldCatalog.tsx` importiert ausschließlich aus `@/lib/shop-admin-translations`. Kein Import aus `@/components/ui/*` nötig (pure Tailwind). Kein Import aus customer-facing Code. `ImportPanel` fügt `import { FieldCatalog } from './FieldCatalog'` hinzu — Admin-intern, Boundary gewahrt.

### 1.2 Backend (`pundo_main_backend`)

| Pfad | Art | Änderung |
|---|---|---|
| `pyproject.toml` | modify | Neue Dependency `xlrd>=2.0,<3.0` im `dependencies`-Block. |
| `uv.lock` | regenerate | `uv lock` nach pyproject-Änderung. |
| `ingestor/ingestion/shop_owner_import.py` | modify | Neue Funktion `parse_xls_bytes(content: bytes) -> list[dict[str, Any]]`. Template-Generator bleibt unverändert (Output weiterhin `.xlsx`). |
| `ingestor/api/shop_owner_import.py` | modify | Upload-Handler: `.xls`-Branch, Size-Check (5 MB), präziserer 400-Error-Text `Unsupported file format. Use .xlsx, .xls or .csv`. |
| `ingestor/tests/test_shop_owner_import.py` (falls vorhanden) | modify/new | Unit-Tests für `parse_xls_bytes` mit einer kleinen fixture `.xls`-Datei. |

---

## 2. Data model changes

**Keine.** Keine Schema-Migration. Keine neuen Spalten. Die parser-seitige Normalisierung (`_normalise_header`, `parse_rows`) bleibt 1:1 — `parse_xls_bytes` liefert dieselbe Shape wie `parse_xlsx_bytes`.

---

## 3. API contracts

### 3.1 `POST /api/v1/shop-owner/import/upload` — geänderte Fehler-Semantik

**Request:** unverändert (`multipart/form-data`, Feld `file`).

**Response 200:** unverändert (`ImportUploadResponse { imported: int, errors: [{row, message}] }`).

**Response 400** (verfeinert):
```json
{ "detail": "Unsupported file format. Use .xlsx, .xls or .csv" }
```
oder
```json
{ "detail": "xls file could not be read — please save as .xlsx or .csv" }
```

**Response 413** (neu):
```json
{ "detail": "File too large. Maximum size is 5 MB." }
```

**Frontend-Mapping** (`ImportPanel.handleUpload`):
- Bei `!res.ok`: `const body = await res.json().catch(() => null)`; falls `body?.detail` vorhanden → Toast zeigt `body.detail` (backend-Text, gewollt englisch-basiert; siehe Risiko 5.3). Fallback: `tr.error_generic`.
- Bei 200 und `errors.some(e => e.message.includes('missing required column: name'))` → zusätzlicher Hinweis-Block oberhalb der Fehlerliste mit neuem Translation-Key `upload_hint_see_catalog`.

### 3.2 `GET /api/v1/shop-owner/import/template` — unverändert

Weiterhin `.xlsx` (Headers `name, category, available` + 2 Beispielzeilen). Wird nun per sichtbarem `<a href="/api/shop-admin/import/template" download>` getriggert.

---

## 4. Dependencies & integration points

### 4.1 Neue Translation-Keys (`shop-admin-translations.ts`, alle 6 Sprachen)

```ts
// Import — Feldkatalog
field_catalog_title: string          // "Field reference" / "Feldkatalog"
field_catalog_intro: string          // Kurz: Header case-insensitive, Leerzeichen/Bindestriche egal
field_catalog_col_name: string       // "Column" / "Spalte"
field_catalog_col_required: string   // "Required?" / "Pflicht?"
field_catalog_col_desc: string       // "Description" / "Beschreibung"
field_catalog_col_example: string    // "Example" / "Beispiel"
field_catalog_required_yes: string   // "Required" / "Pflicht"
field_catalog_required_no: string    // "Optional" / "Optional"

field_name_desc: string              // "Product name, unique per shop (case-insensitive dedup key)."
field_category_desc: string          // "Free-text category. Empty = none."
field_available_desc: string         // "Availability. Accepts true/false, 1/0, yes/no, ja/nein. Default: true."

field_catalog_footnote: string       // "Price and unit are NOT imported — add price tiers in the portal after import."

upload_hint_see_catalog: string      // "The file must contain a 'name' column. See the field reference below."
upload_formats_hint: string          // ".xlsx, .xls, .csv" (ersetzt den hardcoded String Zeile 113 ImportPanel)
upload_error_unsupported_format: string   // "Unsupported file format. Use .xlsx, .xls or .csv."
upload_error_xls_unreadable: string  // "This .xls file could not be read. Please save it as .xlsx or .csv."
upload_error_too_large: string       // "File too large. Maximum size is 5 MB."
```

**RTL:** Der `<FieldCatalog>` nutzt `<table>` mit Tailwind-Default; in `ar`/`he` invertiert Browser-default `dir="rtl"` (vom `<html>`-Tag kommend) die Spalten-Reihenfolge automatisch. Kein manuelles `rtl:`-Flipping nötig. **Ausnahme:** Feld-Identifikatoren (`name`, `category`, `available`) und Beispielwerte bleiben in LTR — mit `<code dir="ltr" class="…">` umhüllen, sonst zerschießt Arabisch die Lesbarkeit.

### 4.2 Neue Backend-Dependency

```toml
# pyproject.toml
"xlrd>=2.0,<3.0",   # Reads classic .xls (BIFF8, Excel 97–2003). Does NOT read .xlsx.
```

Nach `uv sync` laufen. CI-Pipeline erwartet aktualisiertes `uv.lock`.

### 4.3 Feature Flags

Keine. Die Änderung ist additiv (`.xls` erweitert die erlaubten Formate; Feldkatalog ist rein visuelle Ergänzung).

### 4.4 Integration Points

- Frontend → Backend Proxy: `src/app/api/shop-admin/[...path]/route.ts` — unverändert nutzbar.
- Auth: Upload und Template-Download laufen beide über `require_shop_owner`. Template-Download per `<a href>` nutzt Browser-Cookies → funktioniert, da Cookie-Auth (kein Bearer-Header nötig).

---

## 5. Risks & mitigations

| Risiko | Schwere | Mitigation |
|---|---|---|
| **5.1** `xlrd` kann bestimmte `.xls`-Varianten nicht lesen (BIFF5, passwortgeschützt, korrupte Dateien) | Mittel | `try/except xlrd.XLRDError, Exception` im Handler → `HTTPException 400` mit klarem Text (siehe 3.1). Fehlertext empfiehlt .xlsx-Resave. |
| **5.2** Breaking Change bei Fehler-Response-Parsing: frontend erwartete bisher `!res.ok → error_generic`. Neue Logik liest `detail`. | Niedrig | `catch` um `res.json()` — bei altem/leerem Response fällt Code auf `error_generic` zurück. Keine Regression. |
| **5.3** Backend liefert englische `detail`-Texte; Frontend ist i18n | Mittel | Lösung: Backend-Text als Signal, Frontend mappt auf lokalisierte Keys. Map-Tabelle in `ImportPanel`: `{"Unsupported file format...": tr.upload_error_unsupported_format, "xls file could not be read...": tr.upload_error_xls_unreadable, "File too large...": tr.upload_error_too_large}`. Fallback: `tr.error_generic`. **Alternative** (simpler, wenn Matching brittle wird): Backend liefert Error-Code-Schlüssel statt Prosa (`{"detail":"unsupported_format"}`). Wähle bei Coder-Pass die robustere Variante — ich empfehle String-Match für jetzt, Refactor später. |
| **5.4** `openpyxl` könnte irgendwann auch .xls akzeptieren wollen | Sehr niedrig | Branching per `filename.endswith()` bleibt deterministisch. Kein Content-Sniffing. |
| **5.5** Template-Download-Button per `<a href download>` — Cookie-Auth funktioniert, Bearer-Token-Flow würde brechen | Niedrig | Projekt nutzt Cookie-Session. Bei künftigem Bearer-Wechsel: Button zu `fetch + blob + objectURL` umbauen. Aktuell ok. |
| **5.6** RTL-Tabelle: Code-Snippets in arabischem/hebräischem Fluss schlecht lesbar | Mittel | `<code dir="ltr" class="inline-block">` für alle Feldnamen und Beispiele. |
| **5.7** Neue Translation-Keys nicht in allen 6 Sprachen → TypeScript-Fehler erst bei Benutzung | Mittel | `shop-admin-translations.ts` nutzt strukturiertes Objekt; Coder muss alle 6 Blöcke (en/de/el/ru/ar/he) editieren. Architect-Task T5 enthält explizite Prüfliste. |
| **5.8** 5-MB-Limit ist eng für sehr große Kataloge | Niedrig | Design-Entscheidung. Falls Shops >10k Produkte laden wollen, ist Google-Sheets-Sync der bessere Pfad. Limit dokumentieren in `field_catalog_footnote`. |

**Keine Breaking Changes an bestehenden API-Contracts oder DB.** `.xlsx` und `.csv` funktionieren identisch weiter (AC-2, AC-3).

---

## 6. Journey-Deltas

Prüfung: `e2e/journeys/CATALOG.md` existiert, enthält 5 Journeys (shop-owner-lifecycle, customer-discovery, shop-owner-full-lifecycle, customer-and-review-lifecycle, admin-data-management).

**Keine explizite Import-Journey im Katalog.** `shop-owner-full-lifecycle.md` und `shop-owner-lifecycle.md` sind die natürlichen Kandidaten für eine Erweiterung (Produkt-Import ist Teil des Shop-Onboarding-Flows), jedoch nicht verpflichtend für dieses Spec.

**Empfehlung an e2e-tester:** Neue Journey `shop-admin-import-xls` anlegen oder `shop-owner-full-lifecycle` um einen XLS-Upload-Schritt erweitern. Entscheidung liegt beim e2e-tester-Agent; kein Delta hier festgeschrieben, da keine bestehende Journey direkt betroffen wird.

---

## 7. Task breakdown

Reihenfolge so gewählt, dass Backend vor Frontend fertig ist (Frontend greift auf neue Fehlertexte zu). Frontend-UI-Teile (Feldkatalog, Accept-Attribut, Template-Button) sind Backend-unabhängig und können parallel laufen.

### Backend-Tasks

**T1** — Dependency: `xlrd` hinzufügen.
- Datei: `pundo_main_backend/pyproject.toml`
- Aktion: `xlrd>=2.0,<3.0` in `dependencies`-Liste einfügen (alphabetisch neben `openpyxl`).
- Dann: `uv lock` und `uv sync` im Backend-Repo.
- Dep: keine.

**T2** — Parser: `parse_xls_bytes` implementieren.
- Datei: `pundo_main_backend/ingestor/ingestion/shop_owner_import.py`
- Aktion: Neue Funktion `parse_xls_bytes(content: bytes) -> list[dict[str, Any]]`. Öffnet per `xlrd.open_workbook(file_contents=content)`, nutzt `sheet_by_index(0)`, iteriert Zeilen. Output-Shape identisch mit `parse_xlsx_bytes`. Bei `xlrd.XLRDError` oder beliebiger Exception: `raise ValueError("xls file could not be read")` (wird im Handler in HTTPException 400 übersetzt).
- Dep: T1.

**T3** — Upload-Handler: `.xls`-Branch + Größenlimit + präziser Error-Text.
- Datei: `pundo_main_backend/ingestor/api/shop_owner_import.py`
- Aktion:
  - Import `parse_xls_bytes`.
  - Vor `filename`-Check: `if len(content) > 5 * 1024 * 1024: raise HTTPException(413, "File too large. Maximum size is 5 MB.")`.
  - Branch: `elif filename.endswith(".xls"): try: raw_rows = parse_xls_bytes(content) except ValueError: raise HTTPException(400, "xls file could not be read — please save as .xlsx or .csv")`.
  - Error-Text des Fallback-Zweigs: `"Unsupported file format. Use .xlsx, .xls or .csv"`.
- Dep: T2.

**T4** — Backend-Unit-Test für `parse_xls_bytes`.
- Datei: `pundo_main_backend/ingestor/tests/test_shop_owner_import.py` (erweitern oder neu)
- Aktion: Fixture-`.xls`-Datei (BIFF8, 2 Zeilen + Header) als Bytes einchecken oder zur Laufzeit generieren via `xlwt` (dev-only) — besser: kleines statisches Fixture in `ingestor/tests/fixtures/sample.xls`. Test prüft Shape und Werte.
- Dep: T2.

### Frontend-Tasks

**T5** — Translation-Keys in allen 6 Sprachen ergänzen.
- Datei: `src/lib/shop-admin-translations.ts`
- Aktion: 13 neue Keys (siehe 4.1) in jedem der 6 Sprach-Blöcke (`en`, `de`, `el`, `ru`, `ar`, `he`). Prüfliste: **jeder Key × 6 Sprachen = 78 Strings**. Arabisch und Hebräisch durchlesen auf Plausibilität.
- Dep: keine. Kann parallel zu T1–T4 laufen.

**T6** — `FieldCatalog` Komponente.
- Datei: `src/components/shop-admin/FieldCatalog.tsx` (neu)
- Aktion: Client Component, nimmt `lang: string`. Rendert `<details open className="...">` mit `<summary>{tr.field_catalog_title}</summary>`, Intro-Text, und `<table>` mit 4 Spalten (Column/Required/Description/Example) und 3 Zeilen (name/category/available). Feldnamen und Beispielwerte in `<code dir="ltr">`. Footnote. Tailwind: `border border-gray-200 rounded-xl p-4 text-sm`, matching ImportPanel-Look.
- Dep: T5.

**T7** — `ImportPanel` Erweiterung.
- Datei: `src/components/shop-admin/ImportPanel.tsx`
- Aktionen (in dieser Reihenfolge in der Datei):
  1. Import `FieldCatalog`.
  2. `accept=".xlsx,.xls,.csv"` am File-Input.
  3. Hint-String von `.xlsx, .csv` → `tr.upload_formats_hint`.
  4. Template-Download als sichtbarer `<a href="/api/shop-admin/import/template" download className="..." >` neben/unter dem Upload-Label (sekundärer Button-Style, grau). Text: `tr.download_template`.
  5. `<FieldCatalog lang={lang} />` zwischen Upload-Area und Ergebnis-Banner einfügen.
  6. `handleUpload` Fehlerlogik: bei `!res.ok` versuchen `body = await res.json()`, Error-String auf bekannte Detail-Texte mappen (siehe 3.1 + 5.3), sonst `tr.error_generic`.
  7. Nach Erfolg: falls `result.errors.some(e => e.message.includes('missing required column: name'))`, zusätzlichen Hinweis `<p>{tr.upload_hint_see_catalog}</p>` oberhalb der Fehlerliste rendern.
- Dep: T5, T6. Punkte 2/3/4/5 unabhängig von Backend einsetzbar; 6/7 benötigen Backend-Tasks T3 für korrektes End-to-End-Verhalten.

**T8** — Manuelles Smoke-Rauchtest / Nacharbeit.
- Aktion: Test-Instanz (`npm run dev:test` → Port 3500) hochfahren, Upload mit `.xlsx`, `.xls` (BIFF8, z.B. aus LibreOffice „Speichern unter → Excel 97–2003") und `.csv`. Verify: Feldkatalog sichtbar, Template-Download funktioniert, Fehlertext bei `.pdf`-Upload ist nicht mehr `error_generic`. Sprach-Switch auf `ar` → RTL-Layout prüft, Feldnamen bleiben LTR.
- Dep: T1–T7.

### Dependency-Graph

```
T1 ──► T2 ──► T3 ──► T8
          └──► T4
T5 ──► T6 ──► T7 ──► T8
         (T7 benötigt T3 funktional, nicht code-technisch)
```

T5 und T1 können sofort parallel starten. T6 blockt nur auf T5. T7 kann mit T5+T6 starten, letzte Politur braucht T3.

---

Architecture complete at `specs/2026-04-23-shop-admin-import-xls-feldkatalog/02-architecture.md`. Ready for coder.
