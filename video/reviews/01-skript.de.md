# Skript — „Reply to your reviews" (DE, freigegeben BB 2026-10-16)

**Art:** Tutorial der Serie „pundo for businesses", **Teil 10** (hinter Teil 9 „Katalog-Import" einsortieren)
**Länge:** ~95–110 s (16:9) + Short 9:16 (~30 s)
**Sprachen:** EN + EL
**Zielgruppe:** Shop-Owner, deren Shop schon Bewertungen bekommt
**Demo:** „Niko's Survival Shop" (Larnaca, aus Teil 9, mit 24 Artikeln und Fotos). Vier fiktive Bewertungen von Demo-Kunden, angelegt per Prepare-Skript (nur pundo_test).
**Voraussetzung:** [[F5930 Bewertungen im Shop-Portal]] (live seit 2026-10-16, Backend `ec3d624`, Frontend `043495f`).

## Was heute tatsächlich passiert (geprüft im Code, F5930)
1. Dashboard-Kachel „Bewertungen": „{n} neu" und „Ø {Schnitt} · {Anzahl} Bewertungen"; Menüpunkt „Bewertungen" mit Zähler.
2. `/shop-admin/reviews`, Tabs **„Mein Shop"** und **„Meine Produkte"**. Karte: Name, Sterne, Datum, Text, freigegebene Fotos, Badge „Neu".
3. **„Antworten"** (nur Shop-Bewertungen): Feld „Ihre öffentliche Antwort", max. 1.000 Zeichen, Hinweis „öffentlich, wird nicht übersetzt" → „Antwort speichern". Danach „Bearbeiten" / „Löschen".
4. **„Bei pundo melden"**: Grund (Spam oder Werbung · Beleidigend · Rechtliches Problem · Falscher Shop oder falsches Produkt · Sonstiges) + optionaler Kommentar → „Meldung senden" → Badge „Gemeldet", Text „Gemeldet. pundo prüft die Bewertung." Die Bewertung bleibt sichtbar, bis pundo entscheidet. Selbst ausblenden kann der Owner nicht.
5. „Meine Produkte": Bewertungen der Produkte, die der Shop führt — nur lesen und melden (Hinweis im Tab).
6. Kundenseite: Antwort steht unter der Bewertung als „Antwort von <Shopname>".
7. Badge „neu" verschwindet nach dem Öffnen der Liste.

## Demo-Bewertungen (Prepare)
| # | Kunde | Ziel | Sterne | Inhalt |
|---|---|---|---|---|
| A | Maria K. | Shop | ★★★★★ | Tolle Beratung zum Zelt, mit Foto (Zelt am Strand, Draw Things) |
| B | Andreas P. | Shop | ★★★ | Gute Auswahl, aber der Kocher war nicht vorrätig, zweimal umsonst gekommen |
| C | „BestDeals24" | Shop | ★ | Spam-Text mit Link auf eine fremde Seite |
| D | Elena S. | Produkt „Water Filter Straw" | ★★★★ | Funktioniert, Kappen etwas fummelig |

---

## 0 · Hook (~6 s)
*Bild:* Dashboard, Kachel „Bewertungen": „3 neu · Ø 3,0 · 3 Bewertungen".
*Callout:* **„Kunden reden über dich"**
> Deine Kunden schreiben Bewertungen. So liest du sie und antwortest, direkt im Portal.

## 1 · Bewertungen finden (~12 s)
*Bild:* Menüpunkt „Bewertungen" mit Zähler 3 → Liste „Mein Shop", Badges „Neu".
*Callout:* **„Alles an einem Ort"**
> Neue Bewertungen siehst du auf dem Dashboard und im Menü. Ein Klick, und du hast alle auf einen Blick, mit Sternen, Text und Fotos.

## 2 · Danke sagen (~14 s)
*Bild:* Bewertung A (5 ★, Foto) → „Antworten" → kurze Antwort „Danke, Maria! Viel Spaß beim nächsten Camping." → „Antwort speichern".
*Callout:* **„Kurz danke sagen"**
> Für ein Lob reicht ein kurzes Danke. Deine Antwort ist öffentlich und steht direkt unter der Bewertung.

## 3 · Auf Kritik antworten (~20 s)
*Bild:* Bewertung B (3 ★) → „Antworten" → „Danke für die Rückmeldung, Andreas. Der Kocher ist wieder da, und ab sofort reservieren wir ihn dir gern per WhatsApp." → speichern.
*Callout:* **„Kritik? Freundlich und konkret"**
> Bei Kritik zählt die Antwort am meisten. Bleib freundlich, sag was du verbessert hast, und biete eine Lösung an. Das lesen auch alle anderen Kunden.

## 4 · Unpassendes melden (~16 s)
*Bild:* Bewertung C (Spam) → „Bei pundo melden" → Grund „Spam oder Werbung" → „Meldung senden" → Badge „Gemeldet".
*Callout:* **„Spam? Melden, nicht löschen"**
> Spam oder Beleidigungen meldest du an pundo. Wir prüfen die Bewertung und blenden sie aus, wenn sie gegen die Regeln verstößt. Selbst löschen kann niemand, das macht Bewertungen auf pundo glaubwürdig.

## 5 · Bewertungen deiner Produkte (~12 s)
*Bild:* Tab „Meine Produkte" → Bewertung D zum Water Filter Straw, Hinweis „nur melden, nicht antworten".
*Callout:* **„Auch deine Produkte"**
> Unter „Meine Produkte" siehst du, was Kunden über die Produkte schreiben, die du führst. Die gelten für alle Shops, deshalb kannst du hier nur lesen und melden.

## 6 · So sehen es Kunden + Outro (~12 s)
*Bild:* Kunden-Shopseite „Niko's Survival Shop" → Bewertungen mit „Antwort von Niko's Survival Shop" unter A und B; Outro-Karte.
*Callout:* **„Antworten schaffen Vertrauen"**
> So sehen es deine Kunden. Wer antwortet, wirkt erreichbar, und das schafft Vertrauen. Alle Teile der Serie findest du in unserer Playlist.

---

## Short (9:16, ~30 s)
Szenen 0, 3 (gekürzt), 6. Hook-Karte „Schlechte Bewertung? So antwortest du". „Ähnliches Video" = dieses Tutorial.

## Umsetzung
- Neuer Ordner `video/reviews/` (scenes.yml, record.mjs, `prepare_reviews.py`), Short `video/short-reviews/`.
- Prepare (nur pundo_test): Demo-Kunden anlegen bzw. wiederverwenden, die vier Bewertungen frisch anlegen (vorherige Antworten, Meldungen und Bewertungen dieser Demo-Kunden entfernen), „zuletzt gesehen" des Shops zurücksetzen, damit „3 neu" erscheint. Foto für A mit Draw Things, freigegeben (Moderationsstatus approved).
- EL: griechische Demo-Bewertungen und Antworten; Shop „Το κατάστημα επιβίωσης του Νίκου".
- Aufnahme gegen den Standalone-Build (:3500), kein `next dev`.

## Entscheidungen BB (2026-10-16)
1. Anrede: Bewertungstexte im Portal auf „du“ vereinheitlicht (`src/lib/i18n/shop-admin-reviews.ts`, nur DE, 16 Texte), vor der Aufnahme.
2. Skript inkl. Ton der Beispielantworten und Demo-Bewertungen (Tabelle) freigegeben.
