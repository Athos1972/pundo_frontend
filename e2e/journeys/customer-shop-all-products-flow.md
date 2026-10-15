---
id: customer-shop-all-products-flow
title: Customer Shop-Detail → "Alle" → Suchergebnisse mit shop_id
status: implemented
spec-file: e2e/journeys/customer-shop-all-products-flow.spec.ts
priority: P2
owner-agent: e2e-tester
proposed-in-spec: ad-hoc
touches-modules:
  - src/app/(customer)/[lang]/shops/[slug]/**
  - src/app/(customer)/[lang]/search/**
  - src/components/product/**
  - src/lib/api.ts
touches-roles:
  - guest
touches-states:
  - Shop.products:present
  - Offer.multi-shop:present
status-changed-at: 2026-06-04T21:55:00Z
status-changed-by-spec: ad-hoc
last-run: 2026-10-14T00:00:00Z
last-result: PASS
last-run-sha: 35f75a280df9d0d7bc9fd41cd9761f0ef8957471
---

### Journey: Customer Shop-Detail → "Alle" → Suchergebnisse mit shop_id

**Kontext:** Regression-Guard für B5900-004.

Vor dem Fix zeigte `/en/search?shop_id=X` keine Produkte, weil `SearchContent.tsx`
den `shop_id`-URL-Param ignorierte und die Guard-Bedingung früh abbrach. Außerdem
war der "Alle →"-Link auf der Shop-Detailseite hardcodiert auf Deutsch.

**Ziel:** Sicherstellen, dass der vollständige Flow vom Shop-Profil bis zur gefilterten
Produktliste korrekt funktioniert — und dass er bei jeder künftigen Änderung an
`SearchContent` oder `shops/[slug]/page.tsx` sofort auffällt.

**Vorbedingung (F8950 T31, Zwei-Ebenen-Prinzip):** Ebene 1 seedet die Spec selbst: Spec-Shop A mit 3 Produkten
(Festpreis-Angebot), Spec-Shop B listet Produkt 1 zu einem niedrigeren Preis. Alles, was unten mit
`manjo-pet-087d8709` / `shop_id=75` steht, gilt jetzt für Spec-Shop A (Slug/ID zur Laufzeit). Ebene 2 (Schritt E) prüft
dieselben Invarianten zusätzlich gegen reale Prod-Kopie-Shops und überspringt mit Grund, wenn ein Shop fehlt.

----

### Runbook (Assertions in dieser Reihenfolge)

**A — Shop-Detail-Seite lädt korrekt**
1. Navigiere zu `http://localhost:3500/en/shops/manjo-pet-087d8709`
2. HTTP-Status 200 (kein 404, kein 500)
3. `<h1>` enthält Shop-Name (nicht leer)

**B — Top-Products-Sektion ist sichtbar**
4. Element mit Text `{tr.products}` (Heading) ist im DOM
5. Mindestens 1 `ProductCard` ist gerendert (data-testid oder article-Element in der Sektion)
6. "Alle"-Link ist sichtbar und enthält `href` mit `/search?shop_id=75`
7. Link-Text ist NICHT hartcodiert Deutsch "Alle" — sondern sprachabhängig:
   - `/en/...` → "All"
   - `/de/...` → "Alle"
   - `/el/...` → "Όλα"
   (Mindest-Check: `/en/` → Link-Text ist "All →", nicht "Alle →")

**C — Klick auf "Alle"-Link führt zu gefüllter Suche**
8. Klick auf den "Alle →"-Link
9. Browser navigiert zu `/en/search?shop_id=75`
10. **Mindestens 1 Produktkarte** wird gerendert (das war der fehlende Assert vor dem Fix)
11. `searchAll` wird NICHT aufgerufen — nur `searchProducts` mit `shop_id=75`
    (verifizierbar via Network-Tab: Request an `/api/v1/products?shop_id=75`, NICHT `/api/v1/search`)

**D — Keine Regression auf category-Modus**
12. Navigiere zu `/en/search?category_id=1` (existierende Kategorie)
13. Produkte erscheinen — Guard-Fix hat category-Modus nicht gebrochen

----

### Fixture-Anforderungen

| Fixture | Zweck | Quelle |
|---|---|---|
| Spec-Shop A / B | 3 Produkte, Multi-Shop-Angebot | zur Laufzeit per API (specShop) |
| Shop `manjo-pet-087d8709` (Ebene 2) | Realer Shop mit Produkten | `pundo_test` via sync_prod_to_test.sh |
| Mindestens 1 Produkt mit Angebot für Spec-Shop A | Nachweis dass "Alle"-Suche nicht leer ist | Spec-Seed |

Keine eigenen E2E-Fixtures nötig — nutzt bestehende `pundo_test`-Daten.
Bei fehlendem Shop oder 0 Produkten: `test.skip('Fixture-Defekt: ...')` + Bug-Eintrag.

----

### Smoketest-Würdigkeit

**Ja** — dieser Flow ist für echte Nutzer sichtbar und war defekt.
Wenn die Test-Instanz läuft: Manifest-Eintrag `shop-all-products-link` prüfen lassen.
Kriterium: „Würde ein Nutzer das innerhalb von 24h bemerken?" → **Ja**, da direkter CTA.

**Schritt E (B5900-016, 2026-10-14):** `best_offer` im `shop_id`-Modus stammt immer vom eigenen Shop (API mit und ohne Geo, Limassol), `total == product_count`, Shop-Seite und `/search?shop_id=` verlinken nur auf den eigenen Shop. Fixtures: `manjo-pet-087d8709`, Demo-Shops `anna-s-bakery`, `o-phournos-tes-annas` (SKIP, falls nicht vorhanden). 11/11 PASS.
