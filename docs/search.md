# Suche & Produktentdeckung

Pundo ist ein **Price- und Produktlocator**: Nutzer finden Produkte und Dienstleistungen in lokalen Shops in der Nähe ihres Standorts. Die Suche ist der zentrale Einstiegspunkt der App.

---

## Einstiegspunkte

| Route | Datei | Beschreibung |
|---|---|---|
| `/` | `src/app/page.tsx` | Startseite: Hero-Suchfeld + "Shops in deiner Nähe" |
| `/search?q=...` | `src/app/(customer)/search/page.tsx` | Suchergebnisseite |
| `/products/[slug]` | `src/app/(customer)/products/[slug]/page.tsx` | Produktdetailseite mit allen Angeboten |
| `/shops/[slug]` | `src/app/(customer)/shops/[slug]/page.tsx` | Shop-Detailseite mit Top-Produkten |

---

## Suchparameter (URL)

Alle Suchparameter werden als URL Query-Params gespeichert — Links sind damit shareable.

| Parameter | Typ | Beschreibung |
|---|---|---|
| `q` | string | Freitextsuche (Produktname, Shopname, Kategorie) |
| `lat` / `lng` | float | Geokoordinaten für Distanzberechnung |
| `category_id` | integer | Filter auf Kategorie (inkl. aller Unterkategorien) |
| `shop_id` | integer | Filter auf einen bestimmten Shop |
| `with_price` | `1` | Nur Angebote mit Fixpreis (`price_type=fixed`) |
| `show_online` | `1` | Online-Händler einblenden |
| `limit` / `offset` | integer | Pagination |

---

## Datenfluss

```
Nutzer tippt Suchbegriff
  ↓
SearchBar (Client Component, Debounce)
  ↓ URL-Update via router.push
SearchContent (Client Component, liest useSearchParams)
  ↓ fetch /api/v1/products?q=...&lat=...
Backend (pundo_main_backend)
  ↓ Volltext-Suche + Geodistanz + Kategorie-CTE
ProductListResponse { total, items }
  ↓
ProductCard-Liste + ShopMapClient
```

Das eigentliche Rendering der Ergebnisse ist eine **Client Component** (`SearchContent.tsx`), da der Nutzer live filtern, scrollen und die Karte interagieren kann. Die initiale Seite (`search/page.tsx`) ist ein Server Component, das `SearchContent` als Client-Wrapper einbettet.

---

## Geolokation

- Der Browser fragt per `navigator.geolocation.getCurrentPosition()` nach dem Standort
- Bei Zustimmung werden `lat`/`lng` als URL-Params gesetzt — die Suche zeigt Distanzangaben
- Bei Ablehnung oder fehlendem GPS: Suche funktioniert ohne Distanzangabe (kein Fehler)
- Koordinaten kommen ausschließlich vom Browser — niemals vom Backend geschätzt

---

## Filter

### "Nur mit Preis" (`with_price=1`)
Blendet Angebote mit `price_type ≠ fixed` aus (Anfrage, kostenlos, variabel).  
Nützlich wenn Nutzer tatsächliche Preise vergleichen wollen.  
→ Siehe [`price-types.md`](./price-types.md)

### Online-Händler (`show_online=1`)
Pundo zeigt standardmäßig nur lokale Shops. Mit diesem Filter werden auch Online-Händler eingeblendet (erkennbar am Badge "Online").  
→ Technisch: `shop_type = 'online_only'` im Backend.

### Kategorien (`category_id`)
Kategorie-Chips oberhalb der Suchergebnisse filtern auf eine Kategorie.  
Das Backend verwendet eine **recursive CTE** — ein Filter auf "Cat Food" schließt automatisch alle Unterkategorien ein.  
→ Backend-Referenz: [`pundo_main_backend/docs/data-model.md`](../../pundo_main_backend/docs/data-model.md) — Abschnitt "Kategorie-Hierarchie"

---

## Lokale vs. Online-Ergebnisse

Suchergebnisse werden in zwei Gruppen geteilt:

| Gruppe | Anzeige | Shop-Typ |
|---|---|---|
| Lokale Shops | immer sichtbar | `local` |
| Online-Händler | nur bei `show_online=1` | `online_only` |

Lokale Shops zeigen Distanzangabe, Karten-Pin und Öffnungszeiten-Kontext.  
Online-Händler zeigen ein "Delivery available"-Badge falls `delivery_available=true`.

---

## Karte

Die Karte (`ShopMapClient`) ist eine **Client-only Component** (Leaflet läuft nur im Browser).  
Sie zeigt Pins für alle Shops in den aktuellen Suchergebnissen.  
Klick auf einen Pin öffnet die Shop-Detailseite.

Leaflet wird via `dynamic(() => import(...), { ssr: false })` geladen — kein SSR-Overhead.

---

## Produktkarte (`ProductCard`)

Jede Karte zeigt:
- Produktname + Markenbild
- Bestes Angebot: Preis, Shop-Name, Distanz
- Verfügbarkeits-Badge (`available` / `unavailable`)
- Preis-Label bei nicht-numerischen Preisen (`on_request`, `free`, `variable`)

→ Siehe [`price-types.md`](./price-types.md) für Details zu Preis-Labels

---

## Produktdetailseite (`/products/[slug]`)

Zeigt alle Angebote eines Produkts sortiert nach Preis:
- Angebote nach lokalen Shops und Online-Händlern aufgeteilt
- Preishistorie als Sparkline-Diagramm (nur `fixed`-Preise)
- CTA-Button "Anrufen" / "Website" bei `price_type=on_request`

---

## Shop-Detailseite (`/shops/[slug]`)

Zeigt Informationen zu einem einzelnen Shop:
- Name, Adresse, Telefon, Status-Badge
- Gesprochene Sprachen als Chips (wenn vom Shop-Betreiber gepflegt) → [`shop-languages.md`](./shop-languages.md)
- Karte mit Shop-Position
- Öffnungszeiten
- Top-Produkte (bis zu 10)

---

## Backend-Referenzen

- Suchendpunkte: [`pundo_main_backend/docs/api.md`](../../pundo_main_backend/docs/api.md)
- Datenmodell (Produkte, Offers, Shops): [`pundo_main_backend/docs/data-model.md`](../../pundo_main_backend/docs/data-model.md)
- Preis-Typen: [`pundo_main_backend/docs/data-model.md`](../../pundo_main_backend/docs/data-model.md) — Abschnitt "Offer-Modell"
