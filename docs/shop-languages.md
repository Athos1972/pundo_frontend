# Shop-Sprachen (spoken_languages)

Shop-Betreiber können angeben, welche Sprachen in ihrem Shop gesprochen werden. Diese Information wird auf der öffentlichen Shop-Detailseite als Chips angezeigt und im Shop-Admin-Portal gepflegt.

---

## Fachlicher Hintergrund

Für Nutzer in einem mehrsprachigen Umfeld (Larnaca, Zypern) ist es relevant zu wissen, ob ein Shopbetreiber ihre Sprache spricht. Das Feld ist freiwillig — Shops ohne Angabe zeigen keinen Sprach-Block.

---

## Verfügbare Sprachen

Die Liste ist fest auf die App-Sprachen beschränkt:

| Code | Sprache |
|---|---|
| `EN` | Englisch |
| `DE` | Deutsch |
| `EL` | Griechisch |
| `RU` | Russisch |
| `AR` | Arabisch |
| `HE` | Hebräisch |

Die Codes werden als Großbuchstaben gespeichert und angezeigt. Flaggen-Emojis werden bewusst nicht verwendet — Sprache ist nicht dasselbe wie Nationalität.

---

## Kundenseite: Shop-Detailseite

Wenn ein Shop mindestens eine Sprache gesetzt hat, erscheint auf `/shops/[slug]` ein Abschnitt mit Chips direkt unter dem Status-Badge.

**Darstellung:**
```
Gesprochene Sprachen
[ DE ]  [ EN ]  [ RU ]
```

- Chips sind nicht klickbar (kein Filter-Verhalten)
- Container: `flex-wrap` → RTL-kompatibel für AR/HE-Interface
- Kein leerer Abschnitt bei `spoken_languages = []` oder `undefined`

**Komponente:** `src/components/ui/LanguageChips.tsx` (Server Component)

---

## Shop-Admin: Profil-Bearbeitung

Im Shop-Admin-Portal (`/shop-admin/profile`) kann der Shop-Betreiber Sprachen per Toggle-Chips auswählen:

- Alle 6 Sprachen werden als klickbare Chips angezeigt
- Aktiv = blaue Akzentfarbe, inaktiv = grau
- Mehrfachauswahl möglich (0–6 Sprachen)
- Speichern per "Speichern"-Button (zusammen mit anderen Profil-Feldern)

**Komponente:** `src/components/shop-admin/LanguageSelector.tsx` (Client Component)

---

## Technische Implementierung

### Konstante

```typescript
// src/lib/lang.ts
export const SUPPORTED_LANGUAGES = ['EN', 'DE', 'EL', 'RU', 'AR', 'HE'] as const
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]
```

### TypeScript-Typen

```typescript
// src/types/api.ts
interface ShopDetailResponse extends ShopListItem {
  spoken_languages?: string[]  // optional: ältere API-Responses ohne Feld
}

// src/types/shop-admin.ts
interface AdminShop {
  spoken_languages: string[]   // non-optional: Backend gibt immer [] zurück
}
```

### PATCH-Payload (Admin)

```json
PATCH /api/v1/shop-owner/shop
{
  "spoken_languages": ["DE", "EN", "RU"]
}
```

Leeres Array `[]` entfernt alle Sprachen.  
Feld weglassen = keine Änderung (Backend-Semantik).

---

## Backend-Referenz

- Endpunkt-Beschreibung: [`pundo_main_backend/docs/shop-owner-portal.md`](../../pundo_main_backend/docs/shop-owner-portal.md) — Abschnitt "Shop-Profil"
- Validierung: Backend akzeptiert nur Werte aus `["EN","DE","EL","RU","AR","HE"]`
