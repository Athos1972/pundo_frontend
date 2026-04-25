# Legacy Spec Inventory

**Datum:** 2026-04-25
**Entscheidung (User bestätigt):** `/shop-admin/products/*` bleibt redirect-only → Legacy-Specs löschen + relevante Szenarien nach `shop-admin-offers.spec.ts` migrieren.

---

## `shop-admin-offer-product.spec.ts` — Hauptblock (`describe.fixme`)

| Test-Name | Szenario | Heutiger Flow | Aktion |
|---|---|---|---|
| E2 — POST offer with non-existent product_id → HTTP 422 | FK-Guard, 500→422 Regression | /api/v1/shop-owner/offers benötigt jetzt shop_listing_id statt product_id | migrate: Szenario bleibt relevant → neu als "cross-shop-isolation" in shop-admin-offers.spec.ts |
| E3 — POST offer with cross-shop product_id → HTTP 422 | Cross-Shop-Isolation | Wie E2 | migrate: Cross-Shop-Isolation ist weiterhin relevant |
| E4 — PATCH offer to link cross-shop product_id → HTTP 422 | Cross-Shop-Isolation PATCH | Wie E2 | migrate |
| E5 — PATCH offer: unlink product (product_id: null) | Nullable PATCH fix | Obsolet (kein product_id mehr im Schema) | delete |
| A1 — Product WITHOUT offer is searchable | Suche ohne Angebot | Suche auf globalem Katalog, unverändert | migrate (vereinfacht: Suchseite lädt) |
| A3 — Product WITH past (expired) offer: no offer shown | Abgelaufenes Angebot nicht sichtbar | Angebote haben jetzt valid_from/valid_until auf ShopListing-Ebene | migrate |
| A4 — Product WITH future offer (starts tomorrow) | Zukünftiges Angebot | Wie A3 | migrate |
| B1 — Shop A: 2 non-overlapping offers, only current shown | Preis-Zeitraum-Edgecases | Gleich, nur neues Schema | migrate |
| B2 — Shop B: both offers in gap → neither shown today | Lücken-Zeitraum | Wie B1 | migrate |
| B3 — 2 shops offer same product name, non-overlapping | Cross-Shop-Isolation + Zeiträume | Wie B1 | migrate |
| C1 — Price history chart on product detail page | Price-History-Anzeige | Unverändert (globaler Katalog) | migrate (vereinfacht) |
| C2 — Product page with no offers: empty state | Leerstate | Unverändert | migrate (vereinfacht) |
| D2 — Expired offer NOT shown on customer shop page | Abgelaufenes Angebot | Gleich | migrate |
| D3 — Future offer behavior consistent with API | Zukünftiges Angebot | Gleich | migrate |
| D4 — Shop with NO offers: no offers section shown | Leerstate | Gleich | migrate |
| F2 — UI: cross-shop product protection | Cross-Shop-Isolation | API-Level weiterhin relevant | migrate |

## `shop-admin-offer-product.spec.ts` — Extended Block (`describe.fixme`)

| Test-Name | Szenario | Heutiger Flow | Aktion |
|---|---|---|---|
| G3 — Offer with price "0.00" (free) → 201 | Preis-Edgecase: Null | Neues Schema: price_tiers, kein "price" Feld direkt | delete (neues Schema hat keine price= Felder) |
| G4 — REGRESSION: empty price string → null → 201 | Regression price="" | Obsolet: neues Schema hat keine price= Felder mehr | delete |
| G5 — German decimal format "9,99" → 422 | Preis-Edgecase: Komma | Obsolet: neues Schema hat keine price= Felder mehr | delete |
| H1 — Product with single PriceTier + offer → 201 | Staffelpreis | Neue Staffelpreis-Logik in price_tiers[] auf ShopListing-Ebene | migrate: Konzept bleibt, API-Pfad geändert |
| H2 — Product with multiple PriceTier steps → 201 | Staffelpreis (mehrere Stufen) | Wie H1 | migrate |
| H3 — Product with custom unit → offer → 201 | Staffelpreis custom unit | Wie H1 | migrate |
| I1 — Offer without valid_from and valid_until → 201 | Datum optional | Neues Schema: valid_from/valid_until weiterhin optional | migrate |
| I2 — Offer with valid_from in the past → 201 | Datum Vergangenheit | Gleich | migrate |
| I3 — Offer with valid_from = valid_until → 201 | Same-Day-Offer | Gleich | migrate |
| I4 — Offer with explicit null dates → 201 | Null-Datum explicit | Gleich | migrate |
| I5 — DIVERGENCE: UI requires dates but backend does not | UX-Dokumentation | Gleich (informational) | migrate (vereinfacht) |
| J3 — Shop with PriceTier product: customer page renders | Staffelpreis Kundensicht | Gleich, neues API-Pfad | migrate |

## `shop-admin-product-offer-ui.spec.ts` — UI Golden Path (`describe.fixme`)

| Test-Name | Szenario | Heutiger Flow | Aktion |
|---|---|---|---|
| UI-P1 — Neues Produkt via Formular anlegen | /shop-admin/products/new → Produktliste | Redirect zu /shop-admin/offers/new | delete: Route ist Redirect-only, Szenario obsolet |
| UI-O1 — Zeitlich begrenztes Angebot mit Preis anlegen | Angebot anlegen UI + Kundensicht | /shop-admin/offers/new bereits in shop-admin-offers.spec.ts (A1/D1) | delete: bereits durch shop-admin-offers.spec.ts abgedeckt |
| UI-O2 — Angebot ohne Preis → Kundensicht | Angebot ohne Preis | Bereits durch A2/D tests abgedeckt | delete |
| UI-O3 — Produkt anlegen → Angebot verknüpfen → Kundensicht | Full UI Flow | /shop-admin/products/new ist Redirect, neuer Flow via OfferForm Step 1+2 in shop-admin-offers.spec.ts | delete |

---

## Entscheidungs-Zusammenfassung

**Migrate nach `shop-admin-offers.spec.ts`:**
- Cross-Shop-Isolation (E3, E4, F2, B3): Zwei-Shop-Setup mit `buildAdminShopPayload` + `registerAndApproveShopOwner`
- Abgelaufene/zukünftige Angebote (A3, A4, D2, D3, B1, B2): Bestehende D-Tests in shop-admin-offers.spec.ts erweitern
- Staffelpreis-Szenarien (H1, H2, H3, J3): Neues price_tiers-Schema
- Datum-Edgecases (I1-I5): Weiterhin relevant

**Delete (obsolet durch neues Schema):**
- G3, G4, G5: Altes price= Feld
- UI-P1, UI-O1, UI-O2, UI-O3: UI-Tests für redirect-only Route

**Beide Dateien danach löschen.**
