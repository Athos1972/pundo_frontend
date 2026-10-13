# Skript — „Add a product that's already on pundo" (DE, freigegeben 2026-10-13)

**Serie:** pundo for businesses, Teil 3 (nach `shop-signup` und `product-create-new`)
**Zielgruppe:** registrierte Händler auf Zypern, die Markenware verkaufen
**Format:** wie Teil 1 und 2: 16:9 (1920×1080), Handy-UI (390×844) mittig im Gerätrahmen, Texteinblendungen rechts
**Ziellänge:** ca. 1:45 (≈ 230 Wörter Sprechtext)
**Demo-Shop (fiktiv):** „Anna's Bakery“ / „Ο Φούρνος της Άννας“, Limassol (wie in Teil 1 und 2; das Sauerteigbrot aus Teil 2 bleibt im Shop)
**Demo-Produkt (fiktiv, nur in `pundo_test`):** „Troodos Valley Carob Syrup 500 ml“ / „Χαρουπόμελο Troodos Valley 500 ml“ — Johannisbrotsirup, typisch zyprisch, passt zur Bäckerei. Fiktive Marke, Barcode `2001234567893` (fiktiv, GS1-Bereich 200–299 für interne Nummern, damit kein echtes Produkt getroffen wird; Prüfziffer gültig), KI-Packshot ohne echte Marke. Anna verkauft es für **6,90 € pro Stück**.
**Aufnahme:** Test-Instanz 3500/8500, Shop-Admin jeweils in EN bzw. EL

