# Journey Report: shop-admin-product-crud (2026-05-19)

**Shop-Owner:** crud-41f3aa65@pundo.com
**Shop ID:** 5101

## Findings
- T1 PASS: Dashboard erreichbar
- T2 PASS: Produkt angelegt (ID=54845), Offers-Seite erreichbar
- T3 SKIP: No file input found on product edit page
- T4 PASS: Offers/new erreichbar (Preis-Schritt via Offer-Flow)
- T5 WARN: Kategorie-Update returned 405
- T5 PASS: Kategorie-Update, Offers-UI noch erreichbar
- T6a PASS: Zweites Produkt angelegt (201)
- T6b WARN: Delete returned 405
- T6c PASS: Offers-UI noch erreichbar
- T7 SKIP: Keine auto_seeded-Items gefunden (Baustein B noch nicht deployed)