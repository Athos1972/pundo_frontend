# Suche & Produktentdeckung

Pundo ist ein **Price- und Produktlocator**: Nutzer finden Produkte und Dienstleistungen in lokalen Shops in der Nähe ihres Standorts. Die Suche ist der zentrale Einstiegspunkt der App.

---

## Einstiegspunkte

| Route | Datei | Beschreibung |
|---|---|---|
| `/{lang}` | `src/app/(customer)/[lang]/page.tsx` | Startseite: Hero-Suchfeld + "Shops in deiner Nähe" |
| `/{lang}/search?q=...` | `src/app/(customer)/[lang]/search/page.tsx` | Suchergebnisseite |
| `/{lang}/products/[slug]` | `src/app/(customer)/[lang]/products/[slug]/page.tsx` | Produktdetailseite mit allen Angeboten |
| `/{lang}/shops/[slug]` | `src/app/(customer)/[lang]/shops/[slug]/page.tsx` | Shop-Detailseite mit Top-Produkten |

---

## Suchparameter (URL)

Alle Suchparameter werden als URL Query-Params gespeichert — Links sind damit shareable.

| Parameter | Typ | Beschreibung |
|---|---|---|
| `q` | string | Freitextsuche (Produktname, Shopname, Kategorie) |
| `lat` / `lng` | float | Geokoordinaten für Distanzberechnung |
| `category_id` | integer | Filter auf Kategorie (inkl. aller Unterkategorien) |
| `shop_id` | integer | Nur Produkte mit öffentlichem, nicht archiviertem Angebot dieses Shops; `best_offer` ist dann ausschließlich das Angebot dieses Shops (fixed vor anderen, dann günstigster Preis) (B5900-016) |
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

## Shop-Treffer (Shop-Name in der Suche)

Im **Text-Modus** (`?q=` mit mindestens 2 Zeichen, weder `category_id` noch `shop_id`) zeigt `SearchContent` über den Services und Produkten die Sektion **„Shops"** (`data-testid="search-shop-results"`). Logik: `src/lib/search-shop-hits.ts`, Karte: `ShopCard` mit `variant="compact"` (`/shops` nutzt unverändert die Default-Variante).

**Reihenfolge der Liste:** Shop-Sektion → Services → „Lokale Shops" (Produkte) → Online-Händler.

**Requests** (nur beim Reset-Load, parallel zu `searchAll`; „Mehr laden" lädt sie nicht neu):

| | Request | Wann |
|---|---|---|
| R1 | `GET /shops?q&status=active&limit=4&lat&lng&max_dist_km=<Slider>[&is_online_only=false]` | immer |
| R2 | wie R1 **ohne** `max_dist_km` | nur wenn R1 leer ist |

- `limit=4`: angezeigt werden 3 Karten; ein viertes Item (oder `total > 3`) blendet den Link `search-shop-results-all` → `/{lang}/shops?q=<q>` ein.
- `include_online=0` schickt `is_online_only=false` (serverseitig). Der Slider (`max_dist_km`, Default 50) gilt auch für Shops. `available` und `with_price` wirken nicht auf Shops.
- Ein Fehler in R1/R2 lässt die Sektion still entfallen (`fetchShopHits` wirft nie).
- Backend: `q` matcht nur die Namenswerte (alle Sprachen) und `city`, nie die JSON-Schlüssel. Sortierung mit `q`: Relevanz (exakt, Präfix, enthält), dann Distanz. `total` zählt alle Treffer ohne `limit`.

**Umkreis-Hinweis:** Gibt es im Umkreis keinen, aber außerhalb Treffer (R2), zeigt die Sektion `search-shop-outside-hint` („N Shops außerhalb des Umkreises") und den Button `search-shop-expand-radius`. Der Klick setzt `max_dist_km` auf die Distanz des nächsten Treffers, aufgerundet auf den Slider-Schritt (5 km), höchstens 100 km (`expandRadiusTarget`). Ist nichts zu erweitern (Slider schon auf 100, keine Distanz bekannt), steht stattdessen der Link `search-shop-results-all`.

**Leerzustand:** Shop-Treffer und der Außerhalb-Hinweis unterdrücken „Keine Ergebnisse" (Text und ContactCtaLink); die Überschrift „Lokale Shops" und der Hinweis `no_local_results` entfallen, wenn es nur Shop-Treffer gibt. Die Live-Region zählt Produkt-`total` + angezeigte Shop-Treffer.

**Karte:** Shop-Treffer mit `location` erscheinen als Pins (dedupliziert mit den Pins der Angebots-Shops). Ein Pin-Tap scrollt die Karte (Shop-Treffer und Produkt-Karten, beide mit `data-shop-id`) im **sichtbaren** Container in Sicht (`listContent` ist für Mobile-Sheet und Desktop-Panel zweimal im DOM; deshalb `querySelector` im Container, kein `itemRefs`; B2250-002).

**RTL-Ausrichtung:** Überschriften und Hinweise bekommen **keinen** `rtl:text-end`-Override. `text-align: end` ist unter `dir=rtl` der *linke* Rand; die Standardausrichtung (`start`) folgt der Leserichtung (rechts). Gleiches gilt für `text-left` (nicht spiegelnd): `text-start` verwenden. Ein Vitest-Guard (`src/tests/rtl-text-align-guard.test.ts`) und Playwright-Messungen in `e2e/shop-discovery.spec.ts` sichern das (B2250-001).

**`/shops?q=`:** `ShopsContent` übernimmt `q` aus der URL (Suchfeld vorbefüllt, erster Request gefiltert). Die URL wird beim Tippen nicht mitgeführt.

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

## Service-Karten (`ServiceResultCard`, F2970)

Die Suche zeigt über den Produkten bis zu **8 Service-Karten** (Kategorie der Dienstleistung, z. B. „Friseur & Barbier“ mit `provider_count`).
Klick → `/{lang}/shops?service=<category_id>` (Anbieterliste, gleiche Regel wie `provider_count`; Backend: Onboarding, Service-Listing,
Google-Ortstyp, jeweils inklusive Unterkategorien).

Karten **ohne Anbieter** (`provider_count === 0`) bleiben sichtbar (Entscheidung O2). Darunter steht ein Hinweis
„Du bietest das an? Kostenlos eintragen“ (Keys `result_service_provider_prompt` / `result_service_become_provider` in `src/lib/i18n/search.ts`)
mit Link auf `/shop-admin/onboarding` — ein **Bypass-Pfad** (kein `localePath`). Der Link ist ein Geschwister des Karten-`<button>`
(kein interaktives Element im Button), RTL über `rtl:`-Modifier.

Shop-Admin-Picker (`CategoryPicker`): Im Browse für Dienstleistungen steht die vom Backend gepinnte Wurzel „Haus- & Personendienste“ zuerst,
der Rest wird locale-aware sortiert; Produkte bleiben vollständig alphabetisch.

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
