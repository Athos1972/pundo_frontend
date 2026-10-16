# reviews: Produktionsnotizen (Stand 2026-10-16)

Tutorial #13, **Teil 10** von „pundo for businesses“: „Reply to your reviews“ (EN 1:32, EL 1:38). Freigegebenes DE-Skript: `01-skript.de.md`.
Short: `../short-reviews/` (EN 0:24, EL 0:23). Noch nicht hochgeladen.

## Dateien
| Datei | Inhalt |
|---|---|
| `scenes.yml` | meta (`demo.reply_a`/`reply_b` = die im Video getippten Antworten je Sprache, `thumbnail_scene: critique`) + 7 Szenen EN/EL |
| `record.mjs` | Ablauf siehe Szenen; Labels aus `src/lib/i18n/shop-admin-reviews.ts`. Öffnet die Bewertungsliste erst in Szene „find“ (das Öffnen setzt „zuletzt gesehen“) |
| `prepare_reviews.py` | Backend-venv, **nur pundo_test** (bricht sonst ab). Details unten. `--dry-run` = ROLLBACK (wird bei `SKIP_PREPARE=1` benutzt) |
| `assets/review-tent.jpg` | Foto zu Bewertung A (Draw Things, Flux schnell, Seed 23, 4 Schritte; Zelt am Strand, ohne Personen und Logos) |
| `.recording-accounts.json` | Zugangsdaten der 8 Demo-Kunden (gitignored, vom Prepare erzeugt). Shop-Owner: `../catalog-import/.recording-accounts.json` |

### prepare_reviews.py
1. Demo-Shops = die beiden Niko-Shops aus Teil 9 (`niko-s-survival-shop`, `to-katastema-epiviosis-tou-nikou`). Fehlen sie, Abbruch mit Hinweis auf `prepare_catalog_import.py`.
2. Artikel: `prepare_catalog_import.py` setzt bei jedem Lauf **beide** Shops zurück, daher hat meist nur einer die 24 Artikel. Hat der Ziel-Shop keine, kopiert das Prepare Listings + Angebote des anderen Niko-Shops (dieselben Items, also mit Fotos). Hat keiner Artikel: Abbruch.
3. Demo-Kunden je Sprache: Maria K. / Andreas P. / BestDeals24 / Elena S. (EL: Μαρία Κ., Ανδρέας Π., BestDeals24, Έλενα Σ.), `video-reviews-<lang>-<a|b|c|d>@pundo-e2e.io`.
4. Reset: löscht **nur** Bewertungen dieser 8 Demo-Kunden (Antworten, Meldungen, Fotos, Audit per CASCADE, dazu deren Foto-Ordner) und `shop_review_seen` der beiden Niko-Shops. Liegt eine Bewertung eines anderen Kunden im Scope des Ziel-Shops, bricht es ab, ohne etwas anzufassen.
5. Legt A (Shop, 5 ★, vor 3 h, mit Foto), B (Shop, 3 ★, vor 1 Tag), C (Shop, 1 ★, Spam, vor 2 Tagen), D (Produkt „Water Filter Straw“, SKU NSS-WF-01, 4 ★, vor 6 Tagen) an und setzt „zuletzt gesehen“ auf vor 5 Tagen → Dashboard „3 neu · Ø 3.0 · 3 Bewertungen“, Liste A, B, C. Foto wie `customer_photos.upload_photo` (gleiche Varianten und URLs unter `/review_photos/<review_id>/`), aber direkt `status='approved'`, `moderation_model='manual (video demo)'`.

## Bauen
```
cd ~/dev/github/pundo_frontend && node scripts/e2e-frontend.cjs start      # Standalone-Build :3500 (kein next dev)
video/build.sh reviews [en|el] [--rerecord]
video/build.sh short-reviews [en|el] [--rerecord]
```
Kein Gateway nötig. Upload-Fassungen (`libx264 -crf 23 -preset slow`, Ton kopiert): `out/yt/reviews.en.mp4` 5,6 MB, `out/yt/reviews.el.mp4` 6,0 MB; Short `../short-reviews/out/yt/short-reviews.{en,el}.mp4` 1,7 / 1,9 MB. Beschreibungen zum Kopieren: `out/yt/desc.{en,el}.txt`.

