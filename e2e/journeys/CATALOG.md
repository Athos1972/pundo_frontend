# Journey Catalog — pundo_frontend

> Quelle der Wahrheit. Jede Journey hat eine eigene Datei `e2e/journeys/<id>.md`.
> Pflegeregeln: siehe CATALOG_SCHEMA.md.
> Agents lesen und schreiben die einzelnen Journey-Dateien.
> User-Bestätigung (j/n) vor jeder Mutation außer last-run/last-result.

<!-- SCHEMA_VERSION: 1 -->

## Journeys

| ID | Title | Status | Priority | Last Result |
|---|---|---|---|---|
| [shop-owner-lifecycle](shop-owner-lifecycle.md) | Shop-Owner Lifecycle | implemented | P1 | PASS |
| [customer-discovery](customer-discovery.md) | Customer Discovery Flow | implemented | P2 | FAIL |
| [shop-owner-full-lifecycle](shop-owner-full-lifecycle.md) | Shop-Owner Full Lifecycle + UI-Kombinations-Matrix | implemented | P1 | FAIL |
| [customer-and-review-lifecycle](customer-and-review-lifecycle.md) | Customer Auth + Interaction + Review Lifecycle | implemented | P2 | PASS |
| [admin-data-management](admin-data-management.md) | Admin Data Management Sweep | implemented | P3 | FAIL |
