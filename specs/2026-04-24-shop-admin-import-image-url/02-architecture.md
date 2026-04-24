# Architecture — Shop-Admin Import `image_url`

**Slug:** `2026-04-24-shop-admin-import-image-url`
**Design-Ref:** `specs/2026-04-24-shop-admin-import-image-url/01-design.md`
**Frontend-Repo:** `/Users/bb_studio_2025/dev/github/pundo_frontend`
**Backend-Repo:** `/Users/bb_studio_2025/dev/github/pundo_main_backend`

---

## §0. Architect-Entscheidungen zu offenen Fragen

| # | Frage | Entscheidung | Begründung |
|---|---|---|---|
| 1 | Async-Mechanismus | **FastAPI `BackgroundTasks`** — der gleiche Mechanismus den `shop_owner_import.py` bereits für `_background_sync` (Google Sheets) nutzt. Kein neuer Worker, keine neue Dep. | Precedent vorhanden (`background_tasks.add_task(_background_sync, shop_id)`). Kein Celery/ARQ im Repo. `apscheduler` ist nur für periodische Cron-Jobs reserviert. |
| 2 | Fehler-Persistenz | **JSONB-Spalte `image_download_errors` auf `import_status`** (bestehende Tabelle). `list[{product_name, url, reason}]` plus `last_image_download_at` (TIMESTAMP). | Es existiert bereits eine `import_status`-Tabelle mit unique index auf `shop_id`. Keine neue Tabelle nötig. JSONB ist einfach zu serialisieren und zu löschen. Eine eigene Error-Tabelle wäre Overkill für max. ein paar Dutzend Zeilen pro Shop. |
| 3 | Speicherort | **Identisch zu `product_image_ingestor.ingest_image_with_variants()`** — SHA256-dedupliziert unter `PRODUCT_IMAGE_DIR`, mountet als `/product_images/<sha>_card.webp` etc. | Manueller Upload-Pfad existiert (`ingest_image`) und wird bereits für Offer-Bilder, Review-Fotos etc. verwendet. Neuer Code wiederverwendet diese Pipeline → garantiert gleiche Bildvarianten wie manuell hochgeladen. |
| 4 | Content-Type-Whitelist | **`image/jpeg`, `image/png`, `image/webp`** — gleich zu `_LOGO_ALLOWED_TYPES` in `shop_owner_shop.py`. **`image/gif` wird abgelehnt.** | Konsistenz mit Logo-Upload. GIF bringt Animation mit, die die Variant-Pipeline (WebP static) nicht unterstützt. Kann später ergänzt werden. |
| 5 | Größenlimit | **5 MB pro Bild** (`_LOGO_MAX_BYTES`-Muster). Zusätzlich: **HTTP-Timeout 10 s**, **HTTP-Read-Limit 6 MB** (damit ein 100 GB-Stream nicht den Prozess füllt). | Gleich wie Logo-Upload. Timeout ausreichend für normale Bilder; falls zu knapp später konfigurierbar machen. |
| 6 | DB-Migration-Konvention | Alembic, eine einzige neue Revision unter `ingestor/db/migrations/versions/` — Namensformat `<12-hex>_<snake_desc>.py`, `revision`/`down_revision`-Block wie in `a1b2c3d4e5f6_add_offer_image_url.py`. Head-Check vor Commit. | Siehe Beispiel-Revisions. Keine mehrfachen Heads erzeugen. |
| 7 | DB-Feld auf `shop_owner_products` | Zwei neue Spalten: **`image_url TEXT NULLABLE`** (vom User importierte Quell-URL, reiner Audit-Wert) und **`image_path TEXT NULLABLE`** (serverseitiger Card-Variant-Pfad, z.B. `/product_images/<sha>_card.webp` — das ist was die UI rendert). Die Trennung erlaubt: (a) „URL gesehen aber Download fehlgeschlagen" → `image_url` gesetzt, `image_path` NULL; (b) Re-Import-Vergleich „Zelle == letzter `image_url`" → kein Re-Download. | Best-of-both. Ein reines `image_url`-Feld macht den DB-Inhalt abhängig von externer Verfügbarkeit; ein reines `image_path` verliert den Audit-Trail. |
| 8 | Leere Zelle beim Re-Import | **`image_path` bleibt unverändert.** `image_url` wird ebenfalls nicht überschrieben. | Matching der Design-Annahme. Explizit in AC-6. |
| 9 | Fehler-TTL | Fehler-Liste wird bei **nächstem erfolgreichen Upload** für denselben Shop überschrieben (komplett ersetzt). Kein „Dismiss"-Button in dieser Phase. | Einfach und deterministisch. User sieht immer den Stand des letzten Imports. |
| 10 | Frontend-URL-Validierung | **Keine.** Das Backend validiert via tatsächlichem Download-Versuch. | Vermeidet Duplikat-Logik; CSV/XLSX können auch Leerzeichen, relative URLs etc. enthalten — Backend-Fehler-Pfad ist robust. |