## Abweichungen vom Skript / Befunde
1. **Länge:** EN 92 s, EL 98 s (Skript ~95–110 s); Short EN 24 s, EL 23 s (Skript ~30 s). Szenenlängen folgen dem Sprechtext.
2. **Bewertung D ist nicht „neu“:** Der Zähler „neu“ (Dashboard, Menü) zählt Shop- **und** Produktbewertungen. Damit „3 neu“ erscheint, liegt D vor der „zuletzt gesehen“-Marke; D hat deshalb im Tab „Meine Produkte“ kein Badge „Neu“.
3. **Spam-Link:** `www.bestdeals24.example` (reservierte Beispiel-Domain, damit keine echte Seite beworben wird).
4. **„Ein Klick“ → „One tap“ / „Ένα άγγιγμα“**, weil das Video das Handy zeigt. EL-Hook „direkt im Portal“ als „απευθείας από τη διαχείριση του καταστήματος“.
5. **Kapitel:** „Danke sagen“ (8 s) und „Auf Kritik antworten“ sind zu einem Kapitel zusammengefasst (YouTube verlangt ≥ 10 s).
6. **Kundenseite:** C (Spam) steht nach der Meldung weiter auf der Shopseite, das ist so gewollt (bleibt sichtbar, bis pundo entscheidet). Szene 6 zeigt zuerst den Shop-Kopf, dann A und B mit „Reply from …“.
7. **Short:** Szenen Hook (Dashboard-Kachel), Kritik (B beantworten, gekürzt), Kundenseite. A wird im Short nicht beantwortet, die Kundenseite zeigt nur die Antwort unter B.
8. **Anrede EL:** ~~Sie-Form in EL~~ — durch B5930-001 behoben (griechisches Portal duzt), Neuaufnahme 2026-10-16 zeigt die du-Formen.
9. **Datum Kundenseite:** ~~englisch auch in EL~~ — durch B5930-001 behoben (`src/lib/format-date.ts`, Seitensprache + Asia/Nicosia), Neuaufnahme zeigt „16 Οκτ 2026“.
10. **Draw Things** lief zu Beginn nicht (Port 7860 geschlossen), wurde per `open -a "Draw Things"` gestartet und nach der Arbeit wieder beendet.
11. **Backend-Repo:** Review-Fotos landen im Standard-Ordner `pundo_main_backend/review_photos/<id>/` (Test-Server ohne `REVIEW_PHOTO_DIR`). Der Ordner ist dort **nicht gitignored** und erscheint als untracked. Nicht committen.
12. Thumbnail: Badge „Free · ≤ 5 min“ kommt aus dem Brand-Default.
13. Zustand nach dem letzten Lauf (Short EL): EL-Shop mit den vier EL-Bewertungen und der Antwort unter B; der EN-Shop führt jetzt ebenfalls die 24 Artikel (kopiert). Der nächste Prepare-Lauf setzt alles zurück.

## Kapitelmarken (aus `.cache/<lang>/compose.json`, alle ≥ 10 s)
| EN | EL |
|---|---|
| 0:00 Customers are talking about you | 0:00 Οι πελάτες μιλούν για σένα |
| 0:13 Find your reviews | 0:15 Βρες τις αξιολογήσεις σου |
| 0:24 Reply: thanks & criticism | 0:26 Απάντηση: ευχαριστώ και κριτική |
| 0:44 Report spam | 0:47 Αναφορά spam |
| 0:59 Reviews of your products | 1:03 Αξιολογήσεις των προϊόντων σου |
| 1:10 What customers see | 1:16 Τι βλέπουν οι πελάτες |

## Beschreibung EN
Titel: **Reply to your reviews**
```
Your customers write reviews on pundo. In this video we show you where to find them in your shop portal, how to say thank you for praise, how to reply to criticism in a friendly and specific way, and how to report spam to pundo. You also see the reviews of the products you carry and what your replies look like for customers.

Start here: https://pundo.cy/shop-admin

0:00 Customers are talking about you
0:13 Find your reviews
0:24 Reply: thanks & criticism
0:44 Report spam
0:59 Reviews of your products
1:10 What customers see

Your reply is public, appears right under the review and is not translated (maximum 1,000 characters). You can edit or delete it later. Nobody can delete reviews themselves: pundo checks reported reviews and hides them if they break the rules. Reviews of products apply to all shops, so you can only read and report them.

The whole series "pundo for businesses":
Part 1, sign up your shop: https://youtu.be/ojwtm1-a12c
Part 2, your first 10 minutes: https://youtu.be/5o_DmqJxPJA
Part 3, add your first product: https://youtu.be/bMvFGnlSPK4
Part 4, products already on pundo: https://youtu.be/sgnLYIeMkOk
Part 5, add your services: https://youtu.be/mZZliUsNsC8
Part 6, services already on pundo: https://youtu.be/OJY0ic_m1bk
Part 7, prices, bulk discounts & promotions: https://youtu.be/3gFK37esaIE
Part 8, keep your shop profile up to date: https://youtu.be/diyI6i8TI04
Part 9, import your whole catalogue at once: https://youtu.be/7i7nX0W1dZ0
Why pundo? https://youtu.be/7OLULUyEtu8
All playlists: https://www.youtube.com/@pundocy/playlists

Voice: AI text-to-speech. Demo shop, customers, reviews and photo are fictional (photo AI-generated).

#pundo #Cyprus #SmallBusiness #Larnaca
```
Tags: `pundo, customer reviews, reply to reviews, review management, respond to negative reviews, report spam reviews, online reputation, shop admin, cyprus shops, local business cyprus, pundo for businesses, tutorial`

