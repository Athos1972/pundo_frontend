# Shorts (9:16) — Konzept (Stand 2026-10-14)

**Ziel:** Je Tutorial ein kurzer Teaser im Hochformat, der in den Shorts-Feed kommt und auf das volle Tutorial verlinkt („Ähnliches Video“-Link in Studio). Zielgruppe wie die Serie: Händler und Dienstleister auf Zypern. Endkunden weiterhin bewusst nicht (BB 2026-10-13).

## Format
- 1080×1920, **25–40 s**, EN + EL (wie die Serie), eingebrannte Untertitel groß, Musik wie bisher.
- **Aufbau:** 
  1. **Hook (0–3 s):** große Frage/Behauptung oben, z. B. „Your shop on pundo in 5 minutes?“ / „Bulk discounts in 20 seconds“.
  2. **2–3 Kernmomente (≈ 25 s):** das Handy fast bildschirmfüllend (390×844 → ca. 880×1900), Callout oben als Balken, Untertitel unten über dem Handy.
  3. **Abschluss (3–4 s):** „Full tutorial ↓“ + Logo; der Link kommt über „Ähnliches Video“ (Shorts haben keine Endscreens und keine klickbaren Links in der Beschreibung).
- Kein eigenes Thumbnail (bei Shorts nur ein Frame aus dem Video wählbar) → `thumbnail_scene` = Hook-Frame.

## Quelle der Bilder (verworfene Variante: vorhandene Aufnahmen wiederverwenden)
Jede Tutorial-Szene ist bereits eine eigenständige Aufnahme (`video/<slug>/.cache/<lang>/rec/`, Frames + Timing) mit eigenem Ton. Ein Short besteht aus **2–3 ausgewählten Szenen** eines Tutorials, plus neuem Hook- und Schluss-Text (TTS).
- **Vorteil:** keine neue Aufnahme, keine Testdaten-Vorbereitung, kein Port-3500-Konflikt; pro Short nur eine kleine `short.yml` (Szenenliste + Hook/Schluss-Text).
- **Nachteil:** Szenen-Sprechtexte enthalten Formulierungen wie „Tippe auf Speichern“ — passt, weil die Szenen genau das zeigen. Wo eine Szene zu lang ist, wird sie gekürzt (Start/Ende in `short.yml`).
- Alternative: eigene, kürzere Aufnahmen pro Short (sauberer Text, aber ~doppelter Aufwand und erneute Testdaten-Vorbereitung).

## Pipeline-Erweiterung
- `brand.yml`: zweites Layout `layout_vertical` (Leinwand 1080×1920, Handy zentriert, Callout oben, Untertitel unten).
- `render.mjs` / `compose.py`: Layout per `meta.format: vertical` umschalten; Intro/Outro als kurze Hochformat-Varianten (Logo + Hook / „Full tutorial ↓“).
- Neues Script `build_short.sh <tutorial-slug> <lang>`: liest `video/shorts/<slug>.yml`, nimmt die vorhandenen Szenen-Frames + Audio, rendert Hook/Schluss neu.
- Aufwand grob: Pipeline 0,5–1 Tag, danach je Short ~15 min.

## Vorschlag Inhalte (je EN + EL)
| # | Tutorial | Hook | Szenen |
|---|---|---|---|
| S1 | Teil 1 Shop anmelden | „Your shop on pundo – free, in 5 minutes“ | Shop-Typ wählen, Standort, Kontakt, fertig |
| S2 | Teil 2 Produkt neu | „Your first product online in 2 minutes“ | Foto, Preis, Shop-Seite |
| S3 | Teil 3 Produkt aus Katalog | „Already on pundo? Take it over with one tap“ | Barcode, Foto schon da, eigener Preis |
| S4 | Teil 4 Dienstleistung neu | „Services belong on pundo too“ | Kategorie, Foto, Preisarten |
| S5 | Teil 5 Dienstleistung aus Katalog | „Price on request – customers contact you directly“ | Treffer, „Auf Anfrage“, Kontakt |
| S6 | Teil 6 Preise | „Bulk discounts and sales in 20 seconds“ | Staffel, Kundensicht, Aktion |
| S7 | Teil 7 Profil | „Open now? Your profile answers it“ | Öffnungszeiten mit Pause, Sprachen, Kundensicht |

**Pilot:** zuerst S6 (stärkster visueller Effekt: durchgestrichener Preis), EN + EL, dann Freigabe des Formats, dann S1–S5, S7.

## Entscheidungen (BB, 2026-10-14)
- **Neu aufnehmen** (eigene kurze Aufnahme + eigener Text je Short), nicht aus den Tutorials schneiden.
- **Pilot S6 „Preise“ EN + EL** zuerst; danach Format-Freigabe, dann die übrigen sechs.

## Umsetzung (2026-10-14)
Je Short ein Ordner `video/short-<tutorial-slug>/` mit `scenes.yml` (`meta.format: vertical`) und `record.mjs` (abgeleitet aus dem Tutorial-Recorder; Navigation/Formular-Öffnen ungetaktet im `prep` der ersten Szene; Vorbereitungs-Skripte des Tutorials werden wiederverwendet). Bauen: `video/build.sh short-<slug> [en|el] [--rerecord|--no-record]`.

| # | Ordner | Szenen | Vorbereitung |
|---|---|---|---|
| S1 | `short-shop-signup` | Typ → Angebot → Standort → Kontakt → „Check your inbox“ (Schritt 5+6 ungetaktet) | legt je Lauf einen **Wegwerf-Account** an (`video-short-<lang>-<stamp>@pundo-e2e.io`, Login in `short-shop-signup/.recording-accounts.json`, gitignored) |
| S2 | `short-product-create-new` | neues Produkt → Foto → Preis → Shop-Seite | `../product-create-new/prepare.sh` (räumt **alle** Angebote des Demo-Shops ab!) |
| S3 | `short-product-from-catalog` | Barcode + Auswahl → Katalogfoto → Preis → Shop-Seite | `../product-from-catalog/prepare_catalog.py` |
| S4 | `short-service-create-new` | neue Dienstleistung → Foto → Preis pro Sitzung → Shop-Seite | `../service-create-new/prepare_service.py` |
| S5 | `short-service-from-catalog` | Katalog-Treffer → „Auf Anfrage“ → Shop-Seite + Kontakt | `../service-from-catalog/prepare_catalog_service.py` |
| S6 | `short-pricing` | Staffel → Produktseite → Aktion → Aktionskarte | `../pricing/prepare_pricing.py` |
| S7 | `short-shop-profile` | Öffnungszeiten mit Pause → Sprachen + Zahlung → Shop-Seite | `../shop-profile/prepare_profile.py` |

**Reihenfolge beim Neuaufnehmen:** S2 räumt die Angebote des Demo-Shops ab → danach S3/S4/S5/S6 erneut aufnehmen, falls sie dieselbe Shop-Seite zeigen sollen.
**Layout-Regel (render.mjs):** Callouts im Hochformat ≤ 18 Zeichen 70 px, ≤ 26 Zeichen 60 px, sonst 52 px — damit sie nicht hinter das Handy laufen.
