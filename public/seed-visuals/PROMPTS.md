# Seed-Visual Prompt Templates

**DrawThings Modell:** FLUX.1-dev (fp8) — Stand 2026-05  
**Ziel-Ratio Card:** 4:3 (1600 × 1200 px Master → 1200 × 900 px Card)  
**Ziel-Ratio OG:** 1.91:1 (1200 × 630 px, fokuszentrierter Crop aus der Card)

---

## Stil-Anker (universell, unveränderlich)

```
professional craft photography, clean background, warm neutral light,
photorealistic, high detail, sharp focus, no people, no hands,
no text, no logos, no flags, culturally neutral, tools or materials
in foreground, shallow depth of field, studio lighting
```

**Negative Prompt:**

```
blurry, low quality, distorted, text, watermark, people, faces, hands,
anatomical errors, flags, country symbols, political symbols,
nsfw, cartoon, anime, illustration
```

---

## Item-Slot (pro Slug austauschen)

Kombiniere den Stil-Anker mit einer spezifischen Beschreibung:

```
<stil-anker>, <item-beschreibung in Englisch>
```

### Beispiele

| Slug | Item-Beschreibung |
|------|-------------------|
| `parkett-schleifen` | `freshly sanded wooden parquet floor with sanding machine and dust collection bag` |
| `elektriker-stoerung` | `electrical circuit breaker panel with professional tools beside it` |
| `knx-programmierung` | `smart home control panel with illuminated touch interface, modern interior` |
| `laminat-verlegen` | `laminate flooring planks being installed, click-lock system visible` |
| `klimaanlage-installieren` | `modern split air conditioning unit mounted on white wall, outdoor compressor unit` |

---

## Workflow

1. Öffne DrawThings auf dem Studio-Mac (FLUX.1-dev fp8).
2. Setze Steps: 30, CFG: 3.5, Sampler: DPM++ 2M Karras.
3. Setze Image Size: 1600 × 1200 (4:3).
4. Füge Stil-Anker + Item-Beschreibung in das Prompt-Feld ein.
5. Negative Prompt eintragen.
6. Generiere 3–5 Kandidaten, wähle das beste.
7. **Review-Pflicht:** Sichtkontrolle — korrekte Werkzeuge/Details, kein Handproblem, Stil konsistent.
8. Exportiere als JPEG, Qualität 95, in `public/seed-visuals/_masters/<slug>.jpg`.
9. Führe `npm run seed-visuals:build` aus — erzeugt `.webp`, `.jpg` (Card) und `-og.webp` (OG).
10. Committen: nur die drei abgeleiteten Dateien, **nicht** den Master (via `.gitignore`).

---

## Fallback-Slugs ohne eigenes Bild

Wenn DrawThings für einen Slug kein überzeugendes Ergebnis liefert:
- Verwende das **Cluster-Bild** des übergeordneten Themenbereichs (z.B. `elektriker.webp` für alle E-Slugs).
- Oder setze eine **abstrakte Variante** (Werkzeug isoliert auf neutralem Hintergrund).
- Dokumentiere den Slug hier:

| Slug | Grund | Fallback |
|------|-------|---------|
| *(noch leer)* | | |

---

## Sprachneutralität (AC-9)

Alle Bilder müssen kulturell und sprachlich neutral sein:
- Keine Länderflaggen, keine lokalen Symbole, keine ethnisch erkennbaren Merkmale.
- Werkzeuge und Materialien: international üblich (keine regionsspezifischen Marken sichtbar).
- Prompt enthält immer `culturally neutral, no flags, no text`.
