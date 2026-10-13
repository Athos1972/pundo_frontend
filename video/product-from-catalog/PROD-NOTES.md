# product-from-catalog: Produktionsnotizen (Stand 2026-10-13, veröffentlicht)

> EN https://youtu.be/sgnLYIeMkOk · EL https://youtu.be/6JhpJabNF2E

Teil 3 von „pundo for businesses“: „Add a product that's already on pundo“ (EN 1:45, EL 1:52). Freigegebenes DE-Skript: `01-skript.de.md`.
Links, Upload-Status, Endscreens/Playlists: Vault N7900.

## Dateien
| Datei | Inhalt |
|---|---|
| `scenes.yml` | meta (`demo.ean`, `demo.search` je Sprache, `demo.price`, `thumbnail_scene: catalog-photo`) + 8 Szenen EN/EL |
| `record.mjs` | Dashboard → Menü → „Offers“ → „+ Add offer“ → Auswahl-Dialog → EAN tippen (Treffer nur hervorheben) → Namenssuche → Treffer antippen → Schritt 2 mit Katalogfoto → „Fixed price“, „Piece“, 6.90/6,90 → Speichern → Liste → Shop-Seite (Pause/Resume beim Seitenwechsel) |
| `prepare_catalog.py` | läuft mit dem **Backend-venv** (Bild-Pipeline + DB): legt das fiktive Katalog-Item an (Slug `troodos-valley-carob-syrup-500ml`, source `admin`, Kategorie 4647 „Syrup“, EAN `2001234567893`, Namen in 6 Sprachen) + Foto via `ingest_image_with_variants` (`contributed_by_shop_id` NULL → „From Pundo“); aktiviert die von den Demo-Shops angebotenen Items wieder (Annas Brot); gibt Item-ID + Shop-Slugs aus. Nur `pundo_test`, sonst Abbruch. `--dry-run` = ROLLBACK. Wird von `record.mjs` automatisch aufgerufen. |
| `assets/catalog-photo.jpg` | Packshot: Draw Things FLUX schnell, Seed 3101 (`assets/photo-candidates/`, gitignored) + Etikett „TROODOS VALLEY · Carob Syrup · 500 ml“ per PIL |

## Bauen
```
video/build.sh product-from-catalog [en|el] [--rerecord]
```
Voraussetzungen: Test-Instanz (Frontend :3500 = **Dev-Server** dieses Repos, Backend :8500), **keine parallelen E2E-/pytest-Läufe**, Teil 2 (`product-create-new`) wurde für beide Sprachen gebaut (Annas Brot muss als Angebot im Demo-Shop stehen; die Konsole meldet `bread offer present`).
`record.mjs` räumt vor der Aufnahme nur das Sirup-Angebot/-Listing des Demo-Shops auf, das Brot bleibt.

## Befunde & Lösungen
1. **Katalog ohne Barcodes, mit Foto fast nur Tierbedarf** (`pundo_test` = Prod-Kopie). → fiktives Demo-Item (Entscheid BB „Anna's Bakery + Demo-Katalogprodukt“). EAN aus dem GS1-Bereich 200–299 (interne Nummern), damit kein echtes Produkt getroffen wird.
2. **EN-Suche „carob“ / „carob syrup“** listet Hunde-Leckerli („Barking Bakery Carob Woofin…“) und blendet den Kasten „Similar products or services found“ ein. → EN sucht nach „Troodos“ (keine Fuzzy-Treffer), EL nach „χαρουπόμελο“.
3. **Button beim Barcode-Treffer hieß „Selected“** (Zustand statt Aktion). → vor der Aufnahme behoben: Key `item_picker_select` („Select“/„Auswählen“/„Επιλογή“/„Выбрать“/„اختيار“/„בחירה“).
4. **Teil 2 deaktiviert Annas Brot der jeweils anderen Sprache** (sein `prepare.sh` deaktiviert alle `shop_manual`-Items der Video-Demo-Shops). → `prepare_catalog.py` aktiviert alles wieder, was die Demo-Shops als aktives Angebot führen.
5. **Port 3500 kann von anderen Sessions belegt werden** (E2E startet dort einen Standalone-Build ohne lokale Änderungen). Erste Aufnahme brach deshalb bei der Namenssuche ab. → vor dem Bauen prüfen, dass der Dev-Server dieses Repos auf 3500 läuft (`lsof -iTCP:3500` → `next dev`, nicht `.next/standalone`).

## Offene Punkte
- Aussprache nicht nach Gehör geprüft: EL „barcode“, „Troodos Valley“; EN „Troodos“.
- Erledigt beim Upload: Playlists, Endscreen (automatisch + Abo), Endscreen von `product-create-new` → dieses Video. Sobald Teil 4 online ist, den Endscreen hier gezielt auf Teil 4 umstellen.
