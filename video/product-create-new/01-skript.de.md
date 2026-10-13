# Skript — „Add your first product to pundo" (DE-Entwurf zur Abnahme)

**Serie:** pundo for businesses, Teil 2 (nach `shop-signup`)
**Zielgruppe:** frisch registrierte Händler auf Zypern
**Format:** wie `shop-signup`: 16:9 (1920×1080), Handy-UI (390×844) mittig im Gerätrahmen, Texteinblendungen links und rechts
**Ziellänge:** ca. 2:00 (≈ 280 Wörter Sprechtext)
**Demo-Shop (fiktiv):** „Anna's Bakery“ / „Ο Φούρνος της Άννας“, Limassol (wie in Teil 1)
**Demo-Produkt:** Sauerteigbrot 750 g, 4,50 € pro Stück, eigenes Foto (Brotlaib auf Holzbrett)
**Aufnahme:** Test-Instanz 3500/8500, Shop-Admin jeweils in EN bzw. EL

> ✅ Blocker behoben (B5900-009 bis -012, alle SHIP am 2026-10-12, live seit Push 34b2876). Video produziert und veröffentlicht am 2026-10-13 (siehe `PROD-NOTES.md`, Vault N7900).

---

## 0 · Intro (Branding-Baustein, ~6 s, ohne Sprechtext)
pundo-Logo-Animation, Musik-Sting. Titel: **Add your first product**

## 1 · Begrüßung (~12 s)
*Bild:* Shop-Admin-Dashboard von Anna's Bakery auf dem Handy.

> Willkommen zurück! Dein Geschäft ist bei pundo angemeldet – jetzt zeigen wir Dir, wie Du Dein erstes Produkt anlegst, mit eigenem Foto und Preis. Das dauert nur zwei Minuten.

## 2 · Zu den Angeboten (~12 s)
*Bild:* Menü → „Angebote“ → Button „Angebot hinzufügen“. Einblendung: **pundo.cy/shop-admin**

> Melde Dich in Deinem Shop-Bereich an und öffne „Angebote“. Hier findest Du alles, was Du verkaufst. Tippe auf „Angebot hinzufügen“.

## 3 · Schritt 1 – Erst suchen (~15 s)
*Bild:* Stepper „1. Artikel wählen“ (EN „Select product or service“) → Suchfeld, „Sauerteigbrot“ eintippen, keine passenden Treffer.

> Zuerst suchst Du, ob es Dein Produkt bei pundo schon gibt. Markenprodukte findest Du oft direkt, auch über den Barcode. Annas Sauerteigbrot backt sie selbst – das gibt es noch nicht. Also legt sie es neu an.

*Callout:* „Already listed? → next video“

## 4 · Neues Produkt anlegen (~25 s)
*Bild:* „Neuen Artikel anlegen“ (EN „Create new product or service“) → Name eintippen → Art „Produkt“ ist ausgewählt → unter „Vorgeschlagene Kategorien“ erscheint „Brot & Brötchen“ → antippen → Speichern.

> Tippe auf „Neues Produkt oder Dienstleistung anlegen“. Gib den Namen so ein, wie Deine Kunden danach suchen würden – hier „Sauerteigbrot, 750 g“ – ganz einfach in Deiner Sprache. Wähle „Produkt“. pundo schlägt Dir gleich die passende Kategorie vor: „Brot & Brötchen“ – ein Tipp genügt. Einen Barcode brauchst Du nur, wenn Dein Produkt einen hat. Dann speichern.

*Callout:* „Category suggested automatically“

## 5 · Eigenes Foto (~20 s)
*Bild:* Schritt „2. Preis & Details“ öffnet sich automatisch → Bereich „Fotos“ → Foto auswählen (Brotlaib, `assets/product-photo.jpg`) → Vorschau.

> Jetzt kommt das Wichtigste: ein gutes Foto. Fotografiere Dein Produkt bei Tageslicht vor einem ruhigen Hintergrund. Du kannst bis zu acht Fotos hochladen – das erste ist das Titelbild. Große Handyfotos verkleinert pundo automatisch.

*Callout:* „Daylight · calm background · up to 8 photos“

