# Skript — „Keep your shop profile up to date" (DE, freigegeben 2026-10-13)

**Serie:** pundo for businesses, Teil 7 (Ergänzung nach dem Serienende in Teil 6; kommt in beide Playlists)
**Zielgruppe:** Händler und Dienstleister auf Zypern
**Format:** wie Teil 1–6: 16:9 (1920×1080), Handy-UI (390×844) im Gerätrahmen, Texteinblendungen rechts
**Ziellänge:** ca. 2:00 (≈ 260 Wörter Sprechtext)
**Demo-Shop (fiktiv):** „Anna's Bakery“ / „Ο Φούρνος της Άννας“, Limassol
**Aufnahme:** Test-Instanz 3500/8500, Shop-Admin jeweils in EN bzw. EL

**Idee:** Kunden entscheiden in Sekunden: Hat der Laden offen? Spricht man dort meine Sprache? Kann ich mit Karte zahlen? Liefert er zu mir? Genau das zeigt das Profil. Mit Blick auf Zypern: viele Expats → Sprachen; typische Öffnungszeiten mit Mittagspause.

---

## 0 · Intro (~6 s)
Titel: **Keep your shop profile up to date**

## 1 · Begrüßung (~12 s)
*Bild:* Shop-Admin-Dashboard.
*Callout:* **„A complete profile builds trust“**

> Kunden wollen sofort wissen: Hast Du gerade offen? Sprichst Du ihre Sprache? Können sie mit Karte zahlen? Das alles stellst Du in Deinem Shop-Profil ein – einmal, in zwei Minuten.

## 2 · Öffnungszeiten (~28 s)
*Bild:* Menü → „Öffnungszeiten“ → Montag 07:00–14:00, „+ Zweites Zeitfenster“ 16:30–19:00 → Dienstag bis Freitag genauso (zügig) → Samstag 07:00–14:00 → Sonntag „Geschlossen“ → „Öffnungszeiten speichern“.
*Callout:* **„Opening hours“**

> Fang mit den Öffnungszeiten an. Anna backt ab sieben Uhr, macht mittags Pause und öffnet am späten Nachmittag wieder. Für die Pause fügst Du einfach ein zweites Zeitfenster hinzu. Samstags nur vormittags, sonntags geschlossen. Speichern.

## 3 · Beschreibung (~16 s)
*Bild:* Menü → „Shop-Profil“ → Feld „Beschreibung“: „Fresh sourdough bread and pastries, baked every morning in Limassol.“ (EL: „Φρέσκο ψωμί προζυμιού και αρτοσκευάσματα, ψημένα κάθε πρωί στη Λεμεσό.“)
*Callout:* **„Tell customers who you are“**

> Im Shop-Profil beschreibst Du in einem Satz, was Dich ausmacht. Kurz und konkret ist am besten.

## 4 · Sprachen und Zahlungsarten (~20 s)
*Bild:* „Gesprochene Sprachen“: Englisch, Griechisch, Russisch antippen → „Akzeptierte Zahlungsarten“: Bar, Karte, Revolut antippen.
*Callout:* **„Languages & payment“**

> Auf Zypern leben viele Menschen aus aller Welt. Zeig, welche Sprachen Ihr im Laden sprecht – bei Anna Englisch, Griechisch und Russisch. Darunter wählst Du, wie Kunden zahlen können: bar, mit Karte oder mit Revolut.

## 5 · Liefergebiet (~12 s)
*Bild:* „Liefer-/Service-Umkreis (km)“: 10 → kurzer Schwenk zu „Social Links“ (nur hervorheben) → „Speichern“.
*Callout:* **„Delivery area“**

> Lieferst Du oder kommst Du zum Kunden? Dann trag Deinen Umkreis ein – Anna liefert im Umkreis von zehn Kilometern. Weiter unten kannst Du noch Deine Social-Media-Links eintragen, zum Beispiel Instagram. Speichern.

## 6 · So sieht es der Kunde (~18 s)
*Bild:* Shop-Seite (Pause/Resume): Beschreibung, Sprach-Chips, „Liefert im Umkreis von 10 km“, Zahlungsarten, Öffnungszeiten-Block nacheinander hervorheben.
*Callout:* **„All on your shop page“**

> Und so sieht es Dein Kunde: Beschreibung, Sprachen, Liefergebiet, Zahlungsarten und Deine Öffnungszeiten – alles auf einen Blick.

## 7 · Abschluss (~10 s)
*Callout:* **„All tutorials in one playlist“**

> Ein vollständiges Profil bringt Dir mehr Anfragen. Alle Videos dieser Serie findest Du in unserer Playlist.

## 8 · Outro (~11 s)

---

## Bewusst nicht im Video
Website/Webshop, Social Links, Charity, „Termin erforderlich“, Logo (kam schon in Teil 1). Optional als Satz in Szene 5 („…und vieles mehr, z. B. Social-Media-Links“) — Entscheidung BB.

## Demo-Daten & Vorbereitung
- `prepare_profile.py` (nur Shop der aufgenommenen Sprache, nur `pundo_test`): Beschreibung, Sprachen, Zahlungsarten, Umkreis und Öffnungszeiten leeren, damit das Video bei null beginnt. Telefon/WhatsApp/Adresse aus Teil 1 bleiben.
- Zeit-Eingaben sind native `<input type="time">`.

## Beobachtungen vorab (2026-10-13)
| # | Beobachtung | Wirkung aufs Video |
|---|---|---|
| B1 | Öffnungszeiten: kein „auf alle Tage übernehmen“ — jeder Tag muss einzeln eingetragen werden. | Dienstag–Freitag werden im Video zügig ausgefüllt; als UX-Verbesserung vorschlagen. |
| B2 | Zweites Zeitfenster (Mittagspause) wird gespeichert, aber auf der Shop-Seite nicht angezeigt und von `is_open_now` ignoriert. | Bug [[B5950-001 Zweites Öffnungszeitfenster fehlt in Kundensicht und Geöffnet-Status]] — Entscheidung BB: erst fixen, dann Video. |

## Entscheidungen (BB, 2026-10-13)
- Teil 7 = Shop-Profil, danach Shorts (Backlog „Ideen“ #1 und #3); Endkunden-Video bewusst noch nicht (zu wenig Shops).
- Skript freigegeben; Social Links kurz erwähnen (Szene 5).
- Zweites Zeitfenster erst als Bug B5950-001 fixen, dann aufnehmen.
