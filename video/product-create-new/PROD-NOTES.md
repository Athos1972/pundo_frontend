# product-create-new: Produktionsnotizen (Stand 2026-10-13, abgeschlossen)

> **Status:** aufgenommen, gebaut und veroeffentlicht am 2026-10-13 (EN 2:25, EL 2:36). Links und Upload-Einstellungen: Vault N7900.
> Neu bauen: `video/build.sh product-create-new [en|el] --rerecord` (Voraussetzungen unten, keine parallelen Tests gegen `pundo_test`).

Teil 2 von „pundo for businesses“: „Add your first product to pundo“ (EN + EL). Freigegebenes DE-Skript: `01-skript.de.md`.

## Vorbereitet
| Datei | Inhalt |
|---|---|
| `scenes.yml` | meta (Titel, URL `pundo.cy/shop-admin`, next_video, `thumbnail_scene: photo`) und 8 Szenen + Intro/Outro, EN + EL (EL informell „εσύ“). UI-Begriffe wörtlich aus `src/lib/i18n/shop-admin-*.ts`, Kategorie und Einheit aus `pundo_test`. |
| `record.mjs` | Playwright-Ablauf: Dashboard → Menü → „Offers“ → „+ Add offer“ → Suche ohne Treffer → neues Produkt (Name, „Product“, Kategorie-Vorschlag) → Foto → „Fixed price“, Einheit „Piece“, 4.50 / 4,50 → Speichern → Angebotsliste → Kunden-Shopseite |
| `prepare.sh` | Test-DB-Vorbereitung, wird von `record.mjs` automatisch je Sprache aufgerufen (nur `pundo_test`, sonst Abbruch). `--dry-run` = ROLLBACK. |
| `../_branding/compose.py` | 1 Zeile: `thumbnail_scene` darf jetzt pro Video in `scenes.yml → meta` stehen (vorher nur `brand.yml`, Default `step5-name-photo`; ohne den Fix gäbe es kein Thumbnail). |

Geprüft: `node --check record.mjs`, `bash -n prepare.sh`, YAML parsebar (alle Szenen mit EN/EL), Szenen-IDs `record.mjs` ↔ `scenes.yml` deckungsgleich, Foto `assets/product-photo.jpg` (1024×1024 JPEG, 195 KB), Musik vorhanden, alle zitierten UI-Strings existieren genau einmal je Sprache (keine Namespace-Kollision in `tAdmin`).
TTS ist gelaufen (`.cache/<lang>/timeline.json`), Layer gerendert und Callouts sichtbar geprüft.

| | Sprechtext | Video gesamt (geschätzt, inkl. Intro 6 s + Outro 11 s) |
|---|---|---|
| DE-Skript | 299 Wörter | – |
| EN | 300 Wörter, 119 s | ≈ 2:25 |
| EL | 295 Wörter, 130 s | ≈ 2:36 |

## Demo-Daten
- Konten aus der shop-signup-Aufnahme (`../shop-signup/.recording-accounts.json`): EN owner 192 / shop 10713 `anna-s-bakery-4`, EL owner 193 / shop 10714 `o-phournos-tes-annas-1`.
- Produktname: EN „Sourdough bread 750 g“, EL „Ψωμί προζυμιού 750 γρ.“; Suchbegriff im Video: EN „Sourdough“, EL „Ψωμί προζυμιού“.
- Kategorie-Vorschlag (simuliert gegen `pundo_test`, Platz 1): id 4608 EN „Breads & Buns“, EL „Άρτοι και ψωμάκια“. Fallback in `record.mjs`: Kategoriesuche „bread“ / „ψωμί“.
- Einheit `per_piece` = EN „Piece“, EL „Τεμάχιο“ (aus `price_units`).

