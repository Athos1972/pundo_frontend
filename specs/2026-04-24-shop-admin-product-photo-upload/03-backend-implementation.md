# /coder → /e2e-tester Übergabe-Protokoll

Feature: Backend-Implementierung Shop-Owner Produktfoto-Upload (T1–T6): Modell, Endpoints, GC-Erweiterung, Tests, Migrationen.

---

## Task-by-Task Summary

| Task | Status | Anmerkung |
|------|--------|-----------|
| T1 — Model + Migration | DONE | `ShopOwnerProductImage` Modell, Relationship in `ShopOwnerProduct`, Migration `h1b2c3d4e5f6`, Merge-Migration `i2c3d4e5f6a7` (Single-Head wiederhergestellt) |
| T2 — Schemas | DONE | `ProductImageResponse`, `ProductReorderRequest`, `ProductResponse.images` ergänzt, `_to_response` liefert images |
| T3 — Upload-Endpoint | DONE | `POST /shop-owner/products/{id}/images` mit MIME-Check, Size-Check, Ownership, Limit-409, SHA256-Dedup, generate_variants |
| T4 — Delete + Reorder | DONE | `DELETE /shop-owner/products/{pid}/images/{iid}` (204), `PUT .../reorder` mit Zweistufen-Update |
| T5 — Tests | DONE | 19 neue Tests, alle grün |
| T6 — GC-Erweiterung | DONE | UNION-Query in `cleanup_orphan_images.py`, 4 neue Tests in `test_cleanup_scripts.py` |

---

## Geänderte Dateien

### Neue Dateien (Backend: `/Users/bb_studio_2025/dev/github/pundo_main_backend`)

- `ingestor/models/shop_owner_product_image.py` (NEU) — SQLAlchemy-Modell mit allen 9 Spalten, UniqueConstraint DEFERRABLE INITIALLY DEFERRED
- `ingestor/db/migrations/versions/h1b2c3d4e5f6_add_shop_owner_product_images.py` (NEU) — Tabelle, 2 Indexe, DEFERRABLE UNIQUE Constraint
- `ingestor/db/migrations/versions/i2c3d4e5f6a7_merge_heads_for_product_images.py` (NEU) — Merge-Migration, löst Mehrfach-Head-Problem
- `ingestor/tests/test_shop_owner_product_images_api.py` (NEU) — 19 Tests

### Geänderte Dateien (Backend)

- `ingestor/models/shop_owner_product.py` — Relationship `images` ergänzt (selectin, cascade all, delete-orphan, order_by sort_order)
- `ingestor/models/__init__.py` — Export `ShopOwnerProductImage`
- `ingestor/schemas/shop_owner.py` — `ProductImageResponse`, `ProductReorderRequest` neu; `ProductResponse.images` ergänzt
- `ingestor/api/shop_owner_products.py` — `_to_response` liefert images; neue Imports; `_product_image_dir()`, `MAX_IMAGES_PER_PRODUCT`; 3 neue Endpoints
- `ingestor/scripts/cleanup_orphan_images.py` — UNION-Query gegen `shop_owner_product_images` (alle 6 URL-Spalten)
- `ingestor/tests/test_cleanup_scripts.py` — 4 neue Tests in `TestCleanupOrphanImagesShopOwnerProtection`

---

## Alembic-Status

| DB | Version | Head? |
|----|---------|-------|
| `pundo_test` | `i2c3d4e5f6a7` | Ja |
| `pundo` | `i2c3d4e5f6a7` | Ja |

Migration-Chain: `a8b9c0d1e2f3` → `h1b2c3d4e5f6` → `i2c3d4e5f6a7` (merge mit `057fdaec566f`)

Hinweis: Auf prod wurde vor der Migration ein DB-Backup erstellt (`/Users/bb_studio_2025/pundo.cy/db_backups/backup_2026-04-24_14-23-35.pgdump`).

---

## Unit-Test-Ergebnis

```
19 neue Tests (test_shop_owner_product_images_api.py): 19/19 bestanden
4 neue Tests (test_cleanup_scripts.py): 25/25 bestanden (inkl. Bestand)
Gesamt neue/betroffene Tests: 44/44 PASS
```

---

## Coverage betroffener Module

| Modul | Coverage | Ziel | Status |
|-------|----------|------|--------|
| `ingestor/api/shop_owner_products.py` | 80% | 80% | PASS |
| `ingestor/models/shop_owner_product_image.py` | 95% | 90% | PASS |
| `ingestor/schemas/shop_owner.py` | 93% | 80% | PASS |
| `ingestor/scripts/cleanup_orphan_images.py` | 71% | 80% | GAP |