### Breaking-Change-Flag
- **Keine Breaking Changes.** `ImportUploadResponse` erhält optionales Feld `image_download_pending`. `GoogleSheetStatusResponse` wird in ein neues Response-Schema `ImportStatusResponse` umbenannt **ODER** um optionale Felder erweitert. → Entscheidung: **erweitern**, kein Rename — bestehende Frontend-Version bleibt kompatibel, neue Felder werden ignoriert wenn nicht genutzt.

### Migrationsrisiko
- Alembic-Migration nur `ADD COLUMN` auf `shop_owner_products` + `import_status` → rückwärtskompatibel, downgrade trivial.
- Bestehende Rows: `image_url`/`image_path` = NULL → entspricht „kein Bild", keine Re-Migration-Logik nötig.

---

## §1. Affected modules / files

### Backend (`/Users/bb_studio_2025/dev/github/pundo_main_backend`)

| Pfad | Änderung |
|---|---|
| `ingestor/models/shop_owner_product.py` | + `image_url: Mapped[Optional[str]]`, + `image_path: Mapped[Optional[str]]` |
| `ingestor/models/import_status.py` | + `image_download_errors: Mapped[Optional[list]]` (JSONB), + `last_image_download_at: Mapped[Optional[datetime]]` |
| `ingestor/db/migrations/versions/<new>_add_import_image_url_fields.py` | NEU — `ADD COLUMN` Statements, `down_revision` = aktueller head |
| `ingestor/ingestion/shop_owner_import.py` | `parse_rows()` liest optional `image_url`; `upsert_products()` setzt `image_url`-Feld, gibt zusätzliche Liste `image_download_jobs: list[(shop_owner_product_id, url)]` zurück; `generate_template_xlsx()` bekommt Spalte `image_url` + Beispiele |
| `ingestor/ingestion/shop_owner_image_downloader.py` | NEU — `download_product_images(shop_id, jobs)`: synchrone Schleife, `httpx.Client`, Content-Type-Whitelist, Size-Guard, ruft `ingest_image_with_variants`, setzt `ShopOwnerProduct.image_path`, persistiert Fehler in `ImportStatus.image_download_errors` |
| `ingestor/api/shop_owner_import.py` | `upload_file()` sammelt Jobs, triggert `background_tasks.add_task(_background_image_download, shop_id, jobs)`, setzt `image_download_pending` im Response; `get_import_status()` liefert `image_download_errors`, `last_image_download_at` |
| `ingestor/schemas/shop_owner.py` | `ImportUploadResponse` + `image_download_pending: int = 0`; `GoogleSheetStatusResponse` + `image_download_errors: list[ImageDownloadErrorItem] \| None = None`, + `last_image_download_at: datetime \| None = None`; neues Modell `ImageDownloadErrorItem` |
| `ingestor/api/shop_owner_products.py` | `_to_response()` liefert `image_path` an die Shop-Owner-Produktliste (nur lesend; für Portal-UI „mein Produkt hat ein Bild"). Non-breaking addition. |
| `ingestor/tests/test_shop_owner_import.py` | NEU — Unit-Tests für Parser + Downloader (HTTPX mocked) |

### Frontend (`/Users/bb_studio_2025/dev/github/pundo_frontend`)

| Pfad | Änderung |
|---|---|
| `src/types/shop-admin.ts` | + `ImageDownloadError` interface; + `image_download_errors?: ImageDownloadError[]`, `last_image_download_at?: string` auf `ImportStatus`; + `image_download_pending?: number` auf `ImportUploadResult` |
| `src/lib/shop-admin-translations.ts` | Neue Keys in allen 6 Sprachen (siehe §4) |
| `src/components/shop-admin/FieldCatalog.tsx` | Neue Tabellenzeile `image_url` (optional) mit Beschreibung + Beispiel |
| `src/components/shop-admin/ImportPanel.tsx` | (a) Info-Hinweis wenn `uploadResult.image_download_pending > 0`; (b) amber-Banner wenn `status.image_download_errors?.length > 0` mit aufklappbarer Fehler-Liste; (c) Status-Polling: nach Upload mit Pending nach ~3 s GET `/api/shop-admin/import/status` neu abrufen |
| `src/app/(shop-admin)/shop-admin/(portal)/import/page.tsx` | keine Änderung (nur die Child-Komponenten) — zu prüfen beim Coder ob Status bereits server-seitig geladen wird |

### Clean-Boundary-Check
- `ImportPanel.tsx` und `FieldCatalog.tsx` nutzen ausschließlich `@/lib/shop-admin-translations`, `@/types/shop-admin`, `./Toast`, `./FieldCatalog`. Keine neuen Imports aus customer-facing Code.

---

## §2. Data model changes

### 2.1 Alembic-Migration

Dateiname: `<12-hex-id>_add_import_image_url_fields.py`, `down_revision` = aktueller Alembic-Head (Coder ermittelt via `alembic heads`).

```python
def upgrade() -> None:
    op.add_column(
        "shop_owner_products",
        sa.Column("image_url", sa.Text(), nullable=True),
    )
    op.add_column(
        "shop_owner_products",
        sa.Column("image_path", sa.Text(), nullable=True),
    )
    op.add_column(
        "import_status",
        sa.Column(
            "image_download_errors",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )
    op.add_column(
        "import_status",
        sa.Column(
            "last_image_download_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

def downgrade() -> None:
    op.drop_column("import_status", "last_image_download_at")
    op.drop_column("import_status", "image_download_errors")
    op.drop_column("shop_owner_products", "image_path")
    op.drop_column("shop_owner_products", "image_url")
```

### 2.2 Sqlalchemy-Modell-Fragmente

```python
# shop_owner_product.py
image_url: Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
image_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

# import_status.py
from sqlalchemy.dialects.postgresql import JSONB
image_download_errors: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
last_image_download_at: Mapped[Optional[datetime]] = mapped_column(
    DateTime(timezone=True), nullable=True
)
```

### 2.3 `image_download_errors` JSONB-Shape
```json
[
  {"product_name": "Royal Canin Adult Cat 5kg",
   "url": "https://example.com/missing.jpg",
   "reason": "http 404"}
]
```
`reason`-Werte (stabile Strings, UI darf auf sie matchen für Tests):
- `"http 404"`, `"http 403"`, `"http 500"` usw.
- `"timeout"`
- `"invalid content-type: <received>"`
- `"file too large"`
- `"invalid url"`
- `"unknown error"`

---

## §3. API contracts

### 3.1 `POST /api/v1/shop-owner/import/upload`

**Response — erweitert (non-breaking):**
```ts
{
  imported: number,
  errors: { row: number; message: string }[],
  image_download_pending: number   // NEU (default 0)
}
```
Die Response wird **sofort** zurückgegeben — der asynchrone Download läuft via `BackgroundTasks` nach Response-Commit.

### 3.2 `GET /api/v1/shop-owner/import/status`

**Response — erweitert:**
```ts
{
  google_sheet_url?: string,
  last_sync?: string,
  last_sync_status?: 'ok' | 'error',
  last_sync_message?: string,

  // NEU:
  image_download_errors?: {
    product_name: string;
    url: string;
    reason: string;
  }[],
  last_image_download_at?: string  // ISO-8601
}
```

### 3.3 `GET /api/v1/shop-owner/import/template`
**Response:** `.xlsx` mit Header `name, category, available, image_url`, eine Beispielzeile mit Dummy-URL und eine mit leerem `image_url`-Feld.

### 3.4 Fehler-Cases
- Upload-Phase: unverändert (413, 400-Unsupported, 400-xls-unreadable).
- Download-Phase: keine HTTP-Fehler — jeder Fehler pro URL landet in `image_download_errors`.

---

## §4. Dependencies & integration points

### 4.1 Neue Backend-Libraries
- **Keine.** `httpx>=0.27` ist bereits in `pyproject.toml`. `Pillow>=10.0` auch. `openpyxl`, `xlrd` vorhanden.

### 4.2 Neue Translation-Keys (alle 6 Sprachen: en, de, el, ru, ar, he)
- `field_image_url_desc` — „Optional URL to the product image (JPEG/PNG/WebP, max 5 MB). Downloaded in background."
- `field_image_url_example_label` — Beispiel-Text neben Code-Block (oder Code selbst: `https://example.com/product.jpg`)
- `image_download_pending` — „{n} product images are being downloaded in the background…" (Platzhalter `{n}`)
- `image_download_errors_title` — „{n} product images could not be loaded" (Platzhalter `{n}`)
- `image_download_errors_detail_toggle` — „Show details" / „Hide details"
- `image_download_error_reason_header` — „Reason" (für kleinen Header in Details-Liste)
- `image_download_last_checked` — „Last check: {ts}" (optional, verwendet `last_image_download_at`)

### 4.3 Integration Points
- **Static Mount:** `/product_images/*` ist bereits in `api/main.py` gemountet → keine Änderung.
- **Shared Image Pipeline:** neue Downloader-Funktion ruft `ingest_image_with_variants()` → Bilder landen im selben SHA256-dedupliziertem Pool wie manuelle Uploads.
- **Session-Handling im Background:** `get_session()` (nicht `get_db`) nutzen — bestehendes Muster in `_background_sync`.
- **Feature-Flag:** Keiner. Rollout per Deploy.

---

## §5. Risks & mitigations

| Risiko | Mitigation |
|---|---|
| SSRF — ein Shop-Owner lädt `http://169.254.169.254/` (AWS-Metadata) | Downloader blockiert private/link-local/loopback-Hostnames (IP-Whitelist-Check nach DNS-Resolve). Log-Eintrag `reason: "invalid url"` |
| Sehr große Datei (100 GB Stream) frisst Speicher | `httpx` mit `stream=True`, Content-Length-Check vorab, early abort nach 6 MB |
| Langsame Server → BackgroundTask hängt | HTTP-Timeout 10 s pro URL; Gesamtdauer pro Upload natürlich ohne Hard-Limit, aber pro URL begrenzt |
| Re-Import identischer URL erzeugt doppelten Download | Vergleich `new_url == product.image_url AND product.image_path is not None` → Skip |
| `BackgroundTask` läuft nach Response → kann bei Prozess-Restart abbrechen | Akzeptiert — Shop-Owner kann re-uploaden. Kein Retry/Persistenz in dieser Phase. In Spec-Risiken dokumentiert. |
| Fehler-Liste wird über Zeit groß | Jede neue Import-Session **ersetzt** die Liste komplett (kein Append). TTL implizit. |
| DB-Commit im Background-Task konkurriert mit anderen Requests | `get_session()` öffnet eigene Session — kein Shared-State. |
| `image_path` zeigt auf nicht-existente Datei (manueller Löschen in `product_images/`) | Out-of-scope. `product_images/` wird nicht gelöscht. Falls doch: UI zeigt kaputtes Bild, kein Crash. |
| RTL-Layout bricht bei amber-Banner | Verwendet bestehende Tailwind-`rtl:`-Modifier (siehe `ImportPanel`-Errorbanner — gleicher Stil). |
| Shop-Owner sieht Fehler nicht, weil er die Seite nicht refresht | `ImportPanel` triggert automatischen Status-Refetch ~3 s nach Upload wenn `image_download_pending > 0`, und nochmal nach 8 s falls noch nicht fertig. Einfacher Zwei-Stufen-Check, kein SSE. |

---

## §6. Journey-Deltas

### Drift-Check gegen `e2e/journeys/CATALOG.md`

Relevante Journeys:
- `shop-owner-full-lifecycle` (P1, implemented, last: FAIL)
- `import-page-ac-check` (P2, implemented, last: PASS)

**Vorgeschlagene Änderungen (NICHT ohne User-Bestätigung in Katalog schreiben):**

1. **`import-page-ac-check.spec.ts`** — neue Test-Cases hinzufügen (Coder schreibt; e2e-tester verifiziert):
   - AC-1: FieldCatalog zeigt Zeile `image_url`
   - AC-5: Upload ohne `image_url`-Spalte bleibt grün
   - AC-11: Template-Download enthält Header `image_url`

2. **NEUE Journey vorgeschlagen:** `shop-admin-import-image-url` (P2) — E2E-Check für den vollständigen Async-Flow:
   - Upload einer CSV mit 1 gültiger URL (Mock-Server auf Port 3500-Helper?) + 1 404-URL
   - Prüfung: Response `image_download_pending: 2`, Info-Banner sichtbar
   - Poll `/import/status` bis `image_download_errors.length === 1`
   - Amber-Banner sichtbar, öffnen, Fehler-Eintrag mit `reason: "http 404"` prüfen

3. **`shop-owner-full-lifecycle`**: Kein zwingender Delta — bestehender Import-Schritt funktioniert weiterhin (ohne `image_url`-Spalte). Optional: eine zusätzliche Assertion „importierte Produkte haben `image_path === null` wenn keine URL gesetzt" — nur falls die Journey bereits auf Produktbild-Attribute achtet.

Architect schlägt vor — **User muss Katalog-Mutationen freigeben.**

---

## §7. Task breakdown (für den Coder)

Reihenfolge: **Backend zuerst** (da Frontend-Typen von API-Shape abhängen). Innerhalb der Phasen parallelisierbar wo markiert.

### Phase A — Backend-Schema & Migration

- **T1 · Alembic-Migration schreiben** (~0.5 h)
  - Datei: `ingestor/db/migrations/versions/<head+1>_add_import_image_url_fields.py`
  - `alembic heads` vor Commit prüfen — keine neue Head-Divergenz erzeugen
  - `upgrade()` + `downgrade()` wie in §2.1
  - Lokal gegen `pundo_test` anwenden und rollbacken testen
  - **Dependencies:** keine

- **T2 · SQLAlchemy-Modelle erweitern** (~0.25 h, parallel zu T1)
  - `shop_owner_product.py`: + `image_url`, `image_path`
  - `import_status.py`: + `image_download_errors` (JSONB), + `last_image_download_at`
  - **Dependencies:** T1 (Migration muss existieren bevor Modell gegen DB läuft — aber Code-Edit kann parallel erfolgen)

### Phase B — Backend-Parser + Downloader + Endpoints

- **T3 · Parser + Template erweitern** (~1 h)
  - `shop_owner_import.py`:
    - `ALL_COLUMNS` um `image_url` erweitern (optional)
    - `parse_rows()` zieht `image_url` heraus, leerer String → `None`
    - `upsert_products()` Signatur-Änderung: return `(imported, errors, image_download_jobs)`; `image_download_jobs: list[{"product_id": int, "name": str, "url": str}]`. Logik: wenn neuer URL-Wert ≠ `existing.image_url` oder `existing.image_path is None` → Job; leere Zelle → Skip (kein Override)
    - `generate_template_xlsx()`: Header + zwei Beispielzeilen (eine mit URL, eine ohne)
  - Keine Breaking Changes für Aufrufer außer erweitertem Return-Tupel von `upsert_products` — nur ein Aufrufer (`shop_owner_import.py`-API) zu patchen (T5)
  - **Dependencies:** T2

- **T4 · Image-Downloader-Modul** NEU (~2 h)
  - Datei: `ingestor/ingestion/shop_owner_image_downloader.py`
  - Öffentliche Funktion: `download_product_images(shop_id: int, jobs: list[dict]) -> None` (wird als BackgroundTask ausgeführt)
  - Für jeden Job:
    1. URL-Sanity-Check: `startswith("http://", "https://")`; Hostname nicht loopback/private/link-local (nutze `ipaddress`-Modul nach `socket.getaddrinfo`) — sonst `reason: "invalid url"`
    2. `httpx.Client(timeout=10.0, follow_redirects=True, limits=...)` GET
    3. Status != 2xx → `reason: f"http {status}"`
    4. Content-Type prüfen gegen `{"image/jpeg", "image/png", "image/webp"}` (erster Teil vor `;`) — sonst `reason: f"invalid content-type: {ct}"`
    5. Content-Length > 5 MB → Skip & `reason: "file too large"`; auch `read()` mit manueller Grenze (kein unbegrenztes Slurp)
    6. `ingest_image_with_variants(data, filename_from_url)` → `card`-URL als `image_path`
    7. Update `ShopOwnerProduct`: setze `image_url=job["url"]`, `image_path=variant_urls["card"]` (Fallback `orig`)
  - Session via `get_session()`, **ein** Commit pro URL oder Batch am Ende (Batch bevorzugt). Robust gegen Teilfehler — ein fehlgeschlagener Job darf andere nicht abbrechen (try/except pro Job)
  - Am Ende: `import_status.image_download_errors = errors or None`, `last_image_download_at = now()`, commit
  - Logging: `logger.info("image_download_complete shop_id=%s succeeded=%d failed=%d")`
  - **Dependencies:** T2, T3

- **T5 · API-Endpoint anpassen** (~1 h)
  - `ingestor/api/shop_owner_import.py`:
    - `upload_file()` bekommt `background_tasks: BackgroundTasks`-Param
    - Ruft neu `imported, errors, jobs = upsert_products(...)`
    - `background_tasks.add_task(_background_image_download, owner.shop_id, jobs)` wenn `jobs`
    - Response: `ImportUploadResponse(imported=..., errors=..., image_download_pending=len(jobs))`
    - `_background_image_download(shop_id, jobs)` Helper analog zu `_background_sync`
  - `get_import_status()`: liest `image_download_errors`, `last_image_download_at` und gibt sie in Response
  - `ingestor/schemas/shop_owner.py`: `ImportUploadResponse.image_download_pending: int = 0`; `GoogleSheetStatusResponse` um `image_download_errors`, `last_image_download_at` erweitern; neue Klasse `ImageDownloadErrorItem`
  - **Dependencies:** T3, T4

- **T6 · Backend-Unit-Tests** (~1.5 h, parallel zu Frontend-Phase startbar)
  - `ingestor/tests/test_shop_owner_import_image_url.py`
    - Parser: `image_url`-Spalte vorhanden / fehlt / leer
    - Template: Header enthält `image_url`
    - Downloader: httpx-Mock (via `respx` oder `httpx.MockTransport`) — happy path, 404, timeout, invalid content-type, file-too-large, SSRF-IP
    - Re-Import: identische URL skippt, leere Zelle überschreibt nicht, neue URL triggert Download
  - **Dependencies:** T3, T4

### Phase C — Frontend-Types + Translations

- **T7 · TypeScript-Typen** (~0.25 h, parallel zu T5)
  - `src/types/shop-admin.ts`:
    ```ts
    export interface ImageDownloadError {
      product_name: string
      url: string
      reason: string
    }
    // Erweiterungen von ImportStatus / ImportUploadResult (siehe §1)
    ```
  - **Dependencies:** Spec-Freeze (keine Code-Deps)

- **T8 · Translations für alle 6 Sprachen** (~0.75 h, parallel zu T7)
  - `src/lib/shop-admin-translations.ts`: alle in §4.2 gelisteten Keys in jedem Sprachblock (en, de, el, ru, ar, he)
  - Platzhalter `{n}` bleibt als Literal — ersetzt in Komponente
  - **Dependencies:** keine

### Phase D — Frontend-UI

- **T9 · `FieldCatalog.tsx` — Zeile `image_url`** (~0.25 h)
  - Neue `<tr>`-Row: Code `image_url`, Optional, `tr.field_image_url_desc`, Beispiel `https://example.com/product.jpg`
  - **Dependencies:** T8

- **T10 · `ImportPanel.tsx` — Info-Hinweis + Amber-Banner** (~1.5 h)
  - Nach Upload-Success: wenn `result.image_download_pending > 0`, zeige separaten Info-Block (blau, `bg-blue-50 border-blue-200`) mit `tr.image_download_pending.replace('{n}', ...)`
  - Nach Upload-Success mit Pending: setTimeout 3 s → GET `/api/shop-admin/import/status`, bei noch-pending/fehlern erneut nach 8 s
  - Amber-Banner: wenn `status.image_download_errors?.length`, zeige `<details>`-Block mit Titel + aufklappbarer `<ul>` mit Produktname / URL (als `<code>`) / Grund
  - RTL: bestehende `rtl:`-Konventionen nutzen, `text-start`, `pe-3` usw.
  - **Dependencies:** T7, T8

- **T11 · E2E-Smoke in bestehendem `import-page-ac-check.spec.ts`** (~0.5 h)
  - Assert: FieldCatalog zeigt `image_url`-Zeile
  - Assert: Template-Download enthält Bytes mit `image_url` im Header (xlsx → openpyxl lesen im Test-Setup? Alternativ: nur Response-Header + Content-Length prüfen)
  - Assert: Upload ohne `image_url`-Spalte zeigt keinen Info-Block und keinen amber-Banner
  - **Dependencies:** T9, T10 — und T1-T5 müssen deployed sein auf Port 8500

- **T12 · Neue E2E-Journey `shop-admin-import-image-url` (vorschlag)** (~1.5 h, *nur wenn User in §6 die Journey-Mutation freigibt*)
  - Separate `.spec.ts`, Mock-HTTP-Server für Image-URLs (kleines Node-Snippet in Test-Setup oder reuse `e2e/helpers/`)
  - Full flow: Upload → Pending-Banner → Poll → Fehler-Banner
  - **Dependencies:** T10, User-Freigabe der Journey-Mutation

### Parallelisierungs-Hinweis
- Nach T2 können T3/T4/T6/T7/T8 parallel starten (unterschiedliche Dateien, klare Interfaces).
- T5 ist Sync-Point für Backend-Deploy.
- T9 + T10 parallel nach T7/T8.

### Gesamtaufwand (Grobschätzung)
Backend: ~6 h · Frontend: ~3 h · E2E: 0.5–2 h. Ein Coder-Tag realistisch ohne T12, ein bisschen mehr mit T12.

---

Architecture complete at `specs/2026-04-24-shop-admin-import-image-url/02-architecture.md`. Ready for coder.
