# service-create-new: Produktionsnotizen (Stand 2026-10-13, veröffentlicht)

> EN https://youtu.be/mZZliUsNsC8 · EL https://youtu.be/GvH9BTpISIU

Teil 4 von „pundo for businesses“: „Add your services to pundo“ (EN 1:50, EL 2:01). Freigegebenes DE-Skript: `01-skript.de.md`.
Links, Upload-Status, Endscreens/Playlists: Vault N7900.

## Dateien
| Datei | Inhalt |
|---|---|
| `scenes.yml` | meta (`demo.search`, `demo.name`, `demo.category`, `demo.price` je Sprache, `thumbnail_scene: photo`) + 8 Szenen EN/EL |
| `record.mjs` | Dashboard → Menü → „Offers“ → „+ Add offer“ → Auswahl → Namenssuche ohne Treffer → „+ Create new“ → Name, Typ **„Service“**, Kategorie-Vorschlag „Cooking & Baking Classes“ → Speichern → Foto → Preisart-Feld hervorheben (Optionen im Sprechtext), „Fixed price“, Einheit „Session“, 35 → Speichern → Liste → Shop-Seite (Pause/Resume) |
| `prepare_service.py` | läuft mit dem **Backend-venv**: entfernt den Backkurs früherer Läufe (Angebote + Listings der Demo-Shops löschen, Item → inactive; nur `shop_manual`-Services mit „baking workshop“/„Εργαστήρι ψωμιού“ im Namen), aktiviert die übrigen Angebote der Demo-Shops (Brot, Sirup) wieder, prüft die Kategorie `px-cooking`. Nur `pundo_test`. `--dry-run` = ROLLBACK. Wird von `record.mjs` aufgerufen. |
| `assets/workshop-photo.jpg` | Draw Things FLUX schnell, Seed 4102 (`assets/photo-candidates/`, gitignored) |

## Bauen
```
video/build.sh service-create-new [en|el] [--rerecord]
```
Voraussetzungen wie Teil 3 (Dev-Server dieses Repos auf 3500, keine parallelen Tests) plus: Kategorie `px-cooking` in der DB
(Backend: `python scripts/seed_consumer_services.py --file scripts/data/consumer_services_w2_cooking.json --apply`).

## Befunde & Lösungen
1. **Keine Taxonomie-Kategorie für Koch-/Backkurse** (Vorschläge waren „Kids' Haircuts“, „Dance Classes“, „Handcraft Classes & Workshops“). → BB-Entscheid: neue Kategorie `px-cooking` „Cooking & Baking Classes“ (F2970 Welle 2, Backend-Commit `f013f30`), danach Platz 1 der Vorschläge in EN und EL. Synonyme nur Mehrwort (keine Kollision mit Backzutaten). EL/RU/AR/HE-Namen sind nicht muttersprachlich geprüft.
2. **Suchbegriff:** „Sourdough …“ / „Εργαστήρι προζυμιού“ zeigen Annas Brot als ähnlichen Treffer. → EN „Baking workshop“, EL „Εργαστήρι ψωμιού με προζύμι“ (keine Treffer, kein „Similar products“-Kasten).
3. **Catering** wäre auch naheliegend, steht aber als „Catering / events“ im Katalog → Kandidat für Teil 5 („Dienstleistung aus dem Katalog übernehmen“).
4. Kurz blitzt die Feldprüfung „Price must be > 0.“ auf, bis der Preis getippt ist (wie Teil 2, kosmetisch).
5. Die Kunden-Shopseite listet Dienstleistungen im Block „Products“ (keine eigene Überschrift „Services“).
6. Der erste EL-Lauf hat (über `prepare_service.py` mit beiden Demo-Konten) auch den Backkurs des EN-Shops entfernt. → `record.mjs` übergibt jetzt nur das Konto der aufgenommenen Sprache. Folge: Der EN-Demo-Shop hat den Kurs aktuell nicht mehr (Video nicht betroffen; bei Bedarf `video/build.sh service-create-new en --rerecord`).
7. edge-tts (Microsoft) lehnte EL zeitweise so oft ab, dass `tts.py` nach 25 Versuchen abbrach; erneuter Build-Lauf genügte (fertige Szenen sind gecacht).

## Offene Punkte
- Aussprache nicht nach Gehör geprüft (EL „pundo“-Kontext unverändert; neu: keine Fremdwörter).
- Erledigt beim Upload: Playlists, Endscreen (automatisch + Abo), Endscreen von `product-from-catalog` → dieses Video. Sobald Teil 5 online ist, den Endscreen hier gezielt auf Teil 5 umstellen.
- Prod: Kategorie `px-cooking` — Backend gepusht, Seed-Lauf auf Prod per to-prod `20261013-1745-f2970-w2-kategorie-kochkurse.md` angefragt (wartet auf BB-Freigabe). Bis dahin finden Händler auf Prod die Kategorie noch nicht.
