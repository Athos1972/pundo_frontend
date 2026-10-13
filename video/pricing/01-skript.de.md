# Skript — „Prices, bulk discounts & promotions" (DE, freigegeben 2026-10-13)

**Serie:** pundo for businesses, Teil 6 (nach Shop anmelden, Produkt neu, Produkt aus Katalog, Dienstleistung neu, Dienstleistung aus Katalog)
**Zielgruppe:** Händler und Dienstleister auf Zypern
**Format:** wie Teil 1–5: 16:9 (1920×1080), Handy-UI (390×844) im Gerätrahmen, Texteinblendungen rechts
**Ziellänge:** ca. 2:15 (≈ 290 Wörter Sprechtext)
**Demo-Shop (fiktiv):** „Anna's Bakery“ / „Ο Φούρνος της Άννας“, Limassol
**Demo-Angebot:** das Sauerteigbrot aus Teil 2 („Sourdough bread 750 g“ / „Ψωμί προζυμιού 750 γρ.“), bisher Festpreis 4,50 € pro Stück
**Neu in diesem Teil:** ein bestehendes Angebot **bearbeiten** (statt neu anlegen), Preisstufen, Aktionspreis mit Zeitraum
**Aufnahme:** Test-Instanz 3500/8500, Shop-Admin jeweils in EN bzw. EL

> [!warning] Voraussetzung
> Die Mengenstaffel ist für Kunden heute unsichtbar (Backend liefert nur den ersten Staffelpreis). Entscheidung BB 2026-10-13: **erst Feature, dann Video** → Spec `F5200 …/specs/2026-10-13-staffelpreise-kundensicht/`. Szenen 5 und 6b zeigen die Darstellung laut Spec; nach Umsetzung gegen die echte UI prüfen. Wegen Design-Entscheidung A1 (während einer Aktion gelten nur Aktions-Staffeln) wird die Staffel **vor** der Aktion auf der Produktseite gezeigt. Preisformat „4.50 EUR“ (A3).

---

## 0 · Intro (~6 s)
Titel: **Prices, bulk discounts & promotions**

## 1 · Begrüßung (~12 s)
*Bild:* Shop-Admin-Dashboard.
*Callout:* **„Your prices, your rules“**

> Anna will mehr Brot verkaufen: Cafés, die viel abnehmen, bekommen einen Mengenrabatt, und am Wochenende gibt es eine Aktion. Beides stellst Du in wenigen Sekunden ein.

## 2 · Angebot öffnen (~8 s)
*Bild:* Menü → „Angebote“ → beim Sauerteigbrot „Bearbeiten“. Einblendung **pundo.cy/shop-admin**

> Öffne „Angebote“ und tippe beim Sauerteigbrot auf „Bearbeiten“.

## 3 · Preis und Einheit (~14 s)
*Bild:* Block „Standardpreis“: Preisart „Festpreis“, Einheit „Stück“, Preis 4,50 € hervorheben.
*Callout:* **„Price per unit“**

> Hier ist Annas Preis: Festpreis, 4,50 Euro pro Stück. Die Einheit wählst Du selbst – pro Stück, pro Kilo, pro Stunde oder eine eigene.

## 4 · Mengenrabatt (~20 s)
*Bild:* erste Stufe „Bis Menge“ = 5 → „+ Stufe hinzufügen“ → „Ab Menge“ 6, Preis 4,00, „Bis Menge“ leer → „Speichern“.
*Callout:* **„Bulk discount“**

> Für größere Mengen fügst Du einfach eine Stufe hinzu. Bis fünf Stück bleibt es bei 4,50 Euro, ab sechs Stück kostet das Brot nur noch 4 Euro. Ein leeres Feld bei „Bis Menge“ heißt: unbegrenzt. Speichern.

## 5 · So sieht es der Kunde (~12 s)
*Bild:* Produktseite des Brots, Zeile von Anna's Bakery: „4.50 EUR / Stück“, darunter „ab 6: 4.00 EUR / Stück“ hervorheben (Darstellung laut Feature-Spec, AK1).
*Callout:* **„Customers see your prices“**

> Auf der Produktseite sehen Kunden jetzt Preis und Einheit – und dass es ab sechs Stück günstiger wird.

## 6 · Aktionspreis (~24 s)
*Bild:* zurück → Angebot erneut „Bearbeiten“ → „Aktionspreis (optional)“ aufklappen → Preisart „Festpreis“ → „+ Preiseinheit hinzufügen“ → Einheit „Stück“, Preis 3,90 → „Gültig ab“ heute, „Gültig bis“ in 7 Tagen → „Speichern“.
*Callout:* **„Promotion with dates“**

> Jetzt die Wochenend-Aktion: Öffne „Aktionspreis“, wähle Einheit und Preis – 3,90 Euro – und den Zeitraum. Nach dem Enddatum gilt automatisch wieder Dein normaler Preis, Du musst nichts zurückstellen. Speichern.

## 6b · Aktion beim Kunden (~14 s)
*Bild:* Shop-Seite, Aktionsblock: Brot-Karte mit „3.90 EUR / Stück“, „4.50 EUR“ durchgestrichen, Badge „Aktion bis <Datum>“ (AK3/AK4).
*Callout:* **„Customers see the deal“**

> Auf Annas Shop-Seite steht das Brot jetzt bei den Aktionen: mit Aktionspreis, durchgestrichenem Normalpreis und dem Datum, bis wann die Aktion läuft.

## 7 · Abschluss (~10 s)
*Bild:* Shop-Seite bleibt, Übergang zum Outro, Einblendung Playlist.
*Callout:* **„All tutorials: pundo for businesses“**

> Das war's! Alle Videos dieser Serie findest Du in unserer Playlist. Viel Erfolg mit Deinem Shop auf pundo!

## 8 · Outro (~11 s)

---

## Demo-Daten & Vorbereitung
- Angebot „Sourdough bread 750 g“ (EN-Shop) bzw. „Ψωμί προζυμιού 750 γρ.“ (EL-Shop) muss existieren. Vor jeder Aufnahme (`prepare_pricing.py`, nur Shop der aufgenommenen Sprache): Preis auf genau eine Stufe 1–∞ zu 4,50 € pro Stück zurücksetzen, Aktion entfernen.
- Aktionszeitraum relativ zum Aufnahmetag (heute bis +7 Tage), damit die Aktion beim Aufnehmen aktiv ist.
- Datumsfelder sind native `<input type="date">` (Format je Sprache).

## Befunde (2026-10-13)
| # | Befund | Wirkung aufs Video |
|---|---|---|
| B1 | Mengenstaffeln und Einheit sind für Kunden unsichtbar: `product_query.py`/`shop_query.py` liefern nur den ersten Step der ersten Einheit (`_first_price`). | Feature vor dem Video (Entscheidung BB). |
| B2 | ⚠️ zu prüfen: Felder „Promotion name“ / „Promotion description“ — Name wird in der Kundenansicht nirgends angezeigt; die Beschreibung erscheint auf der Produktseite als Preis-Notiz, aber nur ohne aktive Aktion. | Felder im Video nicht zeigen. |

## Entscheidungen (BB, 2026-10-13)
- Mengenstaffeln vor dem Video für Kunden sichtbar machen (Feature F5200 `2026-10-13-staffelpreise-kundensicht`, inkl. JSON-LD).
- Design-Annahmen A1–A11 bestätigt → Staffel wird vor der Aktion auf der Produktseite gezeigt.
- Skript in dieser Reihenfolge freigegeben; Abschluss = Serienende mit Verweis auf die Playlist (kein „nächstes Video“).
