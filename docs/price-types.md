# Price Types

Angebote können einen konkreten Fixpreis haben — oder auch nicht. Das `price_type`-Feld auf jedem Angebot trägt die Semantik.

## Enum-Werte

| Wert | Bedeutung | Preis-Feld | Beispiel |
|---|---|---|---|
| `fixed` | Konkreter Fixpreis | `string` (Pflicht) | "7.99 EUR" |
| `on_request` | Preis auf Anfrage | `null` | Tierarzt-Beratung, Hundetraining |
| `free` | Kostenlos | `null` | Erstberatung gratis, Probepackung |
| `variable` | Variabler Preis | `null` | "ab 5 € / kg", "pro Stunde" |

## Backend-Contract

- `price` ist nullable (`string | null`) auf `BestOffer`, `OfferDetail`, `TopProduct`
- `price_type` ist non-nullable (Default: `'fixed'` für Altdaten)
- `price_note` ist nullable string (max. 100 Zeichen): Freitext-Ergänzung, z.B. `"pro Stunde"` oder `"ab 5 €/kg"`
- `shop_phone` ist nullable string auf `OfferDetail`: wird für CTA-Button ("Anrufen") verwendet
- `PriceHistoryItem.price` bleibt `string` (non-nullable) — historische Einträge haben immer einen konkreten Preis

## Frontend-Rendering

### `formatPriceOrLabel()` — `src/lib/utils.ts`

```typescript
formatPriceOrLabel(
  price: string | null,
  currency: string,
  priceType: PriceType,
  priceNote: string | null,
  tr: Translations
) → { display: string; isNumeric: boolean; note: string | null }
```

- `isNumeric: true` → Preis in `text-accent`
- `isNumeric: false` → Label in `text-text-muted`

### CTA bei `on_request`

Nur wenn `price_type === 'on_request'` UND mindestens ein Kontaktweg vorhanden:
- "Anrufen" → `tel:${shop_phone}` (wenn `shop_phone` gesetzt)
- "Website" → `href={offer.url}` (wenn `offer.url` gesetzt)
- Kein leerer CTA-Block — beide Buttons optional

### Filter "Nur mit Preis"

- URL-Param: `?with_price=1`
- Aktiv: nur `price_type === 'fixed'` Angebote werden angezeigt
- Auf Suchseite: clientseitiger Filter in `SearchContent.tsx`
- Auf Produktdetailseite: serverseitiger Filter in `products/[slug]/page.tsx`

## RTL (AR, HE)

- CTA-Buttons: `rtl:flex-row-reverse` in OfferList
- Preisanzeige (rechts): `rtl:text-left` in OfferList

## I18n-Keys

| Key | EN | DE |
|---|---|---|
| `price_on_request` | Price on request | Preis auf Anfrage |
| `price_free` | Free | Kostenlos |
| `price_variable` | Variable price | Variabler Preis |
| `filter_price_only` | With price only | Nur mit Preis |
| `contact_shop` | Contact shop | Shop kontaktieren |

Alle 6 Sprachen: EN, DE, EL, RU, AR, HE → `src/lib/translations.ts`

## Scope: Was ist OUT OF SCOPE

- **Staffelpreise / Tier Pricing** — zukünftiger Scope
- **Separates Service-Modell** (`/services/…` Route) — zukünftiger Scope  
- **Shop-Admin OfferForm** mit `price_type`-Auswahl — noch nicht implementiert (`// TODO: price_type support für Shop-Admin`)
