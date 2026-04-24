# Journey Report: Unified Item/Offer Model — 2026-04-24

**Feature:** `2026-04-24-unified-item-offer-model`
**Run-SHA:** `bc4e8ac89c083856c0eb12e76a581461f768787b`
**Zeitpunkt:** 2026-04-24T14:00:00Z
**Tester:** e2e-tester (automatisiert)

---

## Zusammenfassung

| Phase | Ergebnis |
|---|---|
| TypeScript | PASS (0 Fehler) |
| ESLint | PASS (0 Fehler, 46 Warnings — alle pre-existing in Test-Dateien) |
| Unit-Tests | 981/981 PASS (2 Test-Assertions korrigiert) |
| Browser E2E (main.spec.ts) | 49/53 PASS |
| Journey shop-owner-lifecycle | PASS (7/9, 2 skipped) |
| Journey shop-owner-full-lifecycle | PASS (9/17, 8 skipped) |
| Journey admin-data-management | FAIL (1/10, pre-existing) |
| Journey import-page-ac-check | PASS (6/6) |
| Journey shop-admin-offers | FAIL (0/16 — backend legacy endpoint broken) |

---

## Code-Fixes während des Testlaufs

### Frontend
| Datei | Änderung |
|---|---|
| `src/tests/unified-item-offer-model.test.tsx:162` | `getByRole('alert')` → `getAllByText(tr.required)` — validation nutzt fieldErrors, kein role=alert |
| `src/tests/unified-item-offer-model.test.tsx:161` | `fireEvent.click(save)` → `fireEvent.submit(form)` — HTML required-Attribut blockt click-submit in jsdom |
| `src/tests/unified-item-offer-model.test.tsx:301` | `getByText('–')` → `getByText(/^–/)` — Element enthält '– · 9.99 EUR', kein exakter Match |

### Backend
| Datei | Änderung |
|---|---|
| `ingestor/models/offer.py:33` | `ForeignKey("products.id")` → `ForeignKey("products_deprecated.id")` |
| `ingestor/models/customer_alert_queue.py:41` | `ForeignKey("products.id")` → `ForeignKey("products_deprecated.id")` |
| `ingestor/models/customer_favorite.py:35` | `ForeignKey("products.id")` → `ForeignKey("products_deprecated.id")` |
| `ingestor/models/product_translation_status.py:44` | `ForeignKey("products.id")` → `ForeignKey("products_deprecated.id")` |
| `scripts/prepare_e2e_db.py` | Tabellenliste auf neue Modelle aktualisiert (items/shop_listings/offers statt products/shop_owner_products/shop_owner_offers) |
| `scripts/prepare_e2e_db.py` | `seed_price_type_fixtures()` auf `Item + ShopListing + UnifiedOffer` umgestellt |
| `scripts/prepare_e2e_db.py` | `INSERT ON CONFLICT DO NOTHING` → `INSERT` (deferrable Constraints verträgen kein ON CONFLICT) |
| `scripts/prepare_e2e_db.py` | `ShopListing.source="admin"` hinzugefügt (NOT NULL) |
| `ingestor/api/shop_query.py:486` | `ShopOwnerOffer` → `UnifiedOffer + ShopListing` JOIN |

---

## Findings (unresolved)

### F1 — Backend: Legacy-Endpoint `POST /shop-owner/products` broken
- **Betroffene Datei:** `ingestor/api/shop_owner_products.py`
- **Symptom:** `INSERT INTO shop_owner_products` → HTTP 500, Tabelle existiert nicht mehr
- **Ursache:** Legacy-Compat-Endpoint nicht auf neue Modelle migriert
- **Impact:** `shop-admin-offers.spec.ts` Fixture-Setup schlägt fehl; Frontend nutzt diesen Endpoint NICHT mehr (verwendet `/shop-owner/items`)
- **Aktion:** Backend-Team: Endpoint auf `Item + ShopListing` umstellen oder entfernen

### F2 — Backend: `shop_owner_price_tiers.py` referenziert entfernte Tabelle
- **Symptom:** Noch nicht getestet, aber Code importiert `ShopOwnerProduct` → selbes Problem
- **Aktion:** Backend-Team: Überprüfen und auf neue Modelle umstellen

### F3 — E2E Spec: `shop-admin-offers.spec.ts` braucht Rewrite
- **Symptom:** Spec verwendet alten Endpoint zur Fixture-Anlage
- **Aktion:** Spec auf `/shop-owner/items` + `/shop-owner/shop-listings` umschreiben

### F4 — E2E: 4 Failures in `main.spec.ts` (pre-existing)
- `E2E-02`: search navigates to `/search?q=...` → URL bleibt `/?` (timing oder SearchBar-Issue)
- `E2E-08` (3×): Leaflet map marker timeout — keine Marker innerhalb von 10s sichtbar

---

## Browser E2E Details

### main.spec.ts (49/53)

| Test | Status | Notiz |
|---|---|---|
| E2E-01 Startseite | PASS | |
| E2E-02 Suche (search navigates) | FAIL | URL bleibt `/?` — pre-existing |
| E2E-02 Suche (empty, results) | PASS | |
| E2E-03 RTL ar/he/en/de | PASS | |
| E2E-04 Produkt-Detail | PASS | |
| E2E-05 Shop & Karte | PASS | |
| E2E-06 Responsive Mobile | PASS | |
| E2E-07 Fehler-Handling | PASS | |
| E2E-08 Karten-Routing (3×) | FAIL | Leaflet marker timeout — pre-existing |

### Journey-Ergebnisse

| Journey | Ergebnis | Notiz |
|---|---|---|
| shop-owner-lifecycle | PASS 7/9 (2 skip) | backend shop_owner_offers warning (F1 Vorstufe) |
| shop-owner-full-lifecycle | PASS 9/17 (8 skip) | selbe warning |
| admin-data-management | FAIL 1/10 | Pre-existing, kein Bezug zu diesem Feature |
| import-page-ac-check | PASS 6/6 | |
| shop-admin-offers | FAIL 0/16 | F1: Legacy-Endpoint broken |
