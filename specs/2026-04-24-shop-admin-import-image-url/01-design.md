# Shop-Admin Import — Optionale Spalte `image_url`

**Slug:** `2026-04-24-shop-admin-import-image-url`
**Datum:** 2026-04-24
**Betrifft:**
- Frontend: `src/components/shop-admin/FieldCatalog.tsx`, `src/components/shop-admin/ImportPanel.tsx`, `src/types/shop-admin.ts`, `src/lib/shop-admin-translations.ts`
- Backend: `ingestor/ingestion/shop_owner_import.py`, `ingestor/models/shop_owner_product.py`, Import-API-Route

---

## 1. Problem & Nutzer

Shop-Owner verwalten ihre Produktlisten per XLS/CSV-Upload. Derzeit gibt es keinen Weg, Produktbilder per Import-Datei zu setzen — sie müssen jedes Bild manuell im Portal hochladen. Das kostet bei größeren Sortimenten unverhältnismäßig viel Zeit.

Ziel: Eine neue optionale Spalte `image_url` im Import. Das Backend lädt das Bild nach dem Upload-Response **asynchron** herunter und speichert es als Produktbild. Fehler beim Bildladen (404, falscher Content-Type, Timeout) sollen im nächsten Import-Status-Abruf sichtbar sein, blockieren jedoch nicht die direkte Upload-Antwort.

Zielgruppe: Shop-Owner mit mittleren bis großen Sortimenten (> 20 Produkte), alle 6 Sprachen.

---

## 2. User Flows

### Happy Path — Import mit gültigen Bild-URLs

1. Shop-Owner öffnet `/shop-admin/import`.
2. Er sieht im Feldkatalog die neue Zeile `image_url` (optional) mit Beschreibung und Beispiel.
3. Er bereitet seine XLS/CSV-Datei vor: Spalte `image_url` enthält `https://…/product.jpg` (oder bleibt leer bei Produkten ohne Bild).
4. Er lädt die Datei hoch.
5. Backend antwortet sofort mit `{ imported: N, errors: [], image_download_pending: M }` (M = Anzahl der Zeilen mit `image_url`).
6. UI zeigt Success-Toast mit Zahl der importierten Produkte **plus** einen Info-Hinweis: „M Produktbilder werden im Hintergrund geladen."
7. Asynchron lädt das Backend die Bilder herunter, speichert sie (gleicher Pfad wie manuell hochgeladene Produktbilder) und trägt den Status je Produkt in die DB ein.
8. Shop-Owner ruft nach wenigen Sekunden die Seite erneut auf (oder triggert manuellen Status-Refresh) → `ImportStatus` enthält `image_download_errors`, falls Fehler aufgetreten sind.

### Edge Case A — Einzelne Bild-URLs nicht erreichbar (404 / Timeout)

1. Import läuft durch, N Produkte importiert.
2. Backend versucht asynchron Bilder zu laden; 2 von 10 URLs liefern 404.
3. Beim nächsten Aufruf von `/api/shop-admin/import/status` enthält `image_download_errors` eine Liste mit `{ product_name, url, reason }`.
4. UI zeigt im `ImportPanel` unter dem letzten Upload-Ergebnis einen amber-Banner: „2 Produktbilder konnten nicht geladen werden" + aufklappbare Liste mit Produktname, URL, Fehlergrund.

### Edge Case B — URL vorhanden, aber Content-Type kein Bild

1. Eine URL liefert HTTP 200, aber `Content-Type: text/html`.
2. Backend verwirft das Ergebnis, trägt Fehler `invalid content-type: text/html` in die Fehler-Liste ein.
3. Produkt wird trotzdem ohne Bild importiert.
4. Anzeige wie Edge Case A.

### Edge Case C — Re-Import: Produkt existiert bereits, neue `image_url` angegeben

1. Shop-Owner importiert eine aktualisierte Liste; ein bestehendes Produkt hat jetzt eine andere oder neue `image_url`.
2. ⚠️ **ANNAHME:** Die neue URL **überschreibt** das bestehende Bild (Download wird erneut angestoßen). Wenn die neue Zelle leer ist, bleibt das vorhandene Bild **unverändert** (kein versehentliches Löschen).

### Edge Case D — Zeile ohne `image_url`-Spalte / leere Zelle

1. Die importierte Datei enthält die Spalte `image_url` gar nicht, oder eine Zelle ist leer.
2. Produkt wird ohne Bild importiert — exakt wie heute. Kein Fehler, keine Warnung.

---

## 3. Screen- / Komponenten-Inventar

