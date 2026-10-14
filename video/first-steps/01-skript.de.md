# Skript — „Your first 10 minutes on pundo" (DE, freigegeben BB 2026-10-14)

**Art:** Tutorial der Serie „pundo for businesses", inhaltlich **direkt nach Teil 1** „Shop anmelden" (BB 2026-10-14) → Playlist manuell sortieren, Teil-Nummern in den Beschreibungen anpassen
**Länge:** ~90–110 s (16:9) + Short 9:16 (~30 s)
**Sprachen:** EN + EL
**Zielgruppe:** Shop-Inhaber, deren Konto gerade freigeschaltet wurde
**Demo:** „Anna's Bakery" (Limassol), frisch freigeschaltet, mit den automatisch vorgeschlagenen Angeboten aus der Anmeldung
(Backend: `create_draft_listings_after_submit` beim Absenden, `assign_services_after_onboarding` bei der Freigabe).

## Was heute tatsächlich passiert (geprüft im Code, 2026-10-14)
1. Anmeldung abgeschickt → Seite „Konto wird geprüft" (`/shop-admin/pending-approval`). pundo legt passend zu Branche und
   Spezialitäten **vorgeschlagene Angebote** an (z. B. Bäckerei: „Frisches Brot (täglich)", „Torten & Gebäck",
   „Hochzeitstorte (auf Bestellung)"), Preis „Auf Anfrage", noch nicht verfügbar.
2. Admin schaltet frei → die Vorschläge werden **verfügbar**, also auf der Shop-Seite sichtbar, weiter „Auf Anfrage",
   mit Badges „Vorgeschlagen" + „Entwurf" und Knopf „Übernehmen" (bis B5910-007: „Aktivieren") in der Angebotsliste.
3. In der Angebotsliste kann der Inhaber pro Vorschlag:
   - **Übernehmen** (früher „Aktivieren", umbenannt in B5910-007) → Vorschlag wird übernommen (Quelle `shop_manual`), bleibt „Auf Anfrage". An der Sichtbarkeit ändert sich nichts.
   - **Bearbeiten** → z. B. echten Preis setzen; damit wird er zum eigenen Angebot.
   - **Löschen** → kommt nicht wieder (Skip-Liste).
4. Dashboard: Kacheln Profil, Öffnungszeiten, Angebote, Import, API-Schlüssel (keine Checkliste).

Voraussetzung für die Aufnahme: Bug [[B5910-007 Onboarding-Vorschläge nicht freigeschalteter Shops in der Kundensuche]] behoben (Suche zeigt keine Entwürfe mehr; Knopf heißt „Übernehmen“).

---

## 0 · Hook (~6 s)
*Bild:* Kunden-Shopseite von Anna, „Torten & Gebäck — Preis auf Anfrage", gleich daneben derselbe Artikel mit Preis.
*Callout:* **„Freigeschaltet. Und jetzt?"**
> Dein Shop ist freigeschaltet. Mit diesen drei Schritten wirkt er in zehn Minuten fertig.

## 1 · Vorschläge ansehen (~14 s)
*Bild:* Dashboard → Kachel „Angebote" → Liste mit drei Vorschlägen (Badges „Vorgeschlagen", „Entwurf").
*Callout:* **„pundo hat schon vorgearbeitet"**
> Passend zu deiner Branche hat pundo schon Angebote vorgeschlagen. Geh sie einmal durch: behalten, Preis setzen oder löschen.

## 2 · Behalten, Preis setzen, löschen (~30 s)
*Bild:* (a) „Hochzeitstorte (auf Bestellung)" → **Übernehmen** (bleibt „Auf Anfrage", passt bei Einzelanfertigungen).
(b) „Frisches Brot (täglich)" → **Bearbeiten** → Festpreis 2,50 € pro Stück → Speichern.
(c) „Torten & Gebäck" passt nicht → **Löschen** → Bestätigen.
*Callout:* **„Behalten · Preis · Löschen"**
> Bei Hochzeitstorten hängt der Preis vom Auftrag ab: einfach übernehmen. Brot hat einen festen Preis: eintragen, speichern.
> Und was du nicht anbietest, löschst du. Es kommt nicht wieder.

## 3 · Profil vervollständigen (~18 s)
*Bild:* Dashboard → Profil: Logo/Foto, kurze Beschreibung; Öffnungszeiten-Kachel kurz antippen.
*Callout:* **„Foto, Beschreibung, Öffnungszeiten"**
> Dann noch ein Foto, zwei Sätze über dich und deine Öffnungszeiten. Wie das im Detail geht, zeigt Teil sieben.

## 4 · Eigene Produkte (~10 s)
*Bild:* Angebote → „+ Neu" kurz anreißen (nicht durchklicken).
*Callout:* **„Deine eigenen Produkte"**
> Was pundo noch nicht kennt, legst du selbst an, mit eigenem Foto und Preis. Das zeigt Teil zwei.

## 5 · So sehen es Kunden (~12 s)
*Bild:* Kunden-Shopseite: Brot 2,50 €, Hochzeitstorte „Auf Anfrage", Öffnungszeiten, WhatsApp.
*Callout:* **„Fertig — so sehen es Kunden"**
> Fertig. So sehen Kunden jetzt deinen Shop: echte Preise, klare Angebote, und sie können dich direkt erreichen.

## 6 · Abschluss + Outro (~6 s)
*Callout:* **„Alle Teile in der Playlist"**
> Alle Schritt-für-Schritt-Videos findest du in unserer Playlist.

---

## Short (9:16, ~30 s)
Szenen 1, 2 (gekürzt: Übernehmen + Preis setzen), 5. Hook-Karte „Freigeschaltet? Das machst du zuerst". „Ähnliches Video" = dieses Tutorial.

## Umsetzung
- Neuer Ordner `video/first-steps/` (scenes.yml, record.mjs, `prepare_first_steps.py`).
- Prepare (nur pundo_test): Vorschläge für den Demo-Shop frisch anlegen wie nach der Freigabe (3 Listings `auto_seeded`, available, „Auf Anfrage"),
  vorher eigene Angebote zu diesen Artikeln entfernen bzw. archivieren und Skip-Einträge löschen; Profil/Öffnungszeiten aus Teil 7 bleiben.
- Szene 2 löscht einen Vorschlag → Prepare legt ihn bei jedem Lauf wieder an.

## Entscheidungen BB (2026-10-14)
1. Knopf: Verhalten bleibt, Text wird „Übernehmen“/„Keep“ → Teil von B5910-007.
2. Such-Leck (Entwürfe nicht freigeschalteter/abgelehnter Shops in der Kundensuche) zuerst als Bug fixen: B5910-007, Kette architect → coder → e2e-tester.
3. Einordnung direkt nach Teil 1 (Playlist manuell sortieren).
4. Skript freigegeben.