## 6 · Preis (~25 s)
*Bild:* gleicher Schritt, nach unten scrollen → „Standardpreis“ → Preisart „Festpreis“ → Einheit „pro Stück“ → Preis 4,50 → Speichern.

> Darunter legst Du den Preis fest. Wähle „Festpreis“ und die Einheit – Anna verkauft ihr Brot pro Stück – und trage den Preis ein: vier Euro fünfzig. Mengenrabatte und Aktionspreise sind auch möglich, die zeigen wir Dir in einem eigenen Video. Tippe auf „Speichern“.

## 7 · Fertig – so sehen es Kunden (~15 s)
*Bild:* Angebotsliste mit dem neuen Brot → Wechsel auf die Kundenansicht: Shop-Seite von Anna's Bakery mit Brot, Foto und Preis.

> Fertig! Dein Produkt steht jetzt in Deiner Liste – und auf Deiner Shop-Seite ganz oben, sofort sichtbar für Kunden in Deiner Nähe, mit Foto und Preis. Änderungen machst Du jederzeit über „Bearbeiten“.

## 8 · Ausblick (~10 s)
*Bild:* Übergang zum Outro, Einblendung „Next video: Add a product that's already on pundo“.

> Im nächsten Video zeigen wir Dir, wie Du ein Produkt übernimmst, das es bei pundo schon gibt – das geht noch schneller. Bis gleich!

## 9 · Outro (Branding-Baustein, ~8 s, ohne Sprechtext)
Logo, URL, „Subscribe“-Hinweis, Endscreen-Fläche.

---

## Blocker & UI-Befunde (Stand 2026-10-12, Code-Review) — alle behoben

B1 → [[B5900-009 Shop-Admin Produktfoto-Upload nicht eingebunden]] · B2–B5 → [[B5900-010 Shop-Admin Angebotsformular Beschriftungen]] · Kategorie-Dropdown → [[B5900-011 Shop-Admin Kategorie-Auswahl beim Artikel-Anlegen unbrauchbar]]

| # | Befund | Wo | Wirkung aufs Video |
|---|---|---|---|
| **B1** | **Kein Foto-Upload im Anlage-Flow.** `ItemPhotoUpload` existiert und das Backend hat die Foto-Endpoints (`/shop-admin/items/{id}/photos`), die Komponente ist aber nirgends eingebunden (nur in Tests). Auch die Bearbeiten-Seite zeigt das Foto nur an (`OfferItemHeader`). | `ItemCreateForm`, `offers/[id]/edit` | Szene 5 (Kern des Videos) heute nicht aufnehmbar |
| **B2** | Namensfeld heißt fest „Product name **(DE)**“ und wird als `name_de` gespeichert, egal in welcher Sprache der Händler arbeitet. | `ItemCreateForm` | In EN/EL verwirrend; griechische Namen landen im deutschen Feld |
| **B3** | Die Auswahl Produkt/Dienstleistung trägt die Überschrift „Category“ (`tr.category`), danach folgt noch einmal „Category“. | `ItemCreateForm` | Zweimal „Category“ im Bild |
| **B4** | Preisarten „On request“, „Free“, „Variable“ sind fest auf Englisch; die Option „fest“ heißt nur „Price“. Das gilt auch für den Aktionspreis. | `OfferForm` | Englische Begriffe im griechischen Video |
| B5 | Fachbegriff „Item“ („Select item“, „Create new item“; EL „αντικείμενο“) wirkt technisch. | `shop-admin-catalog.ts`, `shop-admin-offers.ts` | kosmetisch, Sprechtext umschifft es |

Geklärt: Ein neues Produkt ist ohne Prüfung sofort sichtbar.

## Entscheidungen
- 2026-10-12: Skript von BB freigegeben, Anpassung an die neue UI nach Bugfixing (Szenen 3–7 aktualisiert).
- Produktfoto: KI-generiert (Draw Things, Flux schnell, Seed 2003) → `assets/product-photo.jpg`.
- Neues Produkt ist sofort sichtbar und steht auf der Shop-Seite oben (B5900-009, sort=newest).
