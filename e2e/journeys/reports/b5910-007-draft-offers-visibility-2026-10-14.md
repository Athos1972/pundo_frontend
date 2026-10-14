# Journey-Report: b5910-007-draft-offers-visibility

**Datum:** 2026-10-14T12:50:50.175Z
**Frontend:** http://localhost:3500  **Backend:** http://localhost:8500
**Shop A:** e2e-20261014125012-b5910-007-bakery-a-c82a  **Shop B:** e2e-20261014125012-b5910-007-bakery-b-02e0

| Schritt | Beschreibung | Status |
|---|---|---|
| P1 | Suche „хлеб“ (ru) | **PASS** |
| P1 | Suche „bread“ (en) | **PASS** |
| P1 | Suche „торты“ (ru) | **PASS** |
| P1 | /products?shop_id= leer | **PASS** |
| P1 | Shop-Detail: keine Top-Produkte | **PASS** |
| P1 | Produktdetail baeckerei-konditorei-frisches-brot | **PASS** |
| P1 | Produktdetail baeckerei-konditorei-torten-kuchen | **PASS** |
| P1 | Produktdetail baeckerei-konditorei-hochzeitstorte | **PASS** |
| P1 | Produktdetail metzgerei-frisches-fleisch | **PASS** |
| P1 | Produktdetail metzgerei-grillpakete | **PASS** |
| P1 | Produktdetail metzgerei-wurst-aufschnitt | **PASS** |
| P1 | D3: Shop in Detail + Liste sichtbar | **PASS** |
| P1 | Sitemap enthält Shop nicht | **PASS** |
| P1 | UI /en/shops/<slug>: Shop sichtbar, keine Produkt-Links | **PASS** |
| P1 | UI Produktdetail: Shop nicht als Anbieter gelistet | **PASS** |
| P2 | Knopf/Tooltip en: „Keep" | **PASS** |
| P2 | Knopf/Tooltip de: „Übernehmen" | **PASS** |
| P2 | Knopf/Tooltip el: „Διατήρηση" | **PASS** |
| P2 | Knopf/Tooltip ru: „Оставить" | **PASS** |
| P2 | Knopf/Tooltip ar: „احتفاظ" | **PASS** |
| P2 | Knopf/Tooltip he: „השאר" | **PASS** |
| P2 | Übernehmen (UI) → Toast „Suggestion kept." | **PASS** |
| P2 | Bearbeiten: Preis 12.50 EUR gesetzt | **PASS** |
| P2 | Löschen (UI): archivieren + löschen | **PASS** |
| P2 | DB: Brot/Torte shop_manual, Hochzeitstorte-Angebot gelöscht | **PASS** |
| P2 | Übernommene/bearbeitete Vorschläge vor Freigabe weiter unsichtbar | **PASS** |
| P3 | Suche: übernommener + bearbeiteter Vorschlag sichtbar | **PASS** |
| P3 | Produktdetail: übernommen/bearbeitet/unbearbeitet sichtbar, gelöscht nicht | **PASS** |
| P3 | /products?shop_id= = 5, Hochzeitstorte available=false | **PASS** |
| P3 | Preis 12.50 im Produktdetail | **PASS** |
| P3 | UI Kunden-Shopseite: Angebote sichtbar, gelöschter Vorschlag nicht | **PASS** |
| P4 | abgelehnt: Suche/Produktliste/Detail ohne Angebote des Shops | **PASS** |
| P4 | abgelehnt: Shop in Detail/Liste/UI sichtbar, ohne Angebote (D3) | **PASS** |
| P5 | anna-s-bakery: Shop-Detail + Produktdetail mit Preis 2.50 | **PASS** |
| P5 | o-phournos-tes-annas: Shop-Detail + Produktdetail mit Preis 2.50 | **PASS** |
| P5 | Suche „хлеб“: verfügbare Treffer, abgelehnter Shop B nicht dabei | **PASS** |
| P5 | UI anna-s-bakery: Preis 2,50 sichtbar | **PASS** |
| P5 | gescrapter Shop ohne Owner: Top-Produkte + Suchtreffer unverändert | **PASS** |