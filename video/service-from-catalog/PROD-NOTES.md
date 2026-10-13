# service-from-catalog: Produktionsnotizen (Stand 2026-10-13)

Teil 5 von „pundo for businesses“: „Add a service that's already on pundo“ (EN 1:29, EL 1:38). Freigegebenes DE-Skript: `01-skript.de.md`.
Links, Upload-Status, Endscreens/Playlists: Vault N7900.

## Dateien
| Datei | Inhalt |
|---|---|
| `scenes.yml` | meta (`demo.search`, `demo.name` je Sprache, `thumbnail_scene: catalog-photo`) + 7 Szenen EN/EL |
| `record.mjs` | Dashboard → Menü → „Offers“ → „+ Add offer“ → Auswahl → Namenssuche „Catering / events“ → Treffer antippen → Schritt 2 mit Katalogfoto („From Pundo“) → Preisart **„On request“** → Speichern → Liste → Shop-Seite (Pause/Resume): Karte „Price on request“, dann WhatsApp/Telefon hervorheben |
| `prepare_catalog_service.py` | läuft mit dem **Backend-venv**: entfernt im Demo-Shop **der aufgenommenen Sprache** Angebot + Listing für den Katalog-Eintrag `restaurant-allgemein-catering-veranstaltung` (das Plattform-Item bleibt), aktiviert die übrigen Angebote wieder. Nur `pundo_test`. `--dry-run` = ROLLBACK. Wird von `record.mjs` aufgerufen. |

Kein eigenes Foto: das Katalogfoto ist `/seed-visuals/catering-veranstaltung.webp` (Frontend `public/seed-visuals/`).

## Bauen
```
video/build.sh service-from-catalog [en|el] [--rerecord]
```
Voraussetzungen wie Teil 3/4 (Dev-Server dieses Repos auf 3500, keine parallelen Tests).

## Befunde & Lösungen
1. **B1 – unpassende Fuzzy-Treffer:** Die Item-Suche zeigt für „Catering“ im Kasten „Ähnliche Produkte“ u. a. „Sugaring“, „Piercing“, „Stein“, „Ironing at home“ (bei „catering events“ „Men's clothing“). → Suche mit dem vollen Namen „Catering / events“ / „Catering / εκδηλώσεις“ (keine Fuzzy-Treffer). Eigener Task.
2. **B2 – Kategorie:** Der Katalog-Eintrag hängt in „Restaurants“ statt „Catering“. Im Video nicht sichtbar. Eigener Task.
3. **B3 – fehlender Kontakt-Button:** Die Produkt-Detail-API (`/products/by-slug/…`) liefert bei Angeboten `shop_phone: null`, obwohl der Shop eine Telefonnummer hat → bei „Auf Anfrage“ fehlt auf der Detailseite der Button „Shop kontaktieren“. → Schluss-Szene zeigt die Kontakt-Links (WhatsApp/Telefon) der Shop-Seite statt der Detailseite. Eigener Task.
4. Der EN-Demo-Shop hat den Backkurs aus Teil 4 nicht mehr (siehe `service-create-new/PROD-NOTES.md` Punkt 6); die Shop-Seite zeigt daher Catering, Sirup, Brot.

## Offene Punkte
- Aussprache nicht nach Gehör geprüft (EN/EL „Catering“).
- Nach dem Upload: Endscreen von `service-create-new` → dieses Video, dieses Video in beide Playlists (siehe N7900).
