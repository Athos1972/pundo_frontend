# Journey-Report: shop-admin-offers — Gruppe SKU

**Datum:** 2026-10-16T00:36:27.298Z
**Frontend:** http://127.0.0.1:3500  **Backend:** http://localhost:8500
**Spec-Shop:** e2e-20261016003452-offers-sku-d5d8  **Zweiter Shop:** e2e-20261016003452-offers-sku-b-dbb8

| Schritt | Beschreibung | Status |
|---|---|---|
| SKU-1 | Artikel (product) anlegen, SKU N-bee91a99 in Schritt 2, speichern | **PASS** |
| SKU-1 | Angebotsliste zeigt die SKU; Listing traegt sie | **PASS** |
| SKU-2 | Artikel (service) anlegen, SKU S-bee91a99 in Schritt 2, speichern | **PASS** |
| SKU-2 | Angebotsliste zeigt die SKU; Listing traegt sie | **PASS** |
| SKU-3 | Artikel im Picker waehlen -> Feld zeigt die vorhandene SKU | **PASS** |
| SKU-3 | speichern -> Liste zeigt die SKU, Listing unveraendert | **PASS** |
| SKU-4 | Meldung am Feld, keine Navigation | **PASS** |
| SKU-4 | nichts gespeichert: kein Angebot, Listing ohne SKU | **PASS** |
| ADM-1 | Zeile mit SKU, Listing-ID, Quelle und Archiv-Status | **PASS** |
| ADM-1 | kein "+ New"-Link | **PASS** |
| ADM-2 | Liste gefiltert nach der neuen SKU zeigt genau eine Zeile | **PASS** |
| ADM-2 | Shop-Owner sieht die SKU in seiner Angebotsliste (API listing_sku) | **PASS** |
| ADM-3 | Feldmeldung (EN), keine Navigation | **PASS** |
| ADM-3 | beide SKUs unveraendert | **PASS** |
| ADM-3 | Gegenprobe: dieselbe SKU an einem Listing eines anderen Shops -> 200 | **PASS** |
| I18N | Owner ar: Neu-Flow Schritt 2 | **PASS** |
| I18N | Admin el: Label und griechische Konfliktmeldung | **PASS** |
| ADM-4 | Listing hat keine SKU mehr | **PASS** |
| I18N-2 | Owner he bei 390 px: Schritt 2 | **PASS** |
| I18N-2 | Owner ar bei 390 px: Schritt 2 | **PASS** |
| I18N-2 | Admin en bei 390 px: Formular | **PASS** |
| I18N-2 | Admin el bei 390 px: Formular | **PASS** |