## Beschreibung EL
Τίτλος: **Απάντησε στις αξιολογήσεις σου**
```
Οι πελάτες σου γράφουν αξιολογήσεις στο pundo. Σε αυτό το βίντεο σου δείχνουμε πού τις βρίσκεις στη διαχείριση του καταστήματός σου, πώς λες ένα ευχαριστώ για έναν έπαινο, πώς απαντάς σε κριτική φιλικά και συγκεκριμένα και πώς αναφέρεις το spam στο pundo. Βλέπεις επίσης τις αξιολογήσεις των προϊόντων που διαθέτεις και πώς φαίνονται οι απαντήσεις σου στους πελάτες.

Ξεκίνα εδώ: https://pundo.cy/shop-admin

0:00 Οι πελάτες μιλούν για σένα
0:15 Βρες τις αξιολογήσεις σου
0:26 Απάντηση: ευχαριστώ και κριτική
0:47 Αναφορά spam
1:03 Αξιολογήσεις των προϊόντων σου
1:16 Τι βλέπουν οι πελάτες

Η απάντησή σου είναι δημόσια, εμφανίζεται ακριβώς κάτω από την αξιολόγηση και δεν μεταφράζεται (έως 1.000 χαρακτήρες). Μπορείς να την επεξεργαστείς ή να τη διαγράψεις αργότερα. Κανείς δεν μπορεί να σβήσει μόνος του αξιολογήσεις: το pundo ελέγχει όσες αναφέρονται και τις κρύβει αν παραβιάζουν τους κανόνες. Οι αξιολογήσεις προϊόντων ισχύουν για όλα τα καταστήματα, γι' αυτό μπορείς μόνο να τις διαβάσεις και να τις αναφέρεις.

Όλη η σειρά «pundo για επιχειρήσεις»:
1. Καταχώρισε το κατάστημά σου στο pundo: https://youtu.be/HzBPFSwfdYw
2. Τα πρώτα 10 λεπτά σου στο pundo: https://youtu.be/q3WBIdtg8cI
3. Πρόσθεσε το πρώτο σου προϊόν στο pundo: https://youtu.be/cRQcMGcr3ww
4. Πρόσθεσε ένα προϊόν που υπάρχει ήδη στο pundo: https://youtu.be/6JhpJabNF2E
5. Πρόσθεσε τις υπηρεσίες σου στο pundo: https://youtu.be/GvH9BTpISIU
6. Πρόσθεσε μια υπηρεσία που υπάρχει ήδη στο pundo: https://youtu.be/llOaO9dZko0
7. Τιμές, εκπτώσεις ποσότητας & προσφορές: https://youtu.be/ikUN4_vj2ic
8. Κράτα ενημερωμένο το προφίλ του καταστήματός σου: https://youtu.be/9LQAaIuNA7I
9. Εισήγαγε όλο τον κατάλογό σου με μία κίνηση: https://youtu.be/p60A-EhVE14
Γιατί pundo; https://youtu.be/ey3LLVwvon8
Όλες οι playlists: https://www.youtube.com/@pundocy/playlists

Φωνή: τεχνητή νοημοσύνη (text-to-speech). Το κατάστημα, οι πελάτες, οι αξιολογήσεις και η φωτογραφία είναι φανταστικά (η φωτογραφία δημιουργήθηκε με AI).

#pundo #Κύπρος #Cyprus #ΜικρέςΕπιχειρήσεις #Λάρνακα
```
Tags: `pundo, αξιολογήσεις πελατών, απάντηση σε αξιολογήσεις, κριτικές, αρνητική αξιολόγηση, αναφορά spam, φήμη καταστήματος, κατάστημα, Κύπρος, τοπικές επιχειρήσεις, pundo για επιχειρήσεις, οδηγός`

## Short (`../short-reviews/`)
Titel EN „Bad review? Here's how to reply #Shorts“, EL „Κακή αξιολόγηση; Έτσι απαντάς #Shorts“ (= Hook-Karte); „Ähnliches Video“ = dieses Tutorial. Szenen: Hook (Dashboard „3 new“), Kritik gekürzt (B beantworten), Kundenseite (Antwort unter B).

## Offene Punkte
- Aussprache nicht nach Gehör geprüft (EN „pundo“, „WhatsApp“; EL „spam“, „pundo“, „playlist“).
- Nach Upload: Links hier und in N7900 nachtragen, Serienblock der Teile 1–9 um Teil 10 ergänzen, Abspann von Teil 9 auf Teil 10, Playlists, Endscreen (Playlist + Abo).