## Befunde & Lösungen
1. **Konten sind `pending` und unverifiziert.** Die signup-Aufnahme bestätigt die Mail nie, deshalb antwortet der Login mit 403. `prepare.sh` setzt nur diese Konten (`video-*@pundo-e2e.io`) auf `approved` und verifiziert. Bewusst nicht über `PATCH /admin/shop-owners/{id}`: Dieser Weg löst Auto-Assign (zusätzliche Listings im Demo-Shop) und eine Welcome-Mail an die fiktive Adresse aus.
2. **Die Item-Suche ist ein globaler Fuzzy-Scan** (`item_search.py`, token_set_ratio ≥ 85 = Treffer, ≥ 60 = Warnbox „Similar products…“). Owner können Items nicht löschen. Stand heute liefert die EN-Suche „Sourdough“ **4 E2E-Altlasten** („Sourdough bread E2E-B5900-011-…“, die B5900-011 bei jedem Lauf neu anlegt). Ohne Bereinigung zeigt das Video also Treffer statt „No results found“. Brot aus früheren Video-Läufen würde genauso auftauchen und beim Neuanlegen in derselben Kategorie den Fuzzy-Block (409) auslösen.
   **Lösung (Test-DB, Item-Bereinigung nur mit Marker), `prepare.sh`:** Items werden auf `status='inactive'` gesetzt, nichts wird gelöscht. Die Suche filtert auf `active`. Betroffen sind (a) `shop_manual`-Items, die ein Video-Demo-Shop listet (greift auch, wenn der Name inzwischen auto-übersetzt wurde), (b) verwaiste Items mit exakt dem Demo-Namen, (c) Items mit Marker `E2E-` und „sourdough“/„προζυμ“ im Namen. Danach entfernt `record.mjs` über die **Shop-Owner-API** die Angebote (archivieren → löschen) und die `shop_manual`-Listings des Demo-Shops. Damit ist die Aufnahme beliebig wiederholbar und der Name bleibt „Sourdough bread 750 g“.
   Dry-Run am 2026-10-13: je Sprache 4 Items würden deaktiviert (die 4 E2E-Altlasten), Konten → `approved`. Geschrieben wurde noch nichts.
3. Preisstufen starten leer, deshalb wird vor Einheit und Preis „+ Add pricing unit“ angetippt. Kurz ist dabei die Feldprüfung „Price must be > 0.“ zu sehen, bis der Preis getippt ist. Das ist kosmetisch.
4. Native `<select>`-Popups erscheinen nicht im Screencast. Die Aufnahme zeigt den Tipp-Ripple und setzt den Wert direkt.

## Aufnahme
Voraussetzung: Test-Instanz laeuft (Frontend :3500 via `npm run dev:test`, Backend :8500), **kein paralleler E2E- oder pytest-Lauf** gegen `pundo_test` (wegen B5900-011, siehe 2c, und weil das Backend unter Testlast so langsam wird, dass Szenen stocken).

```
video/build.sh product-create-new
```
Das ist EN + EL komplett. TTS ist gecacht. `record.mjs` ruft `prepare.sh <lang>` selbst auf. Einzeln: `video/build.sh product-create-new el`, neu aufnehmen: `--rerecord`.
Optional vorher pruefen, ohne zu schreiben: `video/product-create-new/prepare.sh en --dry-run`.

## Verlauf 2026-10-13
- Erste Fassung (10:54/10:59) zeigte in Szene `done` ~5 s das Lade-Skelett der Shop-Seite, waehrend der Sprecher "...on your shop page" sagt. Beide Fassungen waren schon hochgeladen (rbQPD1RP0Ek / I980wAOLL2E) und wurden nach Freigabe geloescht.
- Ursache: Im Aufnahme-Browser rendert der Dev-Server `/<lang>/shops/<slug>` in ~5,5 s (curl, normales Chromium, gleiche Header/Cookies: ~0,1 s). Ursache nicht gefunden; Prod nicht betroffen. Vorladen per zweitem Tab oder `page.request` hilft nicht.
- Loesung in `record.mjs` (Szene `done`): Hervorhebung des neuen Angebots schon in `prep`, dann ab Szenenbeginn `sess.pause()` -> Navigation -> warten bis die Brot-Karte da ist -> `sess.resume()`. Das Video haelt die hervorgehobene Liste und schneidet nach ~7 s auf die fertige Shop-Seite (Ende von "...shop page, with photo and price").
- Neue Fassung hochgeladen: EN https://youtu.be/bMvFGnlSPK4, EL https://youtu.be/cRQcMGcr3ww (Titel/Beschreibung/Thumbnail der ersten Fassung + Kapitelmarken, SRT, Tags, Videosprache, KI "Ja").

## Offene Punkte
- **Aussprache nicht nach Gehoer geprueft:** EN "750 g", EL "750 γρ." und "barcode" im griechischen Text. Falls noetig, Respelling in `brand.yml -> pronunciation` und `--no-record` neu bauen (danach neues Video, siehe README "Upload").
- `prepare.sh` deaktiviert E2E-Altlasten mit "sourdough" im Namen. Laeuft B5900-011 genau gleichzeitig, kann dessen frisch angelegtes Item betroffen sein. Deshalb nicht parallel zu E2E aufnehmen.
- Callout Szene 3 folgt dem DE-Skript ("Already on pundo? → next video"). Alternative: "Step 1 · Search first".