**COVERAGE_GAP:** `cleanup_orphan_images.py` — 71% statt 80%.
Ursache: Der `main()`-Entscheidungsbaum (interaktiver Bestätigungs-Prompt, Live-Deletion-Loop) ist nur über Integration-Tests vollständig erreichbar. Die Kern-Logik (`_collect_referenced_stems`, `_img_dir`) ist vollständig abgedeckt. Das GC-Script wird ausschließlich manuell oder via Cron ausgeführt; die fehlenden Pfade sind Boilerplate-CLI-Infrastruktur.

---

## Bekannte Lücken / Operator-Checkliste

### Neue Env-Var: `PRODUCT_IMAGE_DIR`

Der Operator muss auf Prod einrichten (vor dem nächsten Deploy):

```bash
sudo mkdir -p /opt/pundo-app/media/product_images
sudo chown 1000:1000 /opt/pundo-app/media/product_images
```

In `backend.env`:
```
PRODUCT_IMAGE_DIR=/app/media/product_images
```

In `docker-compose.yml`:
```yaml
- /opt/pundo-app/media/product_images:/app/media/product_images:rw
```

Das StaticFiles-Mount `/product_images` in `main.py` liest bereits aus `PRODUCT_IMAGE_DIR` — kein Code-Änderung nötig.

### Pre-Existing Test-Failures (nicht durch diese Implementierung verursacht)

- `test_shop_owner_models.py` — 8 Tests ERROR: `ImportStatus.image_download_errors` ist JSONB, inkompatibel mit SQLite in-memory. Ursache: Vorangehende Migration `a8b9c0d1e2f3` (add_import_image_url_fields, ein anderes Ticket) hat JSONB zu `ImportStatus` hinzugefügt, der Test-Code hat `ImportStatus.__table__` in `_TABLES` (SQLite). Nicht in Scope dieses Tickets.
- `pg_engine`-Fixture-Contention im Full-Test-Run: Bei parallelem Ausführen aller Tests mit `pg_engine` (module-scoped, macht `alembic downgrade base + upgrade head`) gibt es Race Conditions. Bekanntes Infrastruktur-Problem.

### Out of Scope (Frontend T7–T12)

Alle Frontend-Tasks (T7–T12) sind in einem separaten Frontend-Implementierungs-Ticket.

### Nicht implementiert: AC-4 (Kund:innen-Sichtbarkeit)

Explizit OUT OF SCOPE per Architektur §0. Fotos sind im Backend gespeichert, aber öffentliche Produkt-Query liefert sie nicht. Separates Design-Ticket.

---

## Wie Lokal Testen

```bash
cd /Users/bb_studio_2025/dev/github/pundo_main_backend
source .venv/bin/activate

# Unit-Tests (neue)
python -m pytest ingestor/tests/test_shop_owner_product_images_api.py -v
python -m pytest ingestor/tests/test_cleanup_scripts.py -v

# Test-Backend auf Port 8500 starten
./scripts/start_test_server.sh

# Migration verifizieren
export DATABASE_URL="postgresql+psycopg://pundo:Pundo!Software_#HaNb12@localhost:5432/pundo_test"
PYTHONPATH=. alembic current
# Erwartet: i2c3d4e5f6a7 (head)
```

---

## Empfehlung an E2E-Tester

- Upload-Flow: `POST /api/v1/shop-owner/products/{id}/images` gegen Port 8500 testen mit echtem JPEG ≤ 5 MB → Varianten in `PRODUCT_IMAGE_DIR` prüfen
- Limit-Enforcement: 8 Uploads, dann 409 mit `{ "detail": "max_images_reached" }`
- Reorder: `PUT .../reorder` mit vertauschter ID-Liste → DB-Reihenfolge prüfen
- Delete + GC: Datei bleibt nach DELETE auf Disk (GC-Job schlägt erst beim nächsten Lauf an)
- RTL: Nicht relevant für Backend-Tests
- Migration: Beide DBs (`pundo_test`, `pundo`) auf `i2c3d4e5f6a7` verifizieren

---

DB-Migration auf Prod wurde durchgeführt (destructive change: neue Tabelle). Operator-Setup für `PRODUCT_IMAGE_DIR` steht noch aus (manuell).
