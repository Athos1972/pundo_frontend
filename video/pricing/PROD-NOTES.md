# pricing: Produktionsnotizen (Stand 2026-10-13)

Teil 6 (letzter Teil) von „pundo for businesses“: „Prices, bulk discounts & promotions“ (EN 1:45, EL 1:53). Freigegebenes DE-Skript: `01-skript.de.md`.
Veröffentlicht 2026-10-13: EN https://youtu.be/3gFK37esaIE · EL https://youtu.be/ikUN4_vj2ic (SRT, Thumbnail, Kapitel, Playlists, Endscreen mit Playlist-Element + Abo). Details: Vault N7900.

## Voraussetzung
Feature F5200 „Staffelpreise in der Kundensicht“ (Vault `F5200 Dienstleistungen Mengenangaben/specs/2026-10-13-staffelpreise-kundensicht/`): Backend liefert `price_tiers`/`promo_price_tiers` mit Einheiten-Label, Frontend zeigt Einheit + Staffelzeilen (`PriceTierSummary`). Ohne das Feature fehlen in Szene `customer-tiers` die Staffelzeile und in `customer-promo` das „/ Piece“.

## Dateien
| Datei | Inhalt |
|---|---|
| `scenes.yml` | meta (`demo.*` Preise je Sprache, `thumbnail_scene: promo`, `next_video` = Playlist-Hinweis) + 8 Szenen EN/EL |
| `record.mjs` | Dashboard → Menü → „Offers“ → Brot „Edit“ → Standardpreis zeigen → Stufe 1 bis 5, „+ Add step“ ab 6 zu 4.00 → Speichern → Produktseite (Pause/Resume): Annas Zeile + Staffelzeile → erneut „Edit“ (Link per Zeilentext, siehe unten) → „Promotion“ aufklappen, „+ Add pricing unit“, Piece 3.90, heute bis +7 Tage → Speichern → Shop-Seite: Aktionskarte |
| `prepare_pricing.py` | läuft mit dem **Backend-venv**: setzt im Demo-Shop **der aufgenommenen Sprache** das aktive Brot-Angebot auf 1 Stufe 1–∞ zu 4.50/Stück zurück, ohne Aktion. Nur `pundo_test`. `--dry-run` = ROLLBACK. Wird von `record.mjs` aufgerufen. |

## Bauen
```
video/build.sh pricing [en|el] [--rerecord]
```
Voraussetzungen wie Teil 3–5 (Dev-Server dieses Repos auf 3500, Backend 8500 mit F5200, keine parallelen Tests).

## Befunde & Lösungen
1. **Staffeln für Kunden unsichtbar** (nur erster Staffelpreis ausgeliefert) → Entscheidung BB: erst Feature F5200, dann Video.
2. **Jede Preisänderung legt ein neues Angebot an** (altes wird archiviert, neue ID). `record.mjs` sucht den „Edit“-Link deshalb über den Zeilentext in der Angebotsliste, `prepare_pricing.py` nimmt das aktive Angebot der Brot-Zeile. Erster Versuch mit `.last()` über einen zu breiten Container hat die Aktion auf den Sirup gelegt (in `pundo_test` korrigiert).
3. **Zahlenfelder der Stufen** fallen bei leerem Wert auf 1 zurück (`parseInt || 1`) → `fill('')` + Tippen ergab „16“. Lösung: Wert markieren (`ControlOrMeta+a`) und überschreiben.
4. **Shop-Admin auf 390 px:** Stufenzeile war fünfspaltig, Preise abgeschnitten („4“) → `PriceTierEditor` auf schmalen Screens zweispaltig. Außerdem zeigte das Bearbeiten fälschlich „Max must be ≥ min.“ (`max_quantity: null` aus der API) → behoben.
5. Auf der Shop-Seite erscheint die Angebotskarte nur bei laufender Aktion; die Staffel ohne Aktion wird deshalb auf der Produktseite gezeigt (Design-Entscheidung A1/A7).
6. Owner-API: PATCH auf ein archiviertes Angebot → HTTP 500 (eigener Task).

## Offene Punkte
- Aussprache nicht nach Gehör geprüft (EN „4 euros 50“, EL „4,50 ευρώ“).
- Content-ID-Anspruch auf der Hintergrundmusik wie bei allen Teilen (siehe `video/README.md`).
- Kapitel: YouTube verlangt ≥ 10 s je Kapitel → Intro und Begrüßung als ein Kapitel „0:00“ zusammengefasst.