| Element | Typ | Zweck |
|---|---|---|
| `FieldCatalog.tsx` | Erweiterung | Neue Tabellenzeile für `image_url`: Spalte · Optional · Beschreibung · Beispiel-URL. |
| `ImportPanel.tsx` | Erweiterung | (a) Zeigt nach Upload Info-Hinweis „M Bilder werden geladen" wenn `image_download_pending > 0`. (b) Zeigt amber-Banner für `image_download_errors` aus `ImportStatus` (ähnlich wie bestehende Fehler-Liste). |
| `ImportUploadResult` (Typ) | Erweiterung in `src/types/shop-admin.ts` | Neues optionales Feld `image_download_pending?: number`. |
| `ImportStatus` (Typ) | Erweiterung in `src/types/shop-admin.ts` | Neues optionales Feld `image_download_errors?: ImageDownloadError[]`. |
| `ImageDownloadError` (Typ, neu) | `src/types/shop-admin.ts` | `{ product_name: string; url: string; reason: string }` |
| Translations-Keys (neu) | `src/lib/shop-admin-translations.ts` | Alle 6 Sprachen: `image_download_pending`, `image_download_errors_banner`, `field_image_url_desc`. Alle 6 Sprachen. |
| Backend `ShopOwnerProduct.image_url` | Migration + Modell | Neues Feld `image_url: Optional[str]` in der DB-Tabelle `shop_owner_products`. |
| Backend `parse_rows()` | Erweiterung | Liest `image_url`-Spalte (wenn vorhanden) als optionalen String heraus. Keine Validierung des URL-Formats im Parser — das passiert beim Download-Versuch. |
| Backend `upsert_products()` | Erweiterung | Schreibt `image_url` ins Produkt-Objekt; wenn Zelle leer und Produkt existiert, bleibt vorhandenes Bild unverändert. |
| Backend Async-Image-Downloader (neu) | Task / Background Job | Wird nach `upsert_products()` gestartet. Lädt URLs herunter, validiert Content-Type, speichert Bild im gleichen Pfad wie manuelle Produktbild-Uploads. Schreibt Fehler in eine Fehler-Tabelle oder JSON-Spalte. |
| Backend Import-Status-Endpoint | Erweiterung | Liefert `image_download_errors` aus der DB wenn vorhanden. |
| Backend Import-Template (`generate_template_xlsx`) | Erweiterung | Spalte `image_url` in Header-Zeile und Beispielzeile (`https://example.com/product.jpg` / leer). |

---

## 4. Akzeptanzkriterien

1. **AC-1 (Feldkatalog zeigt `image_url`):** Auf `/shop-admin/import` ist im Feldkatalog eine neue Zeile `image_url` sichtbar (optional, mit Beschreibung und Beispiel-URL). Vorhanden in allen 6 Sprachen.

2. **AC-2 (Import mit gültiger Bild-URL):** Given eine CSV-Datei mit Spalten `name, image_url` und einer erreichbaren JPEG-URL · When hochgeladen · Then antwortet das Backend mit `imported: 1, image_download_pending: 1`; nach asynchronem Download hat das Produkt in der DB ein gesetztes `image_url`-Feld (oder Pfad zum gespeicherten Bild).

3. **AC-3 (Info-Hinweis bei pending):** When `image_download_pending > 0` im Upload-Result · Then zeigt die UI einen Info-Hinweis „{M} Produktbilder werden im Hintergrund geladen" (Translation-Key, nicht hardcoded, alle 6 Sprachen).

4. **AC-4 (Amber-Banner bei Download-Fehlern):** When `ImportStatus.image_download_errors` nicht leer · Then zeigt `ImportPanel` einen amber-Banner mit Anzahl und aufklappbarer Fehler-Liste (Produktname + URL + Grund). Banner verschwindet wenn keine Fehler mehr vorhanden.

5. **AC-5 (Kein Fehler bei fehlender `image_url`-Spalte):** Given eine Datei ohne `image_url`-Spalte · When hochgeladen · Then werden Produkte normal importiert, `image_download_pending: 0`, kein Fehler, kein Banner.

6. **AC-6 (Leere Zelle = kein Bild-Override):** Given ein bereits importiertes Produkt mit gesetztem Bild · When re-importiert mit leerer `image_url`-Zelle · Then bleibt das bestehende Produktbild unverändert.

7. **AC-7 (Neue URL = Bild-Override):** Given ein bereits importiertes Produkt · When re-importiert mit anderer (gültiger) `image_url` · Then wird ein neuer Download angestoßen und das Bild überschrieben.

8. **AC-8 (404 → Fehler im Status):** Given eine `image_url` die HTTP 404 liefert · When nach dem Upload `ImportStatus` abgerufen wird · Then enthält `image_download_errors` einen Eintrag mit `reason` der „404" oder „not found" enthält. Produkt wurde trotzdem ohne Bild importiert.

9. **AC-9 (Falscher Content-Type → Fehler im Status):** Given eine URL die HTTP 200 + `Content-Type: text/html` liefert · When nach dem Upload `ImportStatus` abgerufen wird · Then enthält `image_download_errors` einen Eintrag mit `reason` der den unerwarteten Content-Type benennt.

