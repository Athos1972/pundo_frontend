# short-pricing: Produktionsnotizen (Stand 2026-10-14)

YouTube Short S6 (9:16), Pilot der Shorts-Reihe: „Bulk discounts & sales in 30 seconds“ (EN 0:36, EL 0:39). Teaser für Teil 6 `pricing`.
Konzept und Entscheidungen: `../shorts/00-konzept.de.md`. Links/Upload-Status: Vault N7900.
Veröffentlicht 2026-10-14: EN https://youtube.com/shorts/6VUikL1jops · EL https://youtube.com/shorts/hpoAvPpsbcE — „Ähnliches Video“ = Teil 6 der jeweiligen Sprache, SRT hochgeladen, keine Playlist.

## Upload (Shorts)
Der Shorts-Upload-Dialog weicht vom normalen ab (Koordinaten-Klicks greifen nicht): Titel/Beschreibung über `#textbox` + `execCommand('insertText')`, KI-Radio `name=VIDEO_HAS_ALTERED_CONTENT_YES`, Tags-Input `aria-label=Tags` fokussieren und tippen, Sprache über `ytcp-form-language-input ytcp-dropdown-trigger` → `tp-yt-paper-item`, „Ähnliches Video“ im Schritt „Video-Elemente“ (erstes „Hinzufügen“), Sichtbarkeit `name=PRIVATE`/`PUBLIC`, `#next-button` / `#done-button`.

## Dateien
| Datei | Inhalt |
|---|---|
| `scenes.yml` | `meta.format: vertical` (→ `brand.yml formats.vertical`), Hook = `meta.title`, Schluss = `meta.next_video`; 4 Szenen EN/EL |
| `record.mjs` | abgeleitet aus `../pricing/record.mjs`: Bearbeiten-Formular wird ungetaktet geöffnet; Staffel ab 6 → Produktseite → Aktion 3,90 → Shop-Seite |
| Vorbereitung | `../pricing/prepare_pricing.py` (setzt das Brot-Angebot zurück und aktiviert das Item wieder) |

## Bauen
```
video/build.sh short-pricing [en|el] [--rerecord]
```

## Hochformat-Pipeline
- `brand.yml` → `formats.vertical`: Leinwand 1080×1920, Intro 2,6 s (Hook-Karte), Outro 4 s („Full tutorial ↓“ + URL, keine Endscreen-Flächen), Handy zentriert (Bildschirmhöhe 1250 px), Callout oben zentriert, Untertitel unten.
- `tts.py` übernimmt das Format aus `meta.format`; `render.mjs` hat `introVertical`/`outroVertical`; `compose.py` unverändert. `thumbnail_scene: none` (Shorts haben kein eigenes Thumbnail).

## Befunde
1. `product-create-new/prepare.sh` deaktiviert die Demo-Items **aller** Video-Shops → nach einer Teil-2-Aufnahme in einer Sprache ist das Brot der anderen Sprache `inactive` (Produktseite 404). `prepare_pricing.py` aktiviert das Item jetzt wieder.
2. edge-tts bricht gelegentlich mit `WSServerHandshakeError` ab → `tts.py` wiederholt; notfalls neu starten.