> ⚠️ Der Katalog in `pundo_test`/Prod enthält mit Foto fast nur Tierbedarf und keinen einzigen Barcode. Deshalb legt die Vorbereitung (`prepare.sh`) das Demo-Produkt als Katalog-Eintrag an (Entscheid BB 2026-10-13: „Anna's Bakery + Demo-Katalogprodukt“).

---

## 0 · Intro (Branding-Baustein, ~6 s, ohne Sprechtext)
Titel: **Add a product that's already on pundo**

## 1 · Begrüßung (~12 s)
*Bild:* Shop-Admin-Dashboard von Anna's Bakery.

> Im letzten Video hast Du ein Produkt ganz neu angelegt. Viele Produkte gibt es bei pundo aber schon – vor allem Markenware. Die musst Du nicht neu anlegen: Du übernimmst sie einfach, mit Foto und Beschreibung, und setzt nur noch Deinen Preis.

## 2 · Zu den Angeboten (~8 s)
*Bild:* „Angebote“ → „Angebot hinzufügen“. Einblendung: **pundo.cy/shop-admin**

> Öffne wieder „Angebote“ und tippe auf „Angebot hinzufügen“.

## 3 · Per Barcode finden (~20 s)
*Bild:* Dialog „Produkt oder Dienstleistung wählen“ → Feld „EAN / Barcode“ → Barcode eintippen → Treffer mit Foto erscheint (hervorgehoben, noch nicht antippen).
*Callout:* **„Barcode = fastest way“**

> Am schnellsten geht es mit dem Barcode: Tippe einfach die Zahlen unter dem Strichcode auf der Verpackung ein. Anna verkauft Johannisbrotsirup aus dem Troodos – und schon ist er da, mit Foto.

## 4 · Oder nach Namen suchen (~12 s)
*Bild:* im Feld „Nach Namen suchen“ „Troodos“ (EL „χαρουπόμελο“; EN „carob“/„carob syrup“ zeigen Hunde-Leckerli und einen Kasten „Ähnliche Produkte“) eintippen → Treffer mit Foto → antippen (Produkt wird ausgewählt, Schritt 2 öffnet sich). Eigene Szene (Entscheid BB).

> Kein Barcode zur Hand? Dann such einfach nach dem Namen. pundo findet das Produkt auch in anderen Sprachen. Tippe es an, um es auszuwählen.

## 5 · Foto ist schon da (~15 s)
*Bild:* Schritt „2. Preis & Details“ → Produktkopf mit Katalogfoto, Bereich „Fotos“ zeigt das vorhandene Foto.
*Callout:* **„Photo already included“**

> Das Foto ist schon da – Du musst nichts fotografieren. Wenn Du möchtest, kannst Du trotzdem eigene Bilder ergänzen, zum Beispiel wie das Produkt bei Dir im Regal steht.

## 6 · Eigener Preis (~20 s)
*Bild:* nach unten scrollen → „Festpreis“ → Einheit „pro Stück“ → 6,90 → Speichern.
*Callout:* **„€6.90 per piece“**

> Jetzt nur noch Dein Preis: Festpreis, pro Stück, sechs Euro neunzig. Jeder Shop setzt seinen eigenen Preis – so können Kunden vergleichen und sehen, wo es das Produkt in ihrer Nähe gibt. Tippe auf „Speichern“.

## 7 · Fertig (~13 s)
*Bild:* Angebotsliste mit Sirup und Brot → Shop-Seite von Anna's Bakery mit beiden Produkten.

> Fertig! Der Sirup steht jetzt neben Annas Sauerteigbrot auf ihrer Shop-Seite – sofort sichtbar für Kunden in der Nähe.

## 8 · Ausblick (~8 s)
*Bild:* Übergang zum Outro, „Next video: Add your services“.

> Im nächsten Video zeigen wir Dir, wie Du Dienstleistungen anlegst. Bis gleich!

## 9 · Outro (Branding-Baustein, ~11 s, ohne Sprechtext)

---

## Demo-Daten & Vorbereitung (`prepare.sh`, nur `pundo_test`)
- Katalog-Item „Troodos Valley Carob Syrup 500 ml“ (Namen EN/EL/DE/RU, Kategorie „Sirupe & Süßungsmittel“ o. ä. aus der Taxonomie, EAN `2001234567893`, Quelle `catalog`, aktiv) + Packshot als `item_photos` (nicht `contributed_by_shop_id` = Annas Shop, damit es als Katalogfoto erscheint). Idempotent per Slug.
- Vor jeder Aufnahme: Angebot/Listing des Sirups im Demo-Shop entfernen; das Sauerteigbrot aus Teil 2 bleibt.
- Packshot: KI-generiert (Draw Things, FLUX schnell), Glasflasche mit dunklem Sirup, Etikett ohne lesbare Marke, Johannisbrotschoten daneben, heller Hintergrund.

## UI-Befunde (Code-Review 2026-10-13)
| # | Befund | Wo | Wirkung aufs Video |
|---|---|---|---|
| B1 | Button beim Barcode-Treffer heißt „Selected“ / „Επιλέχθηκε“ (Zustand) statt „Select“ / „Επιλογή“ (Aktion) | `ItemPickerModal` (`tr.item_picker_selected`) | kosmetisch; Sprechtext sagt „Ein Tipp“ |
| B2 | Katalog ohne Barcodes, mit Foto fast nur Tierbedarf | Daten (`pundo_test` = Prod-Kopie) | Demo-Produkt wird für die Aufnahme angelegt |

## Entscheidungen (BB, 2026-10-13)
- Demo-Story: Anna's Bakery + fiktives Demo-Katalogprodukt (statt Zoohandlung).
- Skript freigegeben; Namenssuche als eigene kurze Szene (Barcode-Szene zeigt nur den Treffer, ausgewählt wird per Namenssuche).
- Nächstes Video: „Dienstleistungen anlegen“ (Backlog #4).
- B1 vor der Aufnahme behoben: Button heißt jetzt „Select“ / „Auswählen“ / „Επιλογή“ (Key `item_picker_select`).
- Packshot: Draw Things FLUX schnell, Seed 3101, Etikett „TROODOS VALLEY · Carob Syrup · 500 ml“ per PIL ergänzt → `assets/catalog-photo.jpg`. Produktname daher „500 ml“.