10. **AC-10 (Timeout → Fehler im Status):** Given eine URL die nicht antwortet (Timeout nach konfiguriertem Limit) · When nach dem Upload der Status abgerufen wird · Then enthält `image_download_errors` einen Eintrag mit `reason: "timeout"`. Import wurde nicht blockiert.

11. **AC-11 (Template enthält `image_url`):** Der Template-Download liefert eine `.xlsx`-Datei mit Header `name, category, available, image_url` und einer Beispielzeile mit einer Dummy-URL sowie einer Zeile mit leerem `image_url`-Feld.

12. **AC-12 (Clean Boundary):** `ImportPanel.tsx` und `FieldCatalog.tsx` importieren weiterhin nur aus `@/components/ui/*`, `@/lib/shop-admin-*`, `@/types/shop-admin`. Keine neuen Imports aus customer-facing Code.

13. **AC-13 (Keine Regressionen):** Bestehende `.xlsx`-, `.xls`- und `.csv`-Uploads ohne `image_url`-Spalte funktionieren unverändert. Google-Sheets-Connect/Sync/Remove bleibt funktional.

14. **AC-14 (RTL-Kompatibilität):** Neuer Info-Hinweis und amber-Banner rendern mit korrekter RTL-Ausrichtung bei `ar`/`he` (Tailwind `rtl:`-Modifier, kein explizites `dir`-Setzen im JS).

---

## 5. Offene Fragen

- ❓ **OFFEN (Bildformat-Whitelist):** Welche Content-Types sind erlaubt? Vorschlag: `image/jpeg`, `image/png`, `image/webp`. Soll `image/gif` erlaubt sein? Architect entscheidet.

- ❓ **OFFEN (Größenlimit):** Maximale Dateigröße pro heruntergeladenem Bild? Vorschlag: 5 MB (analog zum manuellen Logo-Upload). Muss in der Architecture-Phase festgelegt werden.

- ❓ **OFFEN (Speicherort):** Werden heruntergeladene Bilder im gleichen S3-Bucket/Verzeichnis wie manuell hochgeladene Produktbilder gespeichert? Falls ja: welche Namenskonvention für den Dateinamen (z.B. `shop_{id}_product_{id}_imported.jpg`)? Backend-Repo muss geprüft werden.

- ❓ **OFFEN (Async-Mechanismus):** Wie wird der asynchrone Download im Backend ausgeführt? Optionen: (a) FastAPI `BackgroundTask`, (b) Celery/ARQ-Task, (c) direkter `asyncio.create_task`. Hängt von bestehender Task-Infrastruktur ab — Architect prüft Backend-Repo.

- ❓ **OFFEN (Fehler-Persistenz):** Wo werden `image_download_errors` persistiert? Optionen: (a) eigene DB-Tabelle `import_image_errors`, (b) JSONB-Spalte in einer Import-Log-Tabelle, (c) nur im letzten `ImportStatus`-Cache (Redis). Architect entscheidet basierend auf bestehender Infrastruktur.

- ❓ **OFFEN (Fehler-TTL):** Wie lange bleiben `image_download_errors` im Status sichtbar? Vorschlag: bis zum nächsten erfolgreichen Import oder bis der User sie explizit bestätigt. Alternativ: 24-Stunden-TTL. Unklar ob ein „Schließen"-Button im Banner gewünscht ist.

- ❓ **OFFEN (URL-Validierung im Frontend):** Soll das Frontend eine Vorab-Validierung der `image_url`-Spalte durchführen (z.B. Syntax-Check „muss mit http/https beginnen")? Oder wird das vollständig dem Backend-Download überlassen?

- ❓ **OFFEN (Produktbild vs. image_url im DB-Modell):** Das aktuelle Modell `ShopOwnerProduct` hat kein `image_url`-Feld. Soll ein neues Feld `image_url` (gespeicherte externe URL) oder `image_path` (interner Pfad nach Download) hinzugefügt werden — oder beides? Architect und Backend klären.

- ⚠️ **ANNAHME:** Leere `image_url`-Zelle beim Re-Import überschreibt das bestehende Bild **nicht**. Falls die Anforderung ist, dass eine explizit leere Zelle das Bild löscht, muss das Feature erweitert werden.

- ⚠️ **ANNAHME:** Der asynchrone Download läuft serverseitig nach dem HTTP-Response — der Upload-Endpoint muss nicht auf den Download-Abschluss warten. Der Shop-Owner sieht den finalen Status erst beim nächsten Seiten-Refresh oder Status-Abruf (kein WebSocket/SSE in dieser Phase).

- ⚠️ **ANNAHME:** `image_download_pending` im Upload-Result ist eine einfache Zahl (wie viele Bilder angestoßen wurden), kein polling-fähiger Job-ID. Für eine spätere Phase könnte ein Job-ID-basiertes Polling sinnvoll sein.

---

Design complete at `specs/2026-04-24-shop-admin-import-image-url/01-design.md`. Ready for architect.
