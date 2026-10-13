# Skript — „Add a service that's already on pundo" (DE, freigegeben 2026-10-13)

**Serie:** pundo for businesses, Teil 5 (nach Shop anmelden, Produkt neu, Produkt aus Katalog, Dienstleistung neu)
**Zielgruppe:** Händler und Dienstleister auf Zypern
**Format:** wie Teil 1–4: 16:9 (1920×1080), Handy-UI (390×844) im Gerätrahmen, Texteinblendungen rechts
**Ziellänge:** ca. 1:30 (≈ 200 Wörter Sprechtext) — kürzester Teil, der Ablauf ist aus Teil 3 bekannt
**Demo-Shop (fiktiv):** „Anna's Bakery“ / „Ο Φούρνος της Άννας“, Limassol — Brot, Sirup und Backkurs bleiben im Shop
**Demo-Dienstleistung (echter Katalog-Eintrag in `pundo_test`/Prod):** „Catering / events“ / „Catering / εκδηλώσεις“ (Quelle `admin`, Foto aus dem pundo-Katalog). Preisart **„Auf Anfrage“** — die Ergänzung zum Festpreis aus Teil 4.
**Aufnahme:** Test-Instanz 3500/8500, Shop-Admin jeweils in EN bzw. EL

---

## 0 · Intro (~6 s)
Titel: **Add a service that's already on pundo**

## 1 · Begrüßung (~12 s)
*Bild:* Shop-Admin-Dashboard.

> Viele Dienstleistungen gibt es bei pundo schon – von Reparatur bis Catering. Die übernimmst Du genauso einfach wie Produkte: Foto und Beschreibung sind schon da. Anna bietet ab sofort auch Catering für Feiern an.

## 2 · Zu den Angeboten (~6 s)
*Bild:* „Angebote“ → „Angebot hinzufügen“ → Auswahl öffnen. Einblendung **pundo.cy/shop-admin**

> Öffne „Angebote“, tippe auf „Angebot hinzufügen“ und öffne die Auswahl.

## 3 · Suchen und übernehmen (~15 s)
*Bild:* Namenssuche „Catering / events“ (EL „Catering / εκδηλώσεις“) → Treffer mit Foto → antippen.
*Callout:* **„Already on pundo“**

> Such nach der Dienstleistung – hier „Catering“. Es gibt sie schon, mit Foto. Ein Tipp, und sie ist ausgewählt.

## 4 · Foto ist schon da (~10 s)
*Bild:* Schritt „2. Preis & Details“, Fotos-Block mit dem Katalogfoto („Von Pundo“).
*Callout:* **„Photo included“**

> Auch hier ist das Foto schon da. Eigene Bilder von Deinen Feiern kannst Du jederzeit ergänzen.

## 5 · Preis „Auf Anfrage“ (~18 s)
*Bild:* Preisart **„Auf Anfrage“** wählen → Speichern.
*Callout:* **„Price: on request“**

> Bei Catering hängt der Preis von der Feier ab – Gästezahl, Menü, Ort. Deshalb wählt Anna „Auf Anfrage“. Kunden sehen dann keinen Preis, sondern können Anna direkt kontaktieren. Speichern.

## 6 · Fertig (~14 s)
*Bild:* Angebotsliste → Shop-Seite: Catering-Karte mit „Preis auf Anfrage“ → nach oben zu WhatsApp/Telefon. (Ursprünglich Detailseite mit „Shop kontaktieren“ geplant — der Button fehlt dort, weil die API `shop_phone` nicht liefert, Befund B3.)

> Fertig! Annas Catering steht auf ihrer Shop-Seite. Interessierte sehen „Auf Anfrage“ und können sie mit einem Tipp kontaktieren.

## 7 · Ausblick (~8 s)
*Bild:* Übergang zum Outro, „Next video: Prices, bulk discounts & promotions“.

> Im nächsten Video zeigen wir Dir alles rund um Preise: Mengenrabatte und Aktionspreise. Bis gleich!

## 8 · Outro (~11 s)

---

## Demo-Daten & Vorbereitung
- Kein neuer Katalog-Eintrag nötig: „Catering / events“ (id 58522, Kategorie „Restaurants“, Foto `/seed-visuals/catering-veranstaltung.webp`) ist bereits im Katalog und wird bisher von keinem Shop gelistet.
- Vor jeder Aufnahme: nur das Catering-Angebot/-Listing des Demo-Shops der aufgenommenen Sprache entfernen (das Item bleibt, es ist ein Plattform-Eintrag); übrige Angebote bleiben.
- Suchbegriff: EN „Catering / events“, EL „Catering / εκδηλώσεις“ (siehe Befund B1).

## Befunde (2026-10-13)
| # | Befund | Wirkung aufs Video |
|---|---|---|
| B1 | **Fuzzy-Treffer bei „Catering“ unpassend:** die Item-Suche zeigt im Kasten „Ähnliche Produkte“ z. B. „Sugaring“, „Piercing“, „Stein“, „Ironing at home“ (EN) bzw. „Sugaring“, „Stein“ (EL); bei „catering events“ „Men's clothing“, „Katapang Leaves“. | Mit dem vollen Namen „Catering / events“ erscheint kein Kasten; Suchqualität sollte separat verbessert werden (eigener Task). |
| B3 | Produkt-Detail-API liefert bei Angeboten `shop_phone: null`, obwohl der Shop eine Telefonnummer hat → bei „Auf Anfrage“ fehlt der Button „Shop kontaktieren“. | Schluss-Szene zeigt die Kontakt-Links der Shop-Seite statt der Detailseite; Bug als eigener Task. |
| B2 | Katalog-Eintrag „Catering / events“ hängt in der Kategorie „Restaurants“; passender wäre „Catering & Event Food“ / „Catering“ (gibt es in der Taxonomie). | im Video nicht sichtbar; ggf. Recategorize (wie F2970 `recategorize_items`) |

## Entscheidungen (BB, 2026-10-13)
- Skript freigegeben (Catering, „Auf Anfrage“), Ausblick auf Teil 6 „Preise: Mengenrabatte & Aktionen“.
- B1, B2 (und B3) als eigene Tasks angelegt.
