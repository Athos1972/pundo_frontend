# Skript — „Add your services to pundo" (DE, freigegeben 2026-10-13)

**Serie:** pundo for businesses, Teil 4 (nach `shop-signup`, `product-create-new`, `product-from-catalog`)
**Zielgruppe:** Händler und Dienstleister auf Zypern, die (auch) Dienstleistungen anbieten
**Format:** wie Teil 1–3: 16:9 (1920×1080), Handy-UI (390×844) im Gerätrahmen, Texteinblendungen rechts
**Ziellänge:** ca. 1:50 (≈ 250 Wörter Sprechtext)
**Demo-Shop (fiktiv):** „Anna's Bakery“ / „Ο Φούρνος της Άννας“, Limassol — Sauerteigbrot (Teil 2) und Johannisbrotsirup (Teil 3) bleiben im Shop
**Demo-Dienstleistung:** „Sourdough baking workshop (2 h)“ / „Εργαστήρι ψωμιού με προζύμι (2 ώρες)“, Festpreis **35 € pro Session**, eigenes Foto (Backkurs-Tisch mit Teig, Mehl, Broten; KI-generiert)
**Aufnahme:** Test-Instanz 3500/8500, Shop-Admin jeweils in EN bzw. EL

---

## 0 · Intro (Branding-Baustein, ~6 s)
Titel: **Add your services**

## 1 · Begrüßung (~12 s)
*Bild:* Shop-Admin-Dashboard von Anna's Bakery.

> Nicht nur Produkte – auch Deine Dienstleistungen gehören auf pundo. Ob Reparatur, Beratung, Kurs oder Lieferung: Kunden in Deiner Nähe sollen wissen, was Du anbietest. Anna bietet ab sofort einen Backkurs an.

## 2 · Zu den Angeboten (~8 s)
*Bild:* „Angebote“ → „Angebot hinzufügen“ → Dialog öffnen. Einblendung: **pundo.cy/shop-admin**

> Öffne „Angebote“, tippe auf „Angebot hinzufügen“ und öffne die Auswahl.

## 3 · Kurz suchen, dann neu anlegen (~12 s)
*Bild:* Namenssuche „Baking workshop“ (EL „Εργαστήρι ψωμιού με προζύμι“) → „Keine Ergebnisse“ → „Neues Produkt oder Dienstleistung anlegen“.
*Callout:* **„Search first, then create“**

> Wie immer: erst kurz suchen. Einen Backkurs gibt es noch nicht – also legt Anna ihn neu an.

## 4 · Dienstleistung anlegen (~25 s)
*Bild:* Name eintippen → Art **„Dienstleistung“** antippen → Kategorie-Vorschlag „Koch- & Backkurse“ (neu, `px-cooking`) antippen → Speichern.
*Callout:* **„Type: Service“**

> Gib den Namen ein, so wie Kunden danach suchen würden: „Sauerteig-Backkurs, zwei Stunden“. Wichtig: Wähle diesmal „Dienstleistung“. pundo schlägt Dir passende Kategorien vor – Anna nimmt „Koch- und Backkurse“. Dann speichern.

## 5 · Eigenes Foto (~15 s)
*Bild:* Schritt „2. Preis & Details“ → Foto hinzufügen (Backkurs-Foto) → Titelbild-Markierung.

> Auch für Dienstleistungen gilt: Ein Foto sagt mehr als tausend Worte. Zeig Deine Arbeit, Deinen Laden oder wie der Kurs aussieht.

## 6 · Preis (~25 s)
*Bild:* „Preisart“ → **Festpreis** → Einheit **„Session“** → 35 → Speichern. Kurz vorher die Preisart-Auswahl antippen (Optionen „Auf Anfrage“, „Variabler Preis“ werden genannt; natives Auswahlfeld ist im Screencast nicht sichtbar, daher Callout).
*Callout:* **„Fixed · On request · Variable“**, danach **„€35 per session“**

> Beim Preis hast Du bei Dienstleistungen mehr Möglichkeiten: „Auf Anfrage“, wenn der Preis vom Auftrag abhängt, oder einen variablen Preis. Annas Kurs kostet pauschal fünfunddreißig Euro pro Session – also „Festpreis“, Einheit „Session“. Speichern.

## 7 · Fertig (~13 s)
*Bild:* Angebotsliste (Kurs, Sirup, Brot) → Shop-Seite von Anna's Bakery, Kurs sichtbar.

> Fertig! Annas Backkurs steht jetzt auf ihrer Shop-Seite – neben Brot und Sirup. Kunden in der Nähe finden ihn, wenn sie nach Koch- oder Backkursen suchen.

## 8 · Ausblick (~8 s)
*Bild:* Übergang zum Outro, „Next video: Services that are already on pundo“.

> Im nächsten Video zeigen wir Dir, wie Du Dienstleistungen übernimmst, die es bei pundo schon gibt. Bis gleich!

## 9 · Outro (Branding-Baustein, ~11 s)

---

## Demo-Daten & Vorbereitung
- Kein Katalog-Eintrag nötig (die Dienstleistung wird im Video neu angelegt).
- Vor jeder Aufnahme: Kurs-Angebot/-Listing des Demo-Shops entfernen und das Kurs-Item deaktivieren (wie Teil 2, aber nur per Name/Marker „baking workshop“ / „Εργαστήρι ψωμιού“, Brot und Sirup bleiben). Sonst blockiert die Duplikat-Prüfung beim zweiten Anlegen.
- Suchbegriffe ohne „Ähnliche Produkte“-Kasten geprüft: EN „Baking workshop“, EL „Εργαστήρι ψωμιού με προζύμι“ (mit „Sourdough…“ erscheint Annas Brot als ähnlicher Treffer).
- Kategorie: neu angelegt (BB-Entscheid) als `px-cooking` „Cooking & Baking Classes“ / „Μαθήματα Μαγειρικής & Ζαχαροπλαστικής“ (Backend `scripts/data/consumer_services_w2_cooking.json`, `seed_consumer_services.py`). Danach Platz 1 der Vorschläge in EN und EL.
- Foto: KI (Draw Things, FLUX schnell): Holztisch im Backkurs mit Teig, Mehl, Gärkörbchen und fertigen Sauerteigbroten, warmes Licht, keine Gesichter.

## Entscheidungen (BB, 2026-10-13)
- Skript freigegeben, Demo „Sauerteig-Backkurs (2 h), 35 € pro Session“.
- Neue Taxonomie-Kategorie „Koch- & Backkurse“ (statt „Kurse & Workshops (Handwerk)“).
- Foto: Draw Things FLUX schnell, Seed 4102 → `assets/workshop-photo.jpg`.